/**
 * Round-1 coverage closeout for `assignAudioFailure` (lessonSession.machine.ts).
 *
 * The action's updater (machine.ts:126-131) returns `event.code` for
 * WS_FAIL / AUDIO_INIT_FAIL and `null` otherwise. Both wiring sites
 * (CONNECTING.WS_FAIL / CONNECTING.AUDIO_INIT_FAIL) only ever dispatch it
 * with a matching event, so the `return null` fallback (line 130) is a
 * defensive guard that is unreachable through the machine's transitions.
 *
 * We cover it by invoking the action's `assign` updater directly with a
 * non-failure event — exercising the else branch without mutating any
 * production wiring. We assert the positive branches too so the test fully
 * pins the contract of this updater.
 */

import { createLessonSessionMachine, noopLessonSessionServices } from '@/state/machines/lessonSession.machine';
import type { LessonSessionEvent } from '@/state/machines/lessonSession.types';

// xstate's `assign(...)` builder stores per-field updater closures on
// `action.assignment[field]`. Reach the exact closure under test.
type AudioFailureUpdater = (args: { context: unknown; event: LessonSessionEvent }) => string | null;

function audioFailureUpdater(): AudioFailureUpdater {
  const machine = createLessonSessionMachine(noopLessonSessionServices) as unknown as {
    implementations: { actions: Record<string, { assignment: { audioFailureCode: AudioFailureUpdater } }> };
  };
  return machine.implementations.actions.assignAudioFailure.assignment.audioFailureCode;
}

describe('assignAudioFailure updater (machine.ts:126-131)', () => {
  it('returns the event code for WS_FAIL', () => {
    const updater = audioFailureUpdater();
    expect(updater({ context: {}, event: { type: 'WS_FAIL', code: 'ws_fail' } })).toBe('ws_fail');
  });

  it('returns the event code for AUDIO_INIT_FAIL', () => {
    const updater = audioFailureUpdater();
    expect(updater({ context: {}, event: { type: 'AUDIO_INIT_FAIL', code: 'audio_init_fail' } })).toBe(
      'audio_init_fail',
    );
  });

  it('returns null for any other (non-failure) event — the defensive else branch (line 130)', () => {
    const updater = audioFailureUpdater();
    expect(updater({ context: {}, event: { type: 'RESUME' } as LessonSessionEvent })).toBeNull();
  });
});
