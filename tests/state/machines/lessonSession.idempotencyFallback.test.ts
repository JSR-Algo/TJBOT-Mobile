/**
 * LessonSession machine — CONNECTING invoke input `idempotencyKey ?? ''`
 * fallback arm (machine L237).
 *
 * The sibling `lessonSession.actors.test.ts` always sends START_SESSION WITH a
 * real key, so the input mapper's left operand is always truthy and the `?? ''`
 * RIGHT arm (L237c54) stays dark.
 *
 * Here we drive the machine through CONNECTING while `context.idempotencyKey`
 * is null/undefined: START_SESSION's `assignSessionStartArgs` copies
 * `event.idempotencyKey` (undefined when the field is omitted) into context,
 * so the invoked `startSession` input mapper hits `undefined ?? ''` → ''.
 *
 * Real timers so the invoked promise actually settles. Non-tautology: the spy
 * receives EXACTLY `{ idempotencyKey: '' }` — had the mapper passed the raw
 * context through, it would be `undefined`, not `''`.
 */

import { createActor, waitFor } from 'xstate';
import {
  createLessonSessionMachine,
  noopLessonSessionServices,
} from '@/state/machines/lessonSession.machine';
import type {
  LessonSessionServices,
  LessonSessionEvent,
} from '@/state/machines/lessonSession.types';

jest.useRealTimers();

function buildMachine(overrides?: Partial<LessonSessionServices>) {
  return createLessonSessionMachine({
    ...noopLessonSessionServices,
    ...overrides,
  });
}

describe('LessonSession machine — idempotencyKey "" fallback in CONNECTING input (L237)', () => {
  it('forwards { idempotencyKey: "" } when START_SESSION omits the key', async () => {
    const startSession = jest.fn<
      Promise<{ sessionId: string; deviceSessionId: string }>,
      [{ idempotencyKey: string }]
    >(async () => {
      throw new Error('reject to settle the invoke');
    });
    const actor = createActor(buildMachine({ startSession }));
    actor.start();

    // START_SESSION with NO idempotencyKey field → assignSessionStartArgs copies
    // event.idempotencyKey (undefined) into context; the invoke input mapper then
    // takes the `?? ''` fallback arm.
    actor.send({ type: 'START_SESSION' } as unknown as LessonSessionEvent);
    expect(actor.getSnapshot().value).toBe('CONNECTING');

    await waitFor(actor, (s) => s.matches('AUDIO_FAILED'), { timeout: 2000 });

    expect(startSession).toHaveBeenCalledTimes(1);
    // The exact '' fallback — not undefined — proves the `?? ''` arm ran.
    expect(startSession.mock.calls[0][0]).toEqual({ idempotencyKey: '' });
    actor.stop();
  });
});
