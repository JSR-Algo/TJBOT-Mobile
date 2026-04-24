/**
 * Security tests — enforces plan AC-23 (ephemeral-only Gemini API key path).
 *
 * Requirements:
 *   1. No raw `AIza*` literals anywhere in `src/` (except defensive-branch
 *      runtime detection on receive-side).
 *   2. No env var named `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or `GEMINI_KEY`
 *      is ever referenced in `src/`.
 *   3. The single `GoogleGenAI({ apiKey })` caller sources its `apiKey`
 *      from a backend-issued ephemeral token, NOT from an env var or
 *      hardcoded string.
 *
 * Rationale: mobile is a COPPA app; a leaked raw Gemini API key bundled
 * into the client binary is billing fraud + compliance exposure. The
 * only allowed authentication path is the backend-issued ephemeral
 * token, minted via `/v1/gemini/token`.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '..', '..', 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('Gemini API key — ephemeral-only enforcement (AC-23)', () => {
  const allFiles = walk(SRC_ROOT);

  it('no env var references for GEMINI_API_KEY / GOOGLE_API_KEY / GEMINI_KEY', () => {
    const offending: Array<{ file: string; line: number; text: string }> = [];
    const forbidden = /GEMINI_API_KEY|GOOGLE_API_KEY|GEMINI_KEY/;
    for (const file of allFiles) {
      const src = fs.readFileSync(file, 'utf8');
      src.split('\n').forEach((text, idx) => {
        if (forbidden.test(text)) {
          offending.push({ file: path.relative(SRC_ROOT, file), line: idx + 1, text: text.trim() });
        }
      });
    }
    expect(offending).toEqual([]);
  });

  it('no raw AIza literals outside defensive detection branches', () => {
    // AIza* detection at `useGeminiConversation.ts:158` is defensive parsing
    // of a runtime token — NOT a key literal. The test allows
    // `.startsWith('AIza')` and `'AIza'` as a bare prefix check, but bans any
    // embedded alphanumeric suffix that would indicate a real key was pasted.
    //
    // A real Gemini API key is AIza + 35 more [A-Za-z0-9_-] chars (total 39).
    // Any occurrence of `AIza` followed by 10+ such chars is a hard fail.
    const realKeyShape = /AIza[A-Za-z0-9_\-]{10,}/;
    const offending: Array<{ file: string; line: number; text: string }> = [];
    for (const file of allFiles) {
      const src = fs.readFileSync(file, 'utf8');
      src.split('\n').forEach((text, idx) => {
        if (realKeyShape.test(text)) {
          offending.push({ file: path.relative(SRC_ROOT, file), line: idx + 1, text: text.trim() });
        }
      });
    }
    expect(offending).toEqual([]);
  });

  it('GoogleGenAI({apiKey}) caller sources apiKey from backend ephemeral token', () => {
    const hookPath = path.join(SRC_ROOT, 'hooks', 'useGeminiConversation.ts');
    const src = fs.readFileSync(hookPath, 'utf8');

    // Confirm that apiKey is assigned from data.token (backend response), not
    // from an env/literal.
    expect(src).toMatch(/apiKey\s*=\s*data\.token/);

    // Confirm the token is fetched from the backend's gemini/token endpoint.
    // The path in source is '/gemini/token' — the /v1 prefix is supplied by
    // apiClient's base URL (see src/api/client.ts). Asserting the literal
    // path the source uses keeps the test resilient to baseURL changes.
    expect(src).toMatch(/apiClient\.post[^(]*\(\s*['"]\/gemini\/token['"]/);

    // Confirm `new GoogleGenAI({ apiKey })` uses the variable, not a literal.
    expect(src).toMatch(/new\s+GoogleGenAI\(\s*\{\s*apiKey\s*\}\s*\)/);

    // Negative: no `process.env.GEMINI` or `process.env.GOOGLE` read anywhere
    // in the hook.
    expect(src).not.toMatch(/process\.env\.\s*(GEMINI|GOOGLE)/);
  });

});
