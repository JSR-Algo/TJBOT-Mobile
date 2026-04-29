/**
 * Typed native→JS event schema for the voice stack (sys-16).
 *
 * Single source of truth for what native modules (VoiceSessionModule,
 * VoiceMicModule, PcmStreamModule) emit over DeviceEventManagerModule /
 * RCTDeviceEventEmitter. Keep every field the native side writes in the
 * discriminated union below; the telemetry forwarder in
 * `src/observability/voice-telemetry.ts` relies on the exhaustive `event`
 * tag for compile-time breadcrumb routing.
 *
 * Schema is intentionally COPPA-safe: we record device-type info (speaker,
 * earpiece, bluetooth, wired) and route IDs, never user-identifiable audio
 * content. `deviceName` may include manufacturer strings like "AirPods Pro"
 * — acceptable as device metadata, never a user identifier.
 */

// ─── Shared primitives ──────────────────────────────────────────────────

export type VoiceRoute = 'speaker' | 'earpiece' | 'bluetooth' | 'wired' | 'none';

export type VoiceSessionState = 'active' | 'transientLoss' | 'lost' | 'inactive';

export type Platform = 'android' | 'ios';

// ─── Events emitted by VoiceSessionModule ───────────────────────────────

export interface VoiceSessionStateChangeEvent {
  event: 'voiceSessionStateChange';
  state: VoiceSessionState;
  reason: string;
  route: VoiceRoute;
}

/**
 * Fired by VoiceSessionModule after a media-services-reset recovery completes.
 * Downstream modules (VoiceMicModule, PcmStreamModule) listen for this to
 * re-init their taps and player nodes — the engine's underlying RemoteIO units
 * were invalidated by the system and must be rebuilt. Plan §3.3 P0-5.
 */
export interface VoiceSessionRecoveredEvent {
  event: 'voiceSessionRecovered';
  reason: 'mediaServicesReset' | 'interruptionEnded' | 'foregroundResume';
}

export interface VoiceRouteChangeEvent {
  event: 'voiceRouteChange';
  route: VoiceRoute;
  deviceId: number;
  deviceName: string;
  changeReason?: string;
}

// ─── Events emitted by VoiceMicModule ───────────────────────────────────

export interface VoiceMicStalledEvent {
  event: 'voiceMicStalled';
  lastFrameAgeMs: number;
  fatal: boolean;
}

/**
 * Android-only. Emitted when AcousticEchoCanceler.create() fails or .enabled
 * stays false after attach. iOS never emits this — iOS uses voiceProcessingIO
 * which has no equivalent failure mode. Hook responds by calling
 * VoiceMic.setAecFallbackGate(true, 0.04) (plan §5.1).
 */
export interface VoiceAecAttachFailedEvent {
  event: 'voiceAecAttachFailed';
  /** Human-readable failure reason from the AEC attach site */
  reason: string;
  /** Android audio session ID at time of failure (for diagnostics) */
  modelCode: number;
  /** Build.MODEL of the device (for AEC allowlist tuning) */
  deviceCode: string;
}

/**
 * Fired by VoiceMicModule (iOS + Android) the FIRST time a frame is actually
 * delivered for a given start() cycle. `start()` resolving only proves the
 * engine *began* configuration; this event proves the audio path is *live*
 * (tap installed on iOS, AudioRecord.read returned a positive count on
 * Android). It is the only sound trigger for the FSM `ready → listening`
 * transition (plan §3.2 row `ready`, §3.5 frozen wire, §6.3 row 3 — replaces
 * the old `setTimeout(50)` re-arm).
 *
 * Fires AT MOST ONCE per start() / stop() cycle. The native module resets
 * its "first-frame" latch on stop and on next start.
 */
export interface VoiceMicEngineReadyEvent {
  event: 'voiceMicEngineReady';
  /** ms since stream start (native monotonic clock); 0 on the very first frame */
  firstFrameAgeMs: number;
  /** Effective sample rate the engine actually delivered (post-resample on iOS, native on Android) */
  sampleRate: number;
}

// ─── Events emitted by PcmStreamModule (future) ─────────────────────────

export interface VoicePlaybackStalledEvent {
  event: 'voicePlaybackStalled';
  bufferedMs: number;
  framesSinceLastAdvance: number;
}

/**
 * iOS-only drain sentinel completion. Fires once per `endTurn()` when the
 * tail-silence buffer finishes rendering. `turnGeneration` matches the JS
 * counter in {@link PcmStreamPlayer}; stale events from interrupted turns
 * are filtered on the JS side. See `.omc/plans/ios-voice-drain-sentinel-2026-04-22.md`.
 */
export interface VoicePlaybackDrainedEvent {
  event: 'voicePlaybackDrained';
  turnGeneration: number;
  framesPlayed: number;
  framesScheduled: number;
  reason: string;
}

/**
 * Fired by VoiceMicModule (iOS + Android) when native energy+ZCR VAD detects
 * speech onset (plan §5.6). The first voiceMicData events after this carry
 * seq=-1 (pre-roll frames) to restore the 200ms leading the detection.
 */
export interface VoiceMicVadStartEvent {
  event: 'voiceMicVadStart';
}

/**
 * Fired when VAD hangover expires — speech ended. `hangoverMs` is the
 * hangover window that just elapsed (mirrors EXPO_PUBLIC_VOICE_VAD_HANGOVER_MS).
 */
export interface VoiceMicVadEndEvent {
  event: 'voiceMicVadEnd';
  hangoverMs: number;
}

// ─── Exhaustive union ────────────────────────────────────────────────────

export type VoiceTelemetryEvent =
  | VoiceSessionStateChangeEvent
  | VoiceRouteChangeEvent
  | VoiceSessionRecoveredEvent
  | VoiceMicStalledEvent
  | VoiceMicEngineReadyEvent
  | VoiceAecAttachFailedEvent
  | VoiceMicVadStartEvent
  | VoiceMicVadEndEvent
  | VoicePlaybackStalledEvent
  | VoicePlaybackDrainedEvent;

// ─── Native event-name string literals (used by NativeEventEmitter) ─────

export const VOICE_EVENT_NAMES = {
  sessionStateChange: 'voiceSessionStateChange',
  routeChange: 'voiceRouteChange',
  sessionRecovered: 'voiceSessionRecovered',
  micStalled: 'voiceMicStalled',
  micEngineReady: 'voiceMicEngineReady',
  micVadStart: 'voiceMicVadStart',
  aecAttachFailed: 'voiceAecAttachFailed',
  playbackStalled: 'voicePlaybackStalled',
  playbackDrained: 'voicePlaybackDrained',
  vadStart: 'voiceMicVadStart',
  vadEnd: 'voiceMicVadEnd',
} as const;

export type VoiceEventName = (typeof VOICE_EVENT_NAMES)[keyof typeof VOICE_EVENT_NAMES];
