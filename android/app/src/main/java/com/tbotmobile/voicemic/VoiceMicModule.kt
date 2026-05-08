package com.tbotmobile.voicemic

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import android.os.Process
import android.os.SystemClock
import android.util.Base64
import android.util.Log
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Native AudioRecord wrapper for the Gemini Live mic path with platform AEC
 * attached at the audio-session level.
 *
 * Why this module exists:
 *   The previous RNLAS-based path on Android had no echo cancellation —
 *   AudioRecord was created without an AcousticEchoCanceler effect, so
 *   speaker output bled into the mic. Gemini Live's default
 *   START_OF_ACTIVITY_INTERRUPTS policy then treated that bleed as user
 *   speech and cut every reply short. iOS dodged this via
 *   AVAudioEngine.inputNode.setVoiceProcessingEnabled(true); Android needed
 *   the explicit AcousticEchoCanceler.create(audioSessionId) call.
 *
 * Pattern (from Android docs):
 *   - AudioRecord.source = VOICE_COMMUNICATION (pairs with
 *     AudioManager.MODE_IN_COMMUNICATION set by VoiceSessionModule).
 *   - AcousticEchoCanceler.create(audioRecord.audioSessionId).enabled = true
 *   - The framework selects active AudioTracks on the speaker and uses
 *     their digital streams as the AEC reference, regardless of which
 *     STREAM_TYPE / USAGE the playback declares. So PcmStreamModule keeps
 *     its USAGE_MEDIA (avoids the call-profile downsample) and AEC still
 *     subtracts that output from the mic input.
 *
 * JS bridge contract matches src/native/VoiceMic.ts (mirrors the iOS
 * VoiceMicModule). Events: voiceMicData (PCM chunks), voiceMicStalled
 * (no-frame watchdog).
 */
class VoiceMicModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  private var record: AudioRecord? = null
  private var aec: AcousticEchoCanceler? = null
  private var ns: NoiseSuppressor? = null
  private var agc: AutomaticGainControl? = null
  private var readerThread: Thread? = null
  private val readerRunning = AtomicBoolean(false)
  private val muted = AtomicBoolean(false)

  private var sampleRate: Int = 16_000
  private var aecMode: String = "hw"
  private val framesDelivered = AtomicLong(0)
  @Volatile private var lastFrameMs: Long = 0
  // Set by start() right before startReader(); read by the reader thread on
  // the first read>0 to compute firstFrameAgeMs for voiceMicEngineReady.
  // Reset to 0 by stopInternal so the next start cycle's first frame
  // re-emits the event.
  @Volatile private var engineStartMs: Long = 0
  // One-shot latch the reader thread sets when it emits voiceMicEngineReady.
  // Reset to false in start() (before startReader) and stopInternal so the
  // next session re-emits. Reader thread is the sole writer; @Volatile is
  // sufficient (no compound check-and-set across threads).
  @Volatile private var firstFrameEmitted: Boolean = false
  private var seqCounter: Long = 0
  // True iff AcousticEchoCanceler.create() returned a non-null instance and
  // .enabled latched true. Surfaced via getDiagnostics so JS can degrade
  // gracefully (or surface a banner) on devices that advertise AEC support
  // via isAvailable() but fail the create call.
  @Volatile private var aecAttached: Boolean = false

  // P0-8: software RMS fallback gate. Activated via setAecFallbackGate() when
  // voiceAecAttachFailed fires (AEC unavailable on this device). When enabled,
  // the reader thread drops chunks where RMS < fallbackThreshold while
  // playbackActive is true — prevents echo residual from reaching Gemini
  // as user speech during AI playback.
  @Volatile var fallbackGateEnabled: Boolean = false
  @Volatile var fallbackThreshold: Double = 0.04
  // Written by setPlaybackActive() called from PcmStreamModule.
  // Read by the reader thread. @Volatile: no lock needed (single boolean).
  @Volatile var playbackActive: Boolean = false

  // P0-7: Native energy + ZCR VAD (plan §5.6). Constants read from env vars at
  // property-init so they can be overridden without a rebuild (hot-restart safe).
  // Defaults: E_THRESHOLD=-42dBFS, Z_LOW=0.05, Z_HIGH=0.45, HANGOVER_MS=400.
  private val vadEnergyThresholdDb: Double =
    System.getenv("EXPO_PUBLIC_VOICE_VAD_ENERGY_DB")?.toDoubleOrNull() ?: -42.0
  private val vadZcrLow: Double =
    System.getenv("EXPO_PUBLIC_VOICE_VAD_ZCR_LOW")?.toDoubleOrNull() ?: 0.05
  private val vadZcrHigh: Double =
    System.getenv("EXPO_PUBLIC_VOICE_VAD_ZCR_HIGH")?.toDoubleOrNull() ?: 0.45
  private val vadHangoverMs: Int =
    System.getenv("EXPO_PUBLIC_VOICE_VAD_HANGOVER_MS")?.toIntOrNull() ?: 400
  // 200 ms ring buffer for pre-roll (plan §5.6). Sized at 16kHz mono int16 =
  // 3200 bytes per 100ms → 6400 bytes for 200ms. Filled before VAD fires.
  private val preRollBytes: Int = 6400
  private val preRollBuffer: ArrayDeque<ByteArray> = ArrayDeque()
  private var preRollFilled = false
  @Volatile private var vadSpeechActive = false
  @Volatile private var vadHangoverFramesLeft = 0

  @ReactMethod
  fun start(opts: ReadableMap, promise: Promise) {
    try {
      stopInternal()

      sampleRate = if (opts.hasKey("sampleRate")) opts.getInt("sampleRate") else 16_000
      val channels = if (opts.hasKey("channels")) opts.getInt("channels") else 1
      val bitsPerSample = if (opts.hasKey("bitsPerSample")) opts.getInt("bitsPerSample") else 16
      aecMode = if (opts.hasKey("aec")) opts.getString("aec") ?: "hw" else "hw"

      if (channels != 1) {
        promise.reject("E_CONFIG", "Only mono supported (channels=$channels)")
        return
      }
      if (bitsPerSample != 16) {
        promise.reject("E_CONFIG", "Only 16-bit PCM supported (bitsPerSample=$bitsPerSample)")
        return
      }

      if (ActivityCompat.checkSelfPermission(
          reactContext.applicationContext,
          Manifest.permission.RECORD_AUDIO,
        ) != PackageManager.PERMISSION_GRANTED
      ) {
        promise.reject("E_PERMISSION", "RECORD_AUDIO not granted")
        return
      }

      val channelMask = AudioFormat.CHANNEL_IN_MONO
      val encoding = AudioFormat.ENCODING_PCM_16BIT
      val minBuffer = AudioRecord.getMinBufferSize(sampleRate, channelMask, encoding)
      if (minBuffer <= 0) {
        promise.reject("E_BUFFER", "Invalid minBufferSize: $minBuffer")
        return
      }
      // 4× minBuffer keeps the read loop comfortable when the JS bridge or
      // GC stalls briefly. AudioRecord drops oldest samples on overflow,
      // which is acceptable — late frames are useless to a realtime stream.
      val bufferSize = minBuffer * 4

      val r =
        try {
          AudioRecord(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            sampleRate,
            channelMask,
            encoding,
            bufferSize,
          )
        } catch (e: SecurityException) {
          promise.reject("E_PERMISSION", e.message, e)
          return
        }

      if (r.state != AudioRecord.STATE_INITIALIZED) {
        r.release()
        promise.reject("E_INIT", "AudioRecord not initialized (state=${r.state})")
        return
      }

      val sessionId = r.audioSessionId
      aecAttached = false
      if (aecMode == "hw") {
        if (AcousticEchoCanceler.isAvailable()) {
          try {
            val aecInstance = AcousticEchoCanceler.create(sessionId)
            if (aecInstance != null) {
              aecInstance.enabled = true
              aecAttached = aecInstance.enabled
              if (aecAttached) {
                aec = aecInstance
              } else {
                aecInstance.release()
                emitAecAttachFailed("enabled_latch_false", sessionId)
              }
            } else {
              emitAecAttachFailed("create_returned_null", sessionId)
            }
          } catch (e: Throwable) {
            Log.w(TAG, "AEC attach failed", e)
            emitAecAttachFailed(e.message ?: "exception", sessionId)
          }
        } else {
          emitAecAttachFailed("isAvailable_false", sessionId)
        }
        // NS + AGC are independent effects. Worth attaching even when
        // VOICE_COMMUNICATION already applies platform processing — the
        // explicit effects are deterministic, the implicit ones depend on
        // OEM tuning.
        if (NoiseSuppressor.isAvailable()) {
          try { ns = NoiseSuppressor.create(sessionId)?.also { it.enabled = true } } catch (_: Throwable) {}
        }
        if (AutomaticGainControl.isAvailable()) {
          try { agc = AutomaticGainControl.create(sessionId)?.also { it.enabled = true } } catch (_: Throwable) {}
        }
      }

      try {
        r.startRecording()
      } catch (e: Throwable) {
        r.release()
        promise.reject("E_START", "startRecording failed: ${e.message}", e)
        return
      }

      record = r
      framesDelivered.set(0)
      seqCounter = 0
      lastFrameMs = SystemClock.elapsedRealtime()
      engineStartMs = SystemClock.elapsedRealtime()
      firstFrameEmitted = false
      muted.set(false)

      startReader()
      Log.i(
        TAG,
        "{\"event\":\"start_ok\",\"sr\":$sampleRate,\"sessionId\":$sessionId,\"aec\":\"$aecMode\",\"aecAttached\":$aecAttached}",
      )
      promise.resolve(null)
    } catch (e: Throwable) {
      Log.e(TAG, "start failed", e)
      promise.reject("E_START", e.message, e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      stopInternal()
      promise.resolve(null)
    } catch (e: Throwable) {
      promise.reject("E_STOP", e.message, e)
    }
  }

  @ReactMethod
  fun mute(m: Boolean, promise: Promise) {
    muted.set(m)
    promise.resolve(null)
  }

  @ReactMethod
  fun getDiagnostics(promise: Promise) {
    val map: WritableMap = Arguments.createMap()
    map.putBoolean("running", readerRunning.get())
    map.putInt("sampleRate", sampleRate)
    map.putDouble("framesDelivered", framesDelivered.get().toDouble())
    val now = SystemClock.elapsedRealtime()
    if (lastFrameMs > 0) {
      map.putDouble("lastFrameAgeMs", (now - lastFrameMs).toDouble())
    } else {
      map.putNull("lastFrameAgeMs")
    }
    map.putBoolean("voiceProcessingEnabled", aecAttached)
    map.putBoolean("engineRunning", record != null)
    map.putBoolean("tapInstalled", record != null)
    map.putString("aecMode", aecMode)
    promise.resolve(map)
  }

  @ReactMethod
  fun setAecFallbackGate(enabled: Boolean, threshold: Double, promise: Promise) {
    fallbackGateEnabled = enabled
    fallbackThreshold = threshold
    Log.i(TAG, "{\"event\":\"aecFallbackGate\",\"enabled\":$enabled,\"threshold\":$threshold}")
    promise.resolve(null)
  }

  @ReactMethod
  fun setPlaybackActive(active: Boolean, promise: Promise) {
    playbackActive = active
    promise.resolve(null)
  }

  @ReactMethod
  fun addListener(eventName: String) { /* no-op — required by NativeEventEmitter */ }

  @ReactMethod
  fun removeListeners(count: Int) { /* no-op */ }

  private fun startReader() {
    if (readerThread != null) return
    readerRunning.set(true)
    val t =
      Thread({
        try {
          Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
        } catch (_: Throwable) {
          // best-effort priority bump
        }

        // 20 ms chunks at the configured rate, mono int16. At 16 kHz this
        // is 640 bytes — small enough that bridge+RMS work on the JS side
        // doesn't stall, large enough that we don't context-switch every
        // sample.
        val chunkSamples = (sampleRate * 20) / 1000
        val chunkBytes = chunkSamples * 2
        val buf = ByteArray(chunkBytes)
        // P0-7: reset VAD state for this capture session
        preRollBuffer.clear()
        preRollFilled = false
        vadSpeechActive = false
        vadHangoverFramesLeft = 0

        while (readerRunning.get()) {
          val rec = record ?: break
          val read =
            try {
              rec.read(buf, 0, chunkBytes)
            } catch (e: Throwable) {
              Log.w(TAG, "read exception", e)
              break
            }
          if (read <= 0) {
            if (read == AudioRecord.ERROR_INVALID_OPERATION ||
              read == AudioRecord.ERROR_DEAD_OBJECT
            ) {
              Log.w(TAG, "reader: fatal read $read — exiting")
              break
            }
            // ERROR (-1) or zero — likely transient (record stopped); loop
            // and check readerRunning. If stopInternal called, next
            // iteration breaks out.
            continue
          }
          framesDelivered.addAndGet((read / 2).toLong())
          lastFrameMs = SystemClock.elapsedRealtime()

          // Plan §3.2 row `ready`, §6.3 row 3: fire AT MOST ONCE per
          // start() cycle on the first frame the reader actually receives.
          // JS hook uses this as the trigger for `ready → listening`.
          // The latch is set here (not gated on seqCounter) so a muted
          // start still emits the event — capture is live regardless of
          // whether the first frame's bytes go upstream.
          if (!firstFrameEmitted) {
            firstFrameEmitted = true
            val ageMs =
              if (engineStartMs > 0) (lastFrameMs - engineStartMs) else 0L
            emitEngineReady(ageMs, sampleRate)
          }

          if (muted.get()) continue

          val payload: ByteArray = if (read == buf.size) buf else buf.copyOf(read)

          // P0-8 RMS gate: when HW AEC failed and playback is active, compute
          // a cheap RMS on the raw PCM16LE bytes (every 16th sample ≈ 32 samples
          // per 20 ms chunk). Drop the chunk if it falls below fallbackThreshold
          // — it is almost certainly echo residual, not real user speech.
          if (fallbackGateEnabled && playbackActive) {
            var rmsSum = 0.0
            var rmsCount = 0
            var i = 0
            while (i + 1 < payload.size) {
              val sample = ((payload[i].toInt() and 0xFF) or (payload[i + 1].toInt() shl 8)).toShort()
              val norm = sample / 32768.0
              rmsSum += norm * norm
              rmsCount++
              i += 32 // every 16th sample (2 bytes each)
            }
            val rms = if (rmsCount > 0) Math.sqrt(rmsSum / rmsCount) else 0.0
            if (rms < fallbackThreshold) continue
          }

          val b64 = Base64.encodeToString(payload, Base64.NO_WRAP)

          // P0-7: energy + ZCR VAD on post-read 16kHz PCM16LE buffer.
          // Compute short-time energy in dBFS and zero-crossing rate.
          val sampleCount = payload.size / 2
          var energySum = 0.0
          var zeroCrossings = 0
          var prevSample = 0.0
          var si = 0
          while (si + 1 < payload.size) {
            val raw = ((payload[si].toInt() and 0xFF) or (payload[si + 1].toInt() shl 8)).toShort()
            val norm = raw / 32768.0
            energySum += norm * norm
            if (si > 0 && prevSample * norm < 0) zeroCrossings++
            prevSample = norm
            si += 2
          }
          val energyDb = if (energySum > 0) 10.0 * Math.log10(energySum / sampleCount) else -100.0
          val zcr = if (sampleCount > 1) zeroCrossings.toDouble() / (sampleCount - 1) else 0.0
          val isSpeechFrame = energyDb > vadEnergyThresholdDb && zcr >= vadZcrLow && zcr <= vadZcrHigh

          // Update pre-roll ring buffer (keep last 200ms worth of chunks).
          // Each chunk is ~20ms so we keep the last 10 chunks.
          val maxPreRollChunks = vadHangoverMs / 20
          preRollBuffer.addLast(payload.copyOf())
          while (preRollBuffer.size > maxPreRollChunks) preRollBuffer.removeFirst()
          if (!preRollFilled && preRollBuffer.size >= maxPreRollChunks) preRollFilled = true

          if (isSpeechFrame) {
            vadHangoverFramesLeft = (vadHangoverMs / 20)
            if (!vadSpeechActive) {
              vadSpeechActive = true
              val preRoll = if (preRollFilled) preRollBuffer.toList() else preRollBuffer.toList()
              emitVadStart(preRoll)
            }
          } else {
            if (vadSpeechActive) {
              if (vadHangoverFramesLeft > 0) {
                vadHangoverFramesLeft--
              } else {
                vadSpeechActive = false
                emitVadEnd(vadHangoverMs)
              }
            }
          }

          emitData(b64, seqCounter++, lastFrameMs)
        }
      }, "VoiceMicReader")
    t.isDaemon = true
    t.start()
    readerThread = t
  }

  private fun stopInternal() {
    readerRunning.set(false)
    val t = readerThread
    readerThread = null
    t?.interrupt()
    // Bound the join so a stuck reader (rare HAL freeze) can't wedge the
    // RN bridge thread on shutdown.
    try { t?.join(500) } catch (_: InterruptedException) {}

    record?.let {
      try { it.stop() } catch (_: Throwable) {}
      try { it.release() } catch (_: Throwable) {}
    }
    record = null

    aec?.let { try { it.release() } catch (_: Throwable) {} }
    ns?.let { try { it.release() } catch (_: Throwable) {} }
    agc?.let { try { it.release() } catch (_: Throwable) {} }
    aec = null
    ns = null
    agc = null
    aecAttached = false
    engineStartMs = 0
    firstFrameEmitted = false
    preRollBuffer.clear()
    preRollFilled = false
    vadSpeechActive = false
    vadHangoverFramesLeft = 0
  }

  private fun emitData(base64: String, seq: Long, timestampMs: Long) {
    val payload: WritableMap = Arguments.createMap()
    payload.putString("data", base64)
    payload.putDouble("seq", seq.toDouble())
    payload.putDouble("timestampMs", timestampMs.toDouble())
    safeEmit("voiceMicData", payload)
  }

  private fun emitEngineReady(firstFrameAgeMs: Long, sampleRate: Int) {
    val payload: WritableMap = Arguments.createMap()
    payload.putDouble("firstFrameAgeMs", firstFrameAgeMs.toDouble())
    payload.putInt("sampleRate", sampleRate)
    Log.i(
      TAG,
      "{\"event\":\"voiceMicEngineReady\",\"firstFrameAgeMs\":$firstFrameAgeMs,\"sampleRate\":$sampleRate}",
    )
    safeEmit("voiceMicEngineReady", payload)
  }

  private fun emitVadStart(preRoll: List<ByteArray>) {
    for (chunk in preRoll) {
      val b64 = android.util.Base64.encodeToString(chunk, android.util.Base64.NO_WRAP)
      val payload: WritableMap = Arguments.createMap()
      payload.putString("data", b64)
      payload.putDouble("seq", -1.0)
      payload.putDouble("timestampMs", SystemClock.elapsedRealtime().toDouble())
      safeEmit("voiceMicData", payload)
    }
    safeEmit("voiceMicVadStart", Arguments.createMap())
    Log.i(TAG, "{\"event\":\"voiceMicVadStart\",\"preRollChunks\":${preRoll.size}}")
  }

  private fun emitVadEnd(hangoverMs: Int) {
    val payload: WritableMap = Arguments.createMap()
    payload.putInt("hangoverMs", hangoverMs)
    safeEmit("voiceMicVadEnd", payload)
    Log.i(TAG, "{\"event\":\"voiceMicVadEnd\",\"hangoverMs\":$hangoverMs}")
  }

  private fun emitAecAttachFailed(reason: String, sessionId: Int) {
    val payload: WritableMap = Arguments.createMap()
    payload.putString("reason", reason)
    payload.putInt("modelCode", sessionId)
    payload.putString("deviceCode", android.os.Build.MODEL)
    Log.w(TAG, "{\"event\":\"voiceAecAttachFailed\",\"reason\":\"$reason\",\"sessionId\":$sessionId,\"device\":\"${android.os.Build.MODEL}\"}")
    safeEmit("voiceAecAttachFailed", payload)
  }

  private fun safeEmit(event: String, params: WritableMap) {
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(event, params)
    } catch (e: Throwable) {
      Log.w(TAG, "emit $event failed", e)
    }
  }

  override fun invalidate() {
    super.invalidate()
    stopInternal()
  }

  companion object {
    const val NAME = "VoiceMicModule"
    private const val TAG = "TbotVoiceMic"
  }
}
