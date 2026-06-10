import { SCREEN_MAP, STATES } from '../../src/features/lesson-session';
import { LESSON_SESSION_SCREENS } from '../../src/features/lesson-session/navigation';

const requiredRecoveryStates = [
  'reconnecting',
  'audio_error',
  'safety',
  'cost_capped',
  'timed_out',
  'abandoned_disconnect',
  'parent_stopped',
] as const;

const requiredLoopStates = [
  'robot_listening',
  'user_speaking',
  'thinking',
  'robot_speaking',
  'silence',
  'bargein',
] as const;

describe('lesson-session voice stability coverage', () => {
  it('maps every declared lesson-session state to a screen component', () => {
    const ids = STATES.map((state) => state.id);

    for (const id of ids) {
      expect(SCREEN_MAP[id]).toBeDefined();
    }
  });

  it('exposes recovery and fallback screens for unrecoverable voice outcomes', () => {
    for (const stateId of requiredRecoveryStates) {
      expect(SCREEN_MAP[stateId]).toBeDefined();
      expect(
        LESSON_SESSION_SCREENS.some((screen) => screen.stateMachineId === stateId),
      ).toBe(true);
    }
  });

  it('exposes active loop screens for silence, barge-in, and transcript/audio turn flow', () => {
    for (const stateId of requiredLoopStates) {
      expect(SCREEN_MAP[stateId]).toBeDefined();
      expect(
        LESSON_SESSION_SCREENS.some((screen) => screen.stateMachineId === stateId),
      ).toBe(true);
    }
  });
});
