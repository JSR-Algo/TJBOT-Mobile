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

const HOSTED_API_ROOT = 'http://tbot-staging-alb-81759857.ap-southeast-1.elb.amazonaws.com';
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

const DEFAULT_GEMINI_LIVE_MODEL = 'models/gemini-3.1-flash-live-preview';

export const Config = {
  API_BASE_URL: getApiBaseUrl(),
  AI_BASE_URL: getAiBaseUrl(),
  GEMINI_LIVE_MODEL: ENV.EXPO_PUBLIC_GEMINI_LIVE_MODEL || DEFAULT_GEMINI_LIVE_MODEL,
} as const;
