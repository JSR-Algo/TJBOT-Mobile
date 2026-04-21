package com.tbotmobile.voicesession

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Single owner of Android audio-session state for the Gemini Live conversation:
 * AudioManager.mode, audio focus, and communication device selection. Other
 * native modules (PcmStreamModule, NativeMicModule/RNLiveAudioStream) are
 * subordinate — they never call setMode/requestAudioFocus themselves.
 *
 * Lifecycle:
 *   startSession()  → MODE_IN_COMMUNICATION + focus + speaker default
 *   setRoute(x)     → explicit override (speaker / earpiece / bt / wired)
 *   forceRecover()  → idempotent re-apply (use after WS reconnect or app
 *                     foreground to heal transient session corruption)
 *   endSession()    → restore prior mode, abandon focus, clear comm device
 *
 * Events emitted to JS via DeviceEventManager:
 *   voiceSessionStateChange  { state: active|transientLoss|lost|inactive, reason? }
 *   voiceRouteChange         { route, deviceId, deviceName }
 */
class VoiceSessionModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  private val audioManager: AudioManager =
    reactContext.applicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  private val mainHandler = Handler(Looper.getMainLooper())

  @Volatile private var sessionActive = false
  private var previousMode: Int = AudioManager.MODE_NORMAL
  private var focusRequest: AudioFocusRequest? = null
  private var currentRoute: String = ROUTE_SPEAKER

  private val focusListener =
    AudioManager.OnAudioFocusChangeListener { change ->
      when (change) {
        AudioManager.AUDIOFOCUS_GAIN -> emitState(STATE_ACTIVE, reason = "focus_gain")
        AudioManager.AUDIOFOCUS_LOSS -> emitState(STATE_LOST, reason = "focus_loss_permanent")
        AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
        AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK,
        ->
          emitState(STATE_TRANSIENT_LOSS, reason = "focus_loss_transient")
        else -> structLog("focus_other", mapOf("change" to change))
      }
    }

  private val deviceCallback: AudioDeviceCallback =
    object : AudioDeviceCallback() {
      override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>?) {
        if (!sessionActive) return
        added?.firstOrNull { it.isSink }?.let { emitRoute(routeForDevice(it), it) }
      }

      override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>?) {
        if (!sessionActive) return
        // Fall back to the current resolved route after a device drop so JS
        // knows we've rehomed the stream.
        emitRoute(resolveActiveRoute(), null)
      }
    }

  private val scoReceiver =
    object : BroadcastReceiver() {
      override fun onReceive(
        context: Context?,
        intent: Intent?,
      ) {
        val state = intent?.getIntExtra(AudioManager.EXTRA_SCO_AUDIO_STATE, -1) ?: -1
        structLog("sco_state", mapOf("state" to state))
        if (state == AudioManager.SCO_AUDIO_STATE_CONNECTED) {
          currentRoute = ROUTE_BLUETOOTH
          emitRoute(ROUTE_BLUETOOTH, null)
        } else if (state == AudioManager.SCO_AUDIO_STATE_DISCONNECTED && currentRoute == ROUTE_BLUETOOTH) {
          currentRoute = ROUTE_SPEAKER
          audioManager.isSpeakerphoneOn = true
          emitRoute(ROUTE_SPEAKER, null)
        }
      }
    }
  private var scoReceiverRegistered = false

  // ─────────────────────────────────────────────────────────────────────
  // Bridge methods

  @ReactMethod
  fun startSession(promise: Promise) {
    try {
      if (sessionActive) {
        structLog("start_noop", mapOf("reason" to "already_active"))
        promise.resolve(null)
        return
      }

      previousMode = audioManager.mode
      audioManager.mode = AudioManager.MODE_IN_COMMUNICATION

      val focusResult = requestFocus()
      if (focusResult != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
        structLog("focus_denied", mapOf("result" to focusResult))
        // Don't abort — Gemini can still talk without exclusive focus, it
        // just means notifications won't duck us. JS observes state=lost.
        emitState(STATE_LOST, reason = "focus_denied")
      }

      // Default to speakerphone. MIUI + Snapdragon occasionally latches onto
      // the earpiece if nothing asks explicitly for the speaker profile.
      applyRouteInternal(ROUTE_SPEAKER)

      audioManager.registerAudioDeviceCallback(deviceCallback, mainHandler)
      registerScoReceiver()

      sessionActive = true
      emitState(STATE_ACTIVE, reason = "start")
      promise.resolve(null)
    } catch (e: Throwable) {
      Log.e(TAG, "startSession failed", e)
      promise.reject("E_START", e.message, e)
    }
  }

  @ReactMethod
  fun endSession(promise: Promise) {
    try {
      if (!sessionActive) {
        promise.resolve(null)
        return
      }
      try {
        audioManager.unregisterAudioDeviceCallback(deviceCallback)
      } catch (_: Throwable) {
        // callback may not have been registered if startSession failed early
      }
      unregisterScoReceiver()

      abandonFocus()
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          audioManager.clearCommunicationDevice()
        } else {
          @Suppress("DEPRECATION")
          audioManager.isSpeakerphoneOn = false
          @Suppress("DEPRECATION")
          audioManager.stopBluetoothSco()
        }
      } catch (e: Throwable) {
        structLog("route_cleanup_err", mapOf("err" to (e.message ?: "unknown")))
      }

      audioManager.mode = previousMode
      sessionActive = false
      emitState(STATE_INACTIVE, reason = "end")
      promise.resolve(null)
    } catch (e: Throwable) {
      Log.e(TAG, "endSession failed", e)
      promise.reject("E_END", e.message, e)
    }
  }

  @ReactMethod
  fun setRoute(
    route: String,
    promise: Promise,
  ) {
    try {
      if (!sessionActive) {
        promise.reject("E_NO_SESSION", "setRoute requires an active session")
        return
      }
      applyRouteInternal(route)
      promise.resolve(currentRoute)
    } catch (e: Throwable) {
      promise.reject("E_ROUTE", e.message, e)
    }
  }

  @ReactMethod
  fun getRoute(promise: Promise) {
    promise.resolve(if (sessionActive) currentRoute else ROUTE_NONE)
  }

  // Required by NativeEventEmitter on newer React Native — silent no-ops;
  // the emitter is driven by our own logic, not by listener counts.
  @ReactMethod
  fun addListener(eventName: String) {
    /* no-op */
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    /* no-op */
  }

  @ReactMethod
  fun forceRecover(promise: Promise) {
    try {
      if (!sessionActive) {
        promise.resolve(false)
        return
      }
      audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
      // Re-request focus; idempotent on existing handle.
      val focusResult = requestFocus()
      structLog("recover", mapOf("focus" to focusResult, "route" to currentRoute))
      applyRouteInternal(currentRoute)
      emitState(STATE_ACTIVE, reason = "recover")
      promise.resolve(true)
    } catch (e: Throwable) {
      promise.reject("E_RECOVER", e.message, e)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Internals

  private fun requestFocus(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val attrs =
        AudioAttributes
          .Builder()
          .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build()
      val req =
        AudioFocusRequest
          .Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
          .setAudioAttributes(attrs)
          .setAcceptsDelayedFocusGain(false)
          .setOnAudioFocusChangeListener(focusListener, mainHandler)
          .build()
      focusRequest = req
      audioManager.requestAudioFocus(req)
    } else {
      @Suppress("DEPRECATION")
      audioManager.requestAudioFocus(
        focusListener,
        AudioManager.STREAM_VOICE_CALL,
        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE,
      )
    }
  }

  private fun abandonFocus() {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
        focusRequest = null
      } else {
        @Suppress("DEPRECATION")
        audioManager.abandonAudioFocus(focusListener)
      }
    } catch (e: Throwable) {
      structLog("abandon_focus_err", mapOf("err" to (e.message ?: "unknown")))
    }
  }

  private fun applyRouteInternal(route: String) {
    currentRoute = route
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      applyRouteApi31Plus(route)
    } else {
      applyRouteLegacy(route)
    }
    emitRoute(route, null)
  }

  private fun applyRouteApi31Plus(route: String) {
    val targetType =
      when (route) {
        ROUTE_SPEAKER -> AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
        ROUTE_EARPIECE -> AudioDeviceInfo.TYPE_BUILTIN_EARPIECE
        ROUTE_BLUETOOTH -> AudioDeviceInfo.TYPE_BLUETOOTH_SCO
        ROUTE_WIRED -> AudioDeviceInfo.TYPE_WIRED_HEADSET
        else -> AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
      }
    val candidate =
      audioManager.availableCommunicationDevices.firstOrNull { it.type == targetType }
    if (candidate != null) {
      val ok = audioManager.setCommunicationDevice(candidate)
      structLog("set_comm_device", mapOf("route" to route, "ok" to ok, "name" to candidate.productName))
    } else {
      structLog("route_unavailable", mapOf("route" to route))
      // If BT/wired isn't plugged, fall back to the speaker so audio still
      // flows. The JS side can decide whether to surface an error.
      if (route != ROUTE_SPEAKER) {
        applyRouteApi31Plus(ROUTE_SPEAKER)
      }
    }
  }

  @Suppress("DEPRECATION")
  private fun applyRouteLegacy(route: String) {
    when (route) {
      ROUTE_SPEAKER -> {
        audioManager.stopBluetoothSco()
        audioManager.isBluetoothScoOn = false
        audioManager.isSpeakerphoneOn = true
      }
      ROUTE_EARPIECE -> {
        audioManager.stopBluetoothSco()
        audioManager.isBluetoothScoOn = false
        audioManager.isSpeakerphoneOn = false
      }
      ROUTE_BLUETOOTH -> {
        audioManager.isSpeakerphoneOn = false
        audioManager.startBluetoothSco()
        audioManager.isBluetoothScoOn = true
      }
      ROUTE_WIRED -> {
        // Wired routing is automatic when a headset is plugged in; the OS
        // takes over. Just make sure we haven't locked speaker on.
        audioManager.stopBluetoothSco()
        audioManager.isBluetoothScoOn = false
        audioManager.isSpeakerphoneOn = false
      }
      else -> {
        audioManager.isSpeakerphoneOn = true
      }
    }
  }

  private fun registerScoReceiver() {
    if (scoReceiverRegistered) return
    try {
      val filter = IntentFilter(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)
      // RECEIVER_NOT_EXPORTED required for dynamic receivers on API 33+
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        reactContext.registerReceiver(scoReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        reactContext.registerReceiver(scoReceiver, filter)
      }
      scoReceiverRegistered = true
    } catch (e: Throwable) {
      structLog("sco_register_err", mapOf("err" to (e.message ?: "unknown")))
    }
  }

  private fun unregisterScoReceiver() {
    if (!scoReceiverRegistered) return
    try {
      reactContext.unregisterReceiver(scoReceiver)
    } catch (_: Throwable) {
      // best-effort
    }
    scoReceiverRegistered = false
  }

  private fun resolveActiveRoute(): String {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      audioManager.communicationDevice?.let { return routeForDevice(it) }
    }
    @Suppress("DEPRECATION")
    if (audioManager.isBluetoothScoOn) return ROUTE_BLUETOOTH
    @Suppress("DEPRECATION")
    if (audioManager.isSpeakerphoneOn) return ROUTE_SPEAKER
    return ROUTE_EARPIECE
  }

  private fun routeForDevice(d: AudioDeviceInfo): String =
    when (d.type) {
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> ROUTE_SPEAKER
      AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> ROUTE_EARPIECE
      AudioDeviceInfo.TYPE_WIRED_HEADSET,
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
      AudioDeviceInfo.TYPE_USB_HEADSET,
      -> ROUTE_WIRED
      AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
      -> ROUTE_BLUETOOTH
      else -> ROUTE_SPEAKER
    }

  private fun emitState(
    state: String,
    reason: String,
  ) {
    val payload: WritableMap = Arguments.createMap()
    payload.putString("state", state)
    payload.putString("reason", reason)
    payload.putString("route", currentRoute)
    safeEmit(EVENT_STATE_CHANGE, payload)
    structLog("state", mapOf("state" to state, "reason" to reason, "route" to currentRoute))
  }

  private fun emitRoute(
    route: String,
    device: AudioDeviceInfo?,
  ) {
    currentRoute = route
    val payload: WritableMap = Arguments.createMap()
    payload.putString("route", route)
    payload.putInt("deviceId", device?.id ?: -1)
    payload.putString("deviceName", device?.productName?.toString() ?: "")
    safeEmit(EVENT_ROUTE_CHANGE, payload)
    structLog("route", mapOf("route" to route, "deviceId" to (device?.id ?: -1)))
  }

  private fun safeEmit(
    event: String,
    params: WritableMap,
  ) {
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(event, params)
    } catch (e: Throwable) {
      Log.w(TAG, "emit $event failed", e)
    }
  }

  private fun structLog(
    event: String,
    fields: Map<String, Any?>,
  ) {
    val sb = StringBuilder("{\"event\":\"$event\"")
    for ((k, v) in fields) {
      sb.append(",\"").append(k).append("\":")
      when (v) {
        is Number, is Boolean -> sb.append(v)
        null -> sb.append("null")
        else -> sb.append('"').append(v.toString().replace("\"", "\\\"")).append('"')
      }
    }
    sb.append('}')
    Log.i(TAG, sb.toString())
  }

  override fun invalidate() {
    super.invalidate()
    if (sessionActive) {
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          audioManager.clearCommunicationDevice()
        }
        audioManager.unregisterAudioDeviceCallback(deviceCallback)
        unregisterScoReceiver()
        abandonFocus()
        audioManager.mode = previousMode
      } catch (_: Throwable) {
        // best-effort cleanup on RN context teardown
      }
      sessionActive = false
    }
  }

  companion object {
    const val NAME = "VoiceSessionModule"
    private const val TAG = "TbotVoice"

    const val ROUTE_SPEAKER = "speaker"
    const val ROUTE_EARPIECE = "earpiece"
    const val ROUTE_BLUETOOTH = "bluetooth"
    const val ROUTE_WIRED = "wired"
    const val ROUTE_NONE = "none"

    const val STATE_ACTIVE = "active"
    const val STATE_TRANSIENT_LOSS = "transientLoss"
    const val STATE_LOST = "lost"
    const val STATE_INACTIVE = "inactive"

    const val EVENT_STATE_CHANGE = "voiceSessionStateChange"
    const val EVENT_ROUTE_CHANGE = "voiceRouteChange"
  }
}
