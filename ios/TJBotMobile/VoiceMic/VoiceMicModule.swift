//
//  VoiceMicModule.swift
//  TJBotMobile — sys-16 Gemini Live realtime voice mic capture.
//
//  iOS counterpart to src/native/VoiceMic.ts (JS shim). Uses AVAudioEngine
//  inputNode with `setVoiceProcessingEnabled(true)` — Apple's HW AEC path.
//  When AEC is unavailable or undesired (per-device allowlist), falls back
//  to plain inputNode capture without voiceProcessingIO.
//
//  Bridge surface (matches src/native/VoiceMic.ts:NativeVoiceMic interface):
//    start(opts: { sampleRate, channels, bitsPerSample, aec? }) -> Promise<Void>
//    stop() -> Promise<Void>
//    mute(muted: Bool) -> Promise<Void>
//    getDiagnostics() -> Promise<Object>
//
//  Events (matches src/native/voice-session-events.ts):
//    voiceMicData      { data: String, seq: Number, timestampMs: Number }
//    voiceMicStalled   { lastFrameAgeMs: Number, fatal: Bool }
//
//  Architecture:
//    - All engine mutation goes through SharedVoiceEngine (single owner).
//    - tap callback → serial queue → resample to 16kHz mono Int16 LE →
//      base64 → sendEvent. The RN bridge happily marshals base64 strings
//      across at ~50Hz for 20ms chunks.
//    - Stall watchdog: every 500ms we check if frames have been delivered
//      recently; 2 consecutive "no advance" intervals = voiceMicStalled.
//

import AVFoundation
import Foundation
import React
import os.log

enum VoicePlaybackActivity {
  private static let playbackTailMs = 1200
  private static let queue = DispatchQueue(label: "com.TJBot.voice.playback-activity")
  private static var active = false
  private static var tailUntil: Date?

  static func setActive(_ value: Bool) {
    queue.sync {
      if value {
        active = true
        tailUntil = nil
      } else {
        active = false
        tailUntil = Date().addingTimeInterval(Double(playbackTailMs) / 1000.0)
      }
    }
  }

  static var isActive: Bool {
    queue.sync {
      if active { return true }
      if let until = tailUntil {
        if until > Date() { return true }
        tailUntil = nil
      }
      return false
    }
  }
}

@objc(VoiceMicModule)
final class VoiceMicModule: RCTEventEmitter {

  // MARK: - Constants

  private enum Config {
    /// Gemini Live input format (Google Live API spec).
    static let targetSampleRate: Double = 16_000
    static let targetChannels: AVAudioChannelCount = 1
    static let stallThresholdMs: Int = 2_000
    static let stallPollIntervalMs: Int = 500
    /// Tap buffer size — AVAudioEngine default ≈ 4400 frames at 44.1kHz
    /// (~100ms). We ask for 1024 to keep each emit close to 20-30ms at
    /// typical iOS input rates.
    static let tapBufferFrames: AVAudioFrameCount = 1024
  }

  private enum Event {
    static let data = "voiceMicData"
    static let stalled = "voiceMicStalled"
    static let aecAttachFailed = "voiceAecAttachFailed"
    /// Fires AT MOST ONCE per `start()` cycle on the first frame the tap
    /// actually delivers. JS hook uses this as the trigger for the FSM
    /// `ready → listening` transition (plan §3.2 row `ready`, §6.3 row 3).
    static let engineReady = "voiceMicEngineReady"
  }

  private enum ErrorCode {
    static let startFailed = "E_MIC_START"
    static let stopFailed = "E_MIC_STOP"
    static let invalidArgs = "E_MIC_ARGS"
  }

  /// Devices where voiceProcessingIO produces audibly degraded playback or
  /// mic quality. Silent downgrade to `aec: 'off'`. List is conservative;
  /// plan §6 R1 lists iPhone 12 mini; iPads optional.
  private static let aecFallbackModels: Set<String> = [
    "iPhone12,8",  // iPhone SE (2nd gen)
    "iPhone13,1",  // iPhone 12 mini
  ]

  // MARK: - State (serial queue guarded)

  private let stateQueue = DispatchQueue(label: "com.TJBot.voicemic.state")
  private let log = OSLog(subsystem: "com.TJBot.voice", category: "VoiceMic")

  private var running = false
  private var muted = false
  private var effectiveAecMode = "off"  // resolved at start()
  private var fallbackGateEnabled = false
  private var fallbackThreshold = 0.04
  private var configuredSampleRate = Config.targetSampleRate
  private var configuredChannels: AVAudioChannelCount = Config.targetChannels
  private var configuredBitsPerSample = 16

  private var converter: AVAudioConverter?
  private var targetFormat: AVAudioFormat?

  private var seq: UInt64 = 0
  private var framesDelivered: UInt64 = 0
  private var lastFrameAt: Date?
  /// Stamped at the end of `start()`. The first frame's age is measured
  /// against this so JS gets a meaningful "tap warm-up" duration in the
  /// voiceMicEngineReady event. Reset to nil on stop() so the next start
  /// cycle's first frame fires the event again.
  private var engineStartAt: Date?
  /// One-shot latch — set true the first time a frame triggers the
  /// voiceMicEngineReady emit, reset to false in stopInternal() so each
  /// new start() cycle re-emits. Mirrors Android's `firstFrameEmitted`
  /// in VoiceMicModule.kt so the FSM `READY → LISTENING` transition
  /// fires reliably on both platforms regardless of `seq` accounting.
  private var firstFrameEmitted = false
  /// Buffered engineReady payload for the case where the first frame
  /// arrives before any JS listener has registered. RCTEventEmitter
  /// silently drops `sendEvent` when `_listenerCount == 0`, which on
  /// new-arch iOS can race with the hook's onEngineReady useEffect and
  /// strand the FSM in READY for >2s ("Micro không sẵn sàng"). When
  /// `startObserving` finally runs, the buffered body is delivered.
  private var pendingEngineReadyBody: [String: Any]?
  private var stallTimer: DispatchSourceTimer?
  private var stallNoAdvanceTicks = 0
  private var lastStallCheckFrames: UInt64 = 0
  private var fatalStall = false

  // P0-7: Energy + ZCR VAD (plan §5.6). Constants from env or defaults.
  private let vadEnergyThresholdDb: Double
  private let vadZcrLow: Double
  private let vadZcrHigh: Double
  private let vadHangoverMs: Int
  // Pre-roll ring buffer: [Int16] arrays per chunk, max 10 chunks (~200ms)
  private var preRollBuffer: [[Int16]] = []
  private var preRollFilled = false
  private var vadSpeechActive = false
  private var vadHangoverFramesLeft = 0

  // Diagnostic ticker piggybacked on the stall timer (500 ms cadence). Emits
  // a line to Console.app every 2 s with the state tuple needed to triage
  // the 2026-04-23 "mic auto-turns-off" investigation — `running`,
  // `framesDelivered`, `lastFrameAgeMs`, `voiceProcessing`. NSLog-based so
  // it's visible on a physical iPhone without the React Native DevTools
  // bridge (RN 0.83 moved JS console logs off metro stdout).
  private var diagTickCount: Int = 0

  private var hasListeners = false

  // MARK: - RCTEventEmitter overrides

  override init() {
    func envDouble(_ key: String, _ def: Double) -> Double {
      if let v = ProcessInfo.processInfo.environment[key], let d = Double(v) { return d }
      return def
    }
    func envInt(_ key: String, _ def: Int) -> Int {
      if let v = ProcessInfo.processInfo.environment[key], let i = Int(v) { return i }
      return def
    }
    vadEnergyThresholdDb = envDouble("EXPO_PUBLIC_VOICE_VAD_ENERGY_DB", -42.0)
    vadZcrLow = envDouble("EXPO_PUBLIC_VOICE_VAD_ZCR_LOW", 0.05)
    vadZcrHigh = envDouble("EXPO_PUBLIC_VOICE_VAD_ZCR_HIGH", 0.45)
    vadHangoverMs = envInt("EXPO_PUBLIC_VOICE_VAD_HANGOVER_MS", 400)
    super.init()
  }

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! {
    return [Event.data, Event.stalled, Event.engineReady, "voiceMicVadStart", "voiceMicVadEnd", "voiceAecAttachFailed"]
  }

  // Listener-accounting sentinel; the async replay path below preserves this
  // state transition while avoiding a first-frame/listener race:
  // override func startObserving() { hasListeners = true }
  // override func stopObserving() { hasListeners = false }

  override func startObserving() {
    // RN bridge thread. Hop to stateQueue so the buffered-engineReady
    // replay observes a consistent (`hasListeners`, `pendingEngineReadyBody`)
    // pair with the tap-callback writer, and so the replay's `sendEvent`
    // is serialised after any in-flight first-frame logic.
    stateQueue.async { [weak self] in
      guard let self = self else { return }
      self.hasListeners = true
      if let body = self.pendingEngineReadyBody {
        self.pendingEngineReadyBody = nil
        self.sendEvent(withName: Event.engineReady, body: body)
        os_log("[A1] engineReady replayed on listener attach",
               log: self.log, type: .default)
      }
    }
  }
  override func stopObserving() {
    stateQueue.async { [weak self] in self?.hasListeners = false }
  }

  override func invalidate() {
    // stateQueue.async (not .sync) — invalidate is called by the RN bridge
    // on teardown from the bridge queue. A `.sync` hop is a latent deadlock
    // trap if any stateQueue block ever comes to depend on the caller's
    // queue. Async is fire-and-forget; the module is already marked for
    // teardown when invalidate fires, so waiting gains nothing.
    stateQueue.async { [weak self] in self?.stopInternal() }
    super.invalidate()
  }

  // MARK: - Bridge methods

  @objc(start:resolver:rejecter:)
  func start(
    _ opts: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let sampleRate = (opts["sampleRate"] as? NSNumber)?.doubleValue ?? Config.targetSampleRate
    let channelsNum = (opts["channels"] as? NSNumber)?.uintValue ?? UInt(Config.targetChannels)
    let bits = (opts["bitsPerSample"] as? NSNumber)?.intValue ?? 16
    let aecRequested = (opts["aec"] as? String) ?? "hw"

    guard bits == 16, channelsNum == 1 else {
      reject(ErrorCode.invalidArgs, "only 16-bit mono supported", nil)
      return
    }

    stateQueue.async { [weak self] in
      guard let self = self else { return }
      // `[A1]` lines are active-device diagnostics; keep them at `.default`
      // so Console.app shows them without enabling "Include Info Messages".
      os_log("[A1] start queued rate=%{public}f ch=%{public}llu aec=%{public}@",
             log: self.log, type: .default,
             sampleRate, UInt64(channelsNum), aecRequested)
      self.stopInternal()  // idempotent — fresh state for start

      // Device-level AEC downgrade. HW AEC is requested by the caller
      // (`aec: "hw"`) AND permitted for this hardware model (allowlist in
      // `aecFallbackModels`). Any other combination falls back to plain
      // capture without voiceProcessingIO.
      let modelCode = Self.deviceModelCode()
      let allowsHwAec = !Self.aecFallbackModels.contains(modelCode)
      var useHwAec = (aecRequested == "hw") && allowsHwAec
      self.effectiveAecMode = useHwAec ? "hw" : "off"
      if aecRequested == "hw" && !allowsHwAec {
        self.emitAecAttachFailed(
          reason: "device_aec_fallback_allowlist",
          modelCode: modelCode
        )
      }
      NSLog(
        "[TJBotVoice-debug] %@",
        "VoiceMic.start aecRequested=\(aecRequested) useHwAec=\(useHwAec) model=\(modelCode)"
      )

      // Cross-platform parity with Android's emitter (VoiceMicModule.kt
      // line 511): when the caller asked for HW AEC but the device is
      // on the fallback allowlist, fire `voiceAecAttachFailed` so the
      // JS hook activates the software RMS gate instead of letting
      // echo bleed through. iOS previously emitted nothing on this path
      // because voiceProcessingIO is "usually" sufficient; that
      // assumption breaks on the allowlisted models (iPhone 12 mini
      // today, more in future). The hook is a no-op when no listener
      // is attached, so this is safe to fire unconditionally on
      // downgrade.
      if aecRequested == "hw" && !useHwAec && self.hasListeners {
        self.sendEvent(
          withName: "voiceAecAttachFailed",
          body: [
            "reason": "device_fallback_allowlist",
            "modelCode": 0,
            "deviceCode": modelCode,
          ]
        )
      }

      os_log("[A1] pre-ensureStarted voiceProcessing=%{public}@ model=%{public}@",
             log: self.log, type: .default,
             useHwAec ? "true" : "false", modelCode)
      do {
        try SharedVoiceEngine.shared.ensureStarted(voiceProcessing: useHwAec)
        os_log("[A1] post-ensureStarted ok engineRunning=%{public}@",
               log: self.log, type: .default,
               SharedVoiceEngine.shared.isRunning() ? "true" : "false")
      } catch SharedVoiceEngineError.voiceProcessingTogglePostStart {
        // Engine was started by someone else with a different setting.
        // Honor the existing setting and log.
        let actual = SharedVoiceEngine.shared.isVoiceProcessingEnabled()
        self.effectiveAecMode = actual ? "hw" : "off"
        os_log(
          "[A1] aec conflict — engine already started with voiceProcessing=%{public}@",
          log: self.log, type: .default, actual ? "true" : "false"
        )
        // If the engine is locked to voiceProcessing=false but the
        // caller asked for `hw`, the effective mode is a downgrade —
        // notify JS so the software fallback gate activates. Same
        // contract as the device-fallback path above.
        if aecRequested == "hw" && !actual && self.hasListeners {
          self.sendEvent(
            withName: "voiceAecAttachFailed",
            body: [
              "reason": "engine_conflict_voice_processing_off",
              "modelCode": 0,
              "deviceCode": Self.deviceModelCode(),
            ]
          )
        }
      } catch SharedVoiceEngineError.engineDidNotStart {
        // engine.start() returned without throwing but the engine is
        // not running. Most common cause on physical iOS devices is a
        // denied microphone permission — iOS does not raise an error
        // there; the call silently no-ops, the FSM strands at READY,
        // and the user sees "Micro không sẵn sàng" with no clue what
        // to do. Surface a precise, user-actionable rejection so the
        // hook can render a meaningful message and a triage breadcrumb
        // is left in os_log.
        NSLog(
          "[TJBotVoice-debug] engine.start() silent no-op — likely mic permission denied or AVAudioSession interrupted"
        )
        os_log(
          "[A1] engineDidNotStart — engine.start() returned but isRunning=false (mic permission?)",
          log: self.log, type: .error
        )
        reject(
          "E_MIC_PERMISSION_OR_AUDIO_SESSION",
          "Microphone unavailable — check Settings → TJBotMobile → Microphone, then reopen the app",
          nil
        )
        return
      } catch {
        os_log("[A1] ensureStarted FAILED err=%{public}@",
               log: self.log, type: .error, String(describing: error))
        if useHwAec && SharedVoiceEngine.shared.stopIfIdleForReconfigure() {
          self.emitAecAttachFailed(
            reason: "engine_start_failed:\(String(describing: error))",
            modelCode: modelCode
          )
          useHwAec = false
          self.effectiveAecMode = "off"
          do {
            try SharedVoiceEngine.shared.ensureStarted(voiceProcessing: false)
            os_log("[A1] post-ensureStarted fallback ok engineRunning=%{public}@",
                   log: self.log, type: .default,
                   SharedVoiceEngine.shared.isRunning() ? "true" : "false")
          } catch {
            reject(ErrorCode.startFailed, "engine start failed after AEC fallback: \(error)", error)
            return
          }
        } else {
          reject(ErrorCode.startFailed, "engine start failed: \(error)", error)
          return
        }
      }

      guard
        let target = AVAudioFormat(
          commonFormat: .pcmFormatInt16,
          sampleRate: sampleRate,
          channels: AVAudioChannelCount(channelsNum),
          interleaved: true
        )
      else {
        reject(ErrorCode.startFailed, "failed to create target format", nil)
        return
      }

      os_log("[A1] pre-installInputTap bufferFrames=%{public}d",
             log: self.log, type: .default, Config.tapBufferFrames)
      func installInputTap() throws -> AVAudioFormat {
        try SharedVoiceEngine.shared.installInputTap(
          bufferSize: Config.tapBufferFrames
        ) { [weak self] buffer, when in
          self?.handleTap(buffer: buffer, when: when)
        }
      }
      var nativeFormat: AVAudioFormat
      do {
        nativeFormat = try installInputTap()
        os_log("[A1] post-installInputTap nativeRate=%{public}f channels=%{public}d",
               log: self.log, type: .default,
               nativeFormat.sampleRate, Int(nativeFormat.channelCount))
      } catch SharedVoiceEngineError.engineDidNotStart {
        // engine.start() returned success but the audio unit died
        // before installInputTap ran (Apple bug, most often denied mic
        // permission). Same actionable error as the ensureStarted-time
        // catch — same code path the FSM expects.
        NSLog(
          "[TJBotVoice-debug] installInputTap rejected — engine died between start() and tap install"
        )
        os_log(
          "[A1] installInputTap engineDidNotStart — engine flipped to isRunning=false post-start",
          log: self.log, type: .error
        )
        reject(
          "E_MIC_PERMISSION_OR_AUDIO_SESSION",
          "Microphone unavailable — check Settings → TJBotMobile → Microphone, then reopen the app",
          nil
        )
        return
      } catch {
        os_log("[A1] installInputTap FAILED err=%{public}@",
               log: self.log, type: .error, String(describing: error))
        if useHwAec && SharedVoiceEngine.shared.stopIfIdleForReconfigure() {
          self.emitAecAttachFailed(
            reason: "installInputTap_failed:\(String(describing: error))",
            modelCode: modelCode
          )
          useHwAec = false
          self.effectiveAecMode = "off"
          do {
            try SharedVoiceEngine.shared.ensureStarted(voiceProcessing: false)
            nativeFormat = try installInputTap()
            os_log("[A1] post-installInputTap fallback nativeRate=%{public}f channels=%{public}d",
                   log: self.log, type: .default,
                   nativeFormat.sampleRate, Int(nativeFormat.channelCount))
          } catch {
            reject(ErrorCode.startFailed, "installInputTap failed after AEC fallback: \(error)", error)
            return
          }
        } else {
          reject(ErrorCode.startFailed, "installInputTap failed: \(error)", error)
          return
        }
      }

      guard let conv = AVAudioConverter(from: nativeFormat, to: target) else {
        os_log("[A1] AVAudioConverter FAILED native=%{public}@ target=%{public}@",
               log: self.log, type: .error,
               String(describing: nativeFormat), String(describing: target))
        SharedVoiceEngine.shared.removeInputTap()
        reject(
          ErrorCode.startFailed,
          "converter not available native=\(nativeFormat) target=\(target)",
          nil
        )
        return
      }
      os_log("[A1] converter ok nativeRate=%{public}f targetRate=%{public}f",
             log: self.log, type: .default,
             nativeFormat.sampleRate, target.sampleRate)
      self.converter = conv
      self.targetFormat = target

      self.configuredSampleRate = sampleRate
      self.configuredChannels = AVAudioChannelCount(channelsNum)
      self.configuredBitsPerSample = bits
      self.seq = 0
      self.framesDelivered = 0
      self.lastFrameAt = nil
      self.engineStartAt = Date()
      self.stallNoAdvanceTicks = 0
      self.lastStallCheckFrames = 0
      self.fatalStall = false
      self.muted = false
      self.fallbackGateEnabled = (self.effectiveAecMode != "hw" && aecRequested == "hw")
      self.running = true
      // Release fence: publish `converter`, `targetFormat`, `running` so that
      // the tap callback (HAL thread) observes them as a consistent set. The
      // `running` Bool is not pointer-sized so without this fence a torn read
      // is theoretically possible under aggressive reordering. Closes plan
      // §12 risk #12.
      OSMemoryBarrier()

      self.armStallTimer()

      os_log(
        "start ok aec=%{public}@ rate=%{public}f native=%{public}f",
        log: self.log, type: .info,
        self.effectiveAecMode, sampleRate, nativeFormat.sampleRate
      )
      resolve(nil)
    }
  }

  @objc(stop:rejecter:)
  func stop(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      self?.stopInternal()
      resolve(nil)
    }
  }

  @objc(mute:resolver:rejecter:)
  func mute(
    _ muted: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      self?.muted = muted.boolValue
      resolve(nil)
    }
  }

  @objc(getDiagnostics:rejecter:)
  func getDiagnostics(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      guard let self = self else {
        resolve(NSNull())
        return
      }
      let lastAge: Any = {
        if let last = self.lastFrameAt {
          return Date().timeIntervalSince(last) * 1000.0
        }
        return NSNull()
      }()
      let engine = SharedVoiceEngine.shared.snapshot()
      resolve([
        "running": self.running,
        "sampleRate": self.configuredSampleRate,
        "framesDelivered": self.framesDelivered,
        "lastFrameAgeMs": lastAge,
        "voiceProcessingEnabled": (engine["voiceProcessingEnabled"] as? Bool) ?? false,
        "engineRunning": (engine["isRunning"] as? Bool) ?? false,
        "aecMode": self.effectiveAecMode,
      ])
    }
  }

  /// Software fallback gate for iOS models where HW voiceProcessingIO is
  /// disabled. Drops mic frames while AI playback is active so speaker
  /// residual cannot reach Gemini and self-interrupt the assistant turn.
  @objc(setAecFallbackGate:threshold:resolver:rejecter:)
  func setAecFallbackGate(
    _ enabled: NSNumber,
    threshold: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    stateQueue.async { [weak self] in
      guard let self = self else {
        resolve(nil)
        return
      }
      self.fallbackGateEnabled = enabled.boolValue
      self.fallbackThreshold = threshold.doubleValue
      os_log(
        "aecFallbackGate enabled=%{public}@ threshold=%{public}f",
        log: self.log,
        type: .info,
        enabled.boolValue ? "true" : "false",
        threshold.doubleValue
      )
      resolve(nil)
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

  // MARK: - Internals

  private func stopInternal() {
    stallTimer?.cancel()
    stallTimer = nil
    if running {
      SharedVoiceEngine.shared.removeInputTap()
    }
    converter = nil
    targetFormat = nil
    running = false
    // Release fence: publish the `running = false` + nilled tap fields so a
    // concurrent tap callback observes the teardown as a consistent set.
    // Pairs with the release fence at the end of `start()`. Closes plan
    // §12 risk #12.
    OSMemoryBarrier()
    muted = false
    seq = 0
    framesDelivered = 0
    lastFrameAt = nil
    engineStartAt = nil
    firstFrameEmitted = false
    pendingEngineReadyBody = nil
    stallNoAdvanceTicks = 0
    lastStallCheckFrames = 0
    fatalStall = false
    preRollBuffer.removeAll()
    preRollFilled = false
    vadSpeechActive = false
    vadHangoverFramesLeft = 0
  }

  // Debug counter — bump on every tap; log via print (safe on arm64).
  private static var tapFireCount: UInt64 = 0

  /// Called on AVFoundation internal thread. Hops to stateQueue for safety.
  private func handleTap(buffer: AVAudioPCMBuffer, when: AVAudioTime) {
    // Copy frame metrics out of the buffer on the calling thread — the
    // buffer is only valid for the duration of this callback.
    let frameLength = buffer.frameLength
    let inputRate = buffer.format.sampleRate

    Self.tapFireCount += 1
    if Self.tapFireCount == 1 || Self.tapFireCount % 50 == 0 {
      NSLog(
        "[TJBotVoice-debug] %@",
        "tap_fire #\(Self.tapFireCount) frames=\(frameLength) rate=\(inputRate) running=\(self.running)"
      )
      os_log("[A1] tap_fire #%{public}llu frames=%{public}u rate=%{public}f running=%{public}@",
             log: self.log, type: .default,
             Self.tapFireCount, frameLength, inputRate,
             self.running ? "true" : "false")
    }

    guard frameLength > 0 else {
      if Self.tapFireCount < 10 {
        os_log("[A1] tap dropped: frameLength==0 tapFire=%{public}llu",
               log: self.log, type: .error, Self.tapFireCount)
      }
      return
    }

    // Optimistic read of the format + converter + muted flag. Swift's
    // memory model guarantees atomic pointer-sized reads on arm64, so an
    // unsynchronised read of an optional reference either yields the valid
    // pointer or nil — never a torn pointer. If `stopInternal()` nils the
    // fields concurrently, the `guard let` fails and we return without
    // emitting. Previous implementation used `stateQueue.sync` here, which
    // starved the HAL tap thread under load and dropped all mic frames.
    guard
      self.running,
      let targetFormat = self.targetFormat,
      let converter = self.converter
    else {
      if Self.tapFireCount < 10 {
        os_log(
          "[A1] tap dropped: running=%{public}@ targetFormat=%{public}@ converter=%{public}@ tapFire=%{public}llu",
          log: self.log, type: .error,
          self.running ? "true" : "false",
          self.targetFormat == nil ? "nil" : "set",
          self.converter == nil ? "nil" : "set",
          Self.tapFireCount
        )
      }
      return
    }
    let mutedNow = self.muted

    // Target frame count after resample: inFrames * (targetRate / inputRate).
    let ratio = Config.targetSampleRate / inputRate
    let outCapacity = AVAudioFrameCount(Double(frameLength) * ratio) + 32
    guard let outBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: outCapacity) else {
      return
    }

    var inputDone = false
    let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
      if inputDone {
        outStatus.pointee = .noDataNow
        return nil
      }
      inputDone = true
      outStatus.pointee = .haveData
      return buffer
    }

    var err: NSError?
    let status = converter.convert(to: outBuffer, error: &err, withInputFrom: inputBlock)
    if status == .error || outBuffer.frameLength == 0 {
      return
    }

    let outLen = Int(outBuffer.frameLength) * Int(targetFormat.streamDescription.pointee.mBytesPerFrame)
    guard let src = outBuffer.int16ChannelData?[0] else { return }

    // Mute: zero-fill before base64. Keeps stall watchdog happy (frames
    // still delivered at the correct cadence) while silencing upstream.
    // memset wants UnsafeMutableRawPointer; explicit wrap required.
    if mutedNow {
      memset(UnsafeMutableRawPointer(src), 0, outLen)
    }

    var shouldDropForFallbackGate = false
    if self.fallbackGateEnabled && VoicePlaybackActivity.isActive {
      shouldDropForFallbackGate = true
    }

    // Base64-encode on the tap thread (cheap; ~1µs per KB) to avoid
    // allocating a second buffer on stateQueue.
    let b64 = shouldDropForFallbackGate
      ? ""
      : Data(bytes: src, count: outLen).base64EncodedString()

    // P0-7: VAD computed on tap thread where `src` is valid.
    let vadSampleCount = outLen / 2
    var energySum = 0.0
    var zeroCrossings = 0
    var prevSample: Double = 0
    for vi in 0..<vadSampleCount {
      let norm = Double(src[vi]) / 32768.0
      energySum += norm * norm
      if vi > 0 && prevSample * norm < 0 { zeroCrossings += 1 }
      prevSample = norm
    }
    let energyDb = energySum > 0 ? 10.0 * log10(energySum / Double(vadSampleCount)) : -100.0
    let zcr = vadSampleCount > 1 ? Double(zeroCrossings) / Double(max(1, vadSampleCount - 1)) : 0.0
    // Capture as value so stateQueue.async closure does not need self.vadEnergyThresholdDb etc.
    let isSpeechFrame = energyDb > self.vadEnergyThresholdDb && zcr >= self.vadZcrLow && zcr <= self.vadZcrHigh
    // Snapshot samples for pre-roll (copied before tap buffer is reused)
    let vadSamples = Array(UnsafeBufferPointer(start: src, count: vadSampleCount))

    let frameCount = UInt64(outBuffer.frameLength)
    let timestampMs = Date().timeIntervalSince1970 * 1000.0

    stateQueue.async { [weak self] in
      guard let self = self, self.running else { return }
      self.framesDelivered += frameCount
      self.lastFrameAt = Date()
      let seqNow = self.seq
      self.seq += 1

      if seqNow == 0 || seqNow % 50 == 0 {
        NSLog(
          "[TJBotVoice-debug] %@",
          "emit #\(seqNow) hasListeners=\(self.hasListeners) outBytes=\(b64.count)"
        )
      }

      // Plan §3.2 row `ready`, §6.3 row 3 — the FSM's `ready → listening`
      // trigger is "first frame actually delivered", not "start() resolved".
      // Fires AT MOST ONCE per start() cycle. Latch resets in stopInternal()
      // so the next session re-emits.
      //
      // Parity note: Android's reader thread emits unconditionally
      // (VoiceMicModule.kt:352). iOS used to gate on `seqNow == 0 &&
      // hasListeners`, which silently dropped the event when the first
      // frame raced ahead of the hook's onEngineReady subscription —
      // RN's RCTEventEmitter drops `sendEvent` when `_listenerCount == 0`,
      // and `seq` increments to 1 so retry never occurs. Symptom: FSM
      // strands at READY → 2 s deadline → "Micro không sẵn sàng".
      // The fix uses an explicit `firstFrameEmitted` latch and buffers
      // the payload when no listeners exist, replaying it from
      // `startObserving()` once a JS listener attaches.
      if !self.firstFrameEmitted {
        self.firstFrameEmitted = true
        let ageMs: Double = self.engineStartAt
          .map { Date().timeIntervalSince($0) * 1000.0 } ?? 0
        let body: [String: Any] = [
          "firstFrameAgeMs": ageMs,
          "sampleRate": self.configuredSampleRate,
        ]
        if self.hasListeners {
          self.sendEvent(withName: Event.engineReady, body: body)
        } else {
          self.pendingEngineReadyBody = body
          os_log(
            "[A1] engineReady deferred — no listeners yet ageMs=%{public}f",
            log: self.log, type: .default, ageMs
          )
        }
      }

      if shouldDropForFallbackGate {
        self.vadSpeechActive = false
        self.vadHangoverFramesLeft = 0
        self.preRollBuffer.removeAll()
        self.preRollFilled = false
        return
      }

      // P0-7: VAD state machine on stateQueue (serialised).
      let maxPreRoll = max(1, self.vadHangoverMs / 20)
      self.preRollBuffer.append(vadSamples)
      while self.preRollBuffer.count > maxPreRoll { self.preRollBuffer.removeFirst() }
      if !self.preRollFilled && self.preRollBuffer.count >= maxPreRoll { self.preRollFilled = true }

      if isSpeechFrame {
        self.vadHangoverFramesLeft = self.vadHangoverMs / 20
        if !self.vadSpeechActive {
          self.vadSpeechActive = true
          if self.hasListeners {
            for preChunk in self.preRollBuffer {
              let preData = Data(bytes: preChunk, count: preChunk.count * MemoryLayout<Int16>.size)
              self.sendEvent(withName: Event.data, body: ["data": preData.base64EncodedString(), "seq": -1, "timestampMs": timestampMs])
            }
            self.sendEvent(withName: "voiceMicVadStart", body: [String: Any]())
          }
        }
      } else {
        if self.vadSpeechActive {
          if self.vadHangoverFramesLeft > 0 {
            self.vadHangoverFramesLeft -= 1
          } else {
            self.vadSpeechActive = false
            if self.hasListeners {
              self.sendEvent(withName: "voiceMicVadEnd", body: ["hangoverMs": self.vadHangoverMs])
            }
          }
        }
      }

      if self.hasListeners {
        self.sendEvent(
          withName: Event.data,
          body: [
            "data": b64,
            "seq": seqNow,
            "timestampMs": timestampMs,
          ]
        )
      }
    }
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

  private func checkForStall() {
    guard running else { return }

    // Diagnostic heartbeat — every 4 ticks (= 2 s) emit a single NSLog line
    // with the state that distinguishes the 2026-04-23 A-E hypotheses.
    // Console.app filter: `eventMessage CONTAINS "[TJBotVoice-debug] diag"`.
    diagTickCount += 1
    if diagTickCount % 4 == 0 {
      let lastAgeMs: Double = lastFrameAt.map {
        Date().timeIntervalSince($0) * 1000.0
      } ?? -1
      NSLog(
        "[TJBotVoice-debug] %@",
        "diag tick=\(diagTickCount) running=\(running) framesDelivered=\(framesDelivered) lastFrameAgeMs=\(lastAgeMs) seq=\(seq) muted=\(muted) aec=\(effectiveAecMode) engineRunning=\(SharedVoiceEngine.shared.isRunning()) voiceProcessing=\(SharedVoiceEngine.shared.isVoiceProcessingEnabled())"
      )
    }

    if framesDelivered > lastStallCheckFrames {
      lastStallCheckFrames = framesDelivered
      stallNoAdvanceTicks = 0
      return
    }

    stallNoAdvanceTicks += 1
    let ticksNeeded = Config.stallThresholdMs / Config.stallPollIntervalMs
    if stallNoAdvanceTicks >= ticksNeeded {
      emitStalled(fatal: fatalStall)
      // On first stall, try to restart the engine. On second stall, fatal.
      if !fatalStall {
        stallNoAdvanceTicks = 0
        attemptRecover()
      } else {
        // fatal — stop trying; stall watchdog keeps firing every window.
        stallNoAdvanceTicks = 0
      }
    }
  }

  private func attemptRecover() {
    // Tear down tap, re-install. Engine restart is delegated to SharedVoiceEngine.
    SharedVoiceEngine.shared.removeInputTap()
    do {
      try SharedVoiceEngine.shared.ensureStarted(
        voiceProcessing: effectiveAecMode == "hw"
      )
      _ = try SharedVoiceEngine.shared.installInputTap(
        bufferSize: Config.tapBufferFrames
      ) { [weak self] buffer, when in
        self?.handleTap(buffer: buffer, when: when)
      }
      os_log("recovered from mic stall", log: log, type: .default)
    } catch {
      fatalStall = true
      os_log(
        "mic stall recovery failed — marking fatal: %{public}@",
        log: log, type: .error, String(describing: error)
      )
    }
  }

  private func emitStalled(fatal: Bool) {
    let lastAge: Double = {
      if let last = lastFrameAt {
        return Date().timeIntervalSince(last) * 1000.0
      }
      return Double(Config.stallThresholdMs)
    }()

    os_log(
      "stalled lastFrameAgeMs=%{public}f fatal=%{public}@",
      log: log, type: .default,
      lastAge, fatal ? "true" : "false"
    )

    if hasListeners {
      sendEvent(
        withName: Event.stalled,
        body: [
          "lastFrameAgeMs": lastAge,
          "fatal": fatal,
        ]
      )
    }
  }

  private func emitAecAttachFailed(reason: String, modelCode: String) {
    let payload: [String: Any] = [
      "reason": reason,
      "modelCode": 0,
      "deviceCode": modelCode,
    ]
    os_log(
      "voiceAecAttachFailed reason=%{public}@ model=%{public}@",
      log: log,
      type: .error,
      reason,
      modelCode
    )
    if hasListeners {
      sendEvent(withName: Event.aecAttachFailed, body: payload)
    }
  }

  // MARK: - Device detection

  /// Reads "hw.machine" via sysctlbyname — the Apple-sanctioned way to get
  /// the hardware model code (e.g. "iPhone13,1"). Replaces the older
  /// `Mirror(reflecting: utsname().machine)` recipe, which is fragile for
  /// non-ASCII bytes and depends on reflection internals.
  private static func deviceModelCode() -> String {
    var size = 0
    sysctlbyname("hw.machine", nil, &size, nil, 0)
    guard size > 0 else { return "" }
    var buffer = [CChar](repeating: 0, count: size)
    guard sysctlbyname("hw.machine", &buffer, &size, nil, 0) == 0 else {
      return ""
    }
    return String(cString: buffer)
  }
}
