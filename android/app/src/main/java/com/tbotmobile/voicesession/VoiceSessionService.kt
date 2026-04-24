package com.tbotmobile.voicesession

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground service that keeps a Gemini Live voice conversation alive
 * when the app is backgrounded on Android 14+ (API 34), where the
 * FOREGROUND_SERVICE_MICROPHONE permission is mandatory for AudioRecord
 * to keep delivering frames after the process drops out of the
 * perceptible importance bucket.
 *
 * Lifecycle (owned by VoiceSessionModule, sys-16):
 *   startSession() → ContextCompat.startForegroundService(this)
 *   endSession()   → stopService(this)
 *
 * Notification is intentionally neutral (no AI partner name, no transcript
 * content) to keep COPPA-safe metadata in the notification shade.
 */
class VoiceSessionService : Service() {

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
  }

  override fun onStartCommand(
    intent: Intent?,
    flags: Int,
    startId: Int,
  ): Int {
    val notification =
      NotificationCompat
        .Builder(this, CHANNEL_ID)
        .setContentTitle("Voice session active")
        .setContentText("Return to the app to continue the conversation.")
        .setSmallIcon(applicationInfo.icon)
        .setOngoing(true)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setCategory(NotificationCompat.CATEGORY_CALL)
        .setShowWhen(false)
        .build()

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        // API 29+ allows and API 34+ REQUIRES the foregroundServiceType
        // argument. FG type must match the manifest declaration.
        startForeground(
          NOTIFICATION_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
        )
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
      Log.i(TAG, "{\"event\":\"fg_service_started\",\"sdk\":${Build.VERSION.SDK_INT}}")
    } catch (e: Throwable) {
      // BackgroundServiceStartNotAllowedException on API 31+ when the app
      // was not in a permitted state at call time. Session still proceeds
      // without the FG boost for this lifetime — logged so Sentry can
      // flag the rate.
      Log.w(
        TAG,
        "{\"event\":\"fg_service_start_failed\",\"err\":\"${e.javaClass.simpleName}\",\"msg\":\"${e.message ?: "unknown"}\"}",
        e,
      )
    }

    return START_NOT_STICKY
  }

  override fun onDestroy() {
    Log.i(TAG, "{\"event\":\"fg_service_stopped\"}")
    super.onDestroy()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel =
      NotificationChannel(
        CHANNEL_ID,
        "Voice session",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "Keeps realtime voice conversations alive while the app is in the background."
        setShowBadge(false)
        enableLights(false)
        enableVibration(false)
      }
    nm.createNotificationChannel(channel)
  }

  companion object {
    private const val TAG = "TbotVoiceService"
    private const val CHANNEL_ID = "tbot.voice.session"
    private const val NOTIFICATION_ID = 2601
  }
}
