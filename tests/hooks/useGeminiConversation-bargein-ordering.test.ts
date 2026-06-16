/**
 * P0-22 strict-ordering rule for clear() vs voiceMicVadStart
 * (plan v2 §8.4).
 *
 * Two events race when the user barges in:
 *   A: playbackRef.interrupt() Promise resolves (native clear()
 *      returned).
 *   B: voiceMicVadStart fires (native VAD detected user speech).
 *
 * Three orderings, three outcomes:
 *
 *   A then B  → INTERRUPTED → LISTENING → USER_SPEAKING.
 *               Capture-loop's existing onVadStart subscriber drives
 *               LISTENING → USER_SPEAKING (P0-7). Pending ref stays
 *               null because VAD never fires during INTERRUPTED.
 *
 *   B then A  → VAD-during-INTERRUPTED stamps
 *               pendingUserTurnIdAfterClearRef. clear() resolution
 *               reads the ref and transitions INTERRUPTED →
 *               USER_SPEAKING directly with the stamped turn id —
 *               skipping the LISTENING intermediate.
 *
 *   Neither   → 800ms interrupt_watchdog (P0-10) fires; clears the
 *               pending ref; transitions INTERRUPTED →
 *               ERROR_RECOVERABLE.
 *
 * After the composer refactor, the VAD-during-INTERRUPTED stamp logic and
 * the pending ref live in useGeminiTimers.ts; the .then() ordering rule is
 * still implemented in useGeminiConversation.ts.
 */

import * as fs from 'fs';
import * as path from 'path';

const TIMERS_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiTimers.ts');
const COMPOSER_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
const timers = fs.readFileSync(TIMERS_PATH, 'utf8');
const composer = fs.readFileSync(COMPOSER_PATH, 'utf8');

describe('P0-22 pendingUserTurnIdAfterClearRef plumbing', () => {
  it('declares the ref typed as string | null', () => {
    expect(timers).toMatch(
      /const\s+pendingUserTurnIdAfterClearRef\s*=\s*useRef<string\s*\|\s*null>\(null\)/,
    );
  });

  it('documents the §8.4 rationale on the ref declaration', () => {
    // The rationale is captured in the useGeminiTimers header comment and
    // the P0-22 / §8.4 inline comment near the VAD-during-INTERRUPTED effect.
    expect(timers).toMatch(/P0-22/);
    expect(timers).toMatch(/§8\.4/);
  });
});

describe('P0-22 VAD-during-INTERRUPTED subscriber (B-then-A path)', () => {
  // Slice the VAD-during-INTERRUPTED effect body.
  const startIdx = timers.indexOf('VAD-during-INTERRUPTED strict-ordering stamp');
  if (startIdx < 0) throw new Error('P0-22 VAD-during-INTERRUPTED block not found');
  const block = timers.slice(startIdx, startIdx + 2200);

  it('subscribes to VoiceMic.onVadStart at hook scope', () => {
    expect(block).toMatch(/VoiceMic\.onVadStart\(\(\)\s*=>\s*\{/);
  });

  it('only acts when state === INTERRUPTED', () => {
    expect(block).toMatch(/if\s*\(s\.state\s*!==\s*'INTERRUPTED'\)\s*return/);
  });

  it('idempotent — does not re-mint when ref already set', () => {
    expect(block).toMatch(
      /if\s*\(pendingUserTurnIdAfterClearRef\.current\s*!==\s*null\)\s*return/,
    );
  });

  it('mints a UUID and stamps the ref', () => {
    expect(block).toMatch(/crypto\?\.randomUUID/);
    expect(block).toMatch(/pendingUserTurnIdAfterClearRef\.current\s*=\s*turnId/);
  });

  it('does NOT transition state immediately (waits for clear() resolution)', () => {
    expect(block).not.toMatch(/transition\(\s*'USER_SPEAKING'\s*\)/);
  });

  it('emits voice.bargein.ordering.vad_during_interrupted telemetry', () => {
    expect(block).toMatch(/voice\.bargein\.ordering\.vad_during_interrupted/);
  });

  it('useEffect cleanup unsubscribes from onVadStart', () => {
    expect(block).toMatch(/return\s*\(\)\s*=>\s*unsub\(\)/);
  });
});

describe('P0-22 .then() ordering rule (resolves both A-then-B and B-then-A)', () => {
  it('server-interrupt .then() reads pendingRef and routes USER_SPEAKING vs LISTENING', () => {
    const idx = composer.indexOf("track('barge_in', 'interrupt_server_latency_ms'");
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = composer.slice(idx, idx + 1500);
    expect(slice).toMatch(/const pendingTurnId\s*=\s*timers\.pendingUserTurnIdAfterClearRef\.current/);
    expect(slice).toMatch(/timers\.pendingUserTurnIdAfterClearRef\.current\s*=\s*null/);
    expect(slice).toMatch(/setState\(\{\s*currentUserTurnId:\s*pendingTurnId\s*\}\)/);
    expect(slice).toMatch(/transition\('USER_SPEAKING'\)/);
    expect(slice).toMatch(/transition\('LISTENING'\)/);
  });

  it('user-interrupt .then() reads pendingRef and routes USER_SPEAKING vs LISTENING', () => {
    const idx = composer.indexOf("track('barge_in', 'voice_interrupt_latency_tap'");
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = composer.slice(idx, idx + 1500);
    expect(slice).toMatch(/const pendingTurnId\s*=\s*timers\.pendingUserTurnIdAfterClearRef\.current/);
    expect(slice).toMatch(/timers\.pendingUserTurnIdAfterClearRef\.current\s*=\s*null/);
    expect(slice).toMatch(/setState\(\{\s*currentUserTurnId:\s*pendingTurnId\s*\}\)/);
    expect(slice).toMatch(/transition\('USER_SPEAKING'\)/);
    expect(slice).toMatch(/transition\('LISTENING'\)/);
  });

  it('B-then-A telemetry event is emitted on the ordering hit', () => {
    expect(composer).toMatch(/voice\.bargein\.ordering\.b_then_a/);
  });
});

describe('P0-22 watchdog ref cleanup (Neither A nor B within 800ms)', () => {
  it('INTERRUPTED deadline clears pendingUserTurnIdAfterClearRef before fallback', () => {
    // The FSM deadline timer effect in useGeminiTimers nulls the pending ref
    // when the INTERRUPTED timer fires.
    const idx = timers.indexOf("if (fsmState === 'INTERRUPTED')");
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = timers.slice(idx, idx + 200);
    expect(slice).toMatch(/pendingUserTurnIdAfterClearRef\.current\s*=\s*null/);
  });
});

describe('P0-22 capture-loop VAD subscriber stays out of INTERRUPTED', () => {
  it('the LISTENING-anchored vadStart subscriber explicitly gates on LISTENING (not INTERRUPTED)', () => {
    const idx = composer.indexOf('VoiceMic.onVadStart(() => {');
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = composer.slice(idx, idx + 400);
    expect(slice).toMatch(/if\s*\(s\.state\s*===\s*'LISTENING'\)/);
  });
});
