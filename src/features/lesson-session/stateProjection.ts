import { STATES } from './states';

/**
 * Projection from LessonSession machine states to lesson-session screens.
 *
 * The machine (`src/state/machines/lessonSession.machine.ts`) and the 24
 * screens in this feature were built as two halves of the same spec
 * (`migrate-ui-ux-to-mobile-app-docs/migration/state-machines-mobile-ux.md`
 * §2.2 / §3.2) but nothing joined them: the machine → screen mapping only ever
 * existed inline inside `tests/navigation/state-machine-executable-alignment.test.ts`.
 * That left no place to answer the three questions T3.2 asks —
 *
 *   1. does every server-emitted state map to a screen?
 *   2. what happens on a state this build does not know?
 *   3. which screens can no state produce (orphans)?
 *
 * This module is that place. It is a PURE mapping over state-path strings; it
 * deliberately does NOT import or instantiate the machine. The guard in
 * `tests/navigation/production-hidden-routes.test.ts` ("keeps the dead
 * lesson-session state machine out of runtime source callers") requires the
 * machine factory to have no caller under `src/` while the lesson-session
 * backend contract is unavailable — this file must stay a pure function of
 * strings so it never becomes one.
 */

export type LessonScreenId = (typeof STATES)[number]['id'];

const ALL_SCREEN_IDS: readonly LessonScreenId[] = STATES.map(state => state.id);

/**
 * The reason discriminator the machine attaches to its single `INTERRUPTED`
 * state. Four screens share that one state; the reason picks between them.
 */
export type LessonInterruptReason = 'bargein' | 'gentle_correction' | 'retry' | 'offtopic';

const SCREEN_BY_INTERRUPT_REASON: Record<LessonInterruptReason, LessonScreenId> = {
  bargein: 'bargein',
  gentle_correction: 'gentle',
  retry: 'retry',
  offtopic: 'offtopic',
};

/**
 * Machine state path (dotted for ACTIVE substates) → screen id.
 *
 * `INTERRUPTED` is absent on purpose — it resolves through
 * SCREEN_BY_INTERRUPT_REASON. `ENDED_BACK` and `ABANDONED` are absent because
 * both mean "leave the lesson stack entirely" (see LESSON_EXIT_STATES).
 */
export const SCREEN_BY_MACHINE_STATE: Record<string, LessonScreenId> = {
  IDLE: 'lesson_ready',
  CONNECTING: 'connecting',
  'ACTIVE.GREETING': 'greeting',
  'ACTIVE.ACTIVITY_INTRO': 'activity_intro',
  'ACTIVE.ROBOT_SPEAKING': 'robot_speaking',
  'ACTIVE.ROBOT_LISTENING': 'robot_listening',
  'ACTIVE.USER_SPEAKING': 'user_speaking',
  'ACTIVE.THINKING': 'thinking',
  'ACTIVE.SILENCE': 'silence',
  'ACTIVE.ACTIVITY_DONE': 'activity_done',
  PAUSED: 'exit_confirm',
  RECONNECTING: 'reconnecting',
  AUDIO_FAILED: 'audio_error',
  SAFETY_HALT: 'safety',
  TIMED_OUT: 'timed_out',
  COST_CAPPED: 'cost_capped',
  PARENT_STOPPED: 'parent_stopped',
  COMPLETED: 'lesson_done',
  ABANDONED_DISCONNECT: 'abandoned_disconnect',
};

/**
 * Machine states that render no lesson screen because they hand the child back
 * to the app shell. Both are `final`; neither can return to a live session.
 */
export const LESSON_EXIT_STATES: readonly string[] = ['ENDED_BACK', 'ABANDONED'];

/**
 * Screens for states the session cannot leave. A terminal screen must never
 * offer an edge back into a live lesson screen — the machine enforces this by
 * making each of these `final`, and
 * `tests/features/lesson-session/lesson-state-projection.test.ts` enforces the
 * screen-graph half.
 */
export const TERMINAL_LESSON_SCREENS: readonly LessonScreenId[] = [
  'lesson_done',
  'safety',
  'timed_out',
  'cost_capped',
  'parent_stopped',
  'abandoned_disconnect',
];

/**
 * Screens shown while the session is still open server-side. Android hardware
 * back on any of these must funnel through ExitConfirm rather than pop the
 * stack (see `hooks/useLessonHardwareBack.ts`).
 *
 * `connecting` is excluded: plan §2.2 routes `user_cancel` during CONNECTING
 * straight to ABANDONED, so back there is a direct exit by spec.
 * `audio_error` is excluded: AUDIO_FAILED is a recovery state whose own
 * `GIVE_UP` edge is a direct exit, and the screen carries its own "Go home".
 * `exit_confirm` is excluded because it IS the confirmation gate.
 */
export const LIVE_LESSON_SCREENS: readonly LessonScreenId[] = [
  'greeting',
  'activity_intro',
  'robot_speaking',
  'robot_listening',
  'user_speaking',
  'thinking',
  'silence',
  'activity_done',
  'success',
  'bargein',
  'gentle',
  'retry',
  'offtopic',
  'reconnecting',
];

/**
 * Screens no machine state can produce.
 *
 * `success` ("Success Moment") is a designed screen with no counterpart in the
 * approved state topology: plan §2.2 collapses per-turn feedback into the
 * single `INTERRUPTED` state with four reasons (bargein / gentle_correction /
 * retry / offtopic) and there is no `SUCCESS` state anywhere in the diagram or
 * the §3.2 state table. It is kept (it is referenced by `STATES`, `SCREEN_MAP`
 * and the route registry, all three of which must stay in lockstep per
 * `tests/navigation/feature-state-alignment.test.ts`) and flagged here instead
 * of deleted — resolving it is a product decision, not a mobile refactor.
 * Tracked in LESSON_PRODUCTION_PLAN.md §5.
 *
 * This list is an allow-list: a NEW orphan fails the projection test.
 */
export const ORPHAN_LESSON_SCREENS: readonly LessonScreenId[] = ['success'];

/**
 * Where an unrecognised machine state lands.
 *
 * `audio_error` is the only non-terminal lesson screen offering BOTH a retry
 * and an explicit "Go home", so an unknown state can never strand a child on a
 * screen with no way out. Rendering nothing, or throwing, is the failure mode
 * this constant exists to prevent.
 */
export const UNKNOWN_STATE_FALLBACK_SCREEN: LessonScreenId = 'audio_error';

function isLessonScreenId(value: string): value is LessonScreenId {
  return (ALL_SCREEN_IDS as readonly string[]).includes(value);
}

/**
 * Render a machine snapshot value as the dotted path this module keys on
 * (`'ACTIVE.THINKING'`, `'RECONNECTING'`).
 */
export function lessonStatePath(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const [parent] = Object.keys(value);
    if (parent === undefined) return String(value);
    const child = (value as Record<string, unknown>)[parent];
    return typeof child === 'string' ? `${parent}.${child}` : parent;
  }
  return String(value);
}

export type LessonScreenProjection = {
  screen: LessonScreenId | null;
  /** True when the state was not recognised and `screen` is the fallback. */
  isFallback: boolean;
};

/**
 * Project a machine state onto the screen that should be showing.
 *
 * Returns `screen: null` for the two exit states, which leave the lesson stack
 * rather than render inside it. Any other unrecognised state resolves to
 * UNKNOWN_STATE_FALLBACK_SCREEN with `isFallback: true` — never a throw, never
 * an empty render.
 */
export function projectLessonScreen(
  stateValue: unknown,
  interruptedReason?: LessonInterruptReason | null,
): LessonScreenProjection {
  const path = lessonStatePath(stateValue);

  if (LESSON_EXIT_STATES.includes(path)) {
    return { screen: null, isFallback: false };
  }

  if (path === 'INTERRUPTED') {
    const screen = interruptedReason ? SCREEN_BY_INTERRUPT_REASON[interruptedReason] : undefined;
    // An INTERRUPTED with no/unknown reason is a contract violation on the
    // server side, not a reason to crash the child's screen.
    return screen
      ? { screen, isFallback: false }
      : { screen: UNKNOWN_STATE_FALLBACK_SCREEN, isFallback: true };
  }

  const mapped = SCREEN_BY_MACHINE_STATE[path];
  if (mapped !== undefined && isLessonScreenId(mapped)) {
    return { screen: mapped, isFallback: false };
  }

  return { screen: UNKNOWN_STATE_FALLBACK_SCREEN, isFallback: true };
}

/** Every screen a machine state can produce, orphans excluded. */
export function reachableLessonScreens(): readonly LessonScreenId[] {
  return [
    ...new Set<LessonScreenId>([
      ...Object.values(SCREEN_BY_MACHINE_STATE),
      ...Object.values(SCREEN_BY_INTERRUPT_REASON),
    ]),
  ].sort();
}

/**
 * The `voiceStateBeforeInterruption` token each live screen hands to
 * ExitConfirm so "Keep playing" returns the child to the screen they were
 * actually on. The four original tokens are kept verbatim — they are asserted
 * by `tests/features/lesson-session/lesson-hardware-back-wiring.test.tsx` and
 * travel in route params.
 *
 * Every entry here must have a matching arm in `ExitConfirmScreen`'s resume
 * switch; the projection test asserts that parity so a new live screen cannot
 * be added with a token that silently falls through to Listening.
 */
export const LESSON_RESUME_TOKEN_BY_SCREEN: Record<string, string> = {
  greeting: 'GREETING',
  activity_intro: 'ACTIVITY_INTRO',
  robot_speaking: 'ASSISTANT_SPEAKING',
  robot_listening: 'LISTENING',
  user_speaking: 'USER_SPEAKING',
  thinking: 'WAITING_AI',
  silence: 'SILENCE',
  activity_done: 'ACTIVITY_DONE',
  success: 'SUCCESS',
  bargein: 'INTERRUPTED_BARGEIN',
  gentle: 'INTERRUPTED_GENTLE',
  retry: 'INTERRUPTED_RETRY',
  offtopic: 'INTERRUPTED_OFFTOPIC',
  reconnecting: 'RECONNECTING',
};

export function isTerminalLessonScreen(screen: LessonScreenId): boolean {
  return TERMINAL_LESSON_SCREENS.includes(screen);
}

export function isLiveLessonScreen(screen: LessonScreenId): boolean {
  return LIVE_LESSON_SCREENS.includes(screen);
}
