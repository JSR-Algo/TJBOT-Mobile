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
 * Live-runtime testing of these orderings requires a mounted hook
 * with deterministic timer + Promise + native event scheduling — the
 * "React 18 + Hermes microtask scheduling surprise" the task brief
 * calls out is exactly the kind of thing structural source-readback
 * tests cannot catch. That said, the structural shape of the wiring
 * IS asserted here so the contract doesn't drift; the runtime fuzz
 * test belongs to P0-16's BI8 (200 trials of randomized A/B
 * inter-arrival, device-only).
 */

import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
const hook = fs.readFileSync(HOOK_PATH, 'utf8');

describe('P0-22 pendingUserTurnIdAfterClearRef plumbing', () => {
  it('declares the ref typed as string | null', () => {
    expect(hook).toMatch(
      /const\s+pendingUserTurnIdAfterClearRef\s*=\s*useRef<string\s*\|\s*null>\(null\)/,
    );
  });

  it('documents the §8.4 rationale on the ref declaration', () => {
    expect(hook).toMatch(/P0-22 plan v2 §8\.4/);
    // Comments may wrap across lines; match the phrase tokens
    // tolerantly. Both orderings must be named in source so a future
    // reader sees the contract.
    expect(hook).toMatch(/B-then-A[\s\S]{0,80}path/);
    expect(hook).toMatch(/A-then-B[\s\S]{0,80}path/);
  });
});

describe('P0-22 VAD-during-INTERRUPTED subscriber (B-then-A path)', () => {
  // Anchor on the unique heading comment.
  const startIdx = hook.indexOf('// P0-22 plan v2 §8.4: when voiceMicVadStart arrives');
  if (startIdx < 0) throw new Error('P0-22 VAD-during-INTERRUPTED block not found');
  const block = hook.slice(startIdx, startIdx + 2200);

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
    // The block must not contain any `transition('USER_SPEAKING')`
    // call — that responsibility is the .then()'s.
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
    // Anchor on the server-interrupt latency log line.
    const idx = hook.indexOf("track('barge_in', 'interrupt_server_latency_ms'");
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(idx, idx + 1500);
    // Reads the pending ref.
    expect(slice).toMatch(/const pendingTurnId\s*=\s*pendingUserTurnIdAfterClearRef\.current/);
    // B-then-A: clears ref, sets currentUserTurnId, transitions USER_SPEAKING.
    expect(slice).toMatch(/pendingUserTurnIdAfterClearRef\.current\s*=\s*null/);
    expect(slice).toMatch(/setState\(\{\s*currentUserTurnId:\s*pendingTurnId\s*\}\)/);
    expect(slice).toMatch(/transition\('USER_SPEAKING'\)/);
    // A-then-B fallback: transitions LISTENING.
    expect(slice).toMatch(/transition\('LISTENING'\)/);
  });

  it('user-interrupt .then() reads pendingRef and routes USER_SPEAKING vs LISTENING', () => {
    // Anchor on the user-interrupt latency log line.
    const idx = hook.indexOf("track('barge_in', 'voice_interrupt_latency_tap'");
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(idx, idx + 1500);
    expect(slice).toMatch(/const pendingTurnId\s*=\s*pendingUserTurnIdAfterClearRef\.current/);
    expect(slice).toMatch(/pendingUserTurnIdAfterClearRef\.current\s*=\s*null/);
    expect(slice).toMatch(/setState\(\{\s*currentUserTurnId:\s*pendingTurnId\s*\}\)/);
    expect(slice).toMatch(/transition\('USER_SPEAKING'\)/);
    expect(slice).toMatch(/transition\('LISTENING'\)/);
  });

  it('B-then-A telemetry event is emitted on the ordering hit', () => {
    expect(hook).toMatch(/voice\.bargein\.ordering\.b_then_a/);
  });
});

describe('P0-22 watchdog ref cleanup (Neither A nor B within 800ms)', () => {
  it('800ms interrupt_watchdog clears pendingUserTurnIdAfterClearRef', () => {
    // Anchor on the watchdog telemetry line.
    const idx = hook.indexOf("'voice.assistant_turn.interrupted_timeout'");
    expect(idx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(idx, idx + 600);
    // The ref must be nulled before the ERROR_RECOVERABLE transition,
    // otherwise a stamped turn id would leak into the next interrupt
    // cycle.
    expect(slice).toMatch(/pendingUserTurnIdAfterClearRef\.current\s*=\s*null/);
    expect(slice).toMatch(/transition\('ERROR_RECOVERABLE'\)/);
  });
});

describe('P0-22 capture-loop VAD subscriber stays out of INTERRUPTED', () => {
  it('the LISTENING-anchored vadStart subscriber explicitly gates on LISTENING (not INTERRUPTED)', () => {
    // The capture-loop subscriber added by P0-7 must only fire on
    // LISTENING → USER_SPEAKING. If it also fired on
    // INTERRUPTED → USER_SPEAKING, it would race with the
    // hook-scoped pending-ref subscriber added here. Anchor on the
    // P0-7 comment.
    const idx = hook.indexOf('P0-7: native VAD event subscriptions');
    if (idx >= 0) {
      const slice = hook.slice(idx, idx + 800);
      expect(slice).toMatch(/if\s*\(s\.state\s*===\s*'LISTENING'\)/);
    }
  });
});
