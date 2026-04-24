/**
 * voice-telemetry — forwards native voice-stack events to Sentry breadcrumbs.
 *
 * Subscribes at app boot (see `src/App.tsx` integration — one-liner call
 * to `startVoiceTelemetry()`) and forwards every typed event in
 * `voice-session-events.ts:VoiceTelemetryEvent` to `@sentry/react-native`
 * as a breadcrumb under category `voice.<subsystem>`.
 *
 * Privacy (sys-16 / COPPA): we do NOT forward audio content, transcripts,
 * or user identifiers. Only device-type route info, session state, and
 * native-side reason strings. `deviceName` (e.g. "AirPods Pro") is device
 * metadata, not a user identifier, and is acceptable for breadcrumbs per
 * Sentry's PII policy.
 */
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import {
  VOICE_EVENT_NAMES,
  type VoiceRouteChangeEvent,
  type VoiceSessionStateChangeEvent,
  type VoiceSessionRecoveredEvent,
  type VoiceMicStalledEvent,
  type VoicePlaybackStalledEvent,
  type VoicePlaybackDrainedEvent,
  type VoiceTelemetryEvent,
} from '../native/voice-session-events';

type Unsub = () => void;

let active = false;
let unsubs: Unsub[] = [];

/**
 * Map raw native emit payload (missing the `event` tag) into our typed
 * discriminated-union shape. Native modules emit the body only; we stamp
 * the tag on the JS side so the schema is authoritative in one place.
 */
function tagSessionState(
  payload: Omit<VoiceSessionStateChangeEvent, 'event'>,
): VoiceSessionStateChangeEvent {
  return { event: 'voiceSessionStateChange', ...payload };
}

function tagRoute(payload: Omit<VoiceRouteChangeEvent, 'event'>): VoiceRouteChangeEvent {
  return { event: 'voiceRouteChange', ...payload };
}

function tagSessionRecovered(
  payload: Omit<VoiceSessionRecoveredEvent, 'event'>,
): VoiceSessionRecoveredEvent {
  return { event: 'voiceSessionRecovered', ...payload };
}

function tagMicStall(payload: Omit<VoiceMicStalledEvent, 'event'>): VoiceMicStalledEvent {
  return { event: 'voiceMicStalled', ...payload };
}

function tagPlaybackStall(
  payload: Omit<VoicePlaybackStalledEvent, 'event'>,
): VoicePlaybackStalledEvent {
  return { event: 'voicePlaybackStalled', ...payload };
}

function tagPlaybackDrained(
  payload: Omit<VoicePlaybackDrainedEvent, 'event'>,
): VoicePlaybackDrainedEvent {
  return { event: 'voicePlaybackDrained', ...payload };
}

function breadcrumb(event: VoiceTelemetryEvent, category: string): void {
  // `lost` session state → warn. Drain events with a fallback/timeout reason
  // indicate the native sentinel never fired (JS safety-net tripped) → warn.
  // Everything else is informational.
  const isLostSession =
    event.event === 'voiceSessionStateChange' && event.state === 'lost';
  const isFallbackDrain =
    event.event === 'voicePlaybackDrained' &&
    /fallback|timeout/i.test(event.reason);
  const level: 'warning' | 'info' = isLostSession || isFallbackDrain ? 'warning' : 'info';
  try {
    Sentry.addBreadcrumb({
      category,
      level,
      message: event.event,
      data: { ...event, platform: Platform.OS },
      timestamp: Date.now() / 1000,
    });
  } catch {
    /* Sentry not initialized yet — fine in dev/test; do not swallow in hotpath */
  }
}

/**
 * Subscribe to every native voice event and mirror it as a Sentry breadcrumb.
 * Idempotent — calling twice is a no-op. Returns the tear-down function for
 * tests; in production the subscriptions live for the process lifetime.
 */
export function startVoiceTelemetry(): Unsub {
  if (active) return () => {};
  active = true;

  const voiceSession = NativeModules.VoiceSessionModule;
  const voiceMic = NativeModules.VoiceMicModule;
  const pcmStream = NativeModules.PcmStreamModule;

  if (voiceSession) {
    const em = new NativeEventEmitter(voiceSession);
    unsubs.push(
      em.addListener(VOICE_EVENT_NAMES.sessionStateChange, (raw: Omit<VoiceSessionStateChangeEvent, 'event'>) => {
        breadcrumb(tagSessionState(raw), 'voice.session');
      }).remove,
      em.addListener(VOICE_EVENT_NAMES.routeChange, (raw: Omit<VoiceRouteChangeEvent, 'event'>) => {
        breadcrumb(tagRoute(raw), 'voice.route');
      }).remove,
      em.addListener(VOICE_EVENT_NAMES.sessionRecovered, (raw: Omit<VoiceSessionRecoveredEvent, 'event'>) => {
        breadcrumb(tagSessionRecovered(raw), 'voice.session');
      }).remove,
    );
  }

  if (voiceMic) {
    const em = new NativeEventEmitter(voiceMic);
    unsubs.push(
      em.addListener(VOICE_EVENT_NAMES.micStalled, (raw: Omit<VoiceMicStalledEvent, 'event'>) => {
        breadcrumb(tagMicStall(raw), 'voice.mic');
      }).remove,
    );
  }

  if (pcmStream) {
    const em = new NativeEventEmitter(pcmStream);
    unsubs.push(
      em.addListener(VOICE_EVENT_NAMES.playbackStalled, (raw: Omit<VoicePlaybackStalledEvent, 'event'>) => {
        breadcrumb(tagPlaybackStall(raw), 'voice.playback');
      }).remove,
      em.addListener(VOICE_EVENT_NAMES.playbackDrained, (raw: Omit<VoicePlaybackDrainedEvent, 'event'>) => {
        breadcrumb(tagPlaybackDrained(raw), 'voice.drain');
      }).remove,
    );
  }

  return stopVoiceTelemetry;
}

/**
 * Emit a Sentry breadcrumb for a JS-side caught exception that we would
 * otherwise silently swallow. Callers on audio/session hot paths use this
 * to preserve an audit trail for post-mortem without surfacing an error
 * to the UI (the higher-level state machine decides that).
 *
 * The error is reduced to name + message — full stacks are heavy and
 * Sentry will capture the real stack via `Sentry.captureException` when
 * the hot path bubbles up.
 */
export function jsErrorBreadcrumb(
  where: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const name = err instanceof Error ? err.name : typeof err;
  const message = err instanceof Error ? err.message : String(err);
  try {
    Sentry.addBreadcrumb({
      category: 'voice.js-error',
      level: 'warning',
      message: where,
      data: { name, message, ...extra, platform: Platform.OS },
      timestamp: Date.now() / 1000,
    });
  } catch {
    /* Sentry not initialized yet — fine in dev/test */
  }
}

export function stopVoiceTelemetry(): void {
  if (!active) return;
  for (const u of unsubs) {
    try {
      u();
    } catch {
      /* best-effort cleanup */
    }
  }
  unsubs = [];
  active = false;
}
