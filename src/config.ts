/**
 * Runtime configuration — generated from .env by metro.config.js
 *
 * Backend URL resolution order (see getApiBaseUrl):
 *   1. ENV.EXPO_PUBLIC_TBOT_API_URL if set to anything except literal
 *      http://localhost:3000
 *   2. (real device + __DEV__) auto-derive http://<metro-host>:3000 from the
 *      JS bundle URL — works on iPhone/Android over LAN with zero per-network
 *      .env edits. Set EXPO_PUBLIC_TBOT_API_URL explicitly to override.
 *   3. iOS Simulator / Android Emulator hardcoded loopbacks
 *   4. Hosted Render URL as final fallback (production builds)
 */
import { NativeModules, Platform } from 'react-native';
import * as Device from 'expo-device';
import { ENV } from './__env__';

// Hosted backend fallback. Keep in sync with original-app/TJBOT-Mobile/.env
// EXPO_PUBLIC_TBOT_* values.
const HOSTED_API_ROOT = 'https://tbot-backend-8wmh.onrender.com';
const HOSTED_API = `${HOSTED_API_ROOT}/v1`;
const HOSTED_AI = `${HOSTED_API_ROOT}/v1/ai`;
const IOS_SIMULATOR_API = 'http://127.0.0.1:3000/v1';
const ANDROID_EMULATOR_API = 'http://10.0.2.2:3000/v1';
const IOS_SIMULATOR_AI = 'http://127.0.0.1:3001/api/ai';
const ANDROID_EMULATOR_AI = 'http://10.0.2.2:3001/api/ai';

const LOOPBACK_TBOT_API = 'http://localhost:3000';

function ensureV1(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  return /\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

// Parse the Metro bundle URL to extract the dev host's IP. On a physical
// device, scriptURL looks like "http://192.168.1.50:8081/index.bundle?...".
// Returns null in production (no scriptURL), Jest (no NativeModules), or
// when the URL doesn't have a parseable host.
export function deriveDevHostFromBundleUrl(): string | null {
  try {
    const scriptURL: unknown = NativeModules?.SourceCode?.scriptURL;
    if (typeof scriptURL !== 'string' || scriptURL.length === 0) return null;
    const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//);
    if (!match) return null;
    const host = match[1];
    if (host === 'localhost' || host === '127.0.0.1') return null;
    return host;
  } catch {
    return null;
  }
}

export function getApiBaseUrl(): string {
  const explicit = ENV.EXPO_PUBLIC_TBOT_API_URL?.trim();
  // A literal `http://localhost:3000` in .env is treated as "user forgot to
  // set their LAN IP" because that value is unreachable on a real device.
  // The Simulator/Emulator branches below already cover those paths
  // explicitly with 127.0.0.1 / 10.0.2.2.
  if (explicit && explicit !== LOOPBACK_TBOT_API) {
    return ensureV1(explicit);
  }
  // Only auto-derive LAN backend when no explicit VPS/staging URL is configured.
  if (Device.isDevice && __DEV__ && (!explicit || explicit === LOOPBACK_TBOT_API)) {
    const derived = deriveDevHostFromBundleUrl();
    if (derived) return ensureV1(`http://${derived}:3000`);
  }
  if (!Device.isDevice && Platform.OS === 'ios') return IOS_SIMULATOR_API;
  if (!Device.isDevice && Platform.OS === 'android') return ANDROID_EMULATOR_API;
  return HOSTED_API;
}

export function getAiBaseUrl(): string {
  const explicit = ENV.EXPO_PUBLIC_TBOT_AI_URL?.trim();
  if (explicit && explicit !== `${LOOPBACK_TBOT_API}/api/ai`) {
    return explicit.replace(/\/+$/, '');
  }
  if (Device.isDevice && __DEV__ && (!explicit || explicit === `${LOOPBACK_TBOT_API}/api/ai`)) {
    const derived = deriveDevHostFromBundleUrl();
    if (derived) return `http://${derived}:3001/api/ai`;
  }
  if (!Device.isDevice && Platform.OS === 'ios') return IOS_SIMULATOR_AI;
  if (!Device.isDevice && Platform.OS === 'android') return ANDROID_EMULATOR_AI;
  return HOSTED_AI;
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
  const raw = ENV.EXPO_PUBLIC_VOICE_BARGE_IN_BUDGET_MS;
  if (!raw) return DEFAULT_BARGE_IN_BUDGET_MS;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BARGE_IN_BUDGET_MS;
  return n;
}

export const Config = {
  API_BASE_URL: getApiBaseUrl(),
  AI_BASE_URL: getAiBaseUrl(),
  GEMINI_LIVE_MODEL: ENV.EXPO_PUBLIC_GEMINI_LIVE_MODEL || DEFAULT_GEMINI_LIVE_MODEL,
  // True when EXPO_PUBLIC_VOICE_TEST_HARNESS=true — enables QA-only paths such
  // as the voice-telemetry POST to /v1/qa/voice-events and native PCM recording.
  QA_MODE: ENV.EXPO_PUBLIC_VOICE_TEST_HARNESS === 'true',
  /**
   * Tap-to-interrupt budget (plan v2 §7.6). If the user taps to
   * interrupt but does not speak within this many ms, the hook closes
   * the WS to forcibly cancel server generation (token blast-radius
   * cap). Override via EXPO_PUBLIC_VOICE_BARGE_IN_BUDGET_MS.
   */
  VOICE_BARGE_IN_BUDGET_MS: parseBargeInBudgetMs(),
  VOICE_CANCEL_UNACK_RECOVERY: ENV.EXPO_PUBLIC_VOICE_CANCEL_UNACK_RECOVERY === 'true',
} as const;
