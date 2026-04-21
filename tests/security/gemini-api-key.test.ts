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
 *   4. `GeminiLiveClient._buildUrl` still branches on received token
 *      shape — that is expected and is the defensive detection path.
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
    // AIza* detection at `GeminiLiveClient.ts:62,129` and `useGeminiConversation.ts:158`
    // is defensive parsing of a runtime token — NOT a key literal. The test allows
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
    // from an env/literal. The assignment happens at line 156 in rev-2.
    expect(src).toMatch(/apiKey\s*=\s*data\.token/);

    // Confirm the token is fetched from /v1/gemini/token (backend mint path).
    expect(src).toMatch(/\/v1\/gemini\/token/);

    // Confirm `new GoogleGenAI({ apiKey })` uses the variable, not a literal.
    expect(src).toMatch(/new\s+GoogleGenAI\(\s*\{\s*apiKey\s*\}\s*\)/);

    // Negative: no `process.env.GEMINI` or `process.env.GOOGLE` read anywhere
    // in the hook.
    expect(src).not.toMatch(/process\.env\.\s*(GEMINI|GOOGLE)/);
  });

  it('GeminiLiveClient defensive-branch detection is the only AIza reference shape', () => {
    const clientPath = path.join(SRC_ROOT, 'ai', 'GeminiLiveClient.ts');
    const src = fs.readFileSync(clientPath, 'utf8');

    // The file MAY branch on `startsWith('AIza')` for defensive detection.
    // It MUST NOT contain a full-length key literal.
    const realKeyShape = /AIza[A-Za-z0-9_\-]{10,}/;
    expect(src).not.toMatch(realKeyShape);

    // Defensive branch is present (documents the dual-path support that the
    // plan explicitly calls out — it must continue to exist so received
    // ephemeral tokens route through v1alpha, not v1beta).
    expect(src).toMatch(/startsWith\(['"]AIza['"]\)/);
  });
});
