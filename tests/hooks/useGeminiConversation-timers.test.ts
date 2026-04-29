/**
 * P0-10 timer-rewire structural test.
 *
 * Live-runtime testing of the hook's useEffect timer table requires
 * mounting the hook inside a React renderer with a mocked native module
 * surface — heavy and brittle for what is fundamentally a check that
 * each timed FSM state is paired with a useEffect-keyed setTimeout
 * fallback at the deadline §3.2 says.
 *
 * Strategy: read the compiled hook source and assert each timer block
 * is present with the right state guard, deadline, and fallback
 * transition. If the hook drifts from the §3.2 timer table (e.g. a
 * developer accidentally changes `mic_ready_timeout` from 2000 to 200),
 * this test fails loudly. The structural test is intentionally tied to
 * the deadline numerals because §3.2 is the contract.
 *
 * Pairs with tests/state/voiceAssistantStore.test.ts which exercises
 * the store-side transitions; this file exercises hook-side timing.
 */

import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
const hook = fs.readFileSync(HOOK_PATH, 'utf8');

interface TimerExpectation {
  state: string;
  deadlineMs: number;
  fallback: string;
}

const TIMER_TABLE: TimerExpectation[] = [
  { state: 'PREPARING_AUDIO', deadlineMs: 4000, fallback: 'ERROR_RECOVERABLE' },
  { state: 'CONNECTING', deadlineMs: 10_000, fallback: 'ERROR_RECOVERABLE' },
  { state: 'READY', deadlineMs: 2000, fallback: 'ERROR_RECOVERABLE' },
  { state: 'USER_SPEAKING', deadlineMs: 30_000, fallback: 'ERROR_RECOVERABLE' },
  { state: 'USER_SPEECH_FINALIZING', deadlineMs: 1000, fallback: 'LISTENING' },
  { state: 'WAITING_AI', deadlineMs: 8000, fallback: 'LISTENING' },
  { state: 'INTERRUPTED', deadlineMs: 800, fallback: 'ERROR_RECOVERABLE' },
  { state: 'RECONNECTING', deadlineMs: 8000, fallback: 'ERROR_RECOVERABLE' },
  { state: 'ERROR_RECOVERABLE', deadlineMs: 5000, fallback: 'IDLE' },
];

describe('P0-10 timer table — plan v2 §3.2', () => {
  it.each(TIMER_TABLE)(
    '$state arms a setTimeout($deadlineMs) that transitions to $fallback',
    ({ state, deadlineMs, fallback }) => {
      // The useEffect block follows a fixed shape:
      //   if (fsmState !== '<state>') return;
      //   const handle = setTimeout(...
      //   ...
      //   transition('<fallback>')  (or LISTENING / IDLE)
      //   ...
      //   }, <deadlineMs>);
      const guardRe = new RegExp(`if\\s*\\(\\s*fsmState\\s*!==\\s*'${state}'\\s*\\)\\s*return\\s*;`);
      expect({ state, hasGuard: guardRe.test(hook) }).toEqual({ state, hasGuard: true });

      // Slice from the guard forward and look for the matching deadline +
      // fallback transition. Using a slice keeps the test resilient to
      // unrelated edits in the hook outside the timer block.
      const guardIdx = hook.search(guardRe);
      const slice = hook.slice(guardIdx, guardIdx + 800);

      // The hook source uses TS numeric separators for readability:
      // `10_000` for 10 000, `30_000` for 30 000. Strip underscores from
      // the slice before matching the deadline numeral so the test
      // doesn't care about formatting.
      const sliceNormalized = slice.replace(/(\d)_(\d)/g, '$1$2');
      const deadlineRe = new RegExp(`}\\s*,\\s*${deadlineMs}\\s*\\)`);
      expect({ state, hasDeadline: deadlineRe.test(sliceNormalized) }).toEqual({
        state,
        hasDeadline: true,
      });

      const fallbackRe = new RegExp(`transition\\(\\s*'${fallback}'\\s*\\)`);
      expect({ state, hasFallback: fallbackRe.test(slice) }).toEqual({
        state,
        hasFallback: true,
      });
    },
  );

  it('every timer has a useEffect cleanup that clearTimeout(handle) — React cleanup contract', () => {
    // Every armed timer must be cleared on state change. The cleanup
    // function returned from the useEffect calls clearTimeout. If a
    // future edit drops the cleanup, the timer leaks across state
    // transitions and fires from the wrong state — the v1 anti-pattern.
    const armed = (hook.match(/const handle = setTimeout\(/g) ?? []).length;
    // Every armed timer must have AT LEAST one clearTimeout(handle)
    // call somewhere in scope. Tolerates both single-statement
    // `() => clearTimeout(handle)` cleanups and multi-statement
    // `() => { ... clearTimeout(handle); ... }` forms (the latter is
    // canonical when the cleanup also unsubscribes from a native
    // event — e.g. P0-20 budget watchdog combines clearTimeout +
    // unsubVad). Defensive double-clears (e.g. inside the VAD
    // resolved-branch AND the cleanup) are fine and only loosely
    // tracked here.
    const cleared = (hook.match(/clearTimeout\(handle\)/g) ?? []).length;
    expect(cleared).toBeGreaterThanOrEqual(armed);
  });

  it('store does not call setTimeout (lint rule §11.7 spirit)', () => {
    const storeSrc = fs.readFileSync(
      path.resolve(__dirname, '../../src/state/voiceAssistantStore.ts'),
      'utf8',
    );
    // Strip block comments + line comments — we only care about live code.
    const stripped = storeSrc
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/setTimeout\s*\(/);
    expect(stripped).not.toMatch(/setInterval\s*\(/);
  });

  it('reconnect kick uses queueMicrotask, not setTimeout(0) (§6.3 row 4)', () => {
    // Two reconnect-driven hops were setTimeout(0) and setTimeout(50)
    // in v1; both are now queueMicrotask. Regression of either back to
    // setTimeout would re-introduce the §11.7 violation.
    expect(hook).toMatch(/queueMicrotask\(\(\)\s*=>\s*\{[\s\S]*?reconnectRef\.current/);
    expect(hook).toMatch(/queueMicrotask\(\(\)\s*=>\s*\{[\s\S]*?if\s*\(s\.state\s*!==\s*'IDLE'/);
  });

  it('INTERRUPTED → LISTENING is driven by playbackRef.interrupt() Promise (§6.3 row 2)', () => {
    // The 400ms setTimeout on INTERRUPTED → LISTENING is removed; the
    // Promise.then() in both server-interrupt and user-interrupt paths
    // now drives the transition. Regression risk: if a future edit
    // reinstates the setTimeout(400), the watchdog at INTERRUPTED 800ms
    // would still rescue but at increased latency.
    // Skip past the docstring `interruptPlayback` mention; find the
    // useCallback definition. The `interruptPlayback = useCallback`
    // anchor is unique to the body.
    const userInterruptIdx = hook.indexOf('interruptPlayback = useCallback');
    expect(userInterruptIdx).toBeGreaterThanOrEqual(0);
    const slice = hook.slice(userInterruptIdx, userInterruptIdx + 2400);
    expect(slice).toMatch(/\.interrupt\(\)/);
    expect(slice).toMatch(/\.then\(\(\)\s*=>\s*\{/);
    // After the .then opens, the body transitions LISTENING (gated on
    // state still being INTERRUPTED).
    expect(slice).toMatch(/store\.getState\(\)\.transition\('LISTENING'\)/);
  });

  it('voiceMicEngineReady drives READY → LISTENING (§3.2 row READY)', () => {
    // The hook subscribes to VoiceMic.onEngineReady at hook scope and
    // drives the transition only when state is READY. Replaces the v1
    // setTimeout(50) re-arm at line 265-272.
    expect(hook).toMatch(/VoiceMic\.onEngineReady\(\(\)\s*=>\s*\{/);
    expect(hook).toMatch(/if\s*\(s\.state\s*===\s*'READY'\)\s*\{\s*s\.transition\('LISTENING'\)/);
  });
});
