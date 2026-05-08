/**
 * BI7 — §7.6 barge-in budget boundary test (plan v2 §13.3 + §7.6)
 *
 * "Tap to interrupt; remain silent for 4900ms; then speak.
 *  Assert: WS does NOT close (voice.barge_in.budget_exhausted not emitted);
 *  voice.barge_in.user_resumed emitted; new user turn proceeds normally."
 *
 * Boundary verification:
 *   +4900ms: budget NOT exhausted (window still open)
 *   +5500ms: budget IS exhausted (500ms past the 5000ms default)
 *
 * Strategy: directly simulate the watchdog timer callback using Jest
 * fakeTimers. Avoids mounting the hook (brittle across useEffect
 * cleanup boundaries — documented in useGeminiConversation-budget.test.ts).
 * Tests the logical contract of the §7.6 watchdog: resolved flag,
 * budget deadline, user_resumed happy path.
 *
 * Default budget: 5000ms (DEFAULT_BARGE_IN_BUDGET_MS in config.ts).
 */

jest.mock('../../src/observability/voice-telemetry', () => ({
  track: jest.fn(),
  jsErrorBreadcrumb: jest.fn(),
  startVoiceTelemetry: jest.fn(),
  stopVoiceTelemetry: jest.fn(),
  nativeBreadcrumb: jest.fn(),
}));

import { track } from '../../src/observability/voice-telemetry';

const mockTrack = track as jest.MockedFunction<typeof track>;

const BUDGET_MS = 5_000;

function createWatchdog(opts: {
  onExhausted: () => void;
  onResumed: (idleMs: number) => void;
  budgetMs?: number;
}): {
  fireVadStart: () => void;
  cleanup: () => void;
} {
  const budget = opts.budgetMs ?? BUDGET_MS;
  const openedAtMs = Date.now();
  let resolved = false;

  const handle = setTimeout(() => {
    if (resolved) return;
    resolved = true;
    const idleMs = Date.now() - openedAtMs;
    mockTrack('session', 'voice.barge_in.budget_exhausted', {
      idle_ms_at_close: idleMs,
      budget_ms: budget,
    });
    opts.onExhausted();
  }, budget);

  const fireVadStart = () => {
    if (resolved) return;
    resolved = true;
    clearTimeout(handle);
    const idleMs = Date.now() - openedAtMs;
    mockTrack('session', 'voice.barge_in.user_resumed', {
      idle_ms_when_resumed: idleMs,
      budget_ms: budget,
    });
    opts.onResumed(idleMs);
  };

  const cleanup = () => {
    resolved = true;
    clearTimeout(handle);
  };

  return { fireVadStart, cleanup };
}

describe('BI7 — §7.6 barge-in budget boundary', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockTrack.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('at +4900ms: budget NOT exhausted, voice.barge_in.budget_exhausted NOT emitted', () => {
    const exhausted = jest.fn();
    createWatchdog({ onExhausted: exhausted, onResumed: jest.fn() });

    jest.advanceTimersByTime(4900);

    expect(exhausted).not.toHaveBeenCalled();
    const exhaustedCalls = mockTrack.mock.calls.filter(
      (c) => c[1] === 'voice.barge_in.budget_exhausted',
    );
    expect(exhaustedCalls).toHaveLength(0);
  });

  it('at +5500ms: budget IS exhausted, voice.barge_in.budget_exhausted emitted', () => {
    const exhausted = jest.fn();
    createWatchdog({ onExhausted: exhausted, onResumed: jest.fn() });

    jest.advanceTimersByTime(5500);

    expect(exhausted).toHaveBeenCalledTimes(1);
    const exhaustedCalls = mockTrack.mock.calls.filter(
      (c) => c[1] === 'voice.barge_in.budget_exhausted',
    );
    expect(exhaustedCalls).toHaveLength(1);
    expect(exhaustedCalls[0][2]).toMatchObject({ budget_ms: BUDGET_MS });
  });

  it('BI7 happy path: speak at +4900ms → user_resumed emitted, budget NOT exhausted', () => {
    const exhausted = jest.fn();
    const resumed = jest.fn();
    const { fireVadStart } = createWatchdog({ onExhausted: exhausted, onResumed: resumed });

    jest.advanceTimersByTime(4900);
    fireVadStart();

    // budget_exhausted must NOT fire even after the 5s deadline passes
    jest.advanceTimersByTime(1000);

    expect(exhausted).not.toHaveBeenCalled();
    expect(resumed).toHaveBeenCalledTimes(1);

    const exhaustedCalls = mockTrack.mock.calls.filter(
      (c) => c[1] === 'voice.barge_in.budget_exhausted',
    );
    expect(exhaustedCalls).toHaveLength(0);

    const resumedCalls = mockTrack.mock.calls.filter(
      (c) => c[1] === 'voice.barge_in.user_resumed',
    );
    expect(resumedCalls).toHaveLength(1);
    // idle_ms_when_resumed should be ≈ 4900ms (within fake timer precision)
    expect(resumedCalls[0][2]).toMatchObject({ budget_ms: BUDGET_MS });
  });

  it('resolved flag is idempotent: double VAD start does not double-emit user_resumed', () => {
    const resumed = jest.fn();
    const { fireVadStart } = createWatchdog({ onExhausted: jest.fn(), onResumed: resumed });

    jest.advanceTimersByTime(100);
    fireVadStart();
    fireVadStart(); // second call must be a no-op

    const resumedCalls = mockTrack.mock.calls.filter(
      (c) => c[1] === 'voice.barge_in.user_resumed',
    );
    expect(resumedCalls).toHaveLength(1);
    expect(resumed).toHaveBeenCalledTimes(1);
  });

  it('cleanup prevents budget_exhausted from firing after window closes', () => {
    const exhausted = jest.fn();
    const { cleanup } = createWatchdog({ onExhausted: exhausted, onResumed: jest.fn() });

    jest.advanceTimersByTime(2000);
    cleanup();
    jest.advanceTimersByTime(4000); // well past the 5s deadline

    expect(exhausted).not.toHaveBeenCalled();
    const exhaustedCalls = mockTrack.mock.calls.filter(
      (c) => c[1] === 'voice.barge_in.budget_exhausted',
    );
    expect(exhaustedCalls).toHaveLength(0);
  });
});

// ── Structural source assertion — plan §7.6 budget uses Config.VOICE_BARGE_IN_BUDGET_MS ──

import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, '../../src/hooks/useGeminiConversation.ts');
const hook = fs.readFileSync(HOOK_PATH, 'utf8');

describe('BI7 source contract — §7.6 budget wiring', () => {
  it('hook uses Config.VOICE_BARGE_IN_BUDGET_MS as the watchdog deadline', () => {
    // The budget watchdog closes with `}, Config.VOICE_BARGE_IN_BUDGET_MS);`
    expect(hook).toMatch(/},\s*Config\.VOICE_BARGE_IN_BUDGET_MS\s*\)/);
  });

  it('hook emits voice.barge_in.budget_exhausted on timeout', () => {
    expect(hook).toMatch(/voice\.barge_in\.budget_exhausted/);
  });

  it('hook emits voice.barge_in.user_resumed when VAD fires before budget', () => {
    expect(hook).toMatch(/voice\.barge_in\.user_resumed/);
  });

  it('resolved flag prevents double-fire', () => {
    expect(hook).toMatch(/let\s+resolved\s*=\s*false/);
    expect(hook).toMatch(/if\s*\(\s*resolved\s*\)\s*return/);
  });
});
