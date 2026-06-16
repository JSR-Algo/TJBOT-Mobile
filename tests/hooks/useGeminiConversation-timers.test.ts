/**
 * P0-10 timer-rewire structural test.
 *
 * The monolithic useGeminiConversation hook was split into focused sub-hooks.
 * FSM deadline timer arming now lives in useGeminiTimers.ts, while the
 * canonical deadline table lives in voiceAssistantStore.ts. This file asserts
 * the timer contract from plan v2 §3.2 is still honoured after the refactor.
 */

import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiTimers.ts');
const STORE_PATH = path.resolve(__dirname, '../../src/state/voiceAssistantStore.ts');
const hook = fs.readFileSync(HOOK_PATH, 'utf8');
const storeSrc = fs.readFileSync(STORE_PATH, 'utf8');

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
    '$state has deadline $deadlineMs ms and fallback $fallback',
    ({ state, deadlineMs, fallback }) => {
      // The canonical table in the store must contain the expected row.
      const tableStart = storeSrc.indexOf('FSM_TIMER_TABLE:');
      expect(tableStart).toBeGreaterThanOrEqual(0);
      const rowStart = storeSrc.indexOf(`${state}:`, tableStart);
      expect({ state, hasRow: rowStart >= 0 }).toEqual({ state, hasRow: true });
      const rowChunk = storeSrc.slice(rowStart, rowStart + 400);
      const deadlineMatch = rowChunk.match(/deadlineMs:\s*([\d_]+)/);
      expect(deadlineMatch).not.toBeNull();
      expect(parseInt(deadlineMatch![1].replace(/_/g, ''), 10)).toBe(deadlineMs);
      expect({ state, hasFallback: rowChunk.includes(`fallbackState: '${fallback}'`) }).toEqual({
        state,
        hasFallback: true,
      });
    },
  );

  it('useGeminiTimers arms a setTimeout from the store timer config', () => {
    expect(hook).toMatch(/getFsmTimerConfig\(fsmState\)/);
    expect(hook).toMatch(/const handle = setTimeout\(/);
    expect(hook).toMatch(/config\.deadlineMs/);
    expect(hook).toMatch(/onFsmTimerExpired\(fsmState\)/);
  });

  it('every armed timer has a useEffect cleanup that clearTimeout(handle)', () => {
    const armed = (hook.match(/const handle = setTimeout\(/g) ?? []).length;
    const cleared = (hook.match(/clearTimeout\(handle\)/g) ?? []).length;
    expect(cleared).toBeGreaterThanOrEqual(armed);
  });

  it('store does not call setTimeout (lint rule §11.7 spirit)', () => {
    // Strip block comments + line comments — we only care about live code.
    const stripped = storeSrc
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/setTimeout\s*\(/);
    expect(stripped).not.toMatch(/setInterval\s*\(/);
  });

  it('reconnect kick uses queueMicrotask, not setTimeout(0) (§6.3 row 4)', () => {
    expect(hook).toMatch(/queueMicrotask\(\(\)\s*=>\s*(?:\{[\s\S]*?sessionApi\.reconnect|sessionApi\.reconnect\(\))/);
  });

  it('INTERRUPTED → LISTENING is driven by playbackRef.interrupt() Promise (§6.3 row 2)', () => {
    // The 400ms setTimeout on INTERRUPTED → LISTENING is removed; the
    // Promise.then() in both server-interrupt and user-interrupt paths
    // now drives the transition. Regression risk: if a future edit
    // reinstates the setTimeout(400), the watchdog at INTERRUPTED 800ms
    // would still rescue but at increased latency.
    const composerPath = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
    const composer = fs.readFileSync(composerPath, 'utf8');
    const userInterruptIdx = composer.indexOf('interruptPlayback = useCallback');
    expect(userInterruptIdx).toBeGreaterThanOrEqual(0);
    const slice = composer.slice(userInterruptIdx, userInterruptIdx + 2400);
    expect(slice).toMatch(/\.interrupt\(\)/);
    expect(slice).toMatch(/\.then\(\(\)\s*=>\s*\{/);
    expect(slice).toMatch(/store\.getState\(\)\.transition\('LISTENING'\)/);
  });

  it('voiceMicEngineReady drives READY → LISTENING (§3.2 row READY)', () => {
    const composerPath = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
    const composer = fs.readFileSync(composerPath, 'utf8');
    expect(composer).toMatch(/VoiceMic\.onEngineReady\(\(\)\s*=>\s*\{/);
    expect(composer).toMatch(/if\s*\(s\.state\s*===\s*'READY'\)\s*\{\s*s\.transition\('LISTENING'\)/);
  });

  it('engineReadyRef latches early voiceMicEngineReady event for replay (adhoc-2026-05-03)', () => {
    const composerPath = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
    const composer = fs.readFileSync(composerPath, 'utf8');
    expect(composer).toMatch(/engineReadyRef\s*=\s*useRef\(false\)/);
    expect(composer).toMatch(/engineReadyRef\.current\s*=\s*true;[\s\S]*?if\s*\(s\.state\s*===\s*'READY'\)/);
    expect(composer).toMatch(
      /if\s*\(fsmState\s*===\s*'READY'\s*&&\s*engineReadyRef\.current\)\s*\{[\s\S]*?store\.getState\(\)\.transition\('LISTENING'\)/,
    );
    expect(composer).toMatch(/fsmState\s*===\s*'PREPARING_AUDIO'[\s\S]*?engineReadyRef\.current\s*=\s*false/);
  });

  it('engineReadyRef pre-arms on RECONNECTING entry so reconnect→READY does not stall', () => {
    const composerPath = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
    const composer = fs.readFileSync(composerPath, 'utf8');
    expect(composer).toMatch(/fsmState\s*===\s*'RECONNECTING'[\s\S]*?engineReadyRef\.current\s*=\s*true/);
  });
});
