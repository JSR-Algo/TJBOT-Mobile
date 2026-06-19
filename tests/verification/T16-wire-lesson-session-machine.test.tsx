import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { createActor } from 'xstate';
import ConnectingScreen from '@/features/lesson-session/screens/ConnectingScreen';
import * as SessionContext from '@/features/lesson-session/sessionContext';
import {
  createLessonSessionMachine,
  noopLessonSessionServices,
} from '@/state/machines/lessonSession.machine';
import { ROUTES } from '@/navigation/routes';
import type { LessonSessionActor } from '@/state/machines';

jest.useFakeTimers();

const LessonSessionProvider = (SessionContext as any).LessonSessionProvider as
  | React.ComponentType<{ actor: LessonSessionActor; children: React.ReactNode }>
  | undefined;
const useLessonSessionActor = (SessionContext as any).useLessonSessionActor as
  | (() => LessonSessionActor)
  | undefined;

type NavigateMock = jest.Mock<void, [string, object?]>;

function TestHarness({ navigate }: { navigate: NavigateMock }) {
  // After the fix this hook is required; before the fix the provider guard will fail first.
  useLessonSessionActor?.();

  return (
    <ConnectingScreen
      navigation={{
        navigate,
        goBack: jest.fn(),
        replace: jest.fn(),
        setParams: jest.fn(),
        isFocused: jest.fn(() => true),
        addListener: jest.fn(() => jest.fn()),
        removeListener: jest.fn(),
      } as any}
      route={{ key: 'test-connecting', name: 'ConnectingScreen', params: {} } as any}
    />
  );
}

function buildActor(): LessonSessionActor {
  const machine = createLessonSessionMachine(noopLessonSessionServices);
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'START_SESSION', idempotencyKey: 't16-test-idempotency-key' });
  return actor;
}

describe('T16: ConnectingScreen wired to lessonSessionMachine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not navigate on a fixed timer and reaches GreetingScreen only when the machine enters ACTIVE', async () => {
    // Guard: the fix must export the actor provider and hook from sessionContext.ts.
    if (!LessonSessionProvider || !useLessonSessionActor) {
      throw new Error(
        'Expected LessonSessionProvider and useLessonSessionActor to be exported from src/features/lesson-session/sessionContext.ts',
      );
    }

    const actor = buildActor();
    expect(actor.getSnapshot().value).toBe('CONNECTING');

    const navigate = jest.fn() as NavigateMock;

    render(
      <LessonSessionProvider actor={actor}>
        <TestHarness navigate={navigate} />
      </LessonSessionProvider>,
    );

    // The pre-fix implementation navigated after a hard-coded 1.8 s timer.
    // After the fix the screen must still be on ConnectingScreen.
    jest.advanceTimersByTime(2000);
    await waitFor(() => expect(navigate).not.toHaveBeenCalled());

    // Simulate the transport layer reporting that the session has started.
    act(() => {
      actor.send({
        type: 'SESSION_STARTED',
        sessionId: 't16-session-id',
        deviceSessionId: 't16-device-session-id',
      });
    });

    expect(actor.getSnapshot().value).toEqual({ ACTIVE: 'GREETING' });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(ROUTES.GreetingScreen),
    );

    actor.stop();
  });

  it('routes to ReconnectingScreen when the machine enters RECONNECTING', async () => {
    if (!LessonSessionProvider || !useLessonSessionActor) {
      throw new Error(
        'Expected LessonSessionProvider and useLessonSessionActor to be exported from src/features/lesson-session/sessionContext.ts',
      );
    }

    const actor = buildActor();
    actor.send({
      type: 'SESSION_STARTED',
      sessionId: 't16-session-id',
      deviceSessionId: 't16-device-session-id',
    });
    expect(actor.getSnapshot().value).toEqual({ ACTIVE: 'GREETING' });

    const navigate = jest.fn() as NavigateMock;

    render(
      <LessonSessionProvider actor={actor}>
        <TestHarness navigate={navigate} />
      </LessonSessionProvider>,
    );

    act(() => {
      actor.send({ type: 'WS_DISCONNECT' });
    });

    expect(actor.getSnapshot().value).toBe('RECONNECTING');
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(ROUTES.ReconnectingScreen),
    );

    actor.stop();
  });

  it('routes to AudioErrorScreen when the machine enters AUDIO_FAILED', async () => {
    if (!LessonSessionProvider || !useLessonSessionActor) {
      throw new Error(
        'Expected LessonSessionProvider and useLessonSessionActor to be exported from src/features/lesson-session/sessionContext.ts',
      );
    }

    const actor = buildActor();
    const navigate = jest.fn() as NavigateMock;

    render(
      <LessonSessionProvider actor={actor}>
        <TestHarness navigate={navigate} />
      </LessonSessionProvider>,
    );

    act(() => {
      actor.send({ type: 'AUDIO_INIT_FAIL', code: 'audio_init_fail' });
    });

    expect(actor.getSnapshot().value).toBe('AUDIO_FAILED');
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(ROUTES.AudioErrorScreen),
    );

    actor.stop();
  });
});
