package com.tbotmobile.pcmstream

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.atomic.AtomicLong

/**
 * Streams raw PCM16 chunks straight into an Android AudioTrack in MODE_STREAM.
 *
 * The expo-audio-based AudioPlaybackService used one createAudioPlayer per WAV
 * segment, so every segment boundary clicked on MIUI + SD 7-series. AudioTrack
 * in MODE_STREAM maintains one continuous buffer across writes, which is what
 * the Gemini Live WS stream actually wants.
 *
 * Routing: USAGE_MEDIA + CONTENT_TYPE_SPEECH keeps the output on the media
 * profile (48 kHz speaker DAC) even while the mic is recording, so we never
 * fall back to the phone-call earpiece profile.
 */
class PcmStreamModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  private var track: AudioTrack? = null
  private var sampleRate: Int = 24_000
  private val fedBytes = AtomicLong(0)

  @ReactMethod
  fun init(
    rate: Int,
    promise: Promise,
  ) {
    try {
      releaseInternal()

      sampleRate = if (rate > 0) rate else 24_000
      val channelMask = AudioFormat.CHANNEL_OUT_MONO
      val encoding = AudioFormat.ENCODING_PCM_16BIT
      val minBuffer = AudioTrack.getMinBufferSize(sampleRate, channelMask, encoding)
      if (minBuffer <= 0) {
        promise.reject("E_BUFFER", "Invalid minBufferSize: $minBuffer")
        return
      }
      // 4× minBuffer (~120-160 ms) gives enough headroom that a single
      // WRITE_BLOCKING call never stalls the bridge for more than a few ms.
      val bufferSize = minBuffer * 4

      val attrs =
        AudioAttributes
          .Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build()
      val format =
        AudioFormat
          .Builder()
          .setSampleRate(sampleRate)
          .setEncoding(encoding)
          .setChannelMask(channelMask)
          .build()

      val t =
        AudioTrack
          .Builder()
          .setAudioAttributes(attrs)
          .setAudioFormat(format)
          .setBufferSizeInBytes(bufferSize)
          .setTransferMode(AudioTrack.MODE_STREAM)
          .setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
          .build()

      if (t.state != AudioTrack.STATE_INITIALIZED) {
        t.release()
        promise.reject("E_INIT", "AudioTrack not initialized (state=${t.state})")
        return
      }

      t.play()
      track = t
      fedBytes.set(0)
      Log.i(TAG, "init ok sr=$sampleRate bufferBytes=$bufferSize")
      promise.resolve(null)
    } catch (e: Throwable) {
      Log.e(TAG, "init failed", e)
      promise.reject("E_INIT", e.message, e)
    }
  }

  @ReactMethod
  fun feed(
    base64: String,
    promise: Promise,
  ) {
    val t = track
    if (t == null) {
      promise.reject("E_NO_TRACK", "feed called before init")
      return
    }
    try {
      val bytes = Base64.decode(base64, Base64.DEFAULT)
      if (bytes.isEmpty()) {
        promise.resolve(0)
        return
      }
      // WRITE_BLOCKING guarantees every sample from Gemini ends up in the
      // AudioTrack buffer — NON_BLOCKING would silently drop the tail of the
      // chunk when the 120 ms ring fills up, and that's what made the AI's
      // speech sound cut off mid-sentence.
      val written = t.write(bytes, 0, bytes.size, AudioTrack.WRITE_BLOCKING)
      if (written < 0) {
        Log.w(TAG, "write returned $written (error)")
        promise.reject("E_WRITE", "AudioTrack.write returned $written")
        return
      }
      fedBytes.addAndGet(written.toLong())
      promise.resolve(written)
    } catch (e: Throwable) {
      Log.e(TAG, "feed failed", e)
      promise.reject("E_FEED", e.message, e)
    }
  }

  @ReactMethod
  fun pause(promise: Promise) {
    try {
      track?.pause()
      promise.resolve(null)
    } catch (e: Throwable) {
      promise.reject("E_PAUSE", e.message, e)
    }
  }

  @ReactMethod
  fun resume(promise: Promise) {
    try {
      track?.play()
      promise.resolve(null)
    } catch (e: Throwable) {
      promise.reject("E_RESUME", e.message, e)
    }
  }

  @ReactMethod
  fun clear(promise: Promise) {
    val t = track
    if (t == null) {
      promise.resolve(null)
      return
    }
    try {
      // pause + flush drops queued samples for barge-in; play() after so the
      // next feed() starts streaming again without a re-init.
      t.pause()
      t.flush()
      t.play()
      fedBytes.set(0)
      promise.resolve(null)
    } catch (e: Throwable) {
      promise.reject("E_CLEAR", e.message, e)
    }
  }

  @ReactMethod
  fun close(promise: Promise) {
    try {
      releaseInternal()
      promise.resolve(null)
    } catch (e: Throwable) {
      promise.reject("E_CLOSE", e.message, e)
    }
  }

  /**
   * Returns the number of PCM frames already played (not just queued) since
   * the last init/clear. JS uses this to decide when a turn has finished
   * draining from the buffer before firing onPlaybackFinish.
   */
  @ReactMethod
  fun playbackPosition(promise: Promise) {
    val t = track
    if (t == null) {
      promise.resolve(0.0)
      return
    }
    try {
      // getPlaybackHeadPosition wraps at 2^32 frames (~2 days at 24 kHz), safe
      // to cast to double for JS consumption.
      val pos = t.playbackHeadPosition.toLong() and 0xFFFFFFFFL
      promise.resolve(pos.toDouble())
    } catch (e: Throwable) {
      promise.reject("E_POS", e.message, e)
    }
  }

  private fun releaseInternal() {
    val t = track ?: return
    try {
      t.pause()
      t.flush()
      t.stop()
    } catch (_: Throwable) {
      // ignore — best effort tear-down
    }
    try {
      t.release()
    } catch (_: Throwable) {
      // ignore
    }
    track = null
  }

  override fun invalidate() {
    super.invalidate()
    releaseInternal()
  }

  companion object {
    const val NAME = "PcmStreamModule"
    private const val TAG = "PcmStream"
  }
}
