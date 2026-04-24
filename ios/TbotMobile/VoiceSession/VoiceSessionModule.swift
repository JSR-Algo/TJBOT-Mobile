//
//  VoiceSessionModule.swift
//  TbotMobile — sys-16 realtime voice (Gemini Live).
//
//  Single owner of AVAudioSession state for the duration of a voice
//  conversation. Mirrors the Android VoiceSessionModule contract so the
//  JS shim in src/native/VoiceSession.ts is platform-symmetric.
//
//  This module OWNS category, mode, options, activation, and the four
//  lifecycle observers (interruption, route change, media services reset,
//  app background/foreground). It does NOT own AVAudioEngine or
//  voiceProcessingIO — those are the province of VoiceMicModule and
//  PcmStreamModule (pending, see plan §5 MB-NATIVE-VOICE-003 / 004). This
//  split keeps MB-NATIVE-VOICE-001 shippable without the voiceProcessingIO
//  spike result.
//

import AVFoundation
import Foundation
import React
import UIKit

@objc(VoiceSessionModule)
final class VoiceSessionModule: RCTEventEmitter {
  // MARK: - State

  private var sessionActive: Bool = false
  private var hasListeners: Bool = false
  private var observersInstalled: Bool = false

  private var previousCategory: AVAudioSession.Category?
  private var previousMode: AVAudioSession.Mode?
  private var previousOptions: AVAudioSession.CategoryOptions = []

  private var currentRoute: String = Route.speaker

  // MARK: - RCTEventEmitter overrides

  override init() {
    super.init()
  }

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return [Event.stateChange, Event.routeChange, Event.sessionRecovered]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  // MARK: - Bridge methods

  @objc(startSession:rejecter:)
  func startSession(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let session = AVAudioSession.sharedInstance()

    if sessionActive {
      structLog(event: "start_noop", details: ["reason": "already_active"])
      resolve(nil)
      return
    }

    // Snapshot the prior session config so endSession can restore it.
    previousCategory = session.category
    previousMode = session.mode
    previousOptions = session.categoryOptions

    do {
      // Mode: `.default` (was `.voiceChat`). `.voiceChat` activates Apple's
      // output-side voice-processing DSP which ducks/mutes playback to
      // prevent echo feedback — on iPhone this produces silent AI responses
      // even when scheduleBuffer() succeeds. `.default` keeps playback
      // audible at the cost of HW AEC (RNLAS mic doesn't use voiceProcessing
      // IO anyway, so nothing lost vs today). See
      // docs/qa/ad-hoc/2026-04-22-mb-native-voice-001-003-004.md + the
      // silent-playback follow-up plan.
      try session.setCategory(
        .playAndRecord,
        mode: .default,
        options: [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker]
      )
      try session.setActive(true, options: .notifyOthersOnDeactivation)

      // Force-override output to speaker right after activation.
      // `.defaultToSpeaker` in options is advisory — some device states
      // still route to earpiece. This explicit override guarantees loa
      // ngoài for voice conversations until JS explicitly requests a
      // different route via setRoute(...).
      try? session.overrideOutputAudioPort(.speaker)

      // Best-effort latency tuning — these throw only when the HAL rejects
      // the request, which is recoverable. Non-fatal.
      try? session.setPreferredSampleRate(48_000)
      try? session.setPreferredIOBufferDuration(0.01)

      registerObservers()
      sessionActive = true
      currentRoute = routeForCurrentOutput()

      // P0-8: log actual HAL values immediately after activation so every
      // session snapshot in Sentry shows what the hardware really gave us
      // (sampleRate, ioBufferDuration, latencies). Requests above are
      // advisory — this is the source of truth.
      structLog(event: "session_diagnostics", details: [
        "category": session.category.rawValue,
        "mode": session.mode.rawValue,
        "sampleRate": session.sampleRate,
        "ioBufferDuration": session.ioBufferDuration,
        "inputLatency": session.inputLatency,
        "outputLatency": session.outputLatency,
        "route": currentRoute,
        "isOtherAudioPlaying": session.isOtherAudioPlaying,
      ])

      emitState(state: State.active, reason: "start")
      resolve(nil)
    } catch {
      structLog(event: "start_failed", details: ["err": error.localizedDescription])
      reject("E_START", error.localizedDescription, error)
    }
  }

  @objc(endSession:rejecter:)
  func endSession(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard sessionActive else {
      resolve(nil)
      return
    }

    unregisterObservers()

    let session = AVAudioSession.sharedInstance()
    do {
      if let cat = previousCategory, let mode = previousMode {
        try? session.setCategory(cat, mode: mode, options: previousOptions)
      }
      try session.setActive(false, options: .notifyOthersOnDeactivation)
      sessionActive = false
      emitState(state: State.inactive, reason: "end")
      resolve(nil)
    } catch {
      structLog(event: "end_err", details: ["err": error.localizedDescription])
      // Not fatal — the session is ending anyway; surface as a warning.
      sessionActive = false
      emitState(state: State.inactive, reason: "end_with_err")
      resolve(nil)
    }
  }

  @objc(setRoute:resolver:rejecter:)
  func setRoute(
    _ route: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard sessionActive else {
      reject("E_NO_SESSION", "setRoute requires an active session", nil)
      return
    }

    let session = AVAudioSession.sharedInstance()
    do {
      switch route {
      case Route.speaker:
        try session.overrideOutputAudioPort(.speaker)
      case Route.earpiece:
        try session.overrideOutputAudioPort(.none)
      case Route.bluetooth, Route.wired:
        try session.overrideOutputAudioPort(.none)
        if let preferred = findPreferredInput(for: route) {
          try? session.setPreferredInput(preferred)
        }
      default:
        // Fall back to speaker for unrecognized routes.
        try session.overrideOutputAudioPort(.speaker)
      }
      currentRoute = route
      emitRoute(
        route: route,
        deviceName: session.currentRoute.outputs.first?.portName ?? "",
        changeReason: "manual"
      )
      resolve(currentRoute)
    } catch {
      structLog(event: "set_route_err", details: ["route": route, "err": error.localizedDescription])
      reject("E_ROUTE", error.localizedDescription, error)
    }
  }

  @objc(getRoute:rejecter:)
  func getRoute(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(sessionActive ? currentRoute : Route.none)
  }

  /// P0-8: exposes the actual (post-activation) AVAudioSession values.
  /// preferred* fields are what we REQUESTED; the non-preferred fields are
  /// what the HAL actually gave us. BT SCO commonly rejects 48 kHz and
  /// substitutes 8/16 kHz; wired headphones commonly substitute 44.1 kHz.
  /// Meaningful only when sessionActive=true; reads before startSession
  /// return the shared-instance defaults, not our session's values.
  @objc(getDiagnostics:rejecter:)
  func getDiagnostics(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let session = AVAudioSession.sharedInstance()
    resolve([
      "sessionActive": sessionActive,
      "category": session.category.rawValue,
      "mode": session.mode.rawValue,
      "sampleRate": session.sampleRate,
      "ioBufferDuration": session.ioBufferDuration,
      "inputLatency": session.inputLatency,
      "outputLatency": session.outputLatency,
      "route": sessionActive ? currentRoute : Route.none,
      "isOtherAudioPlaying": session.isOtherAudioPlaying,
      "preferredSampleRate": session.preferredSampleRate,
      "preferredIOBufferDuration": session.preferredIOBufferDuration,
    ])
  }

  /// Re-apply the session category/mode/options and speaker override
  /// WITHOUT deactivating+reactivating the session. Designed for the
  /// RNLAS-coexistence case: when another audio library flips the
  /// session to `.voiceChat` (which mutes AVAudioPlayerNode output),
  /// we need to flip it back to `.default` without tearing down the
  /// other library's in-flight AudioQueue capture — `forceRecover`
  /// does setActive(false)/setActive(true) which stalls that AudioQueue
  /// and kills mic delivery. This variant touches only the category
  /// surface, which the system can change on an already-active session.
  @objc(reapplyCategory:rejecter:)
  func reapplyCategory(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard sessionActive else {
      resolve(false)
      return
    }
    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(
        .playAndRecord,
        mode: .default,
        options: [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker]
      )
      try? session.overrideOutputAudioPort(.speaker)
      currentRoute = routeForCurrentOutput()
      structLog(event: "reapply_category", details: ["route": currentRoute])
      resolve(true)
    } catch {
      structLog(event: "reapply_err", details: ["err": error.localizedDescription])
      reject("E_REAPPLY", error.localizedDescription, error)
    }
  }

  @objc(forceRecover:rejecter:)
  func forceRecover(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard sessionActive else {
      resolve(false)
      return
    }

    let session = AVAudioSession.sharedInstance()
    do {
      // Mirror startSession: `.default` mode + explicit speaker override.
      try session.setCategory(
        .playAndRecord,
        mode: .default,
        options: [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker]
      )
      try session.setActive(false, options: .notifyOthersOnDeactivation)
      try session.setActive(true, options: .notifyOthersOnDeactivation)
      try? session.overrideOutputAudioPort(.speaker)
      currentRoute = routeForCurrentOutput()
      structLog(event: "recover", details: ["route": currentRoute])
      emitState(state: State.active, reason: "recover")
      resolve(true)
    } catch {
      structLog(event: "recover_err", details: ["err": error.localizedDescription])
      reject("E_RECOVER", error.localizedDescription, error)
    }
  }

  // MARK: - Observers

  private func registerObservers() {
    guard !observersInstalled else { return }
    let nc = NotificationCenter.default
    nc.addObserver(
      self,
      selector: #selector(handleInterruption(_:)),
      name: AVAudioSession.interruptionNotification,
      object: nil
    )
    nc.addObserver(
      self,
      selector: #selector(handleRouteChange(_:)),
      name: AVAudioSession.routeChangeNotification,
      object: nil
    )
    nc.addObserver(
      self,
      selector: #selector(handleMediaServicesReset(_:)),
      name: AVAudioSession.mediaServicesWereResetNotification,
      object: nil
    )
    nc.addObserver(
      self,
      selector: #selector(handleAppDidEnterBackground(_:)),
      name: UIApplication.didEnterBackgroundNotification,
      object: nil
    )
    nc.addObserver(
      self,
      selector: #selector(handleAppWillEnterForeground(_:)),
      name: UIApplication.willEnterForegroundNotification,
      object: nil
    )
    observersInstalled = true
  }

  private func unregisterObservers() {
    guard observersInstalled else { return }
    NotificationCenter.default.removeObserver(self)
    observersInstalled = false
  }

  @objc private func handleInterruption(_ notification: Notification) {
    guard let info = notification.userInfo,
      let rawType = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: rawType)
    else { return }

    switch type {
    case .began:
      emitState(state: State.transientLoss, reason: "interruption_began")
    case .ended:
      let shouldResume: Bool = {
        if let rawOpts = info[AVAudioSessionInterruptionOptionKey] as? UInt {
          let opts = AVAudioSession.InterruptionOptions(rawValue: rawOpts)
          return opts.contains(.shouldResume)
        }
        return false
      }()
      if shouldResume {
        do {
          try AVAudioSession.sharedInstance().setActive(true, options: .notifyOthersOnDeactivation)
          emitState(state: State.active, reason: "interruption_ended_shouldResume")
        } catch {
          structLog(
            event: "interruption_resume_err",
            details: ["err": error.localizedDescription]
          )
          emitState(state: State.lost, reason: "reactivate_failed")
        }
      } else {
        emitState(state: State.lost, reason: "interruption_ended_noResume")
      }
    @unknown default:
      break
    }
  }

  @objc private func handleRouteChange(_ notification: Notification) {
    guard let info = notification.userInfo,
      let rawReason = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
      let reason = AVAudioSession.RouteChangeReason(rawValue: rawReason)
    else { return }

    let session = AVAudioSession.sharedInstance()
    let output = session.currentRoute.outputs.first
    let newRoute = routeString(for: output)
    let previousRoute = currentRoute

    // P0-6: when a connected output device disappears (headphones unplugged,
    // BT drop) iOS defaults to the earpiece. For a voice assistant this is
    // always wrong — user expects loa ngoài. Force back to speaker ONLY
    // when the user's previous intent was speaker AND the system moved us
    // to the receiver. Do NOT override when a new device genuinely appeared
    // (.newDeviceAvailable) or when the user explicitly picked a route via
    // setRoute(...).
    var finalRoute = newRoute
    if reason == .oldDeviceUnavailable,
       previousRoute == Route.speaker,
       output?.portType == .builtInReceiver {
      try? session.overrideOutputAudioPort(.speaker)
      finalRoute = Route.speaker
      structLog(event: "route_forced_speaker", details: ["from": previousRoute])
    }

    currentRoute = finalRoute
    emitRoute(
      route: finalRoute,
      deviceName: session.currentRoute.outputs.first?.portName ?? "",
      changeReason: reasonString(reason)
    )
  }

  @objc private func handleMediaServicesReset(_ notification: Notification) {
    structLog(event: "media_services_reset", details: ["session_active": sessionActive])
    guard sessionActive else { return }

    // P0-5: the system has invalidated every RemoteIO unit backing our
    // AVAudioEngine. Drop all stale engine state BEFORE reconfiguring the
    // session — the SharedVoiceEngine singleton is reused across session
    // lifetimes, and its refcounts + player-node array would otherwise point
    // at dead units. Downstream modules (VoiceMic, PcmStream) then observe
    // voiceSessionRecovered and re-arm their taps/players.
    SharedVoiceEngine.shared.handleMediaServicesReset()

    do {
      // Mirror startSession: `.default` mode + explicit speaker override.
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(
        .playAndRecord,
        mode: .default,
        options: [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker]
      )
      try session.setActive(true, options: .notifyOthersOnDeactivation)
      try? session.overrideOutputAudioPort(.speaker)
      emitState(state: State.active, reason: "media_services_reset_recovered")
      emitRecovered(reason: "mediaServicesReset")
    } catch {
      structLog(
        event: "media_services_reset_recover_err",
        details: ["err": error.localizedDescription]
      )
      emitState(state: State.lost, reason: "media_services_reset_reactivate_failed")
    }
  }

  @objc private func handleAppDidEnterBackground(_ notification: Notification) {
    structLog(event: "app_background", details: ["session_active": sessionActive])
  }

  @objc private func handleAppWillEnterForeground(_ notification: Notification) {
    structLog(event: "app_foreground", details: ["session_active": sessionActive])
    guard sessionActive else { return }
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setActive(true, options: .notifyOthersOnDeactivation)
      emitState(state: State.active, reason: "foreground_resume")
    } catch {
      structLog(
        event: "foreground_resume_err",
        details: ["err": error.localizedDescription]
      )
      emitState(state: State.lost, reason: "foreground_reactivate_failed")
    }
  }

  // MARK: - Route helpers

  private func routeForCurrentOutput() -> String {
    let session = AVAudioSession.sharedInstance()
    return routeString(for: session.currentRoute.outputs.first)
  }

  private func routeString(for port: AVAudioSessionPortDescription?) -> String {
    guard let port = port else { return Route.speaker }
    switch port.portType {
    case .builtInSpeaker:
      return Route.speaker
    case .builtInReceiver:
      return Route.earpiece
    case .bluetoothA2DP, .bluetoothHFP, .bluetoothLE:
      return Route.bluetooth
    case .headphones, .headsetMic, .usbAudio:
      return Route.wired
    default:
      return Route.speaker
    }
  }

  private func reasonString(_ reason: AVAudioSession.RouteChangeReason) -> String {
    switch reason {
    case .unknown: return "unknown"
    case .newDeviceAvailable: return "newDeviceAvailable"
    case .oldDeviceUnavailable: return "oldDeviceUnavailable"
    case .categoryChange: return "categoryChange"
    case .override: return "override"
    case .wakeFromSleep: return "wakeFromSleep"
    case .noSuitableRouteForCategory: return "noSuitableRouteForCategory"
    case .routeConfigurationChange: return "routeConfigurationChange"
    @unknown default: return "unknown"
    }
  }

  private func findPreferredInput(for route: String) -> AVAudioSessionPortDescription? {
    let session = AVAudioSession.sharedInstance()
    let inputs = session.availableInputs ?? []
    switch route {
    case Route.bluetooth:
      return inputs.first(where: { $0.portType == .bluetoothHFP || $0.portType == .bluetoothLE })
    case Route.wired:
      return inputs.first(where: { $0.portType == .headsetMic || $0.portType == .usbAudio })
    default:
      return nil
    }
  }

  // MARK: - Event emission

  private func emitState(state: String, reason: String) {
    let payload: [String: Any] = [
      "state": state,
      "reason": reason,
      "route": currentRoute,
    ]
    if hasListeners {
      sendEvent(withName: Event.stateChange, body: payload)
    }
    structLog(event: "state", details: payload)
  }

  private func emitRoute(route: String, deviceName: String, changeReason: String) {
    let payload: [String: Any] = [
      "route": route,
      "deviceId": -1,
      "deviceName": deviceName,
      "changeReason": changeReason,
    ]
    if hasListeners {
      sendEvent(withName: Event.routeChange, body: payload)
    }
    structLog(event: "route", details: payload)
  }

  /// P0-5: downstream modules (VoiceMicModule, PcmStreamModule) subscribe
  /// to this event to re-init their taps/players after the engine has been
  /// torn down and rebuilt. Emitted on media-services-reset recovery and
  /// (future) on interruption-ended reactivation.
  private func emitRecovered(reason: String) {
    let payload: [String: Any] = ["reason": reason]
    if hasListeners {
      sendEvent(withName: Event.sessionRecovered, body: payload)
    }
    structLog(event: "session_recovered", details: payload)
  }

  // MARK: - Structured logging

  /// Emits a single-line JSON log under tag [TbotVoice] — same wire format
  /// as Android's VoiceSessionModule.structLog so dashboards can merge.
  private func structLog(event: String, details: [String: Any]) {
    var sb = "{\"event\":\"\(escape(event))\""
    for (k, v) in details {
      sb += ",\"\(escape(k))\":"
      switch v {
      case let num as NSNumber:
        // Booleans on Apple platforms come through as NSNumber too; keep
        // the JSON representation native.
        if CFGetTypeID(num) == CFBooleanGetTypeID() {
          sb += (num.boolValue ? "true" : "false")
        } else {
          sb += "\(num)"
        }
      case let str as String:
        sb += "\"\(escape(str))\""
      default:
        sb += "\"\(escape(String(describing: v)))\""
      }
    }
    sb += "}"
    NSLog("[TbotVoice] %@", sb)
  }

  private func escape(_ s: String) -> String {
    return s.replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: "\"", with: "\\\"")
  }

  // MARK: - Constants

  private enum Route {
    static let speaker = "speaker"
    static let earpiece = "earpiece"
    static let bluetooth = "bluetooth"
    static let wired = "wired"
    static let none = "none"
  }

  private enum State {
    static let active = "active"
    static let transientLoss = "transientLoss"
    static let lost = "lost"
    static let inactive = "inactive"
  }

  private enum Event {
    static let stateChange = "voiceSessionStateChange"
    static let routeChange = "voiceRouteChange"
    static let sessionRecovered = "voiceSessionRecovered"
  }

  deinit {
    unregisterObservers()
  }
}
