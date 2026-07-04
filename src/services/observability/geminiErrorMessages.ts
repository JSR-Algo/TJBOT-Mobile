/**
 * Maps raw Gemini / Google provider errors to parent-actionable copy.
 * Never echoes API key material — only classification + fix hints.
 */

const LEAKED_KEY_RE = /leaked|reported as leaked|api.?key.*invalid/i;

export function isLeakedGeminiKeyError(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== 'string') return false;
  return LEAKED_KEY_RE.test(raw);
}

export function mapGeminiProviderError(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (isLeakedGeminiKeyError(trimmed)) {
    return (
      'Google blocked the server Gemini key (reported leaked). ' +
      'Create a new key in Google AI Studio, update GOOGLE_GEMINI_API_KEY on Render, ' +
      'then restart the backend. Do not put API keys inside the mobile app.'
    );
  }

  if (/permission|forbidden|403/i.test(trimmed)) {
    return 'Gemini access denied. Check API key restrictions and billing on the Google Cloud project.';
  }

  if (/quota|rate.?limit|429/i.test(trimmed)) {
    return 'Gemini quota or rate limit hit. Wait a moment or check billing in Google AI Studio.';
  }

  if (/not found|404/i.test(trimmed) && /model/i.test(trimmed)) {
    return 'Gemini Live model not found. Check EXPO_PUBLIC_GEMINI_LIVE_MODEL matches an enabled model.';
  }

  return null;
}

export function resolveGeminiUserError(
  raw: string | null | undefined,
  fallback = 'Could not connect to Robot voice. Try again.',
): string {
  return mapGeminiProviderError(raw) ?? (raw?.trim() || fallback);
}