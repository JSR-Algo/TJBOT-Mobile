/**
 * P0-20 tap-to-interrupt budget watchdog — structural tests
 * (plan v2 §7.6).
 *
 * The budget watchdog moved into useGeminiTimers.ts when the composer was
 * split into focused sub-hooks. This file asserts the structural contract
 * from §7.6 is still honoured after the refactor.
 */

import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiTimers.ts');
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
    expect(configSrc).toMatch(/EXPO_PUBLIC_VOICE_BARGE_IN_BUDGET_MS/);
    expect(envSrc).toMatch(/EXPO_PUBLIC_VOICE_BARGE_IN_BUDGET_MS/);
  });

  it('falls back to default when env value is invalid (non-positive / NaN)', () => {
    expect(configSrc).toMatch(/Number\.isFinite\(n\)\s*\|\|\s*n\s*<=\s*0/);
  });
});

describe('P0-20 watchdog wiring (plan v2 §7.6)', () => {
  it('keys the useEffect on bargeInWindowOpen', () => {
    expect(hook).toMatch(
      /const\s+bargeInWindowOpen\s*=\s*useVoiceAssistantStore\(\(s\)\s*=>\s*s\.bargeInWindowOpen\)/,
    );
    expect(hook).toMatch(/\[bargeInWindowOpen,\s*store,\s*telemetry,\s*sessionApi\]/);
  });

  it('early-exits when window is closed (no timer armed)', () => {
    expect(hook).toMatch(/if\s*\(\s*!bargeInWindowOpen\s*\)\s*return/);
  });

  it('arms a setTimeout at Config.VOICE_BARGE_IN_BUDGET_MS', () => {
    expect(hook).toMatch(/setTimeout\([\s\S]*?Config\.VOICE_BARGE_IN_BUDGET_MS/);
  });

  it('on watchdog fire, emits voice.barge_in.budget_exhausted with idle_ms_at_close', () => {
    expect(hook).toMatch(/voice\.barge_in\.budget_exhausted/);
    expect(hook).toMatch(/idle_ms_at_close:\s*idleMs/);
  });

  it('on watchdog fire, closes the WS via sessionApi.close()', () => {
    expect(hook).toMatch(/sessionApi\.close\(\)/);
  });

  it('on watchdog fire, transitions to RECONNECTING from active states', () => {
    expect(hook).toMatch(/transition\('RECONNECTING'\)/);
    expect(hook).toMatch(/sessionApi\.reconnect\(\)/);
  });

  it('on VadStart before budget, emits voice.barge_in.user_resumed', () => {
    expect(hook).toMatch(/VoiceMic\.onVadStart\(/);
    expect(hook).toMatch(/voice\.barge_in\.user_resumed/);
    expect(hook).toMatch(/idle_ms_when_resumed:\s*idleMs/);
  });

  it('on VadStart, clears the timer (clearTimeout(handle))', () => {
    expect(hook).toMatch(/clearTimeout\(handle\)/);
    expect(hook).toMatch(/resolved\s*=\s*true/);
  });

  it('uses a `resolved` flag to prevent both timer and VAD branches firing twice', () => {
    expect(hook).toMatch(/let\s+resolved\s*=\s*false/);
    const resolvedChecks = (hook.match(/if\s*\(\s*resolved\s*\)\s*return/g) ?? []).length;
    expect(resolvedChecks).toBeGreaterThanOrEqual(2);
  });

  it('useEffect cleanup clears timer + unsubscribes from VadStart', () => {
    expect(hook).toMatch(/return\s*\(\)\s*=>\s*\{[\s\S]*?clearTimeout\(handle\)[\s\S]*?unsubVad\(\)/);
  });

  it('does not re-fire when window closes via freezeNewResponse', () => {
    expect(hook).toMatch(
      /if\s*\(\s*!store\.getState\(\)\.bargeInWindowOpen\s*\)\s*return/,
    );
  });
});
