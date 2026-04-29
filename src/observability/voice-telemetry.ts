/**
 * voice-telemetry — unified dispatcher for voice-stack telemetry.
 *
 * Plan §12.7 (single dispatcher) + §12.8 (Sentry breadcrumb cardinality).
 *
 * Public API:
 *   track(category, event, fields?)  — the single call site for all voice events
 *   startVoiceTelemetry()            — subscribe to native events at boot
 *   stopVoiceTelemetry()             — tear down (tests / hot-reload)
 *   jsErrorBreadcrumb(where, err)    — lightweight caught-error audit trail
 *
 * Cardinality strategy (plan §12.8):
 *   session, provider, barge_in, error  → always breadcrumb
 *   capture                             → sample 1-in-50; aggregate in 30s window
 *   playback                            → sample 1-in-25; aggregate in 30s window
 *
 * Privacy (sys-16 / COPPA): no audio content, transcripts, or user PII.
 * Only device-type routing, session state, and native reason strings.
 */

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { Config } from '../config';
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

// ── Types ─────────────────────────────────────────────────────────────────

export type VoiceTelemetryCategory =
  | 'session'
  | 'capture'
  | 'playback'
  | 'barge_in'
  | 'provider'
  | 'error';

// ── Sampling config (plan §12.8) ──────────────────────────────────────────

const SAMPLE_RATE: Partial<Record<VoiceTelemetryCategory, number>> = {
  capture: 50,   // 1-in-50
  playback: 25,  // 1-in-25
};

const ALWAYS_BREADCRUMB: Set<VoiceTelemetryCategory> = new Set([
  'session',
  'provider',
  'barge_in',
  'error',
]);

// ── 30-second aggregator (plan §12.8) ─────────────────────────────────────

interface CategoryAgg {
  count: number;
  firstAt: number;
  lastEvent: string;
}

const AGG_WINDOW_MS = 30_000;

const agg: Partial<Record<VoiceTelemetryCategory, CategoryAgg>> = {};
const aggTimers: Partial<Record<VoiceTelemetryCategory, ReturnType<typeof setTimeout>>> = {};

function flushAgg(category: VoiceTelemetryCategory): void {
  const a = agg[category];
  if (!a || a.count === 0) return;
  const windowSec = (Date.now() - a.firstAt) / 1000;
  try {
    Sentry.addBreadcrumb({
      category: `voice.${category}.summary`,
      level: 'info',
      message: `voice.${category}.summary`,
      data: {
        count: a.count,
        windowSec: +windowSec.toFixed(1),
        lastEvent: a.lastEvent,
        platform: Platform.OS,
      },
      timestamp: Date.now() / 1000,
    });
  } catch {
    /* Sentry not initialized */
  }
  delete agg[category];
  delete aggTimers[category];
}

function accumulateAgg(category: VoiceTelemetryCategory, event: string): void {
  const now = Date.now();
  const existing = agg[category];
  if (!existing) {
    agg[category] = { count: 1, firstAt: now, lastEvent: event };
    aggTimers[category] = setTimeout(() => flushAgg(category), AGG_WINDOW_MS);
  } else {
    existing.count++;
    existing.lastEvent = event;
  }
}

// ── QA-mode POST (plan §12.8) ─────────────────────────────────────────────

// Lazy import to avoid circular deps — apiClient lives in src/api/client.ts
// which imports from config.ts. We defer the require until first QA event so
// the module graph stays acyclic at parse time.
let _qaFlushScheduled = false;
const _qaQueue: Array<{ category: string; event: string; fields: Record<string, unknown> }> = [];

const QA_FLUSH_MS = 2_000;

function scheduleQaFlush(): void {
  if (_qaFlushScheduled) return;
  _qaFlushScheduled = true;
  setTimeout(() => {
    _qaFlushScheduled = false;
    if (_qaQueue.length === 0) return;
    const batch = _qaQueue.splice(0, _qaQueue.length);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { default: apiClient } = require('../api/client') as {
        default: { post: (url: string, data: unknown) => Promise<unknown> };
      };
      void apiClient
        .post('/qa/voice-events', { events: batch, platform: Platform.OS })
        .catch(() => {
          /* best-effort — QA endpoint may not be running */
        });
    } catch {
      /* apiClient unavailable in test env */
    }
  }, QA_FLUSH_MS);
}

// ── Sampling counter (module-level, reset-proof via closure) ───────────────

const sampleCounters: Partial<Record<VoiceTelemetryCategory, number>> = {};

function shouldBreadcrumb(category: VoiceTelemetryCategory): boolean {
  if (ALWAYS_BREADCRUMB.has(category)) return true;
  const rate = SAMPLE_RATE[category];
  if (!rate) return true;
  const prev = sampleCounters[category] ?? 0;
  const next = (prev + 1) % rate;
  sampleCounters[category] = next;
  return next === 0;
}

// ── Core dispatcher ───────────────────────────────────────────────────────

/**
 * Primary entry point for all JS-side voice telemetry.
 *
 * category  — one of the VoiceTelemetryCategory values; drives sampling and
 *             Sentry breadcrumb category label.
 * event     — dot-separated name, e.g. 'session.start', 'capture.chunk'.
 * fields    — optional structured payload (no PII, no audio bytes).
 */
export function track(
  category: VoiceTelemetryCategory,
  event: string,
  fields?: Record<string, unknown>,
): void {
  const data: Record<string, unknown> = { ...fields, platform: Platform.OS };

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.info(`[voice:${category}] ${event}`, fields ?? '');
  }

  if (Config.QA_MODE) {
    _qaQueue.push({ category, event, fields: data });
    scheduleQaFlush();
  }

  const sampled = shouldBreadcrumb(category);

  if (!sampled) {
    // Accumulate into 30s aggregator for sampled categories.
    accumulateAgg(category, event);
    return;
  }

  const level: Sentry.SeverityLevel =
    category === 'error' ? 'warning' : 'info';

  try {
    Sentry.addBreadcrumb({
      category: `voice.${category}`,
      level,
      message: event,
      data,
      timestamp: Date.now() / 1000,
    });
  } catch {
    /* Sentry not initialized yet */
  }
}

// ── Native event bridge (unchanged from prior impl, now routes via track()) ─

type Unsub = () => void;

let active = false;
let unsubs: Unsub[] = [];

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

function nativeBreadcrumb(event: VoiceTelemetryEvent): void {
  const isLostSession =
    event.event === 'voiceSessionStateChange' && event.state === 'lost';
  const isFallbackDrain =
    event.event === 'voicePlaybackDrained' && /fallback|timeout/i.test(event.reason);

  // Plan §12 canonical category names — no voice.native.* prefix.
  const sentryCategory =
    event.event === 'voiceRouteChange'
      ? 'voice.route'
      : event.event === 'voiceMicStalled'
        ? 'voice.mic'
        : event.event === 'voicePlaybackStalled'
          ? 'voice.playback'
          : event.event === 'voicePlaybackDrained'
            ? 'voice.drain'
            : 'voice.session';

  const level: Sentry.SeverityLevel =
    isLostSession || isFallbackDrain ? 'warning' : 'info';

  try {
    Sentry.addBreadcrumb({
      category: sentryCategory,
      level,
      message: event.event,
      data: { ...event, platform: Platform.OS },
      timestamp: Date.now() / 1000,
    });
  } catch {
    /* Sentry not initialized */
  }
}

/**
 * Subscribe to every native voice event and forward to Sentry.
 * Idempotent — calling twice is a no-op.
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
        nativeBreadcrumb(tagSessionState(raw));
      }).remove,
      em.addListener(VOICE_EVENT_NAMES.routeChange, (raw: Omit<VoiceRouteChangeEvent, 'event'>) => {
        nativeBreadcrumb(tagRoute(raw));
      }).remove,
      em.addListener(VOICE_EVENT_NAMES.sessionRecovered, (raw: Omit<VoiceSessionRecoveredEvent, 'event'>) => {
        nativeBreadcrumb(tagSessionRecovered(raw));
      }).remove,
    );
  }

  if (voiceMic) {
    const em = new NativeEventEmitter(voiceMic);
    unsubs.push(
      em.addListener(VOICE_EVENT_NAMES.micStalled, (raw: Omit<VoiceMicStalledEvent, 'event'>) => {
        nativeBreadcrumb(tagMicStall(raw));
      }).remove,
    );
  }

  if (pcmStream) {
    const em = new NativeEventEmitter(pcmStream);
    unsubs.push(
      em.addListener(VOICE_EVENT_NAMES.playbackStalled, (raw: Omit<VoicePlaybackStalledEvent, 'event'>) => {
        nativeBreadcrumb(tagPlaybackStall(raw));
      }).remove,
      em.addListener(VOICE_EVENT_NAMES.playbackDrained, (raw: Omit<VoicePlaybackDrainedEvent, 'event'>) => {
        nativeBreadcrumb(tagPlaybackDrained(raw));
      }).remove,
    );
  }

  return stopVoiceTelemetry;
}

export function stopVoiceTelemetry(): void {
  if (!active) return;
  // Flush any open aggregator windows before teardown.
  for (const cat of Object.keys(agg) as VoiceTelemetryCategory[]) {
    if (aggTimers[cat]) {
      clearTimeout(aggTimers[cat]);
    }
    flushAgg(cat);
  }
  for (const u of unsubs) {
    try { u(); } catch { /* best-effort */ }
  }
  unsubs = [];
  active = false;
}

/**
 * Lightweight caught-error audit trail for hot-path swallowed exceptions.
 * Routes through track() so QA mode + DEV logging apply automatically.
 */
export function jsErrorBreadcrumb(
  where: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const name = err instanceof Error ? err.name : typeof err;
  const message = err instanceof Error ? err.message : String(err);
  track('error', `js_error.${where}`, { name, message, ...extra });
}
