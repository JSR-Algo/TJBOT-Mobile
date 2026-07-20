//
//  SharedVoiceEngine.swift
//  tjbotMobile — sys-16 Gemini Live realtime voice.
//
//  Single-owner thread-safe wrapper around AVAudioEngine. tjtjboth VoiceMicModule
//  (input tap with voiceProcessingIO) and PcmStreamModule (AVAudioPlayerNode
//  output) use this to coordinate engine lifecycle.
//
//  Why a class with NSRecursiveLock, not a Swift actor? The RN bridge
//  invokes our methods on DispatchQueue-based synchronous contexts — actors
//  would force every call site into `await` and `Task { ... }` plumbing,
//  which fights the bridge's promise-callback model. A recursive lock gives
//  the same serialization guarantee without the async dance. All public
//  methods are non-blocking under normal use (held only for state mutation,
//  not during AVAudioEngine.start() which AVFoundation serializes itself).
//
//  Invariants enforced here:
//    - At most ONE voiceProcessingIO input tap at a time (VoiceMicModule owner).
//    - At most ONE AVAudioEngine instance per app lifetime, reused across
//      init/close cycles (plan AC-8 "no duplicate playback engines").
//    - voiceProcessingEnabled is sticky per engine lifetime: once set, we do
//      NOT toggle it mid-session (Apple's voiceProcessingIO HAL requires
//      teardown to flip). Conflicting requests throw.
//    - Mic and player are independent "users"; the engine shuts down when
//      refcount drops to zero.
//
//  NOT in scope:
//    - AVAudioSession category/mode/options — VoiceSessionModule owns that
//      (plan principle 1, single session owner).
//    - AVAudioPCMBuffer encoding/decoding — callers pass in prepared buffers.
//

import AVFoundation
import Foundation

enum SharedVoiceEngineError: Error {
  case doubleInputTap
  case voiceProcessingTogglePostStart
  case engineStartFailed(underlying: Error)
  /// `engine.start()` returned without throwing but `engine.isRunning`
  /// is false. Apple's documented behavior is "throws on failure", but
  /// in practice the call can silently no-op when:
  ///   - microphone permission is denied (most common after a fresh
  ///     install — iOS revokes Privacy → Microphone),
  ///   - AVAudioSession is mid-interruption,
  ///   - voiceProcessingIO setup fails on a flaky HW AEC path.
  /// Surfacing this as a typed error lets the caller produce a
  /// user-actionable message and a log breadcrumb instead of leaving
  /// the FSM to strand for 2 s and emit "Micro không sẵn sàng".
  case engineDidNotStart
}

final class SharedVoiceEngine {
  static let shared = SharedVoiceEngine()

  // MARK: - State

  private let lock = NSRecursiveLock()
  private let engine = AVAudioEngine()
  private var started = false
  private var voiceProcessingEnabled = false

  private var micUsers = 0
  private var playerUsers = 0
  private var inputTapInstalled = false
  private var playerNodes: [AVAudioPlayerNode] = []

  private init() {}

  // MARK: - Engine lifecycle

  /// Ensure the engine is running with the requested voiceProcessing flag.
  /// Idempotent when called with the same `voiceProcessing` value; throws
  /// `voiceProcessingTogglePostStart` if the flag would flip mid-session.
  func ensureStarted(voiceProcessing: Bool) throws {
    lock.lock()
    defer { lock.unlock() }

    // Stale-flag recovery. `started` was set to true by a prior
    // ensureStarted/preflight call that observed `engine.isRunning==true`
    // synchronously after `engine.start()`. The audio unit can fail to
    // commission a few ms later (Apple bug — most often denied mic
    // permission, AVAudioSession interruption, or voiceProcessingIO
    // setup quirk). When that happens `engine.isRunning` flips back to
    // false but our `started` flag stays true, so subsequent calls
    // early-return on a dead engine. Detect and reset so the rest of
    // the function actually re-runs setVoiceProcessingEnabled +
    // engine.start() on a freshly-rebuilt engine state.
    if started && !engine.isRunning {
      NSLog(
        "[tjbotVoice-debug] %@",
        "ensureStarted: started=true but engine.isRunning=false — resetting and re-starting"
      )
      // Stop any leftover state. Idempotent — safe even if engine is
      // already in a half-dead state.
      engine.stop()
      started = false
    }

    if started {
      if voiceProcessingEnabled != voiceProcessing {
        throw SharedVoiceEngineError.voiceProcessingTogglePostStart
      }
      return
    }

    do {
      // Permission gate. Apple's `engine.start()` does NOT throw when mic
      // permission is denied — it silently no-ops with `engine.isRunning`
      // briefly true then flipping to false within milliseconds. By the
      // time the diag tick reads it, the engine is dead and the FSM has
      // already strung itself out to a 2 s "Micro không sẵn sàng"
      // timeout. Check the explicit permission FIRST and refuse to
      // even attempt start() so JS gets an actionable error fast.
      //
      // Uses the AVAudioSession API rather than iOS 17's
      // AVAudioApplication so this works back to the project's
      // deployment target. Deprecated but still functional through iOS 18.
      let session = AVAudioSession.sharedInstance()
      let perm = session.recordPermission
      NSLog(
        "[tjbotVoice-debug] %@",
        "ensureStarted recordPermission=\(perm.rawValue) voiceProcessing=\(voiceProcessing)"
      )
      switch perm {
      case .denied:
        throw SharedVoiceEngineError.engineDidNotStart
      case .undetermined:
        // First-call permission prompt. iOS surfaces the system alert;
        // if the user denies we re-throw and the JS hook renders a
        // user-actionable message. Doing it here keeps the prompt
        // close in time to the tap-mic action that caused it.
        let semaphore = DispatchSemaphore(value: 0)
        var granted = false
        session.requestRecordPermission { ok in
          granted = ok
          semaphore.signal()
        }
        _ = semaphore.wait(timeout: .now() + 30)
        NSLog(
          "[tjbotVoice-debug] %@",
          "recordPermission prompt result granted=\(granted)"
        )
        if !granted {
          throw SharedVoiceEngineError.engineDidNotStart
        }
      case .granted:
        break
      @unknown default:
        break
      }

      // Apple requires setVoiceProcessingEnabled BEFORE the engine starts
      // or any taps/attachments depend on voice-processing IO.
      try engine.inputNode.setVoiceProcessingEnabled(voiceProcessing)
      voiceProcessingEnabled = voiceProcessing

      // Force lazy-creation of mainMixerNode BEFORE engine.start(). On first
      // access, AVAudioEngine auto-connects mainMixer → outputNode. If we
      // start the engine before this, downstream player-node attachments
      // end up connected to a mixer that is not yet routed to the DAC —
      // player plays silently even though scheduleBuffer() succeeds.
      _ = engine.mainMixerNode

      try engine.start()
      // Belt-and-braces: engine.start() can return success and
      // engine.isRunning can briefly be true, then flip to false within
      // a few ms when the underlying audio unit fails to commission.
      // Apple does not surface this as a thrown error. Catch the
      // synchronous case here; the millisecond-later flip is now logged
      // by `installInputTap` and surfaces as a stall via the watchdog.
      NSLog(
        "[tjbotVoice-debug] %@",
        "engine.start ok isRunning=\(engine.isRunning) voiceProcessing=\(voiceProcessing)"
      )
      if !engine.isRunning {
        throw SharedVoiceEngineError.engineDidNotStart
      }
      started = true
    } catch let error as SharedVoiceEngineError {
      throw error
    } catch {
      throw SharedVoiceEngineError.engineStartFailed(underlying: error)
    }
  }

  /// Pre-arm the voiceProcessing flag before any tap or player-node is
  /// attached. VoiceSessionModule calls this immediately after
  /// AVAudioSession.setActive(true) so that a concurrent PcmStreamModule
  /// prewarm (which calls ensureStarted(voiceProcessing: false)) races
  /// against an engine that is already marked for voice-processing — the
  /// conflicting call throws voiceProcessingTogglePostStart and the prewarm
  /// is safely discarded rather than silently winning the flag.
  ///
  /// If the engine is already started with the matching flag this is a no-op.
  /// If it is started with a conflicting flag (should not happen in normal
  /// flows — means a prior session was not torn down) this throws
  /// voiceProcessingTogglePostStart, which VoiceSessionModule logs and treats
  /// as a non-fatal session-start failure.
  func preflight(voiceProcessing: Bool) throws {
    lock.lock()
    defer { lock.unlock() }

    // Same stale-flag recovery as ensureStarted — a prior call may have
    // set started=true while the audio unit died milliseconds later.
    if started && !engine.isRunning {
      NSLog(
        "[tjbotVoice-debug] %@",
        "preflight: started=true but engine.isRunning=false — resetting and re-starting"
      )
      engine.stop()
      started = false
    }

    if started {
      if voiceProcessingEnabled != voiceProcessing {
        throw SharedVoiceEngineError.voiceProcessingTogglePostStart
      }
      return
    }

    try engine.inputNode.setVoiceProcessingEnabled(voiceProcessing)
    voiceProcessingEnabled = voiceProcessing
    // Apple's setVoiceProcessingEnabled is only durable once the engine is
    // running — the HAL can silently revert it if the engine is stopped.
    // Start the engine here so the flag is committed at the HAL level before
    // any concurrent ensureStarted(voiceProcessing:false) prewarm call runs.
    _ = engine.mainMixerNode
    try engine.start()
    // Same silent-no-op guard as ensureStarted — preflight is the path
    // VoiceSessionModule uses to commit voiceProcessing before mic/player
    // attach, so a failure here is the earliest place to detect a denied
    // mic permission.
    if !engine.isRunning {
      throw SharedVoiceEngineError.engineDidNotStart
    }
    started = true
  }

  func isVoiceProcessingEnabled() -> Bool {
    lock.lock(); defer { lock.unlock() }
    return voiceProcessingEnabled
  }

  func isRunning() -> Bool {
    lock.lock(); defer { lock.unlock() }
    return started && engine.isRunning
  }

  // MARK: - Input tap (mic user)

  /// Install a tap on the input node. Throws if a tap is already installed
  /// (only one tap per bus allowed). Returns the native input format so the
  /// caller can set up an AVAudioConverter for output format mapping.
  func installInputTap(
    bufferSize: AVAudioFrameCount = 1024,
    onBuffer: @escaping @Sendable (AVAudioPCMBuffer, AVAudioTime) -> Void
  ) throws -> AVAudioFormat {
    lock.lock()
    defer { lock.unlock() }

    if inputTapInstalled {
      throw SharedVoiceEngineError.doubleInputTap
    }
    let inputNode = engine.inputNode
    let nativeFormat = inputNode.inputFormat(forBus: 0)
    // NSLog (not `print`) so the line is visible in Console.app on a
    // physical device — `print` goes to Xcode's debug console only. %@
    // with pre-formatted Swift string avoids the format-specifier / Swift-Int
    // arm64 crash trap that NSLog %d would hit.
    NSLog(
      "[tjbotVoice-debug] %@",
      "installInputTap rate=\(nativeFormat.sampleRate) channels=\(nativeFormat.channelCount) engineRunning=\(engine.isRunning) voiceProcessing=\(voiceProcessingEnabled)"
    )
    // Guard against the millisecond-later flip: `engine.start()` returned
    // success and `started` is true, but the audio unit failed to come
    // up by the time we install the tap. Without this guard the tap is
    // installed on a dead engine, callbacks never fire, framesDelivered
    // stays at 0, and the FSM strands. Surface the real failure now so
    // start() rejects with engineDidNotStart and JS shows a precise
    // error instead of waiting for the 2 s timeout.
    if !engine.isRunning {
      throw SharedVoiceEngineError.engineDidNotStart
    }
    inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: nativeFormat) { buffer, when in
      onBuffer(buffer, when)
    }
    inputTapInstalled = true
    micUsers += 1
    return nativeFormat
  }

  /// Remove the input tap. Idempotent — safe to call repeatedly.
  func removeInputTap() {
    lock.lock()
    defer { lock.unlock() }
    if inputTapInstalled {
      engine.inputNode.removeTap(onBus: 0)
      inputTapInstalled = false
    }
    if micUsers > 0 { micUsers -= 1 }
    considerShutdownLocked()
  }

  // MARK: - Player node (playback user)

  /// Attach a new AVAudioPlayerNode to the main mixer.
  ///
  /// `bufferFormat` MUST match what the caller will later pass to
  /// `node.scheduleBuffer(...)`. AVAudioPlayerNode does NOT auto-convert
  /// between scheduled-buffer format and its output connection — scheduling
  /// a buffer whose format differs from the connection raises an ObjC
  /// NSException at runtime (terminates the app). The engine's main mixer
  /// then converts `bufferFormat` to the hardware rate/mix format.
  ///
  /// Lifecycle note: `playerUsers` is incremented under the lock before the
  /// method returns, so the engine stays running even if the caller
  /// delays `node.play()` or never calls it. The engine shuts down only
  /// when `detachPlayerNode` is called and refcount reaches zero.
  func attachPlayerNode(bufferFormat: AVAudioFormat) -> AVAudioPlayerNode {
    lock.lock()
    defer { lock.unlock() }

    let node = AVAudioPlayerNode()
    engine.attach(node)
    engine.connect(node, to: engine.mainMixerNode, format: bufferFormat)

    // Force volumes to full-scale. On some iOS configs, newly-attached
    // nodes can default to 0.0 or inherit a ducked volume from voice-
    // processing mixer state, making scheduleBuffer() silent even though
    // completion handlers fire correctly.
    node.volume = 1.0
    engine.mainMixerNode.outputVolume = 1.0

    playerNodes.append(node)
    playerUsers += 1
    return node
  }

  /// Stop and detach a previously-attached player node. Safe to call on a
  /// node that is already detached.
  func detachPlayerNode(_ node: AVAudioPlayerNode) {
    lock.lock()
    defer { lock.unlock() }

    if let idx = playerNodes.firstIndex(where: { $0 === node }) {
      node.stop()
      engine.detach(node)
      playerNodes.remove(at: idx)
      if playerUsers > 0 { playerUsers -= 1 }
    }
    considerShutdownLocked()
  }

  // MARK: - Shutdown

  /// Diagnostics snapshot for the bridged `getDiagnostics` paths.
  func snapshot() -> [String: Any] {
    lock.lock()
    defer { lock.unlock() }
    return [
      "started": started,
      "isRunning": engine.isRunning,
      "voiceProcessingEnabled": voiceProcessingEnabled,
      "micUsers": micUsers,
      "playerUsers": playerUsers,
      "tapInstalled": inputTapInstalled,
      "playerNodes": playerNodes.count,
    ]
  }

  /// Stop the engine when refcount drops to zero. Keeps the single engine
  /// instance alive for reuse on the next start-up.
  private func considerShutdownLocked() {
    if micUsers == 0 && playerUsers == 0 && started {
      engine.stop()
      started = false
      // Leave voiceProcessingEnabled untouched — next ensureStarted decides.
    }
  }

  // MARK: - Media services reset recovery

  /// Called by VoiceSessionModule when AVAudioSession posts
  /// `mediaServicesWereResetNotification`. The engine + all node state is
  /// invalidated; callers must re-init.
  func handleMediaServicesReset() {
    lock.lock()
    defer { lock.unlock() }

    if inputTapInstalled {
      engine.inputNode.removeTap(onBus: 0)
      inputTapInstalled = false
    }
    for node in playerNodes {
      node.stop()
      engine.detach(node)
    }
    playerNodes.removeAll()
    micUsers = 0
    playerUsers = 0
    if started {
      engine.stop()
      started = false
    }
    voiceProcessingEnabled = false
  }
}
