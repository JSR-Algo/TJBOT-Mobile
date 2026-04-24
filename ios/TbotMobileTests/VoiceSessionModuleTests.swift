//
//  VoiceSessionModuleTests.swift
//  TbotMobileTests — behavioral tests for the AVAudioSession configuration
//  that `ios/TbotMobile/VoiceSession/VoiceSessionModule.swift` applies on
//  `startSession()`.
//
//  These tests do NOT import TbotMobile directly (the module references
//  React headers through the app's bridging header, which the test target
//  does not currently inherit — see TbotMobileTests/README.md). Instead
//  they exercise AVAudioSession / AVAudioEngine at the same call sites
//  and with the same arguments the module uses, proving the platform
//  contract the module relies on still holds on the device under test.
//
//  Keep these tests in lockstep with VoiceSessionModule.swift — if the
//  module changes its category / mode / options, update this file so
//  regressions surface here before they reach a user.
//
//  Simulator skip: AVAudioSession semantics on simulator diverge from
//  device (no Bluetooth route, category options silently demoted). All
//  tests skip under simulator.
//

import AVFoundation
import XCTest

final class VoiceSessionModuleTests: XCTestCase {

  // Mirrors the arguments at VoiceSessionModule.swift:88-92 (and 259-263,
  // 287-291, 435-439 — all four call sites are identical by design so the
  // recovery / reactivate paths apply the same contract as initial start).
  private static let expectedCategory: AVAudioSession.Category = .playAndRecord
  private static let expectedMode: AVAudioSession.Mode = .default
  private static let expectedOptions: AVAudioSession.CategoryOptions = [
    .allowBluetooth,
    .allowBluetoothA2DP,
    .defaultToSpeaker,
  ]

  // MARK: - Helpers

  private func applyModuleCategory() throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(
      Self.expectedCategory,
      mode: Self.expectedMode,
      options: Self.expectedOptions
    )
    try session.setActive(true, options: .notifyOthersOnDeactivation)
  }

  private func tearDownSession() {
    try? AVAudioSession.sharedInstance()
      .setActive(false, options: .notifyOthersOnDeactivation)
  }

  // MARK: - Tests

  /// Locks in B3 (2026-04-24) — the `.allowBluetoothA2DP` option was added
  /// alongside the existing `.allowBluetooth` (HFP) so BT headphones can
  /// actually render AI audio, not just route the mic. Regresses if future
  /// edits drop A2DP from the options array.
  func test_start_applies_expected_category_mode_and_options() throws {
    #if targetEnvironment(simulator)
    throw XCTSkip("AVAudioSession options behave differently on simulator — device-only")
    #else
    defer { tearDownSession() }

    try applyModuleCategory()
    let session = AVAudioSession.sharedInstance()

    XCTAssertEqual(session.category, Self.expectedCategory)
    XCTAssertEqual(session.mode, Self.expectedMode,
                   "mode must stay .default — B1 spike (2026-04-24) proved .voiceChat mutes playback on iOS 18.7.7")

    // Options are a raw-value bitmask; use contains() rather than ==
    // because iOS may silently add read-only options (e.g. legacy shims).
    let opts = session.categoryOptions
    XCTAssertTrue(opts.contains(.allowBluetooth), "HFP BT mic input missing")
    XCTAssertTrue(opts.contains(.allowBluetoothA2DP),
                  "A2DP BT output missing — B3 regression")
    XCTAssertTrue(opts.contains(.defaultToSpeaker), "defaultToSpeaker dropped")
    #endif
  }

  /// setActive(true) must succeed without throwing; the override to
  /// `.speaker` that VoiceSessionModule.swift applies after activation
  /// (line 95-97) must not fail either.
  func test_activate_and_override_to_speaker_succeeds() throws {
    #if targetEnvironment(simulator)
    throw XCTSkip("Speaker override is a no-op on simulator — device-only")
    #else
    defer { tearDownSession() }

    try applyModuleCategory()
    let session = AVAudioSession.sharedInstance()

    // The module calls this at VoiceSessionModule.swift ~95-97 as a
    // fallback for `.defaultToSpeaker` being advisory only. Must not throw.
    XCTAssertNoThrow(try session.overrideOutputAudioPort(.speaker))
    #endif
  }

  /// setPreferredSampleRate(48_000) and setPreferredIOBufferDuration(0.01)
  /// are advisory; iOS may coerce. The test asserts these calls don't throw
  /// and that the resulting session.sampleRate is a sane nonzero value.
  func test_preferred_sample_rate_and_buffer_duration_are_accepted() throws {
    #if targetEnvironment(simulator)
    throw XCTSkip("HAL rate coercion not representative on simulator — device-only")
    #else
    defer { tearDownSession() }

    try applyModuleCategory()
    let session = AVAudioSession.sharedInstance()

    XCTAssertNoThrow(try session.setPreferredSampleRate(48_000))
    XCTAssertNoThrow(try session.setPreferredIOBufferDuration(0.01))

    XCTAssertGreaterThan(session.sampleRate, 0,
                         "HAL negotiated sampleRate must be nonzero after activate")
    // Upper sanity bound — iPhone HAL never sits above 48 kHz for voice IO.
    XCTAssertLessThanOrEqual(session.sampleRate, 48_000 + 100,
                             "HAL sampleRate above 48 kHz is unexpected on iPhone voice path")
    #endif
  }

  /// Registering + unregistering interruption observer — the module does
  /// this at VoiceSessionModule.swift:349-383. The test validates that the
  /// notification name is still a valid NSNotification and that adding an
  /// observer block does not throw.
  func test_interruption_observer_registers_and_deregisters() throws {
    let center = NotificationCenter.default
    var observed = false
    let obs = center.addObserver(
      forName: AVAudioSession.interruptionNotification,
      object: nil,
      queue: nil
    ) { _ in observed = true }
    defer { center.removeObserver(obs) }

    // Post a fabricated interruption-began notification to prove our block
    // fires and the name spelling is still current.
    center.post(
      name: AVAudioSession.interruptionNotification,
      object: AVAudioSession.sharedInstance(),
      userInfo: [AVAudioSessionInterruptionTypeKey: AVAudioSession.InterruptionType.began.rawValue]
    )
    XCTAssertTrue(observed, "interruption observer did not fire on posted notification")
  }

  /// Route-change notification registration. Same shape as interruption —
  /// locks in that `AVAudioSession.routeChangeNotification` is the symbol
  /// our module listens to (line 385-418).
  func test_route_change_observer_fires_on_posted_notification() throws {
    let center = NotificationCenter.default
    var observed = false
    let obs = center.addObserver(
      forName: AVAudioSession.routeChangeNotification,
      object: nil,
      queue: nil
    ) { _ in observed = true }
    defer { center.removeObserver(obs) }

    center.post(
      name: AVAudioSession.routeChangeNotification,
      object: AVAudioSession.sharedInstance(),
      userInfo: [
        AVAudioSessionRouteChangeReasonKey:
          AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue,
      ]
    )
    XCTAssertTrue(observed, "routeChange observer did not fire on posted notification")
  }

  /// mediaServicesWereReset — rare but load-bearing recovery path
  /// (VoiceSessionModule.swift:420-451). Asserts the notification name is
  /// still correct.
  func test_media_services_reset_observer_fires_on_posted_notification() throws {
    let center = NotificationCenter.default
    var observed = false
    let obs = center.addObserver(
      forName: AVAudioSession.mediaServicesWereResetNotification,
      object: nil,
      queue: nil
    ) { _ in observed = true }
    defer { center.removeObserver(obs) }

    center.post(
      name: AVAudioSession.mediaServicesWereResetNotification,
      object: AVAudioSession.sharedInstance()
    )
    XCTAssertTrue(observed, "mediaServicesWereReset observer did not fire on posted notification")
  }
}
