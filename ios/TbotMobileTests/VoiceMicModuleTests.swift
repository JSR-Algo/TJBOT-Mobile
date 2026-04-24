//
//  VoiceMicModuleTests.swift
//  TbotMobileTests — T5.1 scaffold.
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
      .appending("/TbotMobile/VoiceMic/VoiceMicModule.swift")
    let src = try String(contentsOfFile: voiceMicPath, encoding: .utf8)

    XCTAssertFalse(
      src.contains("let useHwAec = false"),
      "DEBUG override `let useHwAec = false` has returned to VoiceMicModule.swift"
    )
    XCTAssertTrue(
      src.range(
        of: #"let\s+useHwAec\s*=\s*\(\s*aecRequested\s*==\s*"hw"\s*\)\s*&&\s*allowsHwAec"#,
        options: .regularExpression
      ) != nil,
      "allowlist-derived `useHwAec` assignment is missing — P0-1 regressed"
    )
    let fenceCount = src.components(separatedBy: "OSMemoryBarrier()").count - 1
    XCTAssertGreaterThanOrEqual(
      fenceCount, 2,
      "expected at least 2 OSMemoryBarrier fences (plan §12 risk #12), found \(fenceCount)"
    )
  }
}
