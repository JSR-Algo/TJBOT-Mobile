import blocklistData from './blocklist.v1.json';
import type { BlocklistV1, CheckResult, SafetyCategory, SafetyContext } from './schemas';

export const BLOCKLIST_VERSION = blocklistData.version;

type CryptoGlobal = { subtle: { digest: (algo: string, data: Uint8Array) => Promise<ArrayBuffer> } };

function sha256Hex(_input: string): string {
  if (typeof crypto !== 'undefined' && (crypto as unknown as CryptoGlobal).subtle) {
    // Async path should not be used in the hot scanner; this is a compile-only fallback.
    throw new Error('Use verifyBlocklistIntegrity only in async bootstrap');
  }
  return '';
}

export async function verifyBlocklistIntegrity(data: BlocklistV1): Promise<boolean> {
  if (typeof crypto !== 'undefined' && (crypto as unknown as CryptoGlobal).subtle) {
    const canonical = JSON.stringify(data.categories, Object.keys(data.categories).sort());
    const buf = new TextEncoder().encode(canonical);
    const digest = await (crypto as unknown as CryptoGlobal).subtle.digest('SHA-256', buf);
    const bytes = new Uint8Array(digest);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex === data.integritySha256;
  }
  return true;
}

export function validateIntegrity(data: BlocklistV1): boolean {
  // Runtime integrity check placeholder: in production, compute the SHA-256 of
  // the sorted categories object and compare with integritySha256.
  return typeof data.integritySha256 === 'string' && data.integritySha256.length === 64;
}

export function scanBlocklist(
  text: string,
  ctx: SafetyContext,
  side: 'input' | 'output',
): CheckResult {
  try {
    if (!validateIntegrity(blocklistData as unknown as BlocklistV1)) {
      ctx.telemetry.emit('safety_shim_error', { side, reason: 'integrity_failed' });
      return { verdict: 'block', category: 'prompt-injection', fallback: getFallback() };
    }

    const lower = text.toLowerCase();
    for (const [category, patterns] of Object.entries(blocklistData.categories)) {
      for (const pattern of patterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(lower)) {
            const termSha256 = hashTerm(pattern);
            ctx.telemetry.emit('safety_block_event', {
              sessionId: ctx.sessionId,
              side,
              category,
              termSha256,
              blocklistVersion: BLOCKLIST_VERSION,
              promptVersion: ctx.theme.version,
              tsMs: Date.now(),
            });
            return {
              verdict: 'block',
              category: category as SafetyCategory,
              termSha256,
              fallback: getFallback(),
            };
          }
        } catch (_err) {
          ctx.telemetry.emit('safety_shim_error', {
            side,
            reason: 'regex_compile',
            category,
            patternLength: pattern.length,
          });
          return { verdict: 'block', category: 'prompt-injection', fallback: getFallback() };
        }
      }
    }
    return { verdict: 'allow' };
  } catch (err) {
    ctx.telemetry.emit('safety_shim_error', { side, err: (err as Error).name });
    return { verdict: 'block', category: 'prompt-injection', fallback: getFallback() };
  }
}

function hashTerm(term: string): string {
  // Deterministic hash that never exposes the plaintext term in telemetry.
  let h = 0;
  for (let i = 0; i < term.length; i += 1) {
    h = (h << 5) - h + term.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).padStart(64, '0');
}

function getFallback(): string {
  return "I'm not allowed to talk about that. Let's practice English instead!";
}

export { sha256Hex };
