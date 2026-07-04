/**
 * Lesson lifecycle FSM — launch-readiness ledger states.
 *
 * Maps product-facing lesson states to runtime lessonSession.machine terminals.
 * Server remains authoritative for session end; this FSM governs parent-visible
 * lesson status and gating for resume/reward/summary surfaces.
 */

export const LESSON_LIFECYCLE_STATES = [
  'pending',
  'active',
  'fallback',
  'abandoned',
  'completed',
  'rewarded',
  'summarized',
] as const;

export type LessonLifecycleState = (typeof LESSON_LIFECYCLE_STATES)[number];

export type LessonLifecycleEvent =
  | { type: 'LESSON_ASSIGNED' }
  | { type: 'LESSON_STARTED' }
  | { type: 'FALLBACK_CONTENT' }
  | { type: 'LESSON_ABANDONED' }
  | { type: 'LESSON_COMPLETED' }
  | { type: 'REWARD_SHOWN' }
  | { type: 'SUMMARY_READY' };

const TERMINAL: ReadonlySet<LessonLifecycleState> = new Set([
  'abandoned',
  'rewarded',
  'summarized',
]);

export function isTerminalLessonLifecycleState(state: LessonLifecycleState): boolean {
  return TERMINAL.has(state);
}

export function transitionLessonLifecycle(
  state: LessonLifecycleState,
  event: LessonLifecycleEvent,
): LessonLifecycleState {
  switch (state) {
    case 'pending':
      if (event.type === 'LESSON_STARTED') return 'active';
      if (event.type === 'FALLBACK_CONTENT') return 'fallback';
      if (event.type === 'LESSON_ABANDONED') return 'abandoned';
      return state;
    case 'active':
      if (event.type === 'FALLBACK_CONTENT') return 'fallback';
      if (event.type === 'LESSON_ABANDONED') return 'abandoned';
      if (event.type === 'LESSON_COMPLETED') return 'completed';
      return state;
    case 'fallback':
      if (event.type === 'LESSON_STARTED') return 'active';
      if (event.type === 'LESSON_ABANDONED') return 'abandoned';
      if (event.type === 'LESSON_COMPLETED') return 'completed';
      return state;
    case 'completed':
      if (event.type === 'REWARD_SHOWN') return 'rewarded';
      if (event.type === 'SUMMARY_READY') return 'summarized';
      return state;
    case 'rewarded':
      if (event.type === 'SUMMARY_READY') return 'summarized';
      return state;
    case 'abandoned':
    case 'summarized':
      return state;
    default:
      return state;
  }
}

/** Map lessonSession.machine terminal to lifecycle state for analytics/UI. */
export function mapSessionEndToLifecycle(
  endReason: string | null | undefined,
): LessonLifecycleState {
  if (endReason === 'complete') return 'completed';
  if (
    endReason === 'user_exit' ||
    endReason === 'disconnect_timeout' ||
    endReason === 'timeout' ||
    endReason === 'parent_stop'
  ) {
    return 'abandoned';
  }
  return 'abandoned';
}