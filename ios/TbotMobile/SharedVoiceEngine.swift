//
//  SharedVoiceEngine.swift
//  TbotMobile — sys-16 Gemini Live realtime voice.
//
//  Single-owner thread-safe wrapper around AVAudioEngine. Both VoiceMicModule
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

    if started {
      if voiceProcessingEnabled != voiceProcessing {
        throw SharedVoiceEngineError.voiceProcessingTogglePostStart
      }
      return
    }

    do {
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
      started = true
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
      "[TbotVoice-debug] %@",
      "installInputTap rate=\(nativeFormat.sampleRate) channels=\(nativeFormat.channelCount) engineRunning=\(engine.isRunning) voiceProcessing=\(voiceProcessingEnabled)"
    )
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
