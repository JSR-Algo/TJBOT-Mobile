/**
 * Phase 1 of the Vietnamese / bilingual pivot
 * (plan: ~/.claude/plans/silly-orbiting-lamport.md).
 *
 * Repro this test was built from: user spoke "Bạn do ai tạo?" on iOS
 * staging; Gemini Live with no `speechConfig.languageCode` transcribed
 * it as "Bà ấy có nấu không?" and replied to the hallucinated question.
 *
 * Source-match pattern (same as useGeminiConversation-p0.test.ts) —
 * mocking the live session end-to-end is a ~500-line mock dance, and
 * the invariant we care about is purely structural: the BCP-47 hint is
 * wired into the `ai.live.connect` speechConfig. A regex here fails the
 * second that line disappears.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(REPO_ROOT, 'src');
const read = (rel: string): string =>
  fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('L1 — Gemini Live speechConfig carries a BCP-47 language hint', () => {
  const hook = read('hooks/useGeminiConversation.ts');

  it('speechConfig contains languageCode: "vi-VN"', () => {
    expect(hook).toMatch(
      /speechConfig\s*:\s*\{[\s\S]*?languageCode\s*:\s*['"]vi-VN['"]/,
    );
  });

  it('languageCode is declared inside the ai.live.connect config block (not stray)', () => {
    const connectIdx = hook.indexOf('ai.live.connect(');
    expect(connectIdx).toBeGreaterThanOrEqual(0);
    const connectBody = hook.slice(connectIdx, connectIdx + 2500);
    expect(connectBody).toMatch(/languageCode\s*:\s*['"]vi-VN['"]/);
  });

  it('languageCode precedes voiceConfig so it applies to STT + TTS uniformly', () => {
    const speechIdx = hook.indexOf('speechConfig:');
    expect(speechIdx).toBeGreaterThanOrEqual(0);
    const speechBody = hook.slice(speechIdx, speechIdx + 400);
    const langIdx = speechBody.indexOf('languageCode');
    const voiceIdx = speechBody.indexOf('voiceConfig');
    expect(langIdx).toBeGreaterThanOrEqual(0);
    expect(voiceIdx).toBeGreaterThanOrEqual(0);
    expect(langIdx).toBeLessThan(voiceIdx);
  });
});
