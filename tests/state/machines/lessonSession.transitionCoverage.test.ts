/**
 * T3.2 — exhaustive LessonSession transition coverage.
 *
 * `lessonSession.machine.test.ts` covers the headline paths. This file closes
 * the Done criterion "state-machine tests cover all transitions incl.
 * terminals" by walking EVERY declared edge, and pins the two defects T3.2
 * found against the approved topology
 * (`migrate-ui-ux-to-mobile-app-docs/migration/state-machines-mobile-ux.md`
 * §2.2 / §4.2):
 *
 *   MOB-T32-1  RECONNECTING had no `AUDIO_INIT_FAIL` edge, so plan §4.2's
 *              `RECONNECTING → AUDIO_FAILED (audio_init_fail_on_resume)` row
 *              was unimplemented: the event was silently dropped and the child
 *              was stranded on Reconnecting forever.
 *   MOB-T32-2  RESUME / WS_RESUMED targeted bare `ACTIVE`, re-running
 *              `initial: 'GREETING'`. Every recovery re-greeted the child from
 *              the top of the lesson and contradicted ExitConfirmScreen's
 *              `voiceStateBeforeInterruption` resume.
 */

import { createActor } from 'xstate';
import {
  createLessonSessionMachine,
  noopLessonSessionServices,
  type LessonSessionActor,
} from '../../../src/state/machines/lessonSession.machine';
import type { LessonSessionEvent } from '../../../src/state/machines/lessonSession.types';

jest.useFakeTimers();

const IDEMPOTENCY_KEY = '11111111-2222-3333-4444-555555555555';
const SESSION_ID = 'sess_abc123';
const DEVICE_SESSION_ID = 'dsess_xyz789';

function buildActor(): LessonSessionActor {
  const actor = createActor(createLessonSessionMachine(noopLessonSessionServices));
  actor.start();
  return actor;
}

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

/** Drive to a named ACTIVE substate through the real turn loop. */
function driveTo(actor: LessonSessionActor, substate: string): void {
  actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
  actor.send({ type: 'SESSION_STARTED', sessionId: SESSION_ID, deviceSessionId: DEVICE_SESSION_ID });
  if (substate === 'GREETING') return;
  actor.send({ type: 'GREETING_DONE' });
  if (substate === 'ACTIVITY_INTRO') return;
  actor.send({ type: 'INTRO_DONE' });
  if (substate === 'ROBOT_SPEAKING') return;
  actor.send({ type: 'REPLY_READY' });
  if (substate === 'ROBOT_LISTENING') return;
  if (substate === 'SILENCE') {
    actor.send({ type: 'VAD_SILENCE_2S' });
    return;
  }
  actor.send({ type: 'VAD_SPEECH' });
  if (substate === 'USER_SPEAKING') return;
  actor.send({ type: 'VAD_END' });
  if (substate === 'THINKING') return;
  actor.send({ type: 'ACTIVITY_COMPLETE' });
  if (substate === 'ACTIVITY_DONE') return;
  throw new Error(`driveTo: unsupported substate ${substate}`);
}

const ACTIVE_SUBSTATES = [
  'GREETING',
  'ACTIVITY_INTRO',
  'ROBOT_SPEAKING',
  'ROBOT_LISTENING',
  'USER_SPEAKING',
  'SILENCE',
  'THINKING',
  'ACTIVITY_DONE',
] as const;

describe('T3.2 — every declared edge of the composite turn loop', () => {
  const edges: Array<{ from: string; event: LessonSessionEvent; to: string }> = [
    { from: 'GREETING', event: { type: 'GREETING_DONE' }, to: 'ACTIVE.ACTIVITY_INTRO' },
    { from: 'ACTIVITY_INTRO', event: { type: 'INTRO_DONE' }, to: 'ACTIVE.ROBOT_SPEAKING' },
    { from: 'ROBOT_SPEAKING', event: { type: 'REPLY_READY' }, to: 'ACTIVE.ROBOT_LISTENING' },
    { from: 'ROBOT_LISTENING', event: { type: 'VAD_SPEECH' }, to: 'ACTIVE.USER_SPEAKING' },
    { from: 'ROBOT_LISTENING', event: { type: 'VAD_SILENCE_2S' }, to: 'ACTIVE.SILENCE' },
    { from: 'USER_SPEAKING', event: { type: 'VAD_END' }, to: 'ACTIVE.THINKING' },
    { from: 'SILENCE', event: { type: 'PROMPT_AGAIN' }, to: 'ACTIVE.ROBOT_SPEAKING' },
    { from: 'THINKING', event: { type: 'REPLY_READY' }, to: 'ACTIVE.ROBOT_SPEAKING' },
    {
      from: 'THINKING',
      event: { type: 'TURN_COMPLETE', turnId: 't1', responseText: '' },
      to: 'ACTIVE.ROBOT_LISTENING',
    },
    { from: 'THINKING', event: { type: 'ACTIVITY_COMPLETE' }, to: 'ACTIVE.ACTIVITY_DONE' },
    { from: 'ACTIVITY_DONE', event: { type: 'NEXT_ACTIVITY' }, to: 'ACTIVE.ROBOT_SPEAKING' },
  ];

  it.each(edges)('ACTIVE.$from --$event.type--> $to', ({ from, event, to }) => {
    const actor = buildActor();
    driveTo(actor, from);
    expect(path(actor)).toBe(`ACTIVE.${from}`);
    actor.send(event);
    expect(path(actor)).toBe(to);
    actor.stop();
  });

  it('counts one turn per VAD_END and nothing else', () => {
    const actor = buildActor();
    driveTo(actor, 'THINKING');
    expect(actor.getSnapshot().context.turnsCount).toBe(1);
    actor.send({ type: 'REPLY_READY' });
    actor.send({ type: 'REPLY_READY' });
    actor.send({ type: 'VAD_SPEECH' });
    actor.send({ type: 'VAD_END' });
    expect(actor.getSnapshot().context.turnsCount).toBe(2);
    actor.stop();
  });
});

describe('T3.2 — ACTIVE-wide escapes fire from every substate', () => {
  it.each(ACTIVE_SUBSTATES)('%s --WS_DISCONNECT--> RECONNECTING', (substate) => {
    const actor = buildActor();
    driveTo(actor, substate);
    actor.send({ type: 'WS_DISCONNECT' });
    expect(path(actor)).toBe('RECONNECTING');
    actor.stop();
  });

  it.each(ACTIVE_SUBSTATES)('%s --HEARTBEAT_MISS_3X--> RECONNECTING', (substate) => {
    const actor = buildActor();
    driveTo(actor, substate);
    actor.send({ type: 'HEARTBEAT_MISS_3X' });
    expect(path(actor)).toBe('RECONNECTING');
    actor.stop();
  });

  it.each(ACTIVE_SUBSTATES)('%s --USER_EXIT_TAP--> PAUSED', (substate) => {
    const actor = buildActor();
    driveTo(actor, substate);
    actor.send({ type: 'USER_EXIT_TAP' });
    expect(path(actor)).toBe('PAUSED');
    actor.stop();
  });

  it.each(ACTIVE_SUBSTATES)('%s --INTERRUPT--> INTERRUPTED', (substate) => {
    const actor = buildActor();
    driveTo(actor, substate);
    actor.send({ type: 'INTERRUPT', reason: 'bargein' });
    expect(path(actor)).toBe('INTERRUPTED');
    actor.stop();
  });
});

// ── MOB-T32-2 ────────────────────────────────────────────────────────────────
describe('T3.2 — recovery restores the substate the child was in (MOB-T32-2)', () => {
  const RECOVERABLE = ACTIVE_SUBSTATES.filter((s) => s !== 'GREETING');

  it.each(RECOVERABLE)('INTERRUPTED resume returns to ACTIVE.%s, not GREETING', (substate) => {
    const actor = buildActor();
    driveTo(actor, substate);
    actor.send({ type: 'INTERRUPT', reason: 'gentle_correction' });
    expect(path(actor)).toBe('INTERRUPTED');
    actor.send({ type: 'RESUME' });
    expect(path(actor)).toBe(`ACTIVE.${substate}`);
    expect(actor.getSnapshot().context.interruptedReason).toBeNull();
    actor.stop();
  });

  it.each(RECOVERABLE)('PAUSED resume returns to ACTIVE.%s, not GREETING', (substate) => {
    const actor = buildActor();
    driveTo(actor, substate);
    actor.send({ type: 'USER_EXIT_TAP' });
    actor.send({ type: 'RESUME' });
    expect(path(actor)).toBe(`ACTIVE.${substate}`);
    actor.stop();
  });

  it.each(RECOVERABLE)('WS_RESUMED returns to ACTIVE.%s, not GREETING', (substate) => {
    const actor = buildActor();
    driveTo(actor, substate);
    actor.send({ type: 'WS_DISCONNECT' });
    actor.send({ type: 'WS_RESUMED' });
    expect(path(actor)).toBe(`ACTIVE.${substate}`);
    actor.stop();
  });

  it('falls back to GREETING when ACTIVE has no history yet', () => {
    const actor = buildActor();
    driveTo(actor, 'GREETING');
    actor.send({ type: 'WS_DISCONNECT' });
    actor.send({ type: 'WS_RESUMED' });
    expect(path(actor)).toBe('ACTIVE.GREETING');
    actor.stop();
  });

  it('survives a reconnect chained onto an interruption', () => {
    const actor = buildActor();
    driveTo(actor, 'USER_SPEAKING');
    actor.send({ type: 'INTERRUPT', reason: 'bargein' });
    actor.send({ type: 'USER_EXIT_TAP' });
    expect(path(actor)).toBe('PAUSED');
    actor.send({ type: 'RESUME' });
    expect(path(actor)).toBe('ACTIVE.USER_SPEAKING');
    actor.send({ type: 'WS_DISCONNECT' });
    actor.send({ type: 'WS_RESUMED' });
    expect(path(actor)).toBe('ACTIVE.USER_SPEAKING');
    actor.stop();
  });
});

// ── MOB-T32-1 ────────────────────────────────────────────────────────────────
describe('T3.2 — RECONNECTING audio-reinit failure has an exit (MOB-T32-1)', () => {
  it('RECONNECTING --AUDIO_INIT_FAIL--> AUDIO_FAILED with the failure code', () => {
    const actor = buildActor();
    driveTo(actor, 'ROBOT_LISTENING');
    actor.send({ type: 'WS_DISCONNECT' });
    expect(path(actor)).toBe('RECONNECTING');

    actor.send({ type: 'AUDIO_INIT_FAIL', code: 'audio_init_fail' });

    expect(path(actor)).toBe('AUDIO_FAILED');
    expect(actor.getSnapshot().context.audioFailureCode).toBe('audio_init_fail');
    // AUDIO_FAILED offers a real way out, unlike a stuck RECONNECTING.
    actor.send({ type: 'RETRY' });
    expect(path(actor)).toBe('CONNECTING');
    actor.stop();
  });

  it('clears the offline banner when leaving RECONNECTING for AUDIO_FAILED', () => {
    const actor = buildActor();
    driveTo(actor, 'ROBOT_LISTENING');
    actor.send({ type: 'WS_DISCONNECT' });
    jest.advanceTimersByTime(20_000);
    expect(actor.getSnapshot().context.offlineBanner).toBe(true);

    actor.send({ type: 'AUDIO_INIT_FAIL', code: 'mic_unavailable' });
    expect(path(actor)).toBe('AUDIO_FAILED');
    expect(actor.getSnapshot().context.offlineBanner).toBe(false);
    actor.stop();
  });
});

describe('T3.2 — no ghost timers', () => {
  it('the 15s offline-banner timer is cancelled when RECONNECTING is left', () => {
    const actor = buildActor();
    driveTo(actor, 'ROBOT_LISTENING');
    actor.send({ type: 'WS_DISCONNECT' });
    jest.advanceTimersByTime(5_000);
    expect(actor.getSnapshot().context.offlineBanner).toBe(false);

    actor.send({ type: 'WS_RESUMED' });
    expect(path(actor)).toBe('ACTIVE.ROBOT_LISTENING');

    // The banner timer must not fire from a state we already left.
    jest.advanceTimersByTime(60_000);
    expect(actor.getSnapshot().context.offlineBanner).toBe(false);
    expect(path(actor)).toBe('ACTIVE.ROBOT_LISTENING');
    actor.stop();
  });

  it('no client wallclock promotes any state to a terminal', () => {
    for (const substate of ACTIVE_SUBSTATES) {
      const actor = buildActor();
      driveTo(actor, substate);
      jest.advanceTimersByTime(45 * 60_000);
      expect(path(actor)).toBe(`ACTIVE.${substate}`);
      expect(actor.getSnapshot().status).toBe('active');
      actor.stop();
    }
  });
});

describe('T3.2 — rapid state flapping never wedges the machine', () => {
  // The renderer-side debounce cannot exist yet (the machine has no runtime
  // caller while the lesson-session backend contract is unavailable), but the
  // model half is testable: flapping must stay deterministic and must never
  // leave the machine in a state no screen can be derived from.
  it('survives 200 listening↔thinking flaps and lands where the last event says', () => {
    const actor = buildActor();
    driveTo(actor, 'ROBOT_LISTENING');

    for (let i = 0; i < 100; i += 1) {
      actor.send({ type: 'VAD_SPEECH' });
      expect(path(actor)).toBe('ACTIVE.USER_SPEAKING');
      actor.send({ type: 'VAD_END' });
      expect(path(actor)).toBe('ACTIVE.THINKING');
      actor.send({ type: 'TURN_COMPLETE', turnId: `t${i}`, responseText: '' });
      expect(path(actor)).toBe('ACTIVE.ROBOT_LISTENING');
    }

    expect(actor.getSnapshot().context.turnsCount).toBe(100);
    expect(actor.getSnapshot().status).toBe('active');
    actor.stop();
  });

  it('ignores events that do not belong to the current substate instead of wedging', () => {
    const actor = buildActor();
    driveTo(actor, 'ROBOT_LISTENING');

    // Out-of-order traffic for a turn that already ended.
    actor.send({ type: 'VAD_END' });
    actor.send({ type: 'PROMPT_AGAIN' });
    actor.send({ type: 'NEXT_ACTIVITY' });
    actor.send({ type: 'INTRO_DONE' });
    expect(path(actor)).toBe('ACTIVE.ROBOT_LISTENING');

    // Still responsive to the event it IS waiting for.
    actor.send({ type: 'VAD_SPEECH' });
    expect(path(actor)).toBe('ACTIVE.USER_SPEAKING');
    actor.stop();
  });

  it('flapping in and out of RECONNECTING neither loses the substate nor leaks banners', () => {
    const actor = buildActor();
    driveTo(actor, 'THINKING');

    for (let i = 0; i < 20; i += 1) {
      actor.send({ type: 'WS_DISCONNECT' });
      expect(path(actor)).toBe('RECONNECTING');
      actor.send({ type: 'WS_RESUMED' });
      expect(path(actor)).toBe('ACTIVE.THINKING');
    }

    jest.advanceTimersByTime(60_000);
    expect(actor.getSnapshot().context.offlineBanner).toBe(false);
    expect(path(actor)).toBe('ACTIVE.THINKING');
    actor.stop();
  });
});

describe('T3.2 — server-driven terminals reach PAUSED and RECONNECTING (plan §4.2)', () => {
  const serverTerminals: Array<{ event: LessonSessionEvent; terminal: string }> = [
    { event: { type: 'SESSION_END', reason: 'complete' }, terminal: 'COMPLETED' },
    { event: { type: 'SESSION_END', reason: 'timeout' }, terminal: 'TIMED_OUT' },
    { event: { type: 'SESSION_END', reason: 'barge_limit' }, terminal: 'TIMED_OUT' },
    { event: { type: 'SESSION_END', reason: 'cost_limit' }, terminal: 'COST_CAPPED' },
    { event: { type: 'SESSION_END', reason: 'parent_stop' }, terminal: 'PARENT_STOPPED' },
    { event: { type: 'SESSION_END', reason: 'disconnect_timeout' }, terminal: 'ABANDONED_DISCONNECT' },
    { event: { type: 'SAFETY_BLOCK' }, terminal: 'SAFETY_HALT' },
  ];

  it.each(serverTerminals)('PAUSED --$event.type--> $terminal', ({ event, terminal }) => {
    const actor = buildActor();
    driveTo(actor, 'THINKING');
    actor.send({ type: 'USER_EXIT_TAP' });
    expect(path(actor)).toBe('PAUSED');
    actor.send(event);
    expect(path(actor)).toBe(terminal);
    actor.stop();
  });

  it.each(serverTerminals)('RECONNECTING --$event.type--> $terminal', ({ event, terminal }) => {
    const actor = buildActor();
    driveTo(actor, 'THINKING');
    actor.send({ type: 'WS_DISCONNECT' });
    expect(path(actor)).toBe('RECONNECTING');
    actor.send(event);
    expect(path(actor)).toBe(terminal);
    actor.stop();
  });

  it.each(serverTerminals)('INTERRUPTED --$event.type--> $terminal', ({ event, terminal }) => {
    const actor = buildActor();
    driveTo(actor, 'THINKING');
    actor.send({ type: 'INTERRUPT', reason: 'offtopic' });
    expect(path(actor)).toBe('INTERRUPTED');
    actor.send(event);
    expect(path(actor)).toBe(terminal);
    actor.stop();
  });

  it('a parent stop raised from another device terminates from any live substate', () => {
    for (const substate of ACTIVE_SUBSTATES) {
      const actor = buildActor();
      driveTo(actor, substate);
      actor.send({ type: 'SESSION_END', reason: 'parent_stop' });
      expect(path(actor)).toBe('PARENT_STOPPED');
      expect(actor.getSnapshot().context.endReason).toBe('parent_stop');
      actor.stop();
    }
  });
});

describe('T3.2 — terminals cannot be escaped back into a live session', () => {
  const terminals: Array<{ name: string; reach: (actor: LessonSessionActor) => void }> = [
    { name: 'COMPLETED', reach: (a) => a.send({ type: 'SESSION_END', reason: 'complete' }) },
    { name: 'TIMED_OUT', reach: (a) => a.send({ type: 'SESSION_END', reason: 'timeout' }) },
    { name: 'COST_CAPPED', reach: (a) => a.send({ type: 'SESSION_END', reason: 'cost_limit' }) },
    { name: 'PARENT_STOPPED', reach: (a) => a.send({ type: 'SESSION_END', reason: 'parent_stop' }) },
    {
      name: 'ABANDONED_DISCONNECT',
      reach: (a) => a.send({ type: 'SESSION_END', reason: 'disconnect_timeout' }),
    },
    { name: 'SAFETY_HALT', reach: (a) => a.send({ type: 'SAFETY_BLOCK' }) },
    {
      name: 'ABANDONED',
      reach: (a) => {
        a.send({ type: 'USER_EXIT_TAP' });
        a.send({ type: 'CONFIRM_EXIT' });
      },
    },
  ];

  // Every event that could plausibly re-open a live session.
  const escapeAttempts: LessonSessionEvent[] = [
    { type: 'RESUME' },
    { type: 'RETRY' },
    { type: 'WS_RESUMED' },
    { type: 'START_SESSION', idempotencyKey: 'replayed-key' },
    { type: 'SESSION_STARTED', sessionId: 'other', deviceSessionId: 'other' },
    { type: 'GREETING_DONE' },
    { type: 'REPLY_READY' },
    { type: 'VAD_SPEECH' },
    { type: 'TURN_COMPLETE', turnId: 't-late', responseText: 'late' },
    { type: 'INTERRUPT', reason: 'bargein' },
    { type: 'WS_DISCONNECT' },
    { type: 'SESSION_END', reason: 'complete' },
  ];

  it.each(terminals)('$name absorbs every re-entry attempt', ({ name, reach }) => {
    const actor = buildActor();
    driveTo(actor, 'THINKING');
    reach(actor);
    expect(path(actor)).toBe(name);
    expect(actor.getSnapshot().status).toBe('done');
    const endReason = actor.getSnapshot().context.endReason;

    for (const event of escapeAttempts) {
      actor.send(event);
      expect(path(actor)).toBe(name);
      expect(actor.getSnapshot().status).toBe('done');
    }
    // Late traffic must not rewrite the recorded outcome either.
    expect(actor.getSnapshot().context.endReason).toBe(endReason);

    jest.advanceTimersByTime(60_000);
    expect(path(actor)).toBe(name);
    actor.stop();
  });
});

describe('T3.2 — session entry is single-shot', () => {
  it('a second rapid START_SESSION tap does not re-enter CONNECTING or remint the key', () => {
    const actor = buildActor();
    actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
    expect(path(actor)).toBe('CONNECTING');
    actor.send({ type: 'START_SESSION', idempotencyKey: 'second-tap-key' });
    expect(path(actor)).toBe('CONNECTING');
    expect(actor.getSnapshot().context.idempotencyKey).toBe(IDEMPOTENCY_KEY);
    actor.stop();
  });

  it('a duplicate SESSION_STARTED does not restart the turn loop', () => {
    const actor = buildActor();
    driveTo(actor, 'THINKING');
    actor.send({ type: 'SESSION_STARTED', sessionId: 'dup', deviceSessionId: 'dup' });
    expect(path(actor)).toBe('ACTIVE.THINKING');
    expect(actor.getSnapshot().context.sessionId).toBe(SESSION_ID);
    actor.stop();
  });

  it('IDLE --BACK_TO_HOME--> ENDED_BACK and stays there', () => {
    const actor = buildActor();
    actor.send({ type: 'BACK_TO_HOME' });
    expect(path(actor)).toBe('ENDED_BACK');
    actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
    expect(path(actor)).toBe('ENDED_BACK');
    actor.stop();
  });

  it('CONNECTING --USER_EXIT_TAP--> ABANDONED (plan §2.2 user_cancel)', () => {
    const actor = buildActor();
    actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
    actor.send({ type: 'USER_EXIT_TAP' });
    expect(path(actor)).toBe('ABANDONED');
    expect(actor.getSnapshot().context.endReason).toBe('user_exit');
    actor.stop();
  });
});
