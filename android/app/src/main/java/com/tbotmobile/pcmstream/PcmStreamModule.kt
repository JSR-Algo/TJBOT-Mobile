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
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.BlockingQueue
import java.util.concurrent.TimeUnit
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

  // QA harness: non-null when EXPO_PUBLIC_VOICE_TEST_HARNESS=true.
  // Accessed only from the writer thread; no extra synchronization needed.
  private var qaWriter: QaWavWriter? = null

  // Defense-in-depth responseId gate (plan v2 §4.3 + §5.3). Primary defense
  // is JS bargeInWindowOpen drop (§3.1.1); this catches chunks still in the
  // bridge pipeline after a barge-in. @Volatile so the writer thread sees
  // updates from the RN bridge thread without a lock.
  @Volatile
  private var currentResponseId: String? = null
  private var rejectedChunkCounter = 0

  // Dedicated writer drains this queue into AudioTrack.write(WRITE_BLOCKING).
  // Decouples WebSocket/bridge jitter from the audio HAL clock: feed() never
  // blocks the RN native-module thread, so a brief JS/WS stall can't ripple
  // into the speaker. 64 slots ≈ 1.3 s of 20 ms chunks at 24 kHz — comfortable
  // headroom. If the queue ever saturates we drop the oldest chunk rather than
  // stall the bridge (stutter is worse than a sub-20 ms gap).
  private val writeQueue: BlockingQueue<ByteArray> = ArrayBlockingQueue(64)

  @Volatile
  private var writerRunning = false
  private var writerThread: Thread? = null

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
      startWriter()
      Log.i(TAG, "init ok sr=$sampleRate bufferBytes=$bufferSize")
      promise.resolve(null)
    } catch (e: Throwable) {
      Log.e(TAG, "init failed", e)
      promise.reject("E_INIT", e.message, e)
    }
  }

  @ReactMethod
  fun startResponse(
    rid: String,
    promise: Promise,
  ) {
    currentResponseId = rid.ifEmpty { null }
    rejectedChunkCounter = 0
    // QA harness: close prior writer and open a new one per responseId.
    qaWriter?.close()
    qaWriter = if (rid.isNotEmpty() && System.getenv("EXPO_PUBLIC_VOICE_TEST_HARNESS") == "true")
      QaWavWriter(reactApplicationContext, rid, sampleRate) else null
    Log.i(TAG, "startResponse rid=$rid")
    promise.resolve(null)
  }

  @ReactMethod
  fun feed(
    base64: String,
    responseId: String,
    promise: Promise,
  ) {
    val t = track
    if (t == null) {
      promise.reject("E_NO_TRACK", "feed called before init")
      return
    }
    // Defense-in-depth responseId gate. Sampled 1-in-10 for the log metric.
    val cur = currentResponseId
    if (responseId.isNotEmpty() && cur != null && responseId != cur) {
      rejectedChunkCounter++
      if (rejectedChunkCounter % 10 == 1) {
        Log.w(TAG, "feed rejected stale rid=$responseId current=$cur (voicePlaybackQueueRejected)")
      }
      promise.resolve(0)
      return
    }
    try {
      val bytes = Base64.decode(base64, Base64.DEFAULT)
      if (bytes.isEmpty()) {
        promise.resolve(0)
        return
      }
      // Non-blocking handoff to the writer thread. The bridge never waits on
      // AudioTrack.write; a WebSocket burst or brief HAL stall stays isolated
      // from JS. Drop-oldest on saturation keeps the stream live — a stale
      // chunk from 1 s ago is worse than a <20 ms gap.
      if (!writeQueue.offer(bytes)) {
        writeQueue.poll()
        writeQueue.offer(bytes)
        Log.w(TAG, "write queue saturated — dropped oldest chunk")
      }
      fedBytes.addAndGet(bytes.size.toLong())
      // P0-8: signal VoiceMicModule that audio is streaming to the speaker.
      notifyPlaybackActive(true)
      promise.resolve(bytes.size)
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
      // Barge-in path: drop pending bytes from BOTH layers before resuming.
      // Skipping the writer-queue clear would let stale chunks continue to
      // trickle into the HAL after the user interrupts.
      writeQueue.clear()
      t.pause()
      t.flush()
      t.play()
      fedBytes.set(0)
      // P0-6: clear responseId gate on barge-in.
      currentResponseId = null
      rejectedChunkCounter = 0
      // QA harness: close WAV on barge-in.
      qaWriter?.close()
      qaWriter = null
      // P0-8: signal VoiceMicModule that playback has been flushed (barge-in).
      notifyPlaybackActive(false)
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

  private fun startWriter() {
    if (writerThread != null) return
    writerRunning = true
    val t =
      Thread({
        try {
          android.os.Process.setThreadPriority(
            android.os.Process.THREAD_PRIORITY_URGENT_AUDIO,
          )
        } catch (_: Throwable) {
          // priority bump is best-effort — URGENT_AUDIO is rejected on some OEM
          // kernels; the writer still runs correctly at the default priority.
        }
        while (writerRunning) {
          val chunk =
            try {
              writeQueue.poll(50, TimeUnit.MILLISECONDS)
            } catch (_: InterruptedException) {
              if (!writerRunning) break else continue
            } ?: continue
          val audio = track ?: continue
          try {
            val written = audio.write(chunk, 0, chunk.size, AudioTrack.WRITE_BLOCKING)
            if (written < 0) {
              Log.w(TAG, "writer: write returned $written (HAL error)")
            }
            // QA harness: mirror bytes to WAV file.
            qaWriter?.write(chunk)
          } catch (e: Throwable) {
            Log.w(TAG, "writer exception", e)
          }
        }
      }, "PcmStreamWriter")
    t.isDaemon = true
    t.start()
    writerThread = t
  }

  private fun stopWriter() {
    writerRunning = false
    writerThread?.interrupt()
    writerThread = null
    writeQueue.clear()
  }

  private fun releaseInternal() {
    stopWriter()
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
    currentResponseId = null
    rejectedChunkCounter = 0
    qaWriter?.close()
    qaWriter = null
  }

  override fun invalidate() {
    super.invalidate()
    releaseInternal()
  }

  /**
   * P0-8: Notify VoiceMicModule that playback is active/inactive so the
   * native RMS fallback gate knows when to apply. Uses the module registry
   * on the same ReactApplicationContext — no static fields.
   */
  private fun notifyPlaybackActive(active: Boolean) {
    try {
      val mic = reactApplicationContext
        .getNativeModule(com.tbotmobile.voicemic.VoiceMicModule::class.java)
      mic?.playbackActive = active
    } catch (_: Throwable) {
      // Non-fatal: VoiceMicModule may not be registered yet (first launch).
    }
  }

  /**
   * QA-only WAV writer. Only instantiated when EXPO_PUBLIC_VOICE_TEST_HARNESS=true.
   * Accessed from the writer thread only — no synchronization needed.
   * Writes PCM16LE mono WAV to filesDir/voice-test-output/<responseId>.wav.
   */
  private class QaWavWriter(
    ctx: ReactApplicationContext,
    responseId: String,
    private val sampleRate: Int,
  ) {
    private val file: File
    private val fos: FileOutputStream
    private var pcmByteCount = 0

    init {
      val dir = File(ctx.filesDir, "voice-test-output").also { it.mkdirs() }
      val safe = responseId.replace('/', '_').replace(':', '_')
      file = File(dir, "$safe.wav")
      fos = FileOutputStream(file)
      fos.write(ByteArray(44)) // placeholder header; patched in close()
    }

    fun write(pcm16leBytes: ByteArray) {
      fos.write(pcm16leBytes)
      pcmByteCount += pcm16leBytes.size
    }

    fun close() {
      val dataLen = pcmByteCount
      val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN).apply {
        put("RIFF".toByteArray())
        putInt(36 + dataLen)
        put("WAVE".toByteArray())
        put("fmt ".toByteArray())
        putInt(16)
        putShort(1)                  // PCM
        putShort(1)                  // mono
        putInt(sampleRate)
        putInt(sampleRate * 2)       // byte rate (mono 16-bit)
        putShort(2)                  // block align
        putShort(16)                 // bits/sample
        put("data".toByteArray())
        putInt(dataLen)
      }.array()
      fos.flush()
      fos.close()
      try {
        RandomAccessFile(file, "rw").use { raf ->
          raf.seek(0)
          raf.write(header)
        }
      } catch (_: Throwable) { /* best effort */ }
    }
  }

  companion object {
    const val NAME = "PcmStreamModule"
    private const val TAG = "PcmStream"
  }
}
