//
//  VoiceMicModuleTests.swift
//  TJBotMobileTests — T5.1 scaffold.
//
//  Scaffolded per .omc/plans/ios-voice-production-architecture-2026-04-23.md §T5.1.
//  Tests here cover VoiceMicModule + SharedVoiceEngine input-path behavior:
//    - installTap delivers 16 kHz Int16 mono frames at steady-state
//    - AVAudioConverter handles a mismatched HAL rate (48 kHz → 16 kHz)
//    - stall watchdog emits voiceMicStalled after 2 s of no frames
//    - voiceProcessingEnabled=true does not crash on start/stop cycle
//      (guards against the regression that forced useHwAec=false)
//    - unsynchronized tap-thread reads honor OSMemoryBarrier write ordering
//
//  Simulator has no real microphone IO — all tests skip under simulator and
//  must run on a physical iPhone with mic permission granted.
//

import AVFoundation
import XCTest

final class VoiceMicModuleTests: XCTestCase {

  /// Locks in the P0-1 fix. Before P0-1, `VoiceMicModule.swift:147` had
  /// `let useHwAec = false` — a DEBUG override masking a suspected crash
  /// under voiceProcessingIO start/stop cycles. P0-1 restored the
  /// allowlist logic AND added `OSMemoryBarrier()` fences (plan §12 risk
  /// #12) to guard cross-thread reads of mutable tap state. This test
  /// exercises the pattern the DEBUG flag was disabling.
  ///
  /// Stays green if: 10 consecutive start → install-tap → stop cycles
  /// complete without crashing and SharedVoiceEngine returns clean state.
  /// Breaks if a future regression re-introduces the thread-safety bug.
  func test_voiceProcessing_start_stop_cycle_does_not_crash() throws {
    #if targetEnvironment(simulator)
    throw XCTSkip("voiceProcessingIO not exercised on simulator; run on physical device.")
    #else

    let session = AVAudioSession.sharedInstance()
    try session.setCategory(
      .playAndRecord,
      mode: .default,
      options: [.allowBluetooth, .defaultToSpeaker]
    )
    try session.setActive(true, options: .notifyOthersOnDeactivation)
    defer { try? session.setActive(false, options: .notifyOthersOnDeactivation) }

    let engine = SharedVoiceEngine.shared

    for cycle in 0..<10 {
      try engine.ensureStarted(voiceProcessing: true)
      XCTAssertTrue(
        engine.isVoiceProcessingEnabled(),
        "voiceProcessing did not stick on cycle \(cycle)"
      )
      XCTAssertTrue(engine.isRunning(), "engine not running after ensureStarted on cycle \(cycle)")

      var tapFired = false
      let tapLock = NSLock()
      _ = try engine.installInputTap(bufferSize: 1024) { _, _ in
        tapLock.lock()
        tapFired = true
        tapLock.unlock()
      }

      // Let the HAL deliver at least a few callbacks.
      let exp = XCTestExpectation(description: "tap fires cycle \(cycle)")
      DispatchQueue.global().asyncAfter(deadline: .now() + 0.25) { exp.fulfill() }
      wait(for: [exp], timeout: 1.0)

      engine.removeInputTap()
      let snapshot = engine.snapshot()
      XCTAssertEqual(snapshot["micUsers"] as? Int, 0, "micUsers non-zero after removeInputTap on cycle \(cycle)")
      XCTAssertEqual(
        snapshot["inputTapInstalled"] as? Bool, false,
        "tap still installed on cycle \(cycle)"
      )

      tapLock.lock()
      let fired = tapFired
      tapLock.unlock()
      XCTAssertTrue(fired, "no tap callbacks during cycle \(cycle) — mic path broken")
    }

    let final = engine.snapshot()
    XCTAssertEqual(final["micUsers"] as? Int, 0)
    XCTAssertEqual(final["playerUsers"] as? Int, 0)
    #endif
  }

  /// Locks in the allowlist logic restored by P0-1. Runs on simulator too —
  /// inspects source text, not the HAL. Flips only if someone re-introduces
  /// `let useHwAec = false` OR removes the OSMemoryBarrier fences.
  func test_useHwAec_is_not_hardcoded_to_false() throws {
    let filePath = #filePath
    let testsDir = (filePath as NSString).deletingLastPathComponent
    let voiceMicPath = (testsDir as NSString)
      .deletingLastPathComponent
      .appending("/TJBotMobile/VoiceMic/VoiceMicModule.swift")
    let src = try String(contentsOfFile: voiceMicPath, encoding: .utf8)

    XCTAssertFalse(
      src.contains("let useHwAec = false"),
      "DEBUG override `let useHwAec = false` has returned to VoiceMicModule.swift"
    )
    XCTAssertTrue(
      src.range(
        of: #"var\s+useHwAec\s*=\s*\(\s*aecRequested\s*==\s*"hw"\s*\)\s*&&\s*allowsHwAec"#,
        options: .regularExpression
      ) != nil,
      "allowlist-derived `useHwAec` assignment is missing — P0-1 regressed"
    )
    XCTAssertTrue(
      src.contains("\"iPhone12,8\""),
      "iPhone SE (2nd gen) must stay on the AEC fallback list"
    )
    XCTAssertTrue(
      src.contains("voiceAecAttachFailed"),
      "iOS AEC downgrade must emit the cross-platform fallback event"
    )
    let voiceSessionPath = (testsDir as NSString)
      .deletingLastPathComponent
      .appending("/TJBotMobile/VoiceSession/VoiceSessionModule.swift")
    let sessionSrc = try String(contentsOfFile: voiceSessionPath, encoding: .utf8)
    XCTAssertTrue(
      sessionSrc.contains("\"iPhone12,8\""),
      "VoiceSession preflight must use the same iPhone SE AEC fallback"
    )
    let fenceCount = src.components(separatedBy: "OSMemoryBarrier()").count - 1
    XCTAssertGreaterThanOrEqual(
      fenceCount, 2,
      "expected at least 2 OSMemoryBarrier fences (plan §12 risk #12), found \(fenceCount)"
    )
  }

  /// Locks in the iOS software echo gate used when an allowlisted device
  /// cannot use voiceProcessingIO. This is source-level because simulator
  /// cannot exercise speaker-to-mic loopback.
  func test_ios_aec_fallback_gate_is_wired_to_playback_activity() throws {
    let filePath = #filePath
    let testsDir = (filePath as NSString).deletingLastPathComponent
    let appDir = (testsDir as NSString).deletingLastPathComponent
    let voiceMicPath = (appDir as NSString)
      .appending("/TJBotMobile/VoiceMic/VoiceMicModule.swift")
    let pcmStreamPath = (appDir as NSString)
      .appending("/TJBotMobile/PcmStream/PcmStreamModule.swift")
    let micSrc = try String(contentsOfFile: voiceMicPath, encoding: .utf8)
    let pcmSrc = try String(contentsOfFile: pcmStreamPath, encoding: .utf8)

    XCTAssertTrue(
      micSrc.contains("device_aec_fallback_allowlist"),
      "allowlist AEC downgrade must emit voiceAecAttachFailed so JS enables the fallback gate"
    )
    XCTAssertTrue(
      micSrc.contains("fallbackGateEnabled") && micSrc.contains("fallbackThreshold"),
      "iOS VoiceMicModule must implement the software fallback gate, not stub it"
    )
    XCTAssertTrue(
      micSrc.contains(#"self.fallbackGateEnabled = (self.effectiveAecMode != "hw" && aecRequested == "hw")"#),
      "iOS AEC downgrade must enable the fallback gate natively, without relying on a JS event round trip"
    )
    XCTAssertTrue(
      micSrc.contains("VoicePlaybackActivity.isActive") &&
        micSrc.contains("shouldDropForFallbackGate = true") &&
        !micSrc.contains("rms < self.fallbackThreshold"),
      "iOS fallback gate must drop every mic frame while fallback speaker playback is active"
    )
    XCTAssertTrue(
      micSrc.contains("playbackTailMs") && micSrc.contains("tailUntil"),
      "iOS playback activity must remain active briefly after drain to cover acoustic tail"
    )
    XCTAssertFalse(
      micSrc.contains("iOS stub — voiceProcessingIO provides sufficient AEC"),
      "iOS fallback gate must not be a no-op stub"
    )
    XCTAssertTrue(
      pcmSrc.contains("VoicePlaybackActivity.setActive(active)") &&
        pcmSrc.contains("notifyPlaybackActive(true)") &&
        pcmSrc.contains("notifyPlaybackActive(false)"),
      "PcmStreamModule must publish playback active/inactive so the mic gate only runs during speaker output"
    )
    let startResponseRange = pcmSrc.range(of: "func startResponse(")
    XCTAssertNotNil(startResponseRange, "PcmStreamModule.startResponse must exist")
    if let startResponseRange {
      let block = String(pcmSrc[startResponseRange.lowerBound..<pcmSrc.index(startResponseRange.lowerBound, offsetBy: min(900, pcmSrc.distance(from: startResponseRange.lowerBound, to: pcmSrc.endIndex)))])
      XCTAssertTrue(
        block.contains("self.fedFrames = 0") &&
          block.contains("self.playedFrames = 0") &&
          block.contains("self.playbackStarted = false") &&
          block.contains("self.turnOpen = true"),
        "PcmStreamModule.startResponse must reset per-turn playback state so response 2+ re-publishes playback active"
      )
    }
  }
}
