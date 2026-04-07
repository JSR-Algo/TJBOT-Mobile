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
import { ENV } from './__env__';

const HOSTED_API = 'http://tbot-dev-alb-1875222172.ap-southeast-1.elb.amazonaws.com';

export const Config = {
  API_BASE_URL: ENV.TBOT_API_URL || HOSTED_API,
  AI_BASE_URL: ENV.TBOT_AI_URL || `${HOSTED_API}/api/ai`,
} as const;
