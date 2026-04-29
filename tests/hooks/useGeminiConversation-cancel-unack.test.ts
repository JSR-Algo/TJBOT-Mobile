/**
 * P0-14 cancel-unack deadline — plan v2 §7.7
 *
 * Structural source tests verifying the cancel-unack watchdog is
 * correctly wired in useGeminiConversation.ts:
 *
 *   1. cancelUnackMsRef declared as useRef<number | null>(null)
 *   2. useEffect keyed on ASSISTANT_SPEAKING subscribes to onVadStart
 *      and arms a 600ms watchdog
 *   3. Watchdog fires voice.barge_in.cancel_unacked with the right fields
 *   4. serverContent.interrupted clears cancelUnackMsRef (disarms watchdog)
 *
 * Strategy mirrors useGeminiConversation-timers.test.ts: read the hook
 * source and assert the structural contracts from plan §7.7. This catches
 * deadline drift and missing clear-on-interrupted without requiring a
 * full RN mount harness.
 */

import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
const hook = fs.readFileSync(HOOK_PATH, 'utf8');

describe('P0-14 cancel-unack deadline — plan v2 §7.7', () => {
  it('declares cancelUnackMsRef as useRef<number | null>(null)', () => {
    expect(hook).toMatch(/cancelUnackMsRef\s*=\s*useRef<number \| null>\(null\)/);
  });

  it('useEffect is keyed on ASSISTANT_SPEAKING', () => {
    // The block must open with a state guard for ASSISTANT_SPEAKING
    expect(hook).toMatch(
      /if\s*\(\s*fsmState\s*!==\s*'ASSISTANT_SPEAKING'\s*\)\s*return\s*;[\s\S]*?onVadStart/
    );
  });

  it('watchdog deadline is exactly 600ms', () => {
    // The cancel-unack block is anchored by cancelUnackMsRef assignment + 600ms timeout.
    // Use a multiline-aware regex across the full hook source.
    expect(hook).toMatch(/cancelUnackMsRef\.current\s*=\s*vadStartMs[\s\S]{1,500}},\s*600\s*\)/);
  });

  it('watchdog emits voice.barge_in.cancel_unacked with responseId, deadline_ms, mic_vad_start_at_ms', () => {
    // Find the ACTUAL track() call site — there are 3 occurrences (2 comments,
    // then the real call). Walk to the third one.
    let idx = -1;
    for (let i = 0; i < 3; i++) {
      idx = hook.indexOf('voice.barge_in.cancel_unacked', idx + 1);
    }
    expect(idx).toBeGreaterThan(0);
    const surrounding = hook.slice(idx - 10, idx + 300);
    expect(surrounding).toMatch(/responseId/);
    expect(surrounding).toMatch(/deadline_ms/);
    expect(surrounding).toMatch(/mic_vad_start_at_ms/);
  });

  it('serverContent.interrupted handler clears cancelUnackMsRef', () => {
    // Find the interrupted handler block
    const interruptedIdx = hook.indexOf('message.serverContent?.interrupted');
    expect(interruptedIdx).toBeGreaterThan(0);
    // cancelUnackMsRef.current = null must appear within 500 chars after the check
    const surrounding = hook.slice(interruptedIdx, interruptedIdx + 500);
    expect(surrounding).toMatch(/cancelUnackMsRef\.current\s*=\s*null/);
  });

  it('useEffect cleanup unsubscribes onVadStart and clears pending timer and ref', () => {
    // The return () => { ... } from the ASSISTANT_SPEAKING useEffect must
    // call unsub(), clearTimeout, and null the ref
    const assistantEffectStart = hook.indexOf(
      "if (fsmState !== 'ASSISTANT_SPEAKING') return;\n    let watchdogHandle"
    );
    expect(assistantEffectStart).toBeGreaterThan(0);
    // Slice to the end of that useEffect (next }, [fsmState, store]);)
    const effectChunk = hook.slice(assistantEffectStart, assistantEffectStart + 1000);
    expect(effectChunk).toMatch(/unsub\s*\(\s*\)/);
    expect(effectChunk).toMatch(/clearTimeout/);
    expect(effectChunk).toMatch(/cancelUnackMsRef\.current\s*=\s*null/);
  });
});
