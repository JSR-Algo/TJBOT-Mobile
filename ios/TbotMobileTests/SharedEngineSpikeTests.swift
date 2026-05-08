//
//  SharedEngineSpikeTests.swift
//  TbotMobileTests — MB-NATIVE-VOICE-003 pre-implementation spike.
//
//  Staged for the user's Xcode session that will add an XCTest Unit Testing
//  Bundle target. See `docs/adr/mb-native-voice-003-voice-processing-io.md`.
//
//  Question this spike answers: when an AVAudioPlayerNode is attached to
//  the SAME AVAudioEngine whose inputNode has `voiceProcessingEnabled=true`,
//  does the far-end audio scheduled through the player reach the voice-
//  processing AUHAL as a reference signal — i.e., does HW AEC cancel the
//  captured loopback from the player?
//
//  Test method (single test):
//    1. Create one AVAudioEngine.
//    2. Call `inputNode.setVoiceProcessingEnabled(true)` BEFORE any node
//       attach/tap — Apple's ordering requirement.
//    3. Attach an AVAudioPlayerNode via mainMixerNode.
//    4. Install an input tap; accumulate captured PCM during playback.
//    5. Schedule an 8 kHz sine tone @ 70 % volume for 1 second.
//    6. Start engine + player. Sleep 1 s. Stop.
//    7. Compute RMS of the captured input during the "playing" window.
//
//  PASS criterion: RMS < 0.02 of full-scale → HW AEC is cancelling the
//  loopback. SharedVoiceEngine's default shared-engine architecture stays.
//
//  FAIL criterion: RMS >= 0.02 → mic hears its own playback → HW AEC does
//  NOT get a reference signal from the shared player node. Remediation:
//  bifurcate SharedVoiceEngine.attachPlayerNode to attach to a SECOND
//  AVAudioEngine instance (mic and player cannot share HAL then).
//
//  NOTE: this test MUST run on a physical device. The simulator does not
//  exercise voiceProcessingIO — running under simulator will always
//  "pass" with near-zero input RMS and misinforms the architecture
//  decision.
//

import AVFoundation
import XCTest

final class SharedEngineSpikeTests: XCTestCase {

  /// RMS threshold for loopback detection. Values below 0.02 of full-scale
  /// (≈ -34 dBFS) indicate the voice-processing AUHAL is cancelling the
  /// reference signal effectively. Chosen to match plan §4 AC-2.
  private static let maxLoopbackRms: Float = 0.02

  /// Sine frequency chosen to avoid the VP AUHAL's ducking band (typical
  /// bass-ducking filter below 200 Hz) and stay under the Nyquist of the
  /// typical 16 kHz voice-processing pipeline.
  private static let sineHz: Float = 800.0

  /// Playback volume as a linear scalar. 0.7 = ~ -3 dBFS.
  private static let playbackVolume: Float = 0.7

  func test_voiceProcessingIO_cancels_loopback_on_shared_engine() throws {
    #if targetEnvironment(simulator)
    throw XCTSkip("voiceProcessingIO AEC not exercised on simulator; run on physical device.")
    #else

    // --- 1. Audio session owned by XCTest host (not VoiceSessionModule).
    // XCTest targets run outside the TbotMobile RN bridge. We set the
    // session category minimally here to let voiceProcessingIO activate.
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(
      .playAndRecord,
      mode: .voiceChat,
      options: [.allowBluetooth, .defaultToSpeaker]
    )
    try session.setActive(true, options: .notifyOthersOnDeactivation)
    defer { try? session.setActive(false, options: .notifyOthersOnDeactivation) }

    // --- 2. Engine + voiceProcessingIO toggle BEFORE attach.
    let engine = AVAudioEngine()
    try engine.inputNode.setVoiceProcessingEnabled(true)
    XCTAssertTrue(
      engine.inputNode.isVoiceProcessingEnabled,
      "setVoiceProcessingEnabled(true) did not stick — HW AEC not active"
    )

    // --- 3. Attach player node, connect via mainMixer.
    let player = AVAudioPlayerNode()
    engine.attach(player)
    engine.connect(player, to: engine.mainMixerNode, format: nil)

    // --- 4. Capture tap — we collect captured-PCM RMS energy, not the raw
    // samples, to keep memory bounded and because the test doesn't care
    // about the content — only the loudness.
    var samplesSum: Double = 0
    var samplesCount: Int = 0
    let tapLock = NSLock()

    let inputFormat = engine.inputNode.inputFormat(forBus: 0)
    engine.inputNode.installTap(
      onBus: 0,
      bufferSize: 4096,
      format: inputFormat
    ) { buffer, _ in
      guard let channelData = buffer.floatChannelData?[0] else { return }
      let frameCount = Int(buffer.frameLength)
      var localSum: Double = 0
      for i in 0..<frameCount {
        let s = channelData[i]
        localSum += Double(s * s)
      }
      tapLock.lock()
      samplesSum += localSum
      samplesCount += frameCount
      tapLock.unlock()
    }

    // --- 5. Build a 1-second sine buffer in the mixer's output format.
    let outFormat = engine.mainMixerNode.outputFormat(forBus: 0)
    let frameRate = Float(outFormat.sampleRate)
    let durationSec: Float = 1.0
    let totalFrames = AVAudioFrameCount(frameRate * durationSec)
    guard
      let sineBuffer = AVAudioPCMBuffer(pcmFormat: outFormat, frameCapacity: totalFrames)
    else {
      XCTFail("could not allocate sine buffer")
      return
    }
    sineBuffer.frameLength = totalFrames
    let twoPi: Float = 2.0 * .pi
    let omega: Float = twoPi * Self.sineHz / frameRate
    if let data = sineBuffer.floatChannelData {
      for ch in 0..<Int(outFormat.channelCount) {
        for frame in 0..<Int(totalFrames) {
          data[ch][frame] = sinf(omega * Float(frame)) * Self.playbackVolume
        }
      }
    }

    // --- 6. Start, schedule, wait, stop.
    try engine.start()
    player.play()
    player.scheduleBuffer(sineBuffer, completionCallbackType: .dataPlayedBack) { _ in }

    // Give HAL ~100 ms to settle before measuring. Then wait ~1s for the
    // sine to fully play. +200 ms buffer for the tap callback flush.
    let expectation = XCTestExpectation(description: "sine played out")
    DispatchQueue.global().asyncAfter(deadline: .now() + 1.3) {
      expectation.fulfill()
    }
    wait(for: [expectation], timeout: 2.0)

    player.stop()
    engine.inputNode.removeTap(onBus: 0)
    engine.stop()

    // --- 7. Compute RMS and assert.
    tapLock.lock()
    let count = samplesCount
    let sum = samplesSum
    tapLock.unlock()
    XCTAssertGreaterThan(count, 0, "input tap delivered no frames")
    let rms = Float(sqrt(sum / Double(max(count, 1))))
    print("[spike] captured-input RMS = \(rms) over \(count) frames")

    XCTAssertLessThan(
      rms,
      Self.maxLoopbackRms,
      """
      HW AEC did NOT cancel loopback on shared engine.
      RMS=\(rms) >= threshold=\(Self.maxLoopbackRms).
      Remediation: fork SharedVoiceEngine.attachPlayerNode to attach the
      player to a SECOND AVAudioEngine (mic and player cannot share HAL
      with HW AEC). Update the ADR status to Rejected.
      """
    )
    #endif
  }

  /// Companion spike for the SILENT-PLAYBACK regression path that caused
  /// the earlier `.voiceChat` rollback (see `VoiceSessionModule.swift:80-87`
  /// comment). This test installs a tap on the MAIN MIXER OUTPUT — not the
  /// input — and measures whether the scheduled sine actually reaches the
  /// rendering stage. If the mixer output is silent under `.voiceChat`
  /// + voiceProcessingIO=true + shared engine, playback is being ducked/
  /// muted by Apple's voice-processing DSP, which was the root cause of
  /// the earlier regression.
  ///
  /// Gates plan P0-2 (flip session mode to `.voiceChat`). If this test
  /// FAILS, do NOT flip the mode — fall back to plan-B software AEC per
  /// `.omc/plans/ios-voice-production-architecture-2026-04-23.md §3.7`.
  ///
  /// Pass criterion: output-mixer RMS ≥ 0.1 during the sine window.
  /// Fail criterion: output-mixer RMS < 0.01 → silent-playback regression.
  /// In between: ambiguous — capture on real device and escalate.
  func test_voiceChat_shared_engine_playback_is_audible() throws {
    #if targetEnvironment(simulator)
    throw XCTSkip("voiceProcessingIO playback ducking not reproduced on simulator; run on physical device.")
    #else

    let session = AVAudioSession.sharedInstance()
    try session.setCategory(
      .playAndRecord,
      mode: .voiceChat,
      options: [.allowBluetooth, .defaultToSpeaker]
    )
    try session.setActive(true, options: .notifyOthersOnDeactivation)
    defer { try? session.setActive(false, options: .notifyOthersOnDeactivation) }
    try? session.overrideOutputAudioPort(.speaker)

    let engine = AVAudioEngine()
    try engine.inputNode.setVoiceProcessingEnabled(true)

    let player = AVAudioPlayerNode()
    engine.attach(player)
    engine.connect(player, to: engine.mainMixerNode, format: nil)
    player.volume = 1.0
    engine.mainMixerNode.outputVolume = 1.0

    // Tap the MIXER OUTPUT to measure whether the rendered audio reaches
    // the final stage. This is distinct from the input-tap in the AEC
    // spike — here we want to catch the case where scheduleBuffer
    // succeeds but the signal is muted by the VP DSP before reaching HAL.
    var outSum: Double = 0
    var outCount: Int = 0
    let outLock = NSLock()

    let outFormat = engine.mainMixerNode.outputFormat(forBus: 0)
    engine.mainMixerNode.installTap(
      onBus: 0,
      bufferSize: 4096,
      format: outFormat
    ) { buffer, _ in
      guard let channelData = buffer.floatChannelData?[0] else { return }
      let frameCount = Int(buffer.frameLength)
      var localSum: Double = 0
      for i in 0..<frameCount {
        let s = channelData[i]
        localSum += Double(s * s)
      }
      outLock.lock()
      outSum += localSum
      outCount += frameCount
      outLock.unlock()
    }

    // 800 Hz / 1 s sine at 0.7 amplitude — full-scale RMS = 0.7 / sqrt(2)
    // ≈ 0.495. A healthy mixer output under `.voiceChat` should measure
    // 60-90 % of that (≈ 0.30-0.45). A silent-playback regression measures
    // < 0.01.
    let frameRate = Float(outFormat.sampleRate)
    let totalFrames = AVAudioFrameCount(frameRate * 1.0)
    guard
      let sineBuffer = AVAudioPCMBuffer(pcmFormat: outFormat, frameCapacity: totalFrames)
    else {
      XCTFail("could not allocate sine buffer")
      return
    }
    sineBuffer.frameLength = totalFrames
    let omega: Float = 2.0 * .pi * 800.0 / frameRate
    if let data = sineBuffer.floatChannelData {
      for ch in 0..<Int(outFormat.channelCount) {
        for frame in 0..<Int(totalFrames) {
          data[ch][frame] = sinf(omega * Float(frame)) * 0.7
        }
      }
    }

    try engine.start()
    player.play()
    player.scheduleBuffer(sineBuffer, completionCallbackType: .dataPlayedBack) { _ in }

    let expectation = XCTestExpectation(description: "mixer-output sine captured")
    DispatchQueue.global().asyncAfter(deadline: .now() + 1.3) { expectation.fulfill() }
    wait(for: [expectation], timeout: 2.0)

    player.stop()
    engine.mainMixerNode.removeTap(onBus: 0)
    engine.stop()

    outLock.lock()
    let count = outCount
    let sum = outSum
    outLock.unlock()
    XCTAssertGreaterThan(count, 0, "mixer-output tap delivered no frames")

    let rms = Float(sqrt(sum / Double(max(count, 1))))
    print("[spike] mixer-output RMS under .voiceChat + voiceProcessingIO = \(rms) over \(count) frames")

    // Upper-bound assertion: playback is audible at speaker.
    XCTAssertGreaterThan(
      rms,
      0.1,
      """
      Silent-playback regression detected under .voiceChat + voiceProcessingIO.
      Mixer-output RMS=\(rms) < 0.1 (expected ~0.3-0.45 for full-scale sine).
      DO NOT flip VoiceSessionModule.swift mode to .voiceChat.
      Remediation: plan-B software AEC per
      .omc/plans/ios-voice-production-architecture-2026-04-23.md §3.7.
      """
    )
    #endif
  }
}
