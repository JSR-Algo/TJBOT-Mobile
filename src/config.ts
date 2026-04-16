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

const HOSTED_API = 'http://tbot-staging-alb-81759857.ap-southeast-1.elb.amazonaws.com';
const IOS_SIMULATOR_API = 'http://127.0.0.1:3000/v1';
const ANDROID_EMULATOR_API = 'http://10.0.2.2:3000/v1';

function resolveApiBaseUrl(): string {
  if (ENV.TBOT_API_URL) {
    return ENV.TBOT_API_URL;
  }

  if (!Device.isDevice && Platform.OS === 'ios') {
    return IOS_SIMULATOR_API;
  }
  if (!Device.isDevice && Platform.OS === 'android') {
    return ANDROID_EMULATOR_API;
  }
  return HOSTED_API;
}

export const Config = {
  API_BASE_URL: resolveApiBaseUrl(),
  AI_BASE_URL: ENV.TBOT_AI_URL || `${HOSTED_API}/api/ai`,
  GEMINI_LIVE_MODEL: 'models/gemini-3.1-flash-live-preview',
} as const;
