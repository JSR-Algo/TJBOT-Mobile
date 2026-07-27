/**
 * Runtime configuration — reads EXPO_PUBLIC_* env vars directly.
 *
 * Backend URL resolution order (see getApiBaseUrl):
 *   1. process.env.EXPO_PUBLIC_TBOT_API_URL when explicitly set
 *   2. The canonical Linux backend at report.tjbot.vn
 *
 * Simulator, emulator, physical-device, staging, and production builds all use
 * the same hosted backend by default. Local development remains available by
 * explicitly setting the EXPO_PUBLIC_* URLs.
 */
import { OWNED_AI_V1, OWNED_API_V1 } from './constants/ownedBackend';

// Owned TeeBot backend fallback when no explicit env applies.
const HOSTED_API = OWNED_API_V1;
const HOSTED_AI = OWNED_AI_V1;

function ensureV1(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  return /\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

export function getApiBaseUrl(): string {
  const explicit = (process.env.EXPO_PUBLIC_TBOT_API_URL as string | undefined)?.trim();
  return explicit ? ensureV1(explicit) : HOSTED_API;
}

export function getAiBaseUrl(): string {
  const explicit = (process.env.EXPO_PUBLIC_TBOT_AI_URL as string | undefined)?.trim();
  return explicit ? explicit.replace(/\/+$/, '') : HOSTED_AI;
}

export function getRealtimeWsRoot(): string {
  const explicit = (process.env.EXPO_PUBLIC_WS_URL as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const httpBase = getApiBaseUrl().replace(/\/v\d+$/, '');
  return httpBase.replace(/^http/, 'ws');
}

// Canonical repo/live-guide model. Keep env-overridable for hotfixes, but the
// default must match the backend/docs contract.
const DEFAULT_GEMINI_LIVE_MODEL = 'models/gemini-3.1-flash-live-preview';

// P0-20 plan v2 §7.6 — generation-budget watchdog. If the barge-in
// window stays open longer than this without voiceMicVadStart firing
// (i.e. the user tapped to interrupt but never spoke), the hook closes
// the WS to forcibly cancel the in-flight server generation. 5 s is
// the starting heuristic per §7.6 calibration plan; staging telemetry
// will tune it once collected.
const DEFAULT_BARGE_IN_BUDGET_MS = 5_000;
function parseBargeInBudgetMs(): number {
  const raw = process.env.EXPO_PUBLIC_VOICE_BARGE_IN_BUDGET_MS as string | undefined;
  if (!raw) return DEFAULT_BARGE_IN_BUDGET_MS;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BARGE_IN_BUDGET_MS;
  return n;
}

export const Config = {
  API_BASE_URL: getApiBaseUrl(),
  AI_BASE_URL: getAiBaseUrl(),
  GEMINI_LIVE_MODEL: (process.env.EXPO_PUBLIC_GEMINI_LIVE_MODEL as string | undefined) || DEFAULT_GEMINI_LIVE_MODEL,
  // True when EXPO_PUBLIC_VOICE_TEST_HARNESS=true — enables QA-only paths such
  // as the voice-telemetry POST to /v1/qa/voice-events and native PCM recording.
  QA_MODE: process.env.EXPO_PUBLIC_VOICE_TEST_HARNESS === 'true',
  /**
   * Tap-to-interrupt budget (plan v2 §7.6). If the user taps to
   * interrupt but does not speak within this many ms, the hook closes
   * the WS to forcibly cancel server generation (token blast-radius
   * cap). Override via EXPO_PUBLIC_VOICE_BARGE_IN_BUDGET_MS.
   */
  VOICE_BARGE_IN_BUDGET_MS: parseBargeInBudgetMs(),
  VOICE_CANCEL_UNACK_RECOVERY: process.env.EXPO_PUBLIC_VOICE_CANCEL_UNACK_RECOVERY === 'true',
} as const;
