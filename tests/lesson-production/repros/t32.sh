#!/usr/bin/env bash
# repo: tbot-mobile
# T3.2 repro — the mobile lesson-session state machine (24 screens).
#
# The probe below is written INTO the worktree at run time, so the identical
# test code executes on the pre-patch base and on the fix branch. It asserts
# the four defects this task fixed, each found by auditing the machine, the 24
# screens and the navigation graph against the approved topology
# (migrate-ui-ux-to-mobile-app-docs/migration/state-machines-mobile-ux.md
# §2.2 / §3.2 / §4.2):
#
#   MOB-T32-1  RECONNECTING had no AUDIO_INIT_FAIL edge, so plan §4.2's
#              `RECONNECTING -> AUDIO_FAILED (audio_init_fail_on_resume)` row
#              was unimplemented. WS resumes, device audio fails to re-init,
#              the event is silently dropped, and because RECONNECTING has no
#              client-side terminal by design the child is stranded there for
#              good — offline banner up, no retry, no exit.
#   MOB-T32-2  RESUME / WS_RESUMED targeted bare ACTIVE, re-running
#              `initial: 'GREETING'`. A 2 s WS blip in activity 4, or tapping
#              "Keep playing" on the exit sheet, threw the child back to the
#              greeting — contradicting ExitConfirmScreen, which reads
#              voiceStateBeforeInterruption precisely to avoid that.
#   MOB-T32-3  lessonSessionRealtimeAdapter validated frame.sessionId as a
#              non-empty string and then discarded it, so a TURN_COMPLETE the
#              WS flushed after the child exited drove the live machine.
#   MOB-T32-4  The hardware-back confirm gate covered 4 of the 14 screens where
#              the lesson is still live; back on the other 10 popped the stack
#              mid-lesson with no confirmation.
#
# Plus the structural gap: no state->screen projection existed anywhere (the
# mapping lived inline in a test helper), so "every server state maps to a
# screen" and "unknown state -> safe fallback, not a crash" had no answer.
#
# RED on base, GREEN on the fix branch.
set -euo pipefail

CANON="$TBOT_REPRO_REPO_ROOT"
[ -e node_modules ] || ln -s "${TBOT_REPRO_DEPENDENCY_ROOT:-$CANON}/node_modules" node_modules
PROBE="tests/features/lesson-session/t32-repro-probe.test.tsx"
cleanup() { rm -f "$PROBE"; return 0; }
trap cleanup EXIT

mkdir -p "$(dirname "$PROBE")"
cat >"$PROBE" <<'PROBE_EOF'
import React from 'react';
import { render } from '@testing-library/react-native';
import { createActor } from 'xstate';
import { ROUTES } from '@/navigation/routes';
import {
  createLessonSessionMachine,
  noopLessonSessionServices,
} from '@/state/machines/lessonSession.machine';
import { lessonSessionEventFromRealtimeFrame } from '@/state/machines/lessonSessionRealtimeAdapter';

let backPressListener: (() => boolean) | null = null;
jest.mock('react-native/Libraries/Utilities/BackHandler', () => ({
  __esModule: true,
  default: {
    addEventListener: (event: string, cb: () => boolean) => {
      if (event === 'hardwareBackPress') backPressListener = cb;
      return { remove: () => { backPressListener = null; } };
    },
  },
}));

function path(actor: never): string {
  const value = (actor as never as { getSnapshot: () => { value: unknown } }).getSnapshot().value;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const [parent] = Object.keys(value);
    return `${parent}.${(value as Record<string, string>)[parent]}`;
  }
  return String(value);
}

function toThinking() {
  const actor = createActor(createLessonSessionMachine(noopLessonSessionServices));
  actor.start();
  actor.send({ type: 'START_SESSION', idempotencyKey: 'k-1' });
  actor.send({ type: 'SESSION_STARTED', sessionId: 'sess-1', deviceSessionId: 'dsess-1' });
  actor.send({ type: 'GREETING_DONE' });
  actor.send({ type: 'INTRO_DONE' });
  actor.send({ type: 'REPLY_READY' });
  actor.send({ type: 'VAD_SPEECH' });
  actor.send({ type: 'VAD_END' });
  return actor;
}

// MOB-T32-1
it('RECONNECTING recovers to AUDIO_FAILED when audio cannot re-init on resume', () => {
  const actor = toThinking();
  actor.send({ type: 'WS_DISCONNECT' });
  expect(path(actor as never)).toBe('RECONNECTING');

  actor.send({ type: 'AUDIO_INIT_FAIL', code: 'audio_init_fail' });

  // Without the edge the event is dropped and the child is stuck forever.
  expect(path(actor as never)).toBe('AUDIO_FAILED');
  actor.send({ type: 'RETRY' });
  expect(path(actor as never)).toBe('CONNECTING');
  actor.stop();
});

// MOB-T32-2
it('resume returns to the substate the child was in, not the greeting', () => {
  const afterInterrupt = toThinking();
  afterInterrupt.send({ type: 'INTERRUPT', reason: 'bargein' });
  afterInterrupt.send({ type: 'RESUME' });
  expect(path(afterInterrupt as never)).toBe('ACTIVE.THINKING');
  afterInterrupt.stop();

  const afterPause = toThinking();
  afterPause.send({ type: 'USER_EXIT_TAP' });
  afterPause.send({ type: 'RESUME' });
  expect(path(afterPause as never)).toBe('ACTIVE.THINKING');
  afterPause.stop();

  const afterReconnect = toThinking();
  afterReconnect.send({ type: 'WS_DISCONNECT' });
  afterReconnect.send({ type: 'WS_RESUMED' });
  expect(path(afterReconnect as never)).toBe('ACTIVE.THINKING');
  afterReconnect.stop();
});

// MOB-T32-3
it('drops a realtime frame that belongs to another session', () => {
  const adapt = lessonSessionEventFromRealtimeFrame as unknown as (
    frame: unknown,
    epoch: unknown,
  ) => unknown;
  const frame = { type: 'TURN_COMPLETE', sessionId: 'sess-0', turnId: 't-9', responseText: 'late' };

  // Stale session, and post-exit (no live session) — both must be dropped.
  expect(adapt(frame, { sessionId: 'sess-1' })).toBeNull();
  expect(adapt({ ...frame, sessionId: 'sess-1' }, { sessionId: null })).toBeNull();
  // The matching frame still gets through.
  expect(adapt({ ...frame, sessionId: 'sess-1' }, { sessionId: 'sess-1' })).toEqual({
    type: 'TURN_COMPLETE',
    turnId: 't-9',
    responseText: 'late',
  });
});

// MOB-T32-4
it('gates Android hardware-back through ExitConfirm on live screens beyond the four voice screens', () => {
  const cases: Array<[string, string]> = [
    ['GreetingScreen', 'GREETING'],
    ['SilenceScreen', 'SILENCE'],
    ['BargeinScreen', 'INTERRUPTED_BARGEIN'],
    ['ActivityDoneScreen', 'ACTIVITY_DONE'],
    ['ReconnectingScreen', 'RECONNECTING'],
  ];

  for (const [component, token] of cases) {
    backPressListener = null;
    const Screen = require(`@/features/lesson-session/screens/${component}`).default;
    const navigation = {
      navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(), setOptions: jest.fn(),
      canGoBack: jest.fn(() => true), isFocused: jest.fn(() => true),
      addListener: jest.fn(() => jest.fn()), removeListener: jest.fn(),
    };
    render(<Screen navigation={navigation as never} route={{ key: component, name: component, params: {} } as never} />);

    expect(backPressListener).not.toBeNull();
    expect(backPressListener!()).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.ExitConfirmScreen,
      { voiceStateBeforeInterruption: token, resumeReason: 'exit_confirm' },
    );
  }
});

// Structural gap: a state->screen projection with a safe unknown-state fallback.
it('projects machine states onto screens and never crashes on an unknown state', () => {
  let projection: Record<string, unknown> | null = null;
  try {
    projection = require('@/features/lesson-session/stateProjection');
  } catch {
    projection = null;
  }
  expect(projection).not.toBeNull();

  const project = projection!.projectLessonScreen as (v: unknown, r?: unknown) => { screen: string | null; isFallback: boolean };
  const isTerminal = projection!.isTerminalLessonScreen as (s: string) => boolean;

  expect(project('RECONNECTING')).toEqual({ screen: 'reconnecting', isFallback: false });
  expect(project('PARENT_STOPPED')).toEqual({ screen: 'parent_stopped', isFallback: false });
  expect(project({ ACTIVE: 'SILENCE' })).toEqual({ screen: 'silence', isFallback: false });
  expect(project('INTERRUPTED', 'offtopic')).toEqual({ screen: 'offtopic', isFallback: false });

  for (const unknown of ['SOME_FUTURE_SERVER_STATE', undefined, null, 42, {}]) {
    const result = project(unknown);
    expect(result.isFallback).toBe(true);
    // The fallback must not strand a child in a terminal dead end.
    expect(isTerminal(result.screen as string)).toBe(false);
  }
});
PROBE_EOF

# NOTE: `--selectProjects` is a yargs array option and swallows a trailing positional
# path, so the probe must be selected with an explicit --testPathPattern.
# --maxWorkers=2: mobile suites time out at the 5000 ms jest default when the host
# is under heavy contention (see the T0.4/T6.5 finding on load-dependent mobile
# test flakiness). Pinning workers keeps the gate verdict trustworthy.
npx jest --selectProjects=unit --maxWorkers=2 --testPathPattern='t32-repro-probe'
