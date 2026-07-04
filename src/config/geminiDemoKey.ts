/**
 * Demo-only Gemini API key from local .env (gitignored).
 * When set, voice lessons skip Render /gemini/token and talk to Google directly.
 * Never commit the key — use .env on your Mac only for investor/iPad demo builds.
 */
import { ENV } from '../__env__';

const DEMO_KEY_ENV = 'EXPO_PUBLIC_GEMINI_DEMO_API_KEY';

export function getGeminiDemoApiKey(): string | null {
  const fromProcess = (process.env[DEMO_KEY_ENV] as string | undefined)?.trim();
  const fromBundle = (ENV.EXPO_PUBLIC_GEMINI_DEMO_API_KEY as string | undefined)?.trim();
  const key = fromProcess || fromBundle || '';
  return key.length > 0 ? key : null;
}

export function isGeminiDemoKeyEnabled(): boolean {
  return getGeminiDemoApiKey() !== null;
}