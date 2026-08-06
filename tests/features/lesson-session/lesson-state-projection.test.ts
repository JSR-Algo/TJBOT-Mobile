/**
 * T3.2 — the machine ↔ screen join.
 *
 * Answers the three questions the task asks, executably:
 *   1. every state the server can drive the machine into maps to a screen;
 *   2. an unrecognised state lands on a safe fallback instead of crashing;
 *   3. which screens no state can produce (orphans), pinned to an allow-list
 *      so a NEW orphan fails this suite.
 *
 * The projection is exercised against a REAL running machine, not a
 * hand-written list of state names — a state added to the machine without a
 * screen shows up here as a fallback projection.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createActor } from 'xstate';
import {
  createLessonSessionMachine,
  noopLessonSessionServices,
  type LessonSessionActor,
} from '@/state/machines/lessonSession.machine';
import { STATES } from '@/features/lesson-session/states';
import { SCREEN_MAP } from '@/features/lesson-session';
import {
  LESSON_EXIT_STATES,
  LESSON_RESUME_TOKEN_BY_SCREEN,
  LIVE_LESSON_SCREENS,
  ORPHAN_LESSON_SCREENS,
  SCREEN_BY_MACHINE_STATE,
  TERMINAL_LESSON_SCREENS,
  UNKNOWN_STATE_FALLBACK_SCREEN,
  isLiveLessonScreen,
  isTerminalLessonScreen,
  lessonStatePath,
  projectLessonScreen,
  reachableLessonScreens,
  type LessonScreenId,
} from '@/features/lesson-session/stateProjection';

const featureRoot = join(__dirname, '..', '..', '..', 'src', 'features', 'lesson-session');

const IDEMPOTENCY_KEY = '11111111-2222-3333-4444-555555555555';
const SESSION_ID = 'sess_abc123';
const DEVICE_SESSION_ID = 'dsess_xyz789';

function buildActor(): LessonSessionActor {
  const actor = createActor(createLessonSessionMachine(noopLessonSessionServices));
  actor.start();
  return actor;
}

function toActive(actor: LessonSessionActor): void {
  actor.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
  actor.send({ type: 'SESSION_STARTED', sessionId: SESSION_ID, deviceSessionId: DEVICE_SESSION_ID });
}

function screenFor(actor: LessonSessionActor): LessonScreenId | null {
  const snapshot = actor.getSnapshot();
  return projectLessonScreen(snapshot.value, snapshot.context.interruptedReason).screen;
}

const ALL_SCREEN_IDS = STATES.map(state => state.id);

describe('T3.2 — every machine state the server can reach projects to a screen', () => {
  /**
   * Walk the machine to each reachable state and assert the projection is a
   * real, registered screen — no fallbacks on any legitimate state.
   */
  const walks: Array<{ state: string; walk: (actor: LessonSessionActor) => void; screen: LessonScreenId }> = [
    { state: 'IDLE', walk: () => undefined, screen: 'lesson_ready' },
    {
      state: 'CONNECTING',
      walk: (a) => a.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY }),
      screen: 'connecting',
    },
    { state: 'ACTIVE.GREETING', walk: toActive, screen: 'greeting' },
    {
      state: 'ACTIVE.ACTIVITY_INTRO',
      walk: (a) => { toActive(a); a.send({ type: 'GREETING_DONE' }); },
      screen: 'activity_intro',
    },
    {
      state: 'ACTIVE.ROBOT_SPEAKING',
      walk: (a) => { toActive(a); a.send({ type: 'GREETING_DONE' }); a.send({ type: 'INTRO_DONE' }); },
      screen: 'robot_speaking',
    },
    {
      state: 'ACTIVE.ROBOT_LISTENING',
      walk: (a) => {
        toActive(a);
        a.send({ type: 'GREETING_DONE' });
        a.send({ type: 'INTRO_DONE' });
        a.send({ type: 'REPLY_READY' });
      },
      screen: 'robot_listening',
    },
    {
      state: 'ACTIVE.USER_SPEAKING',
      walk: (a) => {
        toActive(a);
        a.send({ type: 'GREETING_DONE' });
        a.send({ type: 'INTRO_DONE' });
        a.send({ type: 'REPLY_READY' });
        a.send({ type: 'VAD_SPEECH' });
      },
      screen: 'user_speaking',
    },
    {
      state: 'ACTIVE.SILENCE',
      walk: (a) => {
        toActive(a);
        a.send({ type: 'GREETING_DONE' });
        a.send({ type: 'INTRO_DONE' });
        a.send({ type: 'REPLY_READY' });
        a.send({ type: 'VAD_SILENCE_2S' });
      },
      screen: 'silence',
    },
    {
      state: 'ACTIVE.THINKING',
      walk: (a) => {
        toActive(a);
        a.send({ type: 'GREETING_DONE' });
        a.send({ type: 'INTRO_DONE' });
        a.send({ type: 'REPLY_READY' });
        a.send({ type: 'VAD_SPEECH' });
        a.send({ type: 'VAD_END' });
      },
      screen: 'thinking',
    },
    {
      state: 'ACTIVE.ACTIVITY_DONE',
      walk: (a) => {
        toActive(a);
        a.send({ type: 'GREETING_DONE' });
        a.send({ type: 'INTRO_DONE' });
        a.send({ type: 'REPLY_READY' });
        a.send({ type: 'VAD_SPEECH' });
        a.send({ type: 'VAD_END' });
        a.send({ type: 'ACTIVITY_COMPLETE' });
      },
      screen: 'activity_done',
    },
    {
      state: 'PAUSED',
      walk: (a) => { toActive(a); a.send({ type: 'USER_EXIT_TAP' }); },
      screen: 'exit_confirm',
    },
    {
      state: 'RECONNECTING',
      walk: (a) => { toActive(a); a.send({ type: 'WS_DISCONNECT' }); },
      screen: 'reconnecting',
    },
    {
      state: 'AUDIO_FAILED',
      walk: (a) => {
        a.send({ type: 'START_SESSION', idempotencyKey: IDEMPOTENCY_KEY });
        a.send({ type: 'WS_FAIL', code: 'ws_fail' });
      },
      screen: 'audio_error',
    },
    {
      state: 'COMPLETED',
      walk: (a) => { toActive(a); a.send({ type: 'SESSION_END', reason: 'complete' }); },
      screen: 'lesson_done',
    },
    {
      state: 'TIMED_OUT',
      walk: (a) => { toActive(a); a.send({ type: 'SESSION_END', reason: 'timeout' }); },
      screen: 'timed_out',
    },
    {
      state: 'COST_CAPPED',
      walk: (a) => { toActive(a); a.send({ type: 'SESSION_END', reason: 'cost_limit' }); },
      screen: 'cost_capped',
    },
    {
      state: 'PARENT_STOPPED',
      walk: (a) => { toActive(a); a.send({ type: 'SESSION_END', reason: 'parent_stop' }); },
      screen: 'parent_stopped',
    },
    {
      state: 'ABANDONED_DISCONNECT',
      walk: (a) => { toActive(a); a.send({ type: 'SESSION_END', reason: 'disconnect_timeout' }); },
      screen: 'abandoned_disconnect',
    },
    {
      state: 'SAFETY_HALT',
      walk: (a) => { toActive(a); a.send({ type: 'SAFETY_BLOCK' }); },
      screen: 'safety',
    },
  ];

  it.each(walks)('$state projects to $screen', ({ state, walk, screen }) => {
    const actor = buildActor();
    walk(actor);
    expect(lessonStatePath(actor.getSnapshot().value)).toBe(state);
    const projection = projectLessonScreen(
      actor.getSnapshot().value,
      actor.getSnapshot().context.interruptedReason,
    );
    expect(projection).toEqual({ screen, isFallback: false });
    expect(SCREEN_MAP).toHaveProperty(screen);
    actor.stop();
  });

  it.each([
    ['bargein', 'bargein'],
    ['gentle_correction', 'gentle'],
    ['retry', 'retry'],
    ['offtopic', 'offtopic'],
  ] as const)('INTERRUPTED { reason: %s } projects to %s', (reason, screen) => {
    const actor = buildActor();
    toActive(actor);
    actor.send({ type: 'INTERRUPT', reason });
    expect(lessonStatePath(actor.getSnapshot().value)).toBe('INTERRUPTED');
    expect(screenFor(actor)).toBe(screen);
    actor.stop();
  });

  it('projects the two exit states to no screen at all', () => {
    for (const state of LESSON_EXIT_STATES) {
      expect(projectLessonScreen(state)).toEqual({ screen: null, isFallback: false });
    }

    const actor = buildActor();
    actor.send({ type: 'BACK_TO_HOME' });
    expect(screenFor(actor)).toBeNull();
    actor.stop();

    const exiting = buildActor();
    toActive(exiting);
    exiting.send({ type: 'USER_EXIT_TAP' });
    exiting.send({ type: 'CONFIRM_EXIT' });
    expect(screenFor(exiting)).toBeNull();
    exiting.stop();
  });
});

describe('T3.2 — unknown states land on a safe fallback, never a crash', () => {
  const unknown: unknown[] = [
    'SOME_FUTURE_SERVER_STATE',
    'ACTIVE.SINGING',
    { ACTIVE: 'SINGING' },
    { FUTURE_COMPOSITE: { NESTED: 'DEEP' } },
    '',
    undefined,
    null,
    42,
    {},
  ];

  it.each(unknown.map(value => [JSON.stringify(value) ?? String(value), value]))(
    'projects %s to the fallback screen',
    (_label, value) => {
      const projection = projectLessonScreen(value);
      expect(projection.isFallback).toBe(true);
      expect(projection.screen).toBe(UNKNOWN_STATE_FALLBACK_SCREEN);
      expect(SCREEN_MAP).toHaveProperty(String(projection.screen));
    },
  );

  it('treats INTERRUPTED with a missing or unknown reason as a fallback, not a crash', () => {
    expect(projectLessonScreen('INTERRUPTED')).toEqual({
      screen: UNKNOWN_STATE_FALLBACK_SCREEN,
      isFallback: true,
    });
    expect(projectLessonScreen('INTERRUPTED', null)).toEqual({
      screen: UNKNOWN_STATE_FALLBACK_SCREEN,
      isFallback: true,
    });
  });

  it('picks a fallback that is non-terminal and always offers a way out', () => {
    // A terminal fallback would strand the child in a dead end for what may be
    // a recoverable version skew.
    expect(isTerminalLessonScreen(UNKNOWN_STATE_FALLBACK_SCREEN)).toBe(false);
    const source = readFileSync(join(featureRoot, 'screens', 'AudioErrorScreen.tsx'), 'utf8');
    expect(source).toContain('ROUTES.HomeHubScreen');
  });
});

describe('T3.2 — orphan / unreachable screen audit', () => {
  it('accounts for all 24 screens as reachable or explicitly flagged', () => {
    expect(ALL_SCREEN_IDS).toHaveLength(24);
    expect(Object.keys(SCREEN_MAP).sort()).toEqual([...ALL_SCREEN_IDS].sort());

    const reachable = reachableLessonScreens();
    const unaccounted = ALL_SCREEN_IDS.filter(
      id => !reachable.includes(id) && !ORPHAN_LESSON_SCREENS.includes(id),
    );

    // A screen that no machine state produces must be added to
    // ORPHAN_LESSON_SCREENS with a documented reason and a findings-log row,
    // or given a producing state. Silently unreachable screens fail here.
    expect(unaccounted).toEqual([]);
  });

  it('flags exactly the known orphan set', () => {
    expect([...ORPHAN_LESSON_SCREENS]).toEqual(['success']);
    expect(reachableLessonScreens()).not.toContain('success');
  });

  it('does not claim a screen is both reachable and orphaned', () => {
    const reachable = reachableLessonScreens();
    expect(ORPHAN_LESSON_SCREENS.filter(id => reachable.includes(id))).toEqual([]);
  });

  it('maps no machine state to a screen the feature does not own', () => {
    const projected = Object.values(SCREEN_BY_MACHINE_STATE);
    expect(projected.filter(screen => !ALL_SCREEN_IDS.includes(screen))).toEqual([]);
  });

  it('gives each machine state exactly one screen', () => {
    const duplicated = Object.values(SCREEN_BY_MACHINE_STATE).filter(
      (screen, index, all) => all.indexOf(screen) !== index,
    );
    expect(duplicated).toEqual([]);
  });
});

describe('T3.2 — terminal vs live classification', () => {
  it('classifies every screen as terminal, live, or a documented neither', () => {
    // `lesson_ready` (session not started), `connecting` (spec: back = direct
    // cancel), `audio_error` (recovery state with its own exit), and
    // `exit_confirm` (the gate itself) are deliberately in neither bucket.
    const neither = ['lesson_ready', 'connecting', 'audio_error', 'exit_confirm'];
    const classified = [...TERMINAL_LESSON_SCREENS, ...LIVE_LESSON_SCREENS, ...neither].sort();
    expect(classified).toEqual([...ALL_SCREEN_IDS].sort());
  });

  it('never classifies a screen as both terminal and live', () => {
    expect(TERMINAL_LESSON_SCREENS.filter(isLiveLessonScreen)).toEqual([]);
  });

  it('no terminal screen offers an edge back into a live lesson screen', () => {
    const liveRoutes = LIVE_LESSON_SCREENS.map(
      screen => `${screen.replace(/(^|_)(\w)/g, (_m, _s, c: string) => c.toUpperCase())}Screen`,
    );

    const offenders: string[] = [];
    for (const terminal of TERMINAL_LESSON_SCREENS) {
      const component = `${terminal.replace(/(^|_)(\w)/g, (_m, _s, c: string) => c.toUpperCase())}Screen`;
      const source = readFileSync(join(featureRoot, 'screens', `${component}.tsx`), 'utf8');
      for (const liveRoute of liveRoutes) {
        if (source.includes(`ROUTES.${liveRoute}`)) {
          offenders.push(`${component} -> ${liveRoute}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('T3.2 — hardware-back resume tokens round-trip through ExitConfirm', () => {
  const exitConfirmSource = readFileSync(join(featureRoot, 'screens', 'ExitConfirmScreen.tsx'), 'utf8');

  it('gives every live screen a resume token', () => {
    expect(Object.keys(LESSON_RESUME_TOKEN_BY_SCREEN).sort()).toEqual([...LIVE_LESSON_SCREENS].sort());
  });

  it('uses a distinct token per screen', () => {
    const tokens = Object.values(LESSON_RESUME_TOKEN_BY_SCREEN);
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('handles every token in the ExitConfirm resume switch', () => {
    const unhandled = Object.entries(LESSON_RESUME_TOKEN_BY_SCREEN)
      .filter(([, token]) => !exitConfirmSource.includes(`case '${token}':`))
      .map(([screen, token]) => `${screen} (${token})`);

    expect(unhandled).toEqual([]);
  });

  it('resumes each token to its own screen, not a generic listening fallback', () => {
    const offenders: string[] = [];
    for (const [screen, token] of Object.entries(LESSON_RESUME_TOKEN_BY_SCREEN)) {
      const component = `${screen.replace(/(^|_)(\w)/g, (_m, _s, c: string) => c.toUpperCase())}Screen`;
      const arm = exitConfirmSource.split(`case '${token}':`)[1] ?? '';
      const target = arm.split('return;')[0] ?? '';
      if (!target.includes(`ROUTES.${component}`)) {
        offenders.push(`${token} -> expected ROUTES.${component}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps a default arm so an unrecognised token cannot dead-end the sheet', () => {
    expect(exitConfirmSource).toContain('default:');
    expect(exitConfirmSource).toContain('ROUTES.RobotListeningScreen');
  });
});
