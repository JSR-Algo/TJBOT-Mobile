/**
 * P0-20 tap-to-interrupt budget watchdog — structural tests
 * (plan v2 §7.6).
 *
 * Live-runtime testing of the budget watchdog requires mocking
 * VoiceMic.onVadStart, the @google/genai SDK's session.close(), and
 * driving fakeTimers across a useEffect-cleanup boundary — heavy and
 * brittle for what is fundamentally a check that the watchdog:
 *   1. arms when bargeInWindowOpen flips to true;
 *   2. fires `voice.barge_in.budget_exhausted` and closes the WS at
 *      the configured budget;
 *   3. emits `voice.barge_in.user_resumed` and clears the timer when
 *      voiceMicVadStart fires before the budget;
 *   4. is cleared when bargeInWindowOpen flips to false (window
 *      closed via freezeNewResponse on first chunk).
 *
 * Strategy: read the compiled hook source and assert the structural
 * shape of each guarantee. Drift from §7.6 fails the test loudly.
 *
 * BI7 acceptance test (tap+speak at +4900ms must not trigger close)
 * lives in P0-16 cross-platform regression script (device-only).
 */

import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
const CONFIG_PATH = path.resolve(__dirname, '../../src/config.ts');
const ENV_PATH = path.resolve(__dirname, '../../src/__env__.ts');
const hook = fs.readFileSync(HOOK_PATH, 'utf8');
const configSrc = fs.readFileSync(CONFIG_PATH, 'utf8');
const envSrc = fs.readFileSync(ENV_PATH, 'utf8');

describe('P0-20 budget Config plumbing', () => {
  it('Config exposes VOICE_BARGE_IN_BUDGET_MS', () => {
    expect(configSrc).toMatch(/VOICE_BARGE_IN_BUDGET_MS\s*:/);
  });

  it('default is 5000ms per §7.6', () => {
    expect(configSrc).toMatch(/DEFAULT_BARGE_IN_BUDGET_MS\s*=\s*5_?000/);
  });

  it('reads override from EXPO_PUBLIC_VOICE_BARGE_IN_BUDGET_MS', () => {
    expect(configSrc).toMatch(/ENV\.EXPO_PUBLIC_VOICE_BARGE_IN_BUDGET_MS/);
    expect(envSrc).toMatch(/EXPO_PUBLIC_VOICE_BARGE_IN_BUDGET_MS/);
  });

  it('falls back to default when env value is invalid (non-positive / NaN)', () => {
    // The parser branch is `Number.isFinite(n) || n <= 0 → default`.
    expect(configSrc).toMatch(/Number\.isFinite\(n\)\s*\|\|\s*n\s*<=\s*0/);
  });
});

describe('P0-20 watchdog wiring (plan v2 §7.6)', () => {
  // Slice the watchdog useEffect for the rest of the assertions.
  const startIdx = hook.indexOf('P0-20 plan v2 §7.6');
  if (startIdx < 0) throw new Error('P0-20 watchdog block not found');
  const watchdog = hook.slice(startIdx, startIdx + 4000);

  it('keys the useEffect on bargeInWindowOpen', () => {
    expect(watchdog).toMatch(
      /const\s+bargeInWindowOpen\s*=\s*useVoiceAssistantStore\(\(s\)\s*=>\s*s\.bargeInWindowOpen\)/,
    );
    // The useEffect dep array includes bargeInWindowOpen.
    expect(watchdog).toMatch(/\[bargeInWindowOpen,\s*store\]/);
  });

  it('early-exits when window is closed (no timer armed)', () => {
    expect(watchdog).toMatch(/if\s*\(!bargeInWindowOpen\)\s*return/);
  });

  it('arms a setTimeout at Config.VOICE_BARGE_IN_BUDGET_MS', () => {
    expect(watchdog).toMatch(/setTimeout\([\s\S]*?Config\.VOICE_BARGE_IN_BUDGET_MS/);
  });

  it('on watchdog fire, emits voice.barge_in.budget_exhausted with idle_ms_at_close', () => {
    expect(watchdog).toMatch(/voice\.barge_in\.budget_exhausted/);
    expect(watchdog).toMatch(/idle_ms_at_close:\s*idleMs/);
  });

  it('on watchdog fire, closes the WS via sessionRef.current?.close()', () => {
    expect(watchdog).toMatch(/sessionRef\.current\?\.close\?\.\(\)/);
  });

  it('on watchdog fire, transitions to RECONNECTING from active states', () => {
    // The watchdog MUST drive RECONNECTING so softReconnect (P0-13)
    // rebuilds the WS. Without this, the WS-close would just leave us
    // in INTERRUPTED with no recovery.
    expect(watchdog).toMatch(/transition\('RECONNECTING'\)/);
    expect(watchdog).toMatch(/reconnectRef\.current\?\.\(\)/);
  });

  it('on VadStart before budget, emits voice.barge_in.user_resumed', () => {
    expect(watchdog).toMatch(/VoiceMic\.onVadStart\(/);
    expect(watchdog).toMatch(/voice\.barge_in\.user_resumed/);
    expect(watchdog).toMatch(/idle_ms_when_resumed:\s*idleMs/);
  });

  it('on VadStart, clears the timer (clearTimeout(handle))', () => {
    // The VAD-fired branch must clearTimeout to prevent the late
    // budget-exhausted fire — the `resolved` flag also gates the
    // late fire defensively.
    expect(watchdog).toMatch(/clearTimeout\(handle\)/);
    expect(watchdog).toMatch(/resolved\s*=\s*true/);
  });

  it('uses a `resolved` flag to prevent both timer and VAD branches firing twice', () => {
    expect(watchdog).toMatch(/let\s+resolved\s*=\s*false/);
    // Both branches early-return on resolved.
    const resolvedChecks = (watchdog.match(/if\s*\(resolved\)\s*return/g) ?? []).length;
    expect(resolvedChecks).toBeGreaterThanOrEqual(2);
  });

  it('useEffect cleanup clears timer + unsubscribes from VadStart', () => {
    expect(watchdog).toMatch(/return\s*\(\)\s*=>\s*\{[\s\S]*?clearTimeout\(handle\)[\s\S]*?unsubVad\(\)/);
  });

  it('does not re-fire when window closes via freezeNewResponse', () => {
    // The watchdog re-checks the window inside the timer callback —
    // a fast turn that closed the window between schedule and fire
    // is not flagged as budget-exhausted.
    expect(watchdog).toMatch(
      /if\s*\(!store\.getState\(\)\.bargeInWindowOpen\)\s*return/,
    );
  });
});
