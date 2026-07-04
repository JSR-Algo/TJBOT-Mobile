import {
  transitionLessonLifecycle,
  isTerminalLessonLifecycleState,
  mapSessionEndToLifecycle,
  LESSON_LIFECYCLE_STATES,
} from '@/state/lesson-lifecycle.fsm';

describe('lesson-lifecycle.fsm', () => {
  it('exports all ledger states', () => {
    expect(LESSON_LIFECYCLE_STATES).toEqual([
      'pending',
      'active',
      'fallback',
      'abandoned',
      'completed',
      'rewarded',
      'summarized',
    ]);
  });

  it('pending → active on LESSON_STARTED', () => {
    expect(transitionLessonLifecycle('pending', { type: 'LESSON_STARTED' })).toBe('active');
  });

  it('active → completed → rewarded → summarized', () => {
    expect(transitionLessonLifecycle('active', { type: 'LESSON_COMPLETED' })).toBe('completed');
    expect(transitionLessonLifecycle('completed', { type: 'REWARD_SHOWN' })).toBe('rewarded');
    expect(transitionLessonLifecycle('rewarded', { type: 'SUMMARY_READY' })).toBe('summarized');
  });

  it('fallback path can still complete', () => {
    expect(transitionLessonLifecycle('pending', { type: 'FALLBACK_CONTENT' })).toBe('fallback');
    expect(transitionLessonLifecycle('fallback', { type: 'LESSON_COMPLETED' })).toBe('completed');
  });

  it('terminal states reject further transitions', () => {
    expect(transitionLessonLifecycle('abandoned', { type: 'LESSON_STARTED' })).toBe('abandoned');
    expect(transitionLessonLifecycle('summarized', { type: 'REWARD_SHOWN' })).toBe('summarized');
    expect(isTerminalLessonLifecycleState('summarized')).toBe(true);
    expect(isTerminalLessonLifecycleState('active')).toBe(false);
  });

  it('maps session end reasons', () => {
    expect(mapSessionEndToLifecycle('complete')).toBe('completed');
    expect(mapSessionEndToLifecycle('user_exit')).toBe('abandoned');
    expect(mapSessionEndToLifecycle('disconnect_timeout')).toBe('abandoned');
  });
});