//
//  PcmStreamModuleTests.swift
//  TbotMobileTests — T5.1 scaffold.
//
//  Scaffolded per .omc/plans/ios-voice-production-architecture-2026-04-23.md §T5.1.
//  Tests here exercise PcmStreamModule's native behavior on a real device:
//    - drain sentinel timing (endTurn → voicePlaybackDrained within expected ms)
//    - interrupt idempotency (clear() + clear() does not crash AVAudioPlayerNode)
//    - turnGeneration monotonicity across interrupt+endTurn sequences
//    - scheduleBuffer completion parity with fedFrames counter
//
//  Simulator does NOT exercise real AVAudioEngine output — all tests skip
//  under the simulator and must run on a physical iPhone with speaker
//  access. See the existing SharedEngineSpikeTests.swift for the device-
//  only test pattern this file follows.
//

import AVFoundation
import XCTest

final class PcmStreamModuleTests: XCTestCase {

  func test_endTurn_fires_drained_event_within_deadline() throws {
    #if targetEnvironment(simulator)
    throw XCTSkip("AVAudioEngine output not exercised on simulator; run on physical device.")
    #else
    // TODO(T5.1): feed a known-length PCM burst, call endTurn(), wait for
    // voicePlaybackDrained, assert turnGeneration parity and framesPlayed
    // within ±20 ms of framesScheduled. Target p95 latency from endTurn() to
    // event: ≤ 200 ms + scheduled tail duration.
    throw XCTSkip("Pending T5.1 implementation — see plan §T5.1")
    #endif
  }
}
