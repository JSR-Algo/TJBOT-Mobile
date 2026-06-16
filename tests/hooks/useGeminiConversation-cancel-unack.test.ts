/**
 * P0-14 cancel-unack deadline — plan v2 §7.7
 *
 * Structural source tests verifying the cancel-unack watchdog is
 * correctly wired. After the composer refactor the watchdog lives in
 * useGeminiTimers.ts; the serverContent.interrupted disarm call remains
 * in useGeminiConversation.ts.
 */

import * as fs from 'fs';
import * as path from 'path';

const TIMERS_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiTimers.ts');
const COMPOSER_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
const timers = fs.readFileSync(TIMERS_PATH, 'utf8');
const composer = fs.readFileSync(COMPOSER_PATH, 'utf8');

describe('P0-14 cancel-unack deadline — plan v2 §7.7', () => {
  it('declares cancelUnackMsRef as useRef<number | null>(null)', () => {
    expect(timers).toMatch(/cancelUnackMsRef\s*=\s*useRef<number \| null>\(null\)/);
  });

  it('useEffect is keyed on ASSISTANT_SPEAKING', () => {
    expect(timers).toMatch(
      /if\s*\(\s*fsmState\s*!==\s*'ASSISTANT_SPEAKING'\s*\)\s*return\s*;[\s\S]*?onVadStart/,
    );
  });

  it('watchdog deadline is exactly 600ms', () => {
    // Anchor on the cancel-unack setTimeout block.
    expect(timers).toMatch(/cancelUnackMsRef\.current\s*=\s*vadStartMs;[\s\S]{1,1200}\},\s*600\s*\)/);
  });

  it('watchdog emits voice.barge_in.cancel_unacked with responseId, deadline_ms, mic_vad_start_at_ms', () => {
    const idx = timers.indexOf("track('barge_in', 'voice.barge_in.cancel_unacked'");
    expect(idx).toBeGreaterThan(0);
    const surrounding = timers.slice(idx, idx + 300);
    expect(surrounding).toMatch(/responseId/);
    expect(surrounding).toMatch(/deadline_ms/);
    expect(surrounding).toMatch(/mic_vad_start_at_ms/);
  });

  it('serverContent.interrupted handler clears cancelUnackMsRef', () => {
    const interruptedIdx = composer.indexOf('onInterrupted');
    expect(interruptedIdx).toBeGreaterThan(0);
    const surrounding = composer.slice(interruptedIdx, interruptedIdx + 500);
    expect(surrounding).toMatch(/cancelUnackMsRef\.current\s*=\s*null/);
  });

  it('useEffect cleanup unsubscribes onVadStart and clears pending timer and ref', () => {
    const assistantEffectStart = timers.indexOf(
      "if (fsmState !== 'ASSISTANT_SPEAKING') return;\n    let watchdogHandle",
    );
    expect(assistantEffectStart).toBeGreaterThan(0);
    const effectChunk = timers.slice(assistantEffectStart, assistantEffectStart + 1500);
    expect(effectChunk).toMatch(/unsub\(\)/);
    expect(effectChunk).toMatch(/clearTimeout\(watchdogHandle\)/);
    expect(effectChunk).toMatch(/cancelUnackMsRef\.current\s*=\s*null/);
  });
});
