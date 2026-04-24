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

// ─── Exhaustive union ────────────────────────────────────────────────────

export type VoiceTelemetryEvent =
  | VoiceSessionStateChangeEvent
  | VoiceRouteChangeEvent
  | VoiceSessionRecoveredEvent
  | VoiceMicStalledEvent
  | VoicePlaybackStalledEvent
  | VoicePlaybackDrainedEvent;

// ─── Native event-name string literals (used by NativeEventEmitter) ─────

export const VOICE_EVENT_NAMES = {
  sessionStateChange: 'voiceSessionStateChange',
  routeChange: 'voiceRouteChange',
  sessionRecovered: 'voiceSessionRecovered',
  micStalled: 'voiceMicStalled',
  playbackStalled: 'voicePlaybackStalled',
  playbackDrained: 'voicePlaybackDrained',
} as const;

export type VoiceEventName = (typeof VOICE_EVENT_NAMES)[keyof typeof VOICE_EVENT_NAMES];
