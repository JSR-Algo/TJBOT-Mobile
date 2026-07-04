/**
 * Security tests — Gemini key sourcing policy.
 *
 * Production path: backend ephemeral token via /gemini/token.
 * Demo path (investor/iPad only): EXPO_PUBLIC_GEMINI_DEMO_API_KEY in gitignored .env,
 * resolved only in src/config/geminiDemoKey.ts + resolveGeminiApiKey.ts.
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

describe('Gemini API key — sourcing policy', () => {
  const allFiles = walk(SRC_ROOT);

  it('no env var references for GEMINI_API_KEY / GOOGLE_API_KEY / GEMINI_KEY', () => {
    const offending: Array<{ file: string; line: number; text: string }> = [];
    const forbidden = /process\.env\.(?:GEMINI_API_KEY|GOOGLE_API_KEY|GEMINI_KEY)\b/;
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

  it('demo key env is only referenced in geminiDemoKey.ts', () => {
    const allowed = new Set(['config/geminiDemoKey.ts', '__env__.ts']);
    const offending: string[] = [];
    for (const file of allFiles) {
      const rel = path.relative(SRC_ROOT, file);
      const src = fs.readFileSync(file, 'utf8');
      if (src.includes('EXPO_PUBLIC_GEMINI_DEMO_API_KEY') && !allowed.has(rel)) {
        offending.push(rel);
      }
    }
    expect(offending).toEqual([]);
  });

  it('no raw AIza literals outside defensive detection branches', () => {
    const realKeyShape = /AIza[A-Za-z0-9_-]{10,}/;
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

  it('resolveGeminiApiKey supports demo .env path and backend token fallback', () => {
    const resolverPath = path.join(SRC_ROOT, 'services', 'gemini', 'resolveGeminiApiKey.ts');
    const hookPath = path.join(SRC_ROOT, 'hooks', 'useGeminiAudioSession.ts');
    const resolverSrc = fs.readFileSync(resolverPath, 'utf8');
    const hookSrc = fs.readFileSync(hookPath, 'utf8');

    expect(resolverSrc).toMatch(/getGeminiDemoApiKey/);
    expect(resolverSrc).toMatch(/\/gemini\/token/);
    expect(hookSrc).toMatch(/resolveGeminiApiKey/);
    expect(hookSrc).toMatch(/new\s+GoogleGenAI\(\s*\{\s*apiKey\s*\}\s*\)/);
    expect(hookSrc).not.toMatch(/process\.env\.\s*(GEMINI|GOOGLE)/);
  });
});