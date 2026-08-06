import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import {
  decideLessonRecovery,
  fallbackCheckpoint,
  recoveryScreenForReason,
  type LessonCheckpoint,
  type LessonPhase,
  type RecoveryReason,
} from '@/features/fallback/recoveryTypes';
import LessonResumeScreen from '@/features/fallback/screens/LessonResumeScreen';
import NetworkErrorScreen from '@/features/fallback/screens/NetworkErrorScreen';
import ReconnectingOverlay from '@/features/fallback/ReconnectingOverlay';
import AudioRecoveryScreen from '@/features/fallback/screens/AudioRecoveryScreen';
import {
  getCurrentAssignment,
  type CurrentAssignment,
} from '@/services/api/course-library.api';
import { clearRecoveryCheckpoint } from '@/features/fallback/recoveryCheckpointStore';

jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return {
    ...actual,
    getCurrentAssignment: jest.fn(),
  };
});

jest.mock('@/features/fallback/recoveryCheckpointStore', () => {
  const actual = jest.requireActual('@/features/fallback/recoveryCheckpointStore');
  return {
    ...actual,
    clearRecoveryCheckpoint: jest.fn(() => Promise.resolve()),
  };
});

const mockedGetCurrentAssignment = getCurrentAssignment as jest.MockedFunction<typeof getCurrentAssignment>;
const mockedClearRecoveryCheckpoint = clearRecoveryCheckpoint as jest.MockedFunction<typeof clearRecoveryCheckpoint>;

const phases: readonly LessonPhase[] = ['connecting', 'greeting', 'listening', 'speaking', 'done'];

function activeCheckpoint(phase: LessonPhase): LessonCheckpoint {
  return {
    version: 1,
    lessonTitle: 'Greetings',
    progressLabel: '2 of 5',
    resumeTarget: ROUTES.RunningScreen,
    reason: 'voice_failed',
    phase,
    sessionState: 'active',
    authState: 'authenticated',
    deviceId: 'device-1',
    assignmentId: 'assignment-1',
  };
}

function currentAssignment(overrides: Partial<CurrentAssignment> = {}): CurrentAssignment {
  return {
    assignmentId: 'assignment-1',
    sessionId: 'session-1',
    assignmentVersion: 3,
    lessonId: 'lesson-1',
    lessonTitle: 'Authoritative Greetings',
    lessonVersion: 2,
    manifestChecksum: 'sha256:current',
    state: 'RUNNING',
    childId: 'child-1',
    profile: 'espTft',
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    push: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
    getId: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  };
}

function routeFor(name: string, params?: unknown) {
  return { key: name, name, params } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetCurrentAssignment.mockResolvedValue(currentAssignment());
});

describe('mobile lesson recovery decision matrix', () => {
  it('resumes active authenticated checkpoints for every non-terminal lesson phase', () => {
    for (const phase of phases.filter((value) => value !== 'done')) {
      const checkpoint = activeCheckpoint(phase);

      expect(decideLessonRecovery(checkpoint)).toEqual({
        kind: 'resume',
        checkpoint,
      });
    }
  });

  it('ends done checkpoints instead of resuming', () => {
    expect(decideLessonRecovery(activeCheckpoint('done'))).toEqual({
      kind: 'ended',
      reason: 'done',
    });
  });

  it('treats terminated and expired sessions as terminal invariants', () => {
    expect(decideLessonRecovery({ ...activeCheckpoint('speaking'), sessionState: 'terminated' })).toEqual({
      kind: 'ended',
      reason: 'terminated',
    });
    expect(decideLessonRecovery({ ...activeCheckpoint('listening'), sessionState: 'expired' })).toEqual({
      kind: 'ended',
      reason: 'expired',
    });
  });

  it('requires reauth for an otherwise active checkpoint and resumes after authenticated reevaluation', () => {
    const checkpoint = { ...activeCheckpoint('listening'), authState: 'expired' } satisfies LessonCheckpoint;

    expect(decideLessonRecovery(checkpoint)).toEqual({
      kind: 'reauth',
      checkpoint,
    });
    expect(decideLessonRecovery({ ...checkpoint, authState: 'authenticated' })).toMatchObject({
      kind: 'resume',
    });
  });

  it('fails closed for missing, malformed, or partial checkpoint objects', () => {
    const invalidObjects: readonly unknown[] = [
      null,
      undefined,
      'checkpoint',
      {},
      { ...activeCheckpoint('speaking'), lessonTitle: '' },
      { ...activeCheckpoint('speaking'), progressLabel: '   ' },
      { ...activeCheckpoint('speaking'), resumeTarget: ROUTES.LoginScreen },
      { ...activeCheckpoint('speaking'), reason: 'robot_offline' },
      { ...activeCheckpoint('speaking'), phase: 'thinking' },
      { ...activeCheckpoint('speaking'), sessionState: 'paused' },
      { ...activeCheckpoint('speaking'), authState: 'anonymous' },
      { ...activeCheckpoint('speaking'), version: 2 },
      { ...activeCheckpoint('speaking'), deviceId: '' },
      { ...activeCheckpoint('speaking'), assignmentId: '' },
      { lessonTitle: 'Missing everything else' },
    ];

    for (const input of invalidObjects) {
      expect(decideLessonRecovery(input)).toEqual({
        kind: 'ended',
        reason: 'invalid_checkpoint',
      });
    }
  });

  it('maps every recovery reason to its recovery screen', () => {
    const expectations: Readonly<Record<RecoveryReason, string>> = {
      network: ROUTES.NetworkErrorScreen,
      voice_failed: ROUTES.VoiceFailedScreen,
      mic_missing: ROUTES.MicMissingScreen,
      audio_route_changed: ROUTES.AudioRecoveryScreen,
      audio_recovered: ROUTES.LessonResumeScreen,
      safety: ROUTES.SafetyRedirectScreen,
      app_error: ROUTES.AppErrorScreen,
    };

    for (const [reason, screen] of Object.entries(expectations) as Array<[RecoveryReason, string]>) {
      expect(recoveryScreenForReason(reason)).toBe(screen);
    }
  });

  it('provides a complete active speaking fallback checkpoint', () => {
    expect(decideLessonRecovery(fallbackCheckpoint())).toMatchObject({
      kind: 'resume',
      checkpoint: {
        version: 1,
        resumeTarget: ROUTES.RunningScreen,
        phase: 'speaking',
        sessionState: 'active',
        authState: 'authenticated',
        deviceId: 'device-1',
        assignmentId: 'assignment-1',
      },
    });
  });
});

describe('mobile lesson recovery screen matrix', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders resume UI for authoritatively live app-killed phases and ended UI for done', async () => {
    for (const phase of phases.filter((value) => value !== 'done')) {
      const navigation = createNavigation();
      const checkpoint = activeCheckpoint(phase);
      const view = render(
        <LessonResumeScreen
          navigation={navigation as never}
          route={routeFor(ROUTES.LessonResumeScreen, { checkpoint })}
        />,
      );

      expect(await view.findByText('Greetings')).toBeTruthy();
      expect(view.getByText('Keep going')).toBeTruthy();
      view.unmount();
    }

    const navigation = createNavigation();
    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, { checkpoint: activeCheckpoint('done') })}
      />,
    );

    expect(screen.getByText(/Lesson ended/)).toBeTruthy();
    expect(screen.getByText('Back home')).toBeTruthy();
    expect(screen.queryByText('Keep going')).toBeNull();
  });

  it('uses reauth UI for expired auth and stays within protected navigation', () => {
    const navigation = createNavigation();
    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, {
          checkpoint: { ...activeCheckpoint('listening'), authState: 'expired' },
        })}
      />,
    );

    expect(screen.getByText(/Session expired/)).toBeTruthy();
    expect(screen.queryByText('Keep going')).toBeNull();
    expect(screen.queryByText('Sign in again')).toBeNull();
    fireEvent.press(screen.getByText('Back home'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.LoginScreen);
  });

  it('enforces terminal and partial-checkpoint invariants on the resume screen', () => {
    const terminalCheckpoints: readonly unknown[] = [
      { ...activeCheckpoint('speaking'), sessionState: 'terminated' },
      { ...activeCheckpoint('listening'), sessionState: 'expired' },
      { lessonTitle: 'Partial', progressLabel: '20%' },
      undefined,
    ];

    for (const checkpoint of terminalCheckpoints) {
      const navigation = createNavigation();
      const view = render(
        <LessonResumeScreen
          navigation={navigation as never}
          route={routeFor(ROUTES.LessonResumeScreen, { checkpoint })}
        />,
      );

      expect(view.getByText(/Lesson ended/)).toBeTruthy();
      expect(view.queryByText('Keep going')).toBeNull();
      fireEvent.press(view.getByText('Back home'));
      expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
      expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.SendToRobotScreen);
      view.unmount();
    }
  });

  it('guards resume double taps and ignores stale local resume targets', async () => {
    const navigation = createNavigation();
    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, {
          checkpoint: { ...activeCheckpoint('speaking'), resumeTarget: ROUTES.HomeHubScreen },
        })}
      />,
    );

    const keepGoing = await screen.findByText('Keep going');
    fireEvent.press(keepGoing);
    fireEvent.press(keepGoing);
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RunningScreen, expect.objectContaining({
      assignmentId: 'assignment-1',
      deviceId: 'device-1',
    }));
  });

  it('uses authoritative running identity even when stale route context requests home', async () => {
    const navigation = createNavigation();
    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, {
          checkpoint: {
            ...activeCheckpoint('speaking'),
            resumeTarget: ROUTES.HomeHubScreen,
            courseId: 'c_food',
            childId: 'child-1',
          },
        })}
      />,
    );

    fireEvent.press(await screen.findByText('Keep going'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RunningScreen, expect.objectContaining({
      assignmentId: 'assignment-1',
      childId: 'child-1',
      sessionId: 'session-1',
    }));
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.SendToRobotScreen, expect.anything());
  });

  it('preserves network checkpoint through retry and escalates only after max attempts', () => {
    jest.useFakeTimers();
    const checkpoint = { ...activeCheckpoint('connecting'), reason: 'network' as const };
    const navigation = createNavigation();
    const network = render(
      <NetworkErrorScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.NetworkErrorScreen, { checkpoint, attemptCount: 99 })}
      />,
    );

    fireEvent.press(network.getByText('Try again'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ReconnectingOverlay, {
      attempt: 3,
      checkpoint,
      failureTarget: ROUTES.HelpFaqScreen,
      maxAttempts: 3,
      reconnectDelayMs: 15000,
    });

    navigation.navigate.mockClear();
    render(
      <ReconnectingOverlay
        navigation={navigation as never}
        route={routeFor(ROUTES.ReconnectingOverlay, {
          attempt: 1,
          maxAttempts: 3,
          reconnectDelayMs: 10,
          checkpoint,
          failureTarget: ROUTES.HelpFaqScreen,
        })}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(10);
    });
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.NetworkErrorScreen, {
      checkpoint,
      attemptCount: 2,
      failureTarget: ROUTES.HelpFaqScreen,
    });

    navigation.navigate.mockClear();
    render(
      <ReconnectingOverlay
        navigation={navigation as never}
        route={routeFor(ROUTES.ReconnectingOverlay, {
          attempt: 3,
          maxAttempts: 3,
          reconnectDelayMs: 10,
          checkpoint,
          failureTarget: ROUTES.HelpFaqScreen,
        })}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(10);
    });
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HelpFaqScreen);
  });

  it('preserves a home failure target across intermediate reconnect attempts', () => {
    jest.useFakeTimers();
    const checkpoint = { ...activeCheckpoint('connecting'), reason: 'network' as const };
    const navigation = createNavigation();
    const network = render(
      <NetworkErrorScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.NetworkErrorScreen, {
          checkpoint,
          attemptCount: 2,
          failureTarget: ROUTES.HomeHubScreen,
        })}
      />,
    );

    fireEvent.press(network.getByText('Try again'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ReconnectingOverlay, {
      attempt: 2,
      checkpoint,
      failureTarget: ROUTES.HomeHubScreen,
      maxAttempts: 3,
      reconnectDelayMs: 15000,
    });

    navigation.navigate.mockClear();
    network.unmount();
    const intermediateOverlay = render(
      <ReconnectingOverlay
        navigation={navigation as never}
        route={routeFor(ROUTES.ReconnectingOverlay, {
          attempt: 2,
          maxAttempts: 3,
          reconnectDelayMs: 10,
          checkpoint,
          failureTarget: ROUTES.HomeHubScreen,
        })}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(10);
    });
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.NetworkErrorScreen, {
      checkpoint,
      attemptCount: 3,
      failureTarget: ROUTES.HomeHubScreen,
    });

    navigation.navigate.mockClear();
    intermediateOverlay.unmount();
    const finalNetwork = render(
      <NetworkErrorScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.NetworkErrorScreen, {
          checkpoint,
          attemptCount: 3,
          failureTarget: ROUTES.HomeHubScreen,
        })}
      />,
    );

    fireEvent.press(finalNetwork.getByText('Try again'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ReconnectingOverlay, {
      attempt: 3,
      checkpoint,
      failureTarget: ROUTES.HomeHubScreen,
      maxAttempts: 3,
      reconnectDelayMs: 15000,
    });

    navigation.navigate.mockClear();
    finalNetwork.unmount();
    render(
      <ReconnectingOverlay
        navigation={navigation as never}
        route={routeFor(ROUTES.ReconnectingOverlay, {
          attempt: 3,
          maxAttempts: 3,
          reconnectDelayMs: 10,
          checkpoint,
          failureTarget: ROUTES.HomeHubScreen,
        })}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(10);
    });
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.HelpFaqScreen);
  });

  it('routes audio recovery back through lesson resume with recovered reason', () => {
    const checkpoint = { ...activeCheckpoint('speaking'), reason: 'audio_route_changed' as const };
    const navigation = createNavigation();
    const view = render(
      <AudioRecoveryScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.AudioRecoveryScreen, { checkpoint })}
      />,
    );

    fireEvent.press(view.getByText('Audio is working'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonResumeScreen, {
      checkpoint: { ...checkpoint, reason: 'audio_recovered' },
    });
  });

  it('preserves expired-auth audio recovery checkpoints for lesson reauth', () => {
    const checkpoint = {
      ...activeCheckpoint('speaking'),
      reason: 'audio_route_changed' as const,
      authState: 'expired' as const,
      courseId: 'c_food',
      childId: 'child-1',
      deviceId: 'device-1',
      assignmentId: 'assignment-1',
      assignmentVersion: 7,
      manifestChecksum: 'sha256:lesson',
    };
    const navigation = createNavigation();
    const view = render(
      <AudioRecoveryScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.AudioRecoveryScreen, { checkpoint })}
      />,
    );

    fireEvent.press(view.getByText('Audio is working'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonResumeScreen, {
      checkpoint: { ...checkpoint, reason: 'audio_recovered' },
    });
  });

  it('routes audio recovery home when the checkpoint is absent or invalid', () => {
    const navigation = createNavigation();
    const view = render(
      <AudioRecoveryScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.AudioRecoveryScreen, { checkpoint: { lessonTitle: 'Partial' } })}
      />,
    );

    fireEvent.press(view.getByText('Audio is working'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });
});

describe('authoritative lesson resume', () => {
  it('checks the current assignment before offering Keep going', async () => {
    const pending = deferred<CurrentAssignment | null>();
    mockedGetCurrentAssignment.mockReturnValueOnce(pending.promise);
    const checkpoint = { ...activeCheckpoint('speaking'), sessionId: 'session-1' };

    render(
      <LessonResumeScreen
        navigation={createNavigation() as never}
        route={routeFor(ROUTES.LessonResumeScreen, { checkpoint })}
      />,
    );

    expect(screen.getByText('Checking your lesson...')).toBeTruthy();
    expect(screen.queryByText('Keep going')).toBeNull();
    expect(mockedGetCurrentAssignment).toHaveBeenCalledWith('device-1');

    await act(async () => {
      pending.resolve(currentAssignment());
      await pending.promise;
    });

    expect(await screen.findByText('Keep going')).toBeTruthy();
  });

  it('validates a replacement checkpoint and ignores the stale request completion', async () => {
    const pendingA = deferred<CurrentAssignment | null>();
    const pendingB = deferred<CurrentAssignment | null>();
    mockedGetCurrentAssignment
      .mockReturnValueOnce(pendingA.promise)
      .mockReturnValueOnce(pendingB.promise);
    const navigation = createNavigation();
    const checkpointA = {
      ...activeCheckpoint('speaking'),
      deviceId: 'device-a',
      assignmentId: 'assignment-a',
      lessonTitle: 'Checkpoint A',
    };
    const checkpointB = {
      ...activeCheckpoint('listening'),
      deviceId: 'device-b',
      assignmentId: 'assignment-b',
      lessonTitle: 'Checkpoint B',
    };
    const view = render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, { checkpoint: checkpointA })}
      />,
    );

    view.rerender(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, { checkpoint: checkpointB })}
      />,
    );

    expect(mockedGetCurrentAssignment).toHaveBeenNthCalledWith(1, 'device-a');
    expect(mockedGetCurrentAssignment).toHaveBeenNthCalledWith(2, 'device-b');

    await act(async () => {
      pendingB.resolve(currentAssignment({
        assignmentId: 'assignment-b',
        lessonTitle: 'Authoritative B',
      }));
      await pendingB.promise;
    });

    expect(await screen.findByText('Checkpoint B')).toBeTruthy();
    expect(screen.getByText('Keep going')).toBeTruthy();

    await act(async () => {
      pendingA.resolve(null);
      await pendingA.promise;
    });

    expect(screen.getByText('Checkpoint B')).toBeTruthy();
    expect(screen.queryByText(/Lesson ended/)).toBeNull();
    expect(mockedClearRecoveryCheckpoint).not.toHaveBeenCalled();
  });

  it.each(['ASSIGNED', 'PRELOADING', 'READY', 'RUNNING', 'PAUSED'] as const)(
    'resumes a matching %s assignment directly to RunningScreen exactly once',
    async (state) => {
      mockedGetCurrentAssignment.mockResolvedValueOnce(currentAssignment({ state }));
      const navigation = createNavigation();
      const checkpoint = {
        ...activeCheckpoint('speaking'),
        sessionId: 'session-1',
        childId: 'checkpoint-child',
        lessonTitle: 'Checkpoint title',
      };

      render(
        <LessonResumeScreen
          navigation={navigation as never}
          route={routeFor(ROUTES.LessonResumeScreen, { checkpoint })}
        />,
      );

      const keepGoing = await screen.findByText('Keep going');
      fireEvent.press(keepGoing);
      fireEvent.press(keepGoing);

      expect(navigation.navigate).toHaveBeenCalledTimes(1);
      expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RunningScreen, {
        deviceId: 'device-1',
        assignmentId: 'assignment-1',
        sessionId: 'session-1',
        childId: 'child-1',
        lessonTitle: 'Authoritative Greetings',
      });
      expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.SendToRobotScreen, expect.anything());
      expect(mockedClearRecoveryCheckpoint).not.toHaveBeenCalled();
    },
  );

  it('does not resume until authority projects the checkpoint session', async () => {
    mockedGetCurrentAssignment.mockResolvedValueOnce(currentAssignment({ sessionId: null }));
    const navigation = createNavigation();
    const checkpoint = { ...activeCheckpoint('speaking'), sessionId: 'session-1' };

    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, { checkpoint })}
      />,
    );

    expect(await screen.findByText("We can't confirm this lesson yet")).toBeTruthy();
    expect(screen.queryByText('Keep going')).toBeNull();
    expect(mockedClearRecoveryCheckpoint).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it.each([
    ['COMPLETED', currentAssignment({ state: 'COMPLETED' })],
    ['FAILED', currentAssignment({ state: 'FAILED' })],
    ['CANCELLED', currentAssignment({ state: 'CANCELLED' })],
    ['missing', null],
    ['assignment mismatch', currentAssignment({ assignmentId: 'assignment-2' })],
    ['session mismatch', currentAssignment({ sessionId: 'session-2' })],
  ] as const)('ends and clears recovery for %s authority', async (_caseName, assignment) => {
    mockedGetCurrentAssignment.mockResolvedValueOnce(assignment);
    const navigation = createNavigation();
    const checkpoint = { ...activeCheckpoint('listening'), sessionId: 'session-1' };

    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, { checkpoint })}
      />,
    );

    expect(await screen.findByText(/Lesson ended/)).toBeTruthy();
    expect(screen.queryByText('Keep going')).toBeNull();
    await waitFor(() => expect(mockedClearRecoveryCheckpoint).toHaveBeenCalledTimes(1));
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.RunningScreen, expect.anything());
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.SendToRobotScreen, expect.anything());
  });

  it('preserves recovery and retries after the assignment query fails', async () => {
    const retry = deferred<CurrentAssignment | null>();
    mockedGetCurrentAssignment
      .mockRejectedValueOnce(new Error('offline'))
      .mockReturnValueOnce(retry.promise);
    const navigation = createNavigation();
    const checkpoint = { ...activeCheckpoint('speaking'), sessionId: 'session-1' };

    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, { checkpoint })}
      />,
    );

    expect(await screen.findByText("We can't confirm this lesson yet")).toBeTruthy();
    expect(mockedClearRecoveryCheckpoint).not.toHaveBeenCalled();
    const retryButton = screen.getByText('Try again');
    fireEvent.press(retryButton);
    fireEvent.press(retryButton);
    expect(mockedGetCurrentAssignment).toHaveBeenCalledTimes(2);
    expect(navigation.navigate).not.toHaveBeenCalled();

    await act(async () => {
      retry.resolve(currentAssignment());
      await retry.promise;
    });

    expect(await screen.findByText('Keep going')).toBeTruthy();
    expect(mockedClearRecoveryCheckpoint).not.toHaveBeenCalled();
  });
});
