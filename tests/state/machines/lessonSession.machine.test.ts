/**
 * LessonSession machine unit tests.
 *
 * Plan: TJBot-design/.omc/plans/state-machines-mobile-ux.md §0, §2.2, §3.2,
 * §4.2, §5.
 *
 * The most load-bearing assertion in this file is the
 * "RECONNECTING never self-terminates" test in §1.3 — see
 * `it('RECONNECTING never self-terminates without server event', ...)`.
 * If that test fails because the machine added an `after` from
 * RECONNECTING to ABANDONED_DISCONNECT, fix the machine — not the test.
 */

import { createActor } from 'xstate';
import {
  createLessonSessionMachine,
  noopLessonSessionServices,
  type LessonSessionActor,
} from '../../../src/state/machines/lessonSession.machine';
import type {
  InterruptReason,
  LessonSessionServices,
  SessionEndReason,
} from '../../../src/state/machines/lessonSession.types';

jest.useFakeTimers();

const IDEMPOTENCY_KEY = '11111111-2222-3333-4444-555555555555';
const SESSION_ID = 'sess_abc123';
const DEVICE_SESSION_ID = 'dsess_xyz789';

/** Helper: build + start the actor, wired with a controllable service mock. */
function buildActor(overrides?: Partial<LessonSessionServices>) {
  const services: LessonSessionServices = {
    ...noopLessonSessionServices,
    ...overrides,
  };
  const machine = createLessonSessionMachine(services);
  const actor = createActor(machine);
  actor.start();
  return actor;
}

/**
 * Drive the machine from IDLE all the way into the ACTIVE composite state
 * by sending the canonical CTA-tap event, then resolving the
 * server-emitted `SESSION_STARTED`. Used as a fixture by most tests.
 */
function bringToActive(actor: LessonSessionActor): void {
  actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
  actor.send({
    type: 'SESSION_STARTED',
    sessionId: SESSION_ID,
    deviceSessionId: DEVICE_SESSION_ID,
  });
}

/** Read the FSM state as a dotted path like `'ACTIVE.GREETING'`. */
function path(actor: LessonSessionActor): string {
  const value = actor.getSnapshot().value as unknown;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const [parent] = Object.keys(value);
    const child = (value as Record<string, string>)[parent];
    return `${parent}.${child}`;
  }
  return String(value);
}

describe('LessonSession machine — initial state', () => {
  it('starts in IDLE', () => {
    const actor = buildActor();
    expect(path(actor)).toBe('IDLE');
    actor.stop();
  });
});

describe('LessonSession machine — happy path', () => {
  it('IDLE → CONNECTING → ACTIVE.GREETING → ... → COMPLETED via SESSION_END(complete)', () => {
    const actor = buildActor();

    actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
    expect(path(actor)).toBe('CONNECTING');
    expect(actor.getSnapshot().context.idempotencyKey).toBe(IDEMPOTENCY_KEY);

    actor.send({
      type: 'SESSION_STARTED',
      sessionId: SESSION_ID,
      deviceSessionId: DEVICE_SESSION_ID,
    });
    expect(path(actor)).toBe('ACTIVE.GREETING');
    expect(actor.getSnapshot().context.sessionId).toBe(SESSION_ID);
    expect(actor.getSnapshot().context.deviceSessionId).toBe(DEVICE_SESSION_ID);

    // Walk the composite turn loop once.
    actor.send({ type: 'GREETING_DONE' });
    expect(path(actor)).toBe('ACTIVE.ACTIVITY_INTRO');
    actor.send({ type: 'INTRO_DONE' });
    expect(path(actor)).toBe('ACTIVE.ROBOT_SPEAKING');
    actor.send({ type: 'REPLY_READY' });
    expect(path(actor)).toBe('ACTIVE.ROBOT_LISTENING');
    actor.send({ type: 'VAD_SPEECH' });
    expect(path(actor)).toBe('ACTIVE.USER_SPEAKING');
    actor.send({ type: 'VAD_END' });
    expect(path(actor)).toBe('ACTIVE.THINKING');
    expect(actor.getSnapshot().context.turnsCount).toBe(1);
    actor.send({ type: 'ACTIVITY_COMPLETE' });
    expect(path(actor)).toBe('ACTIVE.ACTIVITY_DONE');

    // Server emits the natural-end terminal.
    actor.send({ type: 'SESSION_END', reason: 'complete' });
    expect(path(actor)).toBe('COMPLETED');
    expect(actor.getSnapshot().status).toBe('done');
    expect(actor.getSnapshot().context.endReason).toBe('complete');

    actor.stop();
  });
});

describe('LessonSession machine — each end_reason drives the correct terminal', () => {
  const cases: Array<{ reason: SessionEndReason; terminal: string }> = [
    { reason: 'complete', terminal: 'COMPLETED' },
    { reason: 'timeout', terminal: 'TIMED_OUT' },
    { reason: 'cost_limit', terminal: 'COST_CAPPED' },
    { reason: 'barge_limit', terminal: 'TIMED_OUT' },
    { reason: 'parent_stop', terminal: 'PARENT_STOPPED' },
    { reason: 'disconnect_timeout', terminal: 'ABANDONED_DISCONNECT' },
  ];

  it.each(cases)(
    'SESSION_END { reason: $reason } → $terminal',
    ({ reason, terminal }) => {
      const actor = buildActor();
      bringToActive(actor);
      actor.send({ type: 'SESSION_END', reason });
      expect(path(actor)).toBe(terminal);
      expect(actor.getSnapshot().status).toBe('done');
      expect(actor.getSnapshot().context.endReason).toBe(reason);
      actor.stop();
    },
  );

  it('client-initiated user_exit terminal — PAUSED → ABANDONED via CONFIRM_EXIT', () => {
    const actor = buildActor();
    bringToActive(actor);
    actor.send({ type: 'USER_EXIT_TAP' });
    expect(path(actor)).toBe('PAUSED');
    actor.send({ type: 'CONFIRM_EXIT' });
    expect(path(actor)).toBe('ABANDONED');
    expect(actor.getSnapshot().context.endReason).toBe('user_exit');
    actor.stop();
  });

  it('SAFETY_BLOCK → SAFETY_HALT (server-emitted, distinct from SESSION_END)', () => {
    const actor = buildActor();
    bringToActive(actor);
    actor.send({ type: 'SAFETY_BLOCK' });
    expect(path(actor)).toBe('SAFETY_HALT');
    actor.stop();
  });
});

describe('LessonSession machine — RECONNECTING is server-authoritative', () => {
  it('enters RECONNECTING on WS_DISCONNECT and exits to ACTIVE on WS_RESUMED', () => {
    const actor = buildActor();
    bringToActive(actor);
    actor.send({ type: 'WS_DISCONNECT' });
    expect(path(actor)).toBe('RECONNECTING');
    actor.send({ type: 'WS_RESUMED' });
    expect(path(actor)).toBe('ACTIVE.GREETING');
    actor.stop();
  });

  // ⚠️ INVARIANT TEST — load-bearing.
  // "RECONNECTING never self-terminates"
  // If this fails because the machine added `after: 10000` (or any other
  // wallclock) from RECONNECTING to ABANDONED_DISCONNECT, the FIX is in the
  // machine, NOT in this test. See plan §0 Principle 1 and §4.2 ADR-002.
  it('RECONNECTING never self-terminates without server event (30s elapse → still RECONNECTING)', () => {
    const actor = buildActor();
    bringToActive(actor);
    actor.send({ type: 'WS_DISCONNECT' });
    expect(path(actor)).toBe('RECONNECTING');

    // Advance well past the 10s server reconnect window AND past the 15s
    // client offline-banner safety fallback. Anything > 15000 ms is enough.
    jest.advanceTimersByTime(30_000);

    // Critical: machine MUST still be in RECONNECTING. A failing assertion
    // here means a client-side terminal was wired in — fix the machine.
    expect(path(actor)).toBe('RECONNECTING');
    expect(actor.getSnapshot().status).toBe('active');
    // The non-terminal offline_banner flag is allowed to be true after 15s.
    expect(actor.getSnapshot().context.offlineBanner).toBe(true);
    actor.stop();
  });

  it('RECONNECTING → ABANDONED_DISCONNECT only via server SESSION_END(disconnect_timeout)', () => {
    const actor = buildActor();
    bringToActive(actor);
    actor.send({ type: 'WS_DISCONNECT' });
    expect(path(actor)).toBe('RECONNECTING');

    // Server is the only authority that can declare disconnect_timeout.
    actor.send({ type: 'SESSION_END', reason: 'disconnect_timeout' });

    expect(path(actor)).toBe('ABANDONED_DISCONNECT');
    expect(actor.getSnapshot().status).toBe('done');
    expect(actor.getSnapshot().context.endReason).toBe('disconnect_timeout');
    actor.stop();
  });
});

describe('LessonSession machine — INTERRUPTED carries the reason discriminator', () => {
  const reasons: InterruptReason[] = [
    'bargein',
    'gentle_correction',
    'retry',
    'offtopic',
  ];

  it.each(reasons)(
    'INTERRUPT { reason: %s } → INTERRUPTED with discriminator in context + analytics',
    (reason) => {
      const actor = buildActor();
      bringToActive(actor);
      actor.send({ type: 'INTERRUPT', reason });
      expect(path(actor)).toBe('INTERRUPTED');
      const ctx = actor.getSnapshot().context;
      expect(ctx.interruptedReason).toBe(reason);
      // Analytics side effect is emitted from the entry action.
      expect(ctx.lastAnalyticsEvent).not.toBeNull();
      expect(ctx.lastAnalyticsEvent?.name).toBe('lesson.interrupted');
      expect(ctx.lastAnalyticsEvent?.payload.reason).toBe(reason);

      // RESUME returns to ACTIVE and clears the discriminator.
      actor.send({ type: 'RESUME' });
      expect(path(actor)).toBe('ACTIVE.GREETING');
      expect(actor.getSnapshot().context.interruptedReason).toBeNull();
      actor.stop();
    },
  );

  it('bargein increments bargeinCount; other reasons do not', () => {
    const actor = buildActor();
    bringToActive(actor);
    actor.send({ type: 'INTERRUPT', reason: 'gentle_correction' });
    expect(actor.getSnapshot().context.bargeinCount).toBe(0);
    actor.send({ type: 'RESUME' });
    actor.send({ type: 'INTERRUPT', reason: 'bargein' });
    expect(actor.getSnapshot().context.bargeinCount).toBe(1);
    actor.stop();
  });
});

describe('LessonSession machine — invalid transitions (plan §5)', () => {
  it('SAFETY_HALT is terminal — RESUME/INTERRUPT have no effect', () => {
    const actor = buildActor();
    bringToActive(actor);
    actor.send({ type: 'SAFETY_BLOCK' });
    expect(path(actor)).toBe('SAFETY_HALT');
    // Terminal `final` states accept no events.
    actor.send({ type: 'RESUME' });
    actor.send({ type: 'INTERRUPT', reason: 'bargein' });
    expect(path(actor)).toBe('SAFETY_HALT');
    expect(actor.getSnapshot().status).toBe('done');
    actor.stop();
  });

  it('PARENT_STOPPED is terminal — RESUME/START_SESSION have no effect', () => {
    const actor = buildActor();
    bringToActive(actor);
    actor.send({ type: 'SESSION_END', reason: 'parent_stop' });
    expect(path(actor)).toBe('PARENT_STOPPED');
    actor.send({ type: 'RESUME' });
    actor.send({
      type: 'START_SESSION',
      idempotencyKey: 'should-be-ignored',
    });
    expect(path(actor)).toBe('PARENT_STOPPED');
    actor.stop();
  });

  it('COMPLETED is terminal — START_SESSION has no effect (no re-entry)', () => {
    const actor = buildActor();
    bringToActive(actor);
    actor.send({ type: 'SESSION_END', reason: 'complete' });
    expect(path(actor)).toBe('COMPLETED');
    actor.send({
      type: 'START_SESSION',
      idempotencyKey: 'should-be-ignored',
    });
    expect(path(actor)).toBe('COMPLETED');
    actor.stop();
  });

  it('IDLE → COMPLETED is server-blocked, not client-blocked (plan §5: "Server: state guard in realtime-orchestrator")', () => {
    // Per plan §5 the IDLE → COMPLETED block lives in the realtime
    // orchestrator, NOT the mobile machine — the mobile state is a mirror,
    // not the authority. We document that the client currently mirrors a
    // (contract-violating) server SESSION_END from IDLE, and rely on the
    // server-side guard to prevent the event from ever being emitted. If
    // this assertion changes (e.g. add a `guard: hasSession` to the root
    // SESSION_END transitions) update the plan reference here too.
    const actor = buildActor();
    expect(path(actor)).toBe('IDLE');
    actor.send({ type: 'SESSION_END', reason: 'complete' });
    expect(path(actor)).toBe('COMPLETED');
    actor.stop();
  });
});

describe('LessonSession machine — Idempotency-Key threading (plan §4.2, §7)', () => {
  it('forwards the caller-minted Idempotency-Key into context (machine never mints)', () => {
    const startSession = jest.fn(async () => ({
      sessionId: SESSION_ID,
      deviceSessionId: DEVICE_SESSION_ID,
    }));
    const actor = buildActor({ startSession });
    actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
    expect(path(actor)).toBe('CONNECTING');
    // The invoked actor receives the caller-minted key (not a fresh one).
    // We can't await the promise resolution under fake timers without
    // pumping micro-tasks, but the key is already in context.
    expect(actor.getSnapshot().context.idempotencyKey).toBe(IDEMPOTENCY_KEY);
    actor.stop();
  });
});

describe('LessonSession machine — AUDIO_FAILED edges', () => {
  it('CONNECTING → AUDIO_FAILED on WS_FAIL, retry returns to CONNECTING', () => {
    const actor = buildActor();
    actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
    expect(path(actor)).toBe('CONNECTING');
    actor.send({ type: 'WS_FAIL', code: 'ws_fail' });
    expect(path(actor)).toBe('AUDIO_FAILED');
    expect(actor.getSnapshot().context.audioFailureCode).toBe('ws_fail');
    actor.send({ type: 'RETRY' });
    expect(path(actor)).toBe('CONNECTING');
    actor.stop();
  });

  it('AUDIO_FAILED → ABANDONED on GIVE_UP', () => {
    const actor = buildActor();
    actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
    actor.send({ type: 'AUDIO_INIT_FAIL', code: 'audio_init_fail' });
    expect(path(actor)).toBe('AUDIO_FAILED');
    actor.send({ type: 'GIVE_UP' });
    expect(path(actor)).toBe('ABANDONED');
    actor.stop();
  });
});

describe('LessonSession machine — PAUSED edges', () => {
  it('ACTIVE → PAUSED → ACTIVE via RESUME', () => {
    const actor = buildActor();
    bringToActive(actor);
    actor.send({ type: 'USER_EXIT_TAP' });
    expect(path(actor)).toBe('PAUSED');
    actor.send({ type: 'RESUME' });
    expect(path(actor)).toBe('ACTIVE.GREETING');
    actor.stop();
  });

  it('PAUSED → COMPLETED via CONFIRM_END (manual finish)', () => {
    const actor = buildActor();
    bringToActive(actor);
    actor.send({ type: 'USER_EXIT_TAP' });
    actor.send({ type: 'CONFIRM_END' });
    expect(path(actor)).toBe('COMPLETED');
    actor.stop();
  });
});
