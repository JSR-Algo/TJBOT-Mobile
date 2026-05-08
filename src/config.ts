/**
 * Runtime configuration — generated from .env by metro.config.js
 *
 * For local development on a physical phone:
 *   1. Find your Mac's local IP: `ipconfig getifaddr en0`
 *   2. Create tbot-mobile/.env:
 *      TBOT_API_URL=http://192.168.x.x:3000
 *      TBOT_AI_URL=http://192.168.x.x:3001/api/ai
 *   3. Run: npx react-native start --reset-cache
 */
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { ENV } from './__env__';

const HOSTED_API_ROOT = 'https://tbot-backend-8wmh.onrender.com';
const HOSTED_API = `${HOSTED_API_ROOT}/v1`;
const HOSTED_AI = `${HOSTED_API_ROOT}/api/ai`;
const IOS_SIMULATOR_API = 'http://127.0.0.1:3000/v1';
const ANDROID_EMULATOR_API = 'http://10.0.2.2:3000/v1';
const IOS_SIMULATOR_AI = 'http://127.0.0.1:3001/api/ai';
const ANDROID_EMULATOR_AI = 'http://10.0.2.2:3001/api/ai';

function ensureV1(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  return /\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

export function getApiBaseUrl(): string {
  if (ENV.TBOT_API_URL) {
    return ensureV1(ENV.TBOT_API_URL);
  }
  if (!Device.isDevice && Platform.OS === 'ios') return IOS_SIMULATOR_API;
  if (!Device.isDevice && Platform.OS === 'android') return ANDROID_EMULATOR_API;
  return HOSTED_API;
}

export function getAiBaseUrl(): string {
  if (ENV.TBOT_AI_URL) return ENV.TBOT_AI_URL.replace(/\/+$/, '');
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
} as const;
