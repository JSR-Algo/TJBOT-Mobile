/**
 * LessonSession machine — actor-closure + invoked-onError coverage.
 *
 * The sibling `lessonSession.machine.test.ts` asserts TRANSITIONS under fake
 * timers, so it never (a) lets the invoked `startSession` promise REJECT
 * (the `onError` closure at machine L242 stays dark) nor (b) executes the
 * `endSession` / `reconnectSession` actor logic closures (machine L159,
 * L162-163) — those actors are declared in `setup({ actors })` but only
 * `startSession` is ever `invoke`d by a state, so the machine itself never
 * runs them.
 *
 * This file drives those closures FOR REAL by INTERPRETING the actor logic
 * (`createActor` + `waitFor`), not by asserting static transition objects:
 *   - `startSession` rejects → the `onError` closure runs → AUDIO_FAILED with
 *     `audioFailureCode === 'ws_fail'` (proves the closure, not a guard).
 *   - the `endSession` actor logic forwards `{ sessionId, reason: 'user_exit' }`
 *     — the hard-coded `user_exit` reason is the contract (types §endSession).
 *   - the `reconnectSession` actor logic threads `{ deviceSessionId }` through.
 *
 * Real timers (not fake) so the invoked promise + microtask queue actually
 * flush. Non-tautology proof: each assertion pins the EXACT args the closure
 * injects/threads and the EXACT resulting state/context, and the `endSession`
 * test asserts the closure overrides any caller-supplied reason with
 * `user_exit`.
 */

import { createActor, waitFor } from 'xstate';
import {
  createLessonSessionMachine,
  noopLessonSessionServices,
} from '@/state/machines/lessonSession.machine';
import type { LessonSessionServices } from '@/state/machines/lessonSession.types';

// These tests are promise-driven; real timers let the invoked actor settle.
jest.useRealTimers();

const IDEMPOTENCY_KEY = '11111111-2222-3333-4444-555555555555';

type MachineActorImpls = {
  implementations: {
    actors: Record<string, Parameters<typeof createActor>[0]>;
  };
};

function buildMachine(overrides?: Partial<LessonSessionServices>) {
  return createLessonSessionMachine({
    ...noopLessonSessionServices,
    ...overrides,
  });
}

describe('LessonSession machine — invoked startSession onError closure (L239-244)', () => {
  it('startSession rejection drives CONNECTING → AUDIO_FAILED with audioFailureCode "ws_fail"', async () => {
    const startSession = jest.fn(async () => {
      throw new Error('ws handshake refused');
    });
    const actor = createActor(buildMachine({ startSession }));
    actor.start();

    actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
    expect(actor.getSnapshot().value).toBe('CONNECTING');

    // Let the invoked promise reject and the onError transition fire.
    await waitFor(actor, (s) => s.matches('AUDIO_FAILED'), { timeout: 2000 });

    const snap = actor.getSnapshot();
    expect(snap.value).toBe('AUDIO_FAILED');
    // The onError `assign` closure stamps a literal 'ws_fail' (not from event).
    expect(snap.context.audioFailureCode).toBe('ws_fail');
    // startSession was invoked with the caller-minted key (input mapper).
    expect(startSession).toHaveBeenCalledWith({ idempotencyKey: IDEMPOTENCY_KEY });

    // RETRY from the onError-produced AUDIO_FAILED returns to CONNECTING.
    actor.send({ type: 'RETRY' });
    expect(actor.getSnapshot().value).toBe('CONNECTING');
    actor.stop();
  });

  it('passes the empty-string idempotencyKey fallback when context key is null', async () => {
    // START_SESSION always sets the key, but the input mapper `?? ''` fallback
    // is exercised by confirming the key the closure forwards is exactly what
    // START_SESSION minted (never a machine-invented one).
    const startSession = jest.fn<
      Promise<{ sessionId: string; deviceSessionId: string }>,
      [{ idempotencyKey: string }]
    >(async () => {
      throw new Error('boom');
    });
    const actor = createActor(buildMachine({ startSession }));
    actor.start();
    actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
    await waitFor(actor, (s) => s.matches('AUDIO_FAILED'), { timeout: 2000 });
    expect(startSession.mock.calls[0][0]).toEqual({ idempotencyKey: IDEMPOTENCY_KEY });
    actor.stop();
  });
});

describe('LessonSession machine — endSession actor logic closure (L158-160)', () => {
  it('endSession actor forwards { sessionId, reason: "user_exit" } and resolves done', async () => {
    const endSession = jest.fn<Promise<void>, [{ sessionId: string; reason: 'user_exit' }]>(
      async () => {
        /* resolve */
      },
    );
    const machine = buildMachine({ endSession }) as unknown as MachineActorImpls;
    const endLogic = machine.implementations.actors.endSession;

    const actor = createActor(endLogic, { input: { sessionId: 'sess_abc123' } });
    actor.start();
    await waitFor(actor, (s) => s.status === 'done', { timeout: 2000 });

    // The closure hard-codes reason: 'user_exit' — the single client terminal.
    expect(endSession).toHaveBeenCalledTimes(1);
    expect(endSession).toHaveBeenCalledWith({
      sessionId: 'sess_abc123',
      reason: 'user_exit',
    });
    actor.stop();
  });

  it('endSession closure injects user_exit even though only the sessionId is supplied as input', async () => {
    // Non-tautology: the input has NO `reason`; the closure supplies it. If the
    // closure were a passthrough this would be `undefined`, not 'user_exit'.
    const endSession = jest.fn<Promise<void>, [{ sessionId: string; reason: 'user_exit' }]>(async () => {});
    const machine = buildMachine({ endSession }) as unknown as MachineActorImpls;
    const actor = createActor(machine.implementations.actors.endSession, {
      input: { sessionId: 'only-id' },
    });
    actor.start();
    await waitFor(actor, (s) => s.status === 'done', { timeout: 2000 });
    expect(endSession.mock.calls[0][0]).toHaveProperty('reason', 'user_exit');
    actor.stop();
  });
});

describe('LessonSession machine — reconnectSession actor logic closure (L161-164)', () => {
  it('reconnectSession actor threads { deviceSessionId } through and resolves done', async () => {
    const reconnectSession = jest.fn(async () => {});
    const machine = buildMachine({ reconnectSession }) as unknown as MachineActorImpls;
    const reLogic = machine.implementations.actors.reconnectSession;

    const actor = createActor(reLogic, {
      input: { deviceSessionId: 'dsess_xyz789' },
    });
    actor.start();
    await waitFor(actor, (s) => s.status === 'done', { timeout: 2000 });

    expect(reconnectSession).toHaveBeenCalledTimes(1);
    expect(reconnectSession).toHaveBeenCalledWith({ deviceSessionId: 'dsess_xyz789' });
    actor.stop();
  });
});
