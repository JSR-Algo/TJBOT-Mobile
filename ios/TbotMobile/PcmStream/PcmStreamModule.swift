//
//  PcmStreamModule.swift
//  TbotMobile — sys-16 Gemini Live realtime voice PCM playback.
//
//  iOS counterpart to android/.../pcmstream/PcmStreamModule.kt. Mirrors its
//  public surface so `src/audio/PcmStreamPlayer.ts` works on iOS without
//  any platform-specific branching — plan AC-10 ("no JS contract break").
//
//  Bridge surface (must match Android .kt byte-for-byte):
//    init(rate: Int) -> Promise<Void>
//    feed(base64: String) -> Promise<Int>       // returns byte count
//    pause() / resume() -> Promise<Void>
//    clear() -> Promise<Void>                    // barge-in
//    close() -> Promise<Void>
//    playbackPosition() -> Promise<Double>       // FRAMES at input rate (24kHz)
//
//  Events (for observability wired in src/observability/voice-telemetry.ts):
//    voicePlaybackStalled  { bufferedMs, framesSinceLastAdvance }
//
//  Architecture:
//    - Uses SharedVoiceEngine.attachPlayerNode() — the engine is shared
//      with VoiceMicModule when both are active (sys-16 single-engine rule,
//      plan §5 MB-NATIVE-VOICE-004 line 211).
//    - Playback rate is LOCKED at 24kHz mono Int16 LE — Gemini Live always
//      emits this format. Attempting a different rate at init() is a soft
//      error (log + resolve); we still configure 24k.
//    - scheduleBuffer completion callbacks advance `playedFrames`, the
//      single source of truth for playbackPosition() (matches Android's
//      AudioTrack.getPlaybackHeadPosition semantics — frames that have
//      *actually played*, not frames that have been fed).
//    - Serial DispatchQueue owns all state mutation; scheduleBuffer
//      completions fire on AVAudio internal threads and must hop back.
//    - Barge-in (`clear()`) calls playerNode.stop() → drops every scheduled
//      buffer in <10ms per Apple docs. Then node.play(at: nil) restarts
//      immediately ready for fresh feed() calls.
//

import AVFoundation
import Foundation
import React
import os.log

@objc(PcmStreamModule)
final class PcmStreamModule: RCTEventEmitter {

  // MARK: - Constants

  private enum Config {
    static let inputSampleRate: Double = 24_000
    static let channels: AVAudioChannelCount = 1
    static let stallThresholdMs: Int = 2_000
    static let stallPollIntervalMs: Int = 500
    // B4 (2026-04-24): hold AVAudioPlayerNode playback until this many ms
    // of audio have been scheduled, so tight network jitter does not tear
    // an audible gap into the first AI response. Override via UserDefaults
    // key `voicePlaybackJitterBufferMs` for device-specific tuning. Set 0
    // to disable (pre-B4 behavior: play() fires on the first feed()).
    // Target: AC 2.4 — inter-chunk playback gap < 10 ms under jitter.
    static let jitterBufferDefaultMs: Int = 50
    static let jitterBufferKey: String = "voicePlaybackJitterBufferMs"
    static let jitterBufferMaxMs: Int = 200
  }

  private enum Event {
    static let playbackStalled = "voicePlaybackStalled"
    static let playbackDrained = "voicePlaybackDrained"
  }

  private enum ErrorCode {
    static let notInitialized = "E_PCM_NOT_INIT"
    static let initFailed = "E_PCM_INIT"
    static let feedFailed = "E_PCM_FEED"
    static let controlFailed = "E_PCM_CONTROL"
  }

  // MARK: - State (serial queue guarded)

  private let stateQueue = DispatchQueue(label: "com.tbot.pcmstream.state")
  private var playerNode: AVAudioPlayerNode?
  private var format: AVAudioFormat?

  /// Cumulative frames fed via feed(); input-rate (24kHz).
  private var fedFrames: UInt64 = 0

  /// Cumulative frames that have completed playback; input-rate (24kHz).
  /// Advanced only from scheduleBuffer completion handlers. Authoritative
  /// for playbackPosition().
  private var playedFrames: UInt64 = 0

  /// Frames currently scheduled but not yet played.
  /// Reported as bufferedMs in the voicePlaybackStalled event. Guarded
  /// against UInt64 underflow: after `clear()` zeros both counters, a late
  /// `.dataPlayedBack` callback that Apple hasn't cancelled can still
  /// increment `playedFrames` past `fedFrames`. The saturated subtraction
  /// keeps diagnostics sane in that window.
  private var inflightFrames: UInt64 {
    fedFrames > playedFrames ? fedFrames - playedFrames : 0
  }

  private var turnOpen = false
  private var lastAdvanceCheckPlayedFrames: UInt64 = 0
  private var stallNoAdvanceTicks = 0
  private var stallTimer: DispatchSourceTimer?

  /// B4 jitter-buffer threshold resolved once at init() from UserDefaults.
  /// Playback on the AVAudioPlayerNode is deferred until `fedFrames` crosses
  /// this value for the current turn. endTurn() flushes early for replies
  /// shorter than the threshold; clear() resets for the next turn.
  private var jitterBufferFrames: UInt64 = 0
  private var playbackStarted = false

  /// Monotonically increasing. Incremented on clear() and on each endTurn()
  /// dispatch. Sentinel completion captures the generation at scheduling time
  /// and emits voicePlaybackDrained only if still current.
  private var turnGeneration: UInt64 = 0

  private var hasListeners = false
  private let log = OSLog(subsystem: "com.tbot.voice", category: "PcmStream")

  // MARK: - RCTEventEmitter overrides

  override init() {
    super.init()
  }

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! {
    return [Event.playbackStalled, Event.playbackDrained]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  override func invalidate() {
    // Called when the bridge is torn down (e.g. reload or app termination).
    // Best-effort cleanup — matches Android's `invalidate() -> releaseInternal()`.
    // Use async (not sync) to avoid a latent deadlock trap if any stateQueue
    // block ever comes to depend on the caller's queue. The module is marked
    // for teardown regardless — waiting gains nothing.
    stateQueue.async { [weak self] in self?.closeInternal() }
    super.invalidate()
  }

  // MARK: - Bridge methods

  @objc(initWithRate:resolver:rejecter:)
  func initialize(
    _ rate: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let requestedRate = rate.doubleValue
    stateQueue.async { [weak self] in
      guard let self = self else { return }
      do {
        // Close any prior instance first — matches Android's idempotent init.
        self.closeInternal()

        // Player node connects to mainMixer using Float32 — AVAudioEngine's
        // mainMixer requires float input and will NSException (crash) if
        // handed Int16. Feed() converts incoming Int16 LE bytes to Float32
        // [-1, 1] before scheduleBuffer.
        guard let fmt = AVAudioFormat(
          commonFormat: .pcmFormatFloat32,
          sampleRate: Config.inputSampleRate,
          channels: Config.channels,
          interleaved: false
        ) else {
          reject(ErrorCode.initFailed, "failed to create 24kHz Float32 mono format", nil)
          return
        }

        if requestedRate != Config.inputSampleRate {
          os_log(
            "init requested rate=%{public}f — clamping to 24000 (Gemini Live protocol)",
            log: self.log, type: .info, requestedRate
          )
        }

        // Match whatever voiceProcessing state the engine was started with
        // (usually by VoiceMicModule). Player-only sessions — where mic is
        // still on RNLAS because MB-NATIVE-VOICE-003 hasn't rolled out yet —
        // start the engine fresh with voiceProcessing=false.
        let vpCurrent = SharedVoiceEngine.shared.isVoiceProcessingEnabled()
        do {
          try SharedVoiceEngine.shared.ensureStarted(voiceProcessing: vpCurrent)
        } catch SharedVoiceEngineError.voiceProcessingTogglePostStart {
          // Mid-session mode flip would be a programmer error; surface it.
          reject(ErrorCode.initFailed, "voiceProcessing flip mid-session", nil)
          return
        }
        let node = SharedVoiceEngine.shared.attachPlayerNode(bufferFormat: fmt)
        // Defer node.play() to first feed() — on iOS calling play() before
        // any scheduled buffer can leave the node in a state where
        // subsequent scheduleBuffer() calls don't produce audio output.

        // B4: resolve jitter-buffer threshold once per session. Defaults
        // to 50 ms, clamped to [0, 200] ms. A setting of 0 restores
        // pre-B4 behavior (play() on first feed()).
        let configuredMs = (UserDefaults.standard.object(forKey: Config.jitterBufferKey) as? Int)
          ?? Config.jitterBufferDefaultMs
        let safeMs = max(0, min(configuredMs, Config.jitterBufferMaxMs))
        self.jitterBufferFrames = UInt64((Double(safeMs) / 1000.0) * Config.inputSampleRate)
        self.playbackStarted = false

        self.playerNode = node
        self.format = fmt
        self.fedFrames = 0
        self.playedFrames = 0
        self.lastAdvanceCheckPlayedFrames = 0
        self.turnOpen = true

        self.armStallTimer()
        os_log(
          "jitter buffer configured: %{public}d ms (%{public}llu frames)",
          log: self.log, type: .info,
          safeMs, self.jitterBufferFrames
        )

        os_log(
          "init ok rate=%{public}d channels=%{public}d",
          log: self.log, type: .info,
          Int(Config.inputSampleRate), Int(Config.channels)
        )
        resolve(nil)
      } catch {
        os_log(
          "init failed: %{public}@",
          log: self.log, type: .error, String(describing: error)
        )
        reject(ErrorCode.initFailed, "init failed: \(error)", error)
      }
    }
  }

  @objc(feed:resolver:rejecter:)
  func feed(
    _ base64: NSString,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let b64 = base64 as String
    stateQueue.async { [weak self] in
      guard let self = self else { return }
      guard let node = self.playerNode, let fmt = self.format else {
        reject(ErrorCode.notInitialized, "feed before init", nil)
        return
      }

      guard let data = Data(base64Encoded: b64) else {
        reject(ErrorCode.feedFailed, "invalid base64", nil)
        return
      }
      if data.isEmpty {
        resolve(0)
        return
      }

      // Input from Gemini is PCM16LE at 24 kHz. Convert to Float32 [-1, 1]
      // because the player node's output format is Float32 (AVAudioEngine
      // mainMixer's requirement).
      let inputBytesPerFrame = 2  // Int16 mono
      let frameCount = AVAudioFrameCount(data.count / inputBytesPerFrame)
      guard frameCount > 0 else {
        resolve(0)
        return
      }

      guard let buffer = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: frameCount) else {
        reject(ErrorCode.feedFailed, "failed to allocate PCM buffer", nil)
        return
      }
      buffer.frameLength = frameCount

      guard let dst = buffer.floatChannelData?[0] else {
        reject(ErrorCode.feedFailed, "missing Float32 channel data", nil)
        return
      }

      // Int16 → Float32 conversion. 1.0/32768.0 normalises int16 range to
      // [-1, 1). Simple loop; the compiler vectorises this on arm64 NEON.
      let scale: Float = 1.0 / 32768.0
      data.withUnsafeBytes { rawBuf in
        guard let src = rawBuf.bindMemory(to: Int16.self).baseAddress else { return }
        for i in 0..<Int(frameCount) {
          dst[i] = Float(src[i]) * scale
        }
      }

      self.fedFrames += UInt64(frameCount)
      let frameLen = UInt64(frameCount)

      // Schedule FIRST. scheduleBuffer on a not-yet-playing node queues the
      // data; then play() starts consuming the queue. If we call play()
      // before any buffer is scheduled, iOS sometimes leaves the node in a
      // stuck state where subsequent schedules produce no audio.
      node.scheduleBuffer(
        buffer,
        completionCallbackType: .dataPlayedBack
      ) { [weak self] _ in
        self?.stateQueue.async {
          guard let self = self else { return }
          self.playedFrames += frameLen
        }
      }

      // B4: defer play() until we've queued `jitterBufferFrames` worth of
      // data. This creates a small pre-buffer (default 50 ms) that absorbs
      // network jitter between Gemini chunks without audible gaps. Once
      // started, the AVAudioPlayerNode's internal queue continues to act
      // as the ongoing jitter buffer while new feeds arrive. endTurn()
      // flushes early for replies shorter than the threshold.
      if !self.playbackStarted && self.fedFrames >= self.jitterBufferFrames {
        self.playbackStarted = true
        if !node.isPlaying {
          node.play()
        }
      }

      resolve(data.count)
    }
  }

  @objc(pause:rejecter:)
  func pause(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      self?.playerNode?.pause()
      resolve(nil)
    }
  }

  @objc(resume:rejecter:)
  func resume(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      self?.playerNode?.play()
      resolve(nil)
    }
  }

  @objc(clear:rejecter:)
  func clear(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // Barge-in: stop drops every scheduled buffer in <10ms per Apple docs.
    // Then play(at: nil) restarts immediately ready for fresh feed().
    stateQueue.async { [weak self] in
      guard let self = self else { return }
      guard let node = self.playerNode else {
        resolve(nil)
        return
      }
      node.stop()
      node.reset()
      self.fedFrames = 0
      self.playedFrames = 0
      self.lastAdvanceCheckPlayedFrames = 0
      self.turnGeneration &+= 1
      // B4: reset the jitter-buffer gate so the next turn re-prebuffers.
      self.playbackStarted = false
      node.play(at: nil)
      os_log("clear (barge-in) ok", log: self.log, type: .info)
      resolve(nil)
    }
  }

  @objc(close:rejecter:)
  func close(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      self?.closeInternal()
      resolve(nil)
    }
  }

  @objc(endTurn:rejecter:)
  func endTurn(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      guard let self = self else { resolve(nil); return }

      // Bump generation BEFORE any branch so JS-side generation (incremented
      // on every endTurn() call) always matches the value emitted back.
      // Without this, the not-initialized path would emit the pre-bump
      // generation while JS has already moved on, triggering the safety-net
      // warn spuriously.
      self.turnGeneration &+= 1
      let generation = self.turnGeneration

      guard let node = self.playerNode, let fmt = self.format else {
        // Not initialized → nothing to drain; emit immediately for JS simplicity.
        self.emitDrained(generation: generation, reason: "not-initialized")
        resolve(nil)
        return
      }

      let sentinelFrames: AVAudioFrameCount = 512  // 21.3 ms @ 24 kHz
      guard let sentinel = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: sentinelFrames) else {
        self.emitDrained(generation: generation, reason: "sentinel-alloc-failed")
        resolve(nil)
        return
      }
      sentinel.frameLength = sentinelFrames
      // PCMBuffer zero-init: Float32 channel is already zeroed by Swift on alloc.

      node.scheduleBuffer(sentinel, completionCallbackType: .dataPlayedBack) { [weak self] _ in
        self?.stateQueue.async {
          guard let self = self else { return }
          guard self.turnGeneration == generation else {
            // Barge-in or next endTurn() superseded; drop silently.
            return
          }
          self.emitDrained(generation: generation, reason: "sentinel")
        }
      }

      // B4: if the reply was shorter than `jitterBufferFrames`, playback
      // has never started. Flush now so the sentinel + queued data actually
      // render — otherwise the drain callback fires only when playback
      // catches up, and we'd block a short utterance forever.
      if !self.playbackStarted {
        self.playbackStarted = true
      }
      if !node.isPlaying { node.play() }
      resolve(nil)
    }
  }

  @objc(playbackPosition:rejecter:)
  func playbackPosition(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      guard let self = self else {
        resolve(0.0)
        return
      }
      // Return frames at input rate (24kHz), matching Android and the
      // JS drain logic at src/audio/PcmStreamPlayer.ts:209-232.
      resolve(Double(self.playedFrames))
    }
  }

  // NativeEventEmitter requires these methods to exist, but listener
  // accounting still has to flow through RCTEventEmitter so
  // startObserving()/stopObserving() flip `hasListeners` correctly.
  @objc override func addListener(_ eventName: String) {
    super.addListener(eventName)
  }
  @objc override func removeListeners(_ count: Double) {
    super.removeListeners(count)
  }

  // MARK: - Internals (must be called on stateQueue)

  private func closeInternal() {
    // Tear down stall timer first so the timer callback doesn't race.
    stallTimer?.cancel()
    stallTimer = nil

    if let node = playerNode {
      node.stop()
      SharedVoiceEngine.shared.detachPlayerNode(node)
      playerNode = nil
    }
    format = nil
    fedFrames = 0
    playedFrames = 0
    lastAdvanceCheckPlayedFrames = 0
    turnOpen = false
    playbackStarted = false
    jitterBufferFrames = 0

    os_log("close ok", log: log, type: .info)
  }

  private func armStallTimer() {
    stallTimer?.cancel()
    let timer = DispatchSource.makeTimerSource(queue: stateQueue)
    timer.schedule(
      deadline: .now() + .milliseconds(Config.stallPollIntervalMs),
      repeating: .milliseconds(Config.stallPollIntervalMs)
    )
    timer.setEventHandler { [weak self] in self?.checkForStall() }
    timer.resume()
    stallTimer = timer
  }

  /// Fire `voicePlaybackStalled` if the turn is open, we have scheduled
  /// audio pending, and playedFrames hasn't advanced for stallThresholdMs.
  /// Timer runs every `stallPollIntervalMs`; stall fires when the counter
  /// crosses `stallThresholdMs / stallPollIntervalMs` consecutive ticks
  /// without advancement. Counter resets on advance OR when no audio is
  /// in flight, so pauses between turns don't false-fire.
  private func checkForStall() {
    guard turnOpen, inflightFrames > 0 else {
      lastAdvanceCheckPlayedFrames = playedFrames
      stallNoAdvanceTicks = 0
      return
    }

    if playedFrames > lastAdvanceCheckPlayedFrames {
      lastAdvanceCheckPlayedFrames = playedFrames
      stallNoAdvanceTicks = 0
      return
    }

    stallNoAdvanceTicks += 1
    let ticksNeeded = Config.stallThresholdMs / Config.stallPollIntervalMs
    if stallNoAdvanceTicks >= ticksNeeded {
      stallNoAdvanceTicks = 0
      emitStalled()
    }
  }

  private func emitStalled() {
    let inflight = inflightFrames
    let bufferedMs = Double(inflight) / Config.inputSampleRate * 1000.0
    let framesSinceLastAdvance = inflight

    os_log(
      "stalled bufferedMs=%{public}f framesSinceLastAdvance=%{public}llu",
      log: log, type: .default,
      bufferedMs, framesSinceLastAdvance
    )

    if hasListeners {
      sendEvent(
        withName: Event.playbackStalled,
        body: [
          "bufferedMs": bufferedMs,
          "framesSinceLastAdvance": framesSinceLastAdvance,
        ]
      )
    }
  }

  private func emitDrained(generation: UInt64, reason: String) {
    os_log(
      "drained generation=%{public}llu reason=%{public}@ played=%{public}llu scheduled=%{public}llu",
      log: log, type: .info,
      generation, reason, playedFrames, fedFrames
    )
    if hasListeners {
      sendEvent(
        withName: Event.playbackDrained,
        body: [
          "turnGeneration": generation,
          "framesPlayed": playedFrames,
          "framesScheduled": fedFrames,
          "reason": reason,
        ]
      )
    }
  }
}
