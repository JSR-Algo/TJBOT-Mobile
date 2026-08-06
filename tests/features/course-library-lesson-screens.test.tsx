import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { setAppLanguage } from '@/services/i18n/i18n';
import { ROUTES } from '@/navigation/routes';
import RobotReadyScreen from '@/features/course-library/screens/RobotReadyScreen';
import RunningScreen from '@/features/course-library/screens/RunningScreen';
import CompanionScreen from '@/features/course-library/screens/CompanionScreen';
import {
  getCurrentAssignment,
  getPreloadStatus,
  type CurrentAssignment,
  type PreloadStatus,
} from '@/services/api/course-library.api';
import { openRealtime, type OpenRealtimeOptions, type RealtimeConnection } from '@/services/ws/realtime';
import {
  clearRecoveryCheckpoint,
  writeRecoveryCheckpoint,
} from '@/features/fallback/recoveryCheckpointStore';
import { captureError } from '@/services/observability/sentry';
import { lessonPhaseFromObserverFrame } from '@/features/fallback/recoveryTypes';

// Partial mock — keep the pure helpers (isPreloadReady / presentAssignmentState)
// real, mock ONLY the two network reads.
jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return { ...actual, getPreloadStatus: jest.fn(), getCurrentAssignment: jest.fn() };
});

jest.mock('@/services/ws/realtime', () => ({ openRealtime: jest.fn() }));
jest.mock('@/features/fallback/recoveryCheckpointStore', () => ({
  clearRecoveryCheckpoint: jest.fn(),
  writeRecoveryCheckpoint: jest.fn(),
}));
jest.mock('@/services/observability/sentry', () => ({ captureError: jest.fn() }));

const mockedGetPreloadStatus = getPreloadStatus as jest.MockedFunction<typeof getPreloadStatus>;
const mockedGetCurrentAssignment = getCurrentAssignment as jest.MockedFunction<typeof getCurrentAssignment>;
const mockedOpenRealtime = openRealtime as jest.MockedFunction<typeof openRealtime>;
const mockedClearRecoveryCheckpoint = jest.mocked(clearRecoveryCheckpoint);
const mockedWriteRecoveryCheckpoint = jest.mocked(writeRecoveryCheckpoint);
const mockedCaptureError = jest.mocked(captureError);

type CapturedRealtimeAttach = {
  readonly sessionId: string;
  readonly options: OpenRealtimeOptions;
  readonly close: jest.Mock<void, [number?, string?]>;
};

const realtimeAttaches: CapturedRealtimeAttach[] = [];

function navigationFor() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  };
}

function preload(state: PreloadStatus['state']): PreloadStatus {
  return { assignmentId: 'asg-1', state, profile: 'espTft', criticalTotal: 2, criticalReady: state === 'READY' ? 2 : 1, assets: [] };
}

function current(state: CurrentAssignment['state']): CurrentAssignment {
  return { assignmentId: 'asg-1', sessionId: null, assignmentVersion: 1, lessonId: 'w01-d01-barn-say-it', lessonTitle: 'This Is a Barn', lessonVersion: 1, manifestChecksum: 'sha256:w01-d01', state, childId: 'ch-1', profile: 'espTft' };
}

function currentWithSession(state: CurrentAssignment['state'], sessionId: string | null): CurrentAssignment {
  return { ...current(state), sessionId };
}

function emitRealtimeFrame(frame: unknown): void {
  const latest = realtimeAttaches.at(-1);
  if (!latest) throw new Error('No realtime observer attached');
  latest.options.onFrame?.(frame);
}

type ProductionLessonScreen = 'RunningScreen' | 'CompanionScreen';

function renderProductionLessonScreen(
  screenName: ProductionLessonScreen,
  params: { deviceId?: string; assignmentId?: string; sessionId?: string; childId?: string; lessonTitle?: string } = { deviceId: 'dev-1' },
) {
  const navigation = navigationFor();
  const rendered = screenName === 'RunningScreen'
    ? render(
        <RunningScreen
          navigation={navigation as never}
          route={{ key: 'run', name: ROUTES.RunningScreen, params } as never}
        />,
      )
    : render(
        <CompanionScreen
          navigation={navigation as never}
          route={{ key: 'comp', name: ROUTES.CompanionScreen, params } as never}
        />,
      );
  return { navigation, rendered };
}

const liveCheckpoint = {
  version: 1,
  lessonTitle: 'This Is a Barn',
  progressLabel: 'Lesson in progress',
  resumeTarget: ROUTES.RunningScreen,
  reason: 'network',
  phase: 'speaking',
  sessionState: 'active',
  authState: 'authenticated',
  deviceId: 'dev-1',
  assignmentId: 'asg-1',
  sessionId: 'session-live-1',
  childId: 'ch-1',
  assignmentVersion: 1,
  manifestChecksum: 'sha256:w01-d01',
} as const;

async function advancePolls(count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });
  }
}

describe('US-006 S11 — lesson screens render real data (M2/M3)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    realtimeAttaches.length = 0;
    mockedOpenRealtime.mockImplementation((sessionId, options = {}) => {
      const close = jest.fn<void, [number?, string?]>();
      realtimeAttaches.push({ sessionId, options, close });
      const connection: RealtimeConnection = {
        url: `wss://example.test/realtime/v1/observer/${sessionId}`,
        close,
        send: jest.fn<void, [unknown]>(),
      };
      return Promise.resolve(connection);
    });
    mockedWriteRecoveryCheckpoint.mockResolvedValue(undefined);
    mockedClearRecoveryCheckpoint.mockResolvedValue(undefined);
    // These assertions are on English copy; a sibling suite may have left the
    // shared i18n singleton in vi. Pin the locale so the suite is order-stable.
    await setAppLanguage('en');
  });

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s persists an exact versioned checkpoint and updates it from observer turn phase',
    async (screenName) => {
      mockedGetCurrentAssignment.mockResolvedValue(currentWithSession('RUNNING', 'session-live-1'));
      renderProductionLessonScreen(screenName);

      await waitFor(() => expect(mockedWriteRecoveryCheckpoint).toHaveBeenCalledWith(liveCheckpoint));
      await waitFor(() => expect(mockedOpenRealtime).toHaveBeenCalledWith(
        'session-live-1',
        expect.objectContaining({ onFrame: expect.any(Function) }),
      ));

      act(() => {
        emitRealtimeFrame({ type: 'turn.started', turn_id: 'turn-2', turn_count: 2, phase: 'listening' });
      });

      await waitFor(() => expect(mockedWriteRecoveryCheckpoint).toHaveBeenLastCalledWith({
        ...liveCheckpoint,
        phase: 'listening',
      }));
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s persists assignment identity before a realtime session id is available',
    async (screenName) => {
      mockedGetCurrentAssignment.mockResolvedValue(current('RUNNING'));
      renderProductionLessonScreen(screenName);

      const { sessionId: omittedSessionId, ...checkpointWithoutSession } = liveCheckpoint;
      void omittedSessionId;
      await waitFor(() => expect(mockedWriteRecoveryCheckpoint).toHaveBeenCalledWith(checkpointWithoutSession));
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s includes a known route session id when the live assignment has not projected it yet',
    async (screenName) => {
      mockedGetCurrentAssignment.mockResolvedValue(current('RUNNING'));
      renderProductionLessonScreen(screenName, {
        deviceId: 'dev-1',
        assignmentId: 'asg-1',
        sessionId: 'session-route-known',
      });

      await waitFor(() => expect(mockedWriteRecoveryCheckpoint).toHaveBeenCalledWith({
        ...liveCheckpoint,
        sessionId: 'session-route-known',
      }));
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s does not graft a stale route session onto a different live assignment',
    async (screenName) => {
      mockedGetCurrentAssignment.mockResolvedValue(current('RUNNING'));
      renderProductionLessonScreen(screenName, {
        deviceId: 'dev-1',
        assignmentId: 'stale-assignment',
        sessionId: 'stale-session',
      });

      const { sessionId: omittedSessionId, ...checkpointWithoutSession } = liveCheckpoint;
      void omittedSessionId;
      await waitFor(() => expect(mockedWriteRecoveryCheckpoint).toHaveBeenCalledWith(checkpointWithoutSession));
      expect(mockedWriteRecoveryCheckpoint).not.toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 'stale-session',
      }));
      expect(mockedOpenRealtime).not.toHaveBeenCalledWith(
        'stale-session',
        expect.anything(),
      );
      expect(mockedClearRecoveryCheckpoint).not.toHaveBeenCalled();
    },
  );

  it('maps only supported observer snapshot and turn phases', () => {
    expect(lessonPhaseFromObserverFrame({ type: 'observer_snapshot', current_phase: 'speaking' })).toBe('speaking');
    expect(lessonPhaseFromObserverFrame({ type: 'turn.started', phase: 'listening' })).toBe('listening');
    expect(lessonPhaseFromObserverFrame({ type: 'turn.completed', phase: 'idle' })).toBe('listening');
    expect(lessonPhaseFromObserverFrame({ type: 'turn.started', phase: 'unknown' })).toBeNull();
    expect(lessonPhaseFromObserverFrame({ type: 'unrelated', phase: 'listening' })).toBeNull();
  });

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s updates the checkpoint from an observer snapshot and ignores an unknown frame phase',
    async (screenName) => {
      mockedGetCurrentAssignment.mockResolvedValue(currentWithSession('RUNNING', 'session-live-1'));
      renderProductionLessonScreen(screenName);

      await waitFor(() => expect(mockedWriteRecoveryCheckpoint).toHaveBeenCalledWith(liveCheckpoint));
      act(() => {
        emitRealtimeFrame({ type: 'observer_snapshot', current_state: 'ACTIVE', current_phase: 'greeting' });
      });
      await waitFor(() => expect(mockedWriteRecoveryCheckpoint).toHaveBeenLastCalledWith({
        ...liveCheckpoint,
        phase: 'greeting',
      }));
      const writesAfterSupportedFrame = mockedWriteRecoveryCheckpoint.mock.calls.length;

      act(() => {
        emitRealtimeFrame({ type: 'turn.started', phase: 'unrecognized-phase' });
      });

      expect(mockedWriteRecoveryCheckpoint).toHaveBeenCalledTimes(writesAfterSupportedFrame);
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s clears the checkpoint when a live assignment disappears',
    async (screenName) => {
      jest.useFakeTimers();
      try {
        mockedGetCurrentAssignment
          .mockResolvedValueOnce(currentWithSession('RUNNING', 'session-live-1'))
          .mockResolvedValue(null);
        renderProductionLessonScreen(screenName);

        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });
        expect(mockedWriteRecoveryCheckpoint).toHaveBeenCalledWith(liveCheckpoint);

        await advancePolls(1);

        expect(mockedClearRecoveryCheckpoint).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s clears the checkpoint for every explicit assignment terminal',
    async (screenName) => {
      for (const state of ['COMPLETED', 'FAILED', 'CANCELLED'] as const) {
        jest.clearAllMocks();
        mockedWriteRecoveryCheckpoint.mockResolvedValue(undefined);
        mockedClearRecoveryCheckpoint.mockResolvedValue(undefined);
        mockedGetCurrentAssignment.mockResolvedValue(current(state));

        const { rendered } = renderProductionLessonScreen(screenName);
        await waitFor(() => expect(mockedClearRecoveryCheckpoint).toHaveBeenCalledTimes(1));
        expect(mockedWriteRecoveryCheckpoint).not.toHaveBeenCalled();
        rendered.unmount();
      }
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s clears and renders completion for recognized successful observer end reasons',
    async (screenName) => {
      for (const endReason of ['completed', 'complete'] as const) {
        jest.clearAllMocks();
        realtimeAttaches.length = 0;
        mockedWriteRecoveryCheckpoint.mockResolvedValue(undefined);
        mockedClearRecoveryCheckpoint.mockResolvedValue(undefined);
        mockedGetCurrentAssignment.mockResolvedValue(currentWithSession('RUNNING', 'session-live-1'));
        mockedOpenRealtime.mockImplementation((sessionId, options = {}) => {
          const close = jest.fn<void, [number?, string?]>();
          realtimeAttaches.push({ sessionId, options, close });
          return Promise.resolve({
            url: `wss://example.test/realtime/v1/observer/${sessionId}`,
            close,
            send: jest.fn<void, [unknown]>(),
          });
        });

        const { rendered } = renderProductionLessonScreen(screenName);
        await waitFor(() => expect(realtimeAttaches).toHaveLength(1));
        act(() => {
          emitRealtimeFrame({ type: 'session.end', end_reason: endReason });
        });
        await waitFor(() => expect(mockedClearRecoveryCheckpoint).toHaveBeenCalledTimes(1));
        expect(screen.getByText('Finished! 🎉')).toBeTruthy();
        rendered.unmount();
      }
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s clears and leaves the live presentation for recognized unsuccessful observer terminals',
    async (screenName) => {
      const terminalFrames = [
        { type: 'session.end', end_reason: 'timeout' },
        { type: 'session.end', end_reason: 'timed_out' },
        { type: 'session.end', end_reason: 'cost_limit' },
        { type: 'session.end', end_reason: 'cost_capped' },
        { type: 'session.end', end_reason: 'parent_stop' },
        { type: 'session.end', end_reason: 'parent_stopped' },
        { type: 'session.end', end_reason: 'disconnect_timeout' },
        { type: 'session.end', end_reason: 'abandoned_disconnect' },
        { type: 'session.end', end_reason: 'safety_halt' },
        { type: 'safety.halt', halt_reason: 'policy' },
      ] as const;

      for (const frame of terminalFrames) {
        jest.clearAllMocks();
        realtimeAttaches.length = 0;
        mockedWriteRecoveryCheckpoint.mockResolvedValue(undefined);
        mockedClearRecoveryCheckpoint.mockResolvedValue(undefined);
        mockedGetCurrentAssignment.mockResolvedValue(currentWithSession('RUNNING', 'session-live-1'));
        mockedOpenRealtime.mockImplementation((sessionId, options = {}) => {
          const close = jest.fn<void, [number?, string?]>();
          realtimeAttaches.push({ sessionId, options, close });
          return Promise.resolve({
            url: `wss://example.test/realtime/v1/observer/${sessionId}`,
            close,
            send: jest.fn<void, [unknown]>(),
          });
        });

        const { rendered } = renderProductionLessonScreen(screenName);
        await waitFor(() => expect(realtimeAttaches).toHaveLength(1));
        act(() => {
          emitRealtimeFrame(frame);
        });

        await waitFor(() => expect(mockedClearRecoveryCheckpoint).toHaveBeenCalledTimes(1));
        expect(screen.getByText('Robot could not finish this lesson.')).toBeTruthy();
        expect(screen.queryByText('Finished! 🎉')).toBeNull();
        if (screenName === 'RunningScreen') {
          expect(screen.queryByText("See what's happening")).toBeNull();
        } else {
          expect(screen.queryByText('Live')).toBeNull();
          expect(screen.getByText('Waiting')).toBeTruthy();
        }
        rendered.unmount();
      }
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s ignores unknown or missing session end reasons',
    async (screenName) => {
      for (const frame of [
        { type: 'session.end' },
        { type: 'session.end', end_reason: '' },
        { type: 'session.end', end_reason: 'abandoned' },
        { type: 'session.end', end_reason: 'future_terminal' },
      ] as const) {
        jest.clearAllMocks();
        realtimeAttaches.length = 0;
        mockedWriteRecoveryCheckpoint.mockResolvedValue(undefined);
        mockedClearRecoveryCheckpoint.mockResolvedValue(undefined);
        mockedGetCurrentAssignment.mockResolvedValue(currentWithSession('RUNNING', 'session-live-1'));
        mockedOpenRealtime.mockImplementation((sessionId, options = {}) => {
          const close = jest.fn<void, [number?, string?]>();
          realtimeAttaches.push({ sessionId, options, close });
          return Promise.resolve({
            url: `wss://example.test/realtime/v1/observer/${sessionId}`,
            close,
            send: jest.fn<void, [unknown]>(),
          });
        });

        const { rendered } = renderProductionLessonScreen(screenName);
        await waitFor(() => expect(realtimeAttaches).toHaveLength(1));
        act(() => {
          emitRealtimeFrame(frame);
        });

        expect(mockedClearRecoveryCheckpoint).not.toHaveBeenCalled();
        if (screenName === 'RunningScreen') {
          expect(screen.getByText("See what's happening")).toBeTruthy();
        } else {
          expect(screen.getByText('Live')).toBeTruthy();
        }
        rendered.unmount();
      }
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s clears a terminal checkpoint after an in-flight checkpoint write rejects',
    async (screenName) => {
      const storageError = new Error('checkpoint write failed');
      let rejectWrite: ((reason: Error) => void) | undefined;
      mockedWriteRecoveryCheckpoint.mockImplementation(() => new Promise((_resolve, reject) => {
        rejectWrite = reject;
      }));
      mockedGetCurrentAssignment.mockResolvedValue(currentWithSession('RUNNING', 'session-live-1'));
      renderProductionLessonScreen(screenName);

      await waitFor(() => expect(mockedWriteRecoveryCheckpoint).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(realtimeAttaches).toHaveLength(1));
      act(() => {
        emitRealtimeFrame({ type: 'session.end', end_reason: 'timed_out' });
      });
      expect(mockedClearRecoveryCheckpoint).not.toHaveBeenCalled();

      await act(async () => {
        rejectWrite?.(storageError);
        await Promise.resolve();
      });

      await waitFor(() => expect(mockedCaptureError).toHaveBeenCalledWith(storageError));
      await waitFor(() => expect(mockedClearRecoveryCheckpoint).toHaveBeenCalledTimes(1));
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s does not rewrite a checkpoint when a late live poll resolves after an observer terminal',
    async (screenName) => {
      jest.useFakeTimers();
      try {
        let resolveLateAssignment: ((assignment: CurrentAssignment | null) => void) | undefined;
        mockedGetCurrentAssignment
          .mockResolvedValueOnce(currentWithSession('RUNNING', 'session-live-1'))
          .mockImplementationOnce(() => new Promise((resolve) => {
            resolveLateAssignment = resolve;
          }));
        renderProductionLessonScreen(screenName);

        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });
        expect(realtimeAttaches).toHaveLength(1);
        const writesBeforeTerminal = mockedWriteRecoveryCheckpoint.mock.calls.length;

        await act(async () => {
          jest.advanceTimersByTime(2500);
          await Promise.resolve();
        });
        act(() => {
          emitRealtimeFrame({ type: 'session.end', end_reason: 'timed_out' });
        });
        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });
        expect(mockedClearRecoveryCheckpoint).toHaveBeenCalledTimes(1);

        await act(async () => {
          resolveLateAssignment?.(currentWithSession('RUNNING', 'session-live-1'));
          await Promise.resolve();
        });

        expect(mockedWriteRecoveryCheckpoint).toHaveBeenCalledTimes(writesBeforeTerminal);
      } finally {
        jest.useRealTimers();
      }
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s ignores a live poll that resolves after unmount',
    async (screenName) => {
      let resolveAssignment: ((assignment: CurrentAssignment | null) => void) | undefined;
      mockedGetCurrentAssignment.mockImplementation(() => new Promise((resolve) => {
        resolveAssignment = resolve;
      }));
      const { rendered } = renderProductionLessonScreen(screenName);
      rendered.unmount();

      await act(async () => {
        resolveAssignment?.(currentWithSession('RUNNING', 'session-after-unmount'));
        await Promise.resolve();
      });

      expect(mockedWriteRecoveryCheckpoint).not.toHaveBeenCalled();
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s never persists incomplete assignment identity',
    async (screenName) => {
      for (const assignment of [
        { ...current('RUNNING'), assignmentId: '' },
        { ...current('RUNNING'), childId: '' },
        { ...current('RUNNING'), lessonTitle: '' },
      ]) {
        jest.clearAllMocks();
        mockedGetCurrentAssignment.mockResolvedValue(assignment);
        const { rendered } = renderProductionLessonScreen(screenName);

        await waitFor(() => expect(mockedGetCurrentAssignment).toHaveBeenCalledWith('dev-1'));
        expect(mockedWriteRecoveryCheckpoint).not.toHaveBeenCalled();
        rendered.unmount();
      }

      jest.clearAllMocks();
      mockedGetCurrentAssignment.mockResolvedValue(current('RUNNING'));
      const { rendered } = renderProductionLessonScreen(screenName, {});
      expect(mockedGetCurrentAssignment).not.toHaveBeenCalled();
      expect(mockedWriteRecoveryCheckpoint).not.toHaveBeenCalled();
      rendered.unmount();
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s reports checkpoint storage rejection without changing the live UI',
    async (screenName) => {
      const storageError = new Error('secure storage unavailable');
      mockedGetCurrentAssignment.mockResolvedValue(currentWithSession('RUNNING', 'session-live-1'));
      mockedWriteRecoveryCheckpoint.mockRejectedValue(storageError);
      renderProductionLessonScreen(screenName);

      await waitFor(() => expect(mockedCaptureError).toHaveBeenCalledWith(storageError));
      expect(screen.getByText('This Is a Barn')).toBeTruthy();
      expect(screen.queryByText(/secure storage unavailable/)).toBeNull();
    },
  );

  it.each(['RunningScreen', 'CompanionScreen'] as const)(
    '%s reports checkpoint clear rejection without changing terminal UI',
    async (screenName) => {
      const storageError = new Error('secure storage clear unavailable');
      mockedGetCurrentAssignment.mockResolvedValue(current('COMPLETED'));
      mockedClearRecoveryCheckpoint.mockRejectedValue(storageError);
      renderProductionLessonScreen(screenName);

      await waitFor(() => expect(mockedCaptureError).toHaveBeenCalledWith(storageError));
      expect(screen.getByText('Finished! 🎉')).toBeTruthy();
      expect(screen.queryByText(/secure storage clear unavailable/)).toBeNull();
    },
  );

  // §10.4 — Preload-status render (kills fake-ready, DIV-MOBILE-FAKEREADY).
  it('RobotReadyScreen does NOT show ready while PRELOADING (no hardcoded good:true)', async () => {
    mockedGetPreloadStatus.mockResolvedValue(preload('PRELOADING'));
    mockedGetCurrentAssignment.mockResolvedValue(current('PRELOADING'));
    const navigation = navigationFor();
    render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={{ key: 'r', name: ROUTES.RobotReadyScreen, params: { deviceId: 'dev-1', assignmentId: 'asg-1' } } as never}
      />,
    );

    await waitFor(() => expect(mockedGetPreloadStatus).toHaveBeenCalledWith('dev-1'));
    // The ready chip copy is absent and the primary CTA is gated to "Preparing…".
    expect(screen.queryByText('Ready for today')).toBeNull();
    expect(screen.getByText('Preparing…')).toBeTruthy();
    // Heading is bound to the real lessonTitle, not the old hardcoded literal.
    expect(screen.getByText('This Is a Barn')).toBeTruthy();
    expect(screen.queryByText('Lesson 4 · Animals at home')).toBeNull();
  });

  it('RobotReadyScreen shows ready ONLY when the server reports state === READY', async () => {
    mockedGetPreloadStatus.mockResolvedValue(preload('READY'));
    mockedGetCurrentAssignment.mockResolvedValue(current('READY'));
    const navigation = navigationFor();
    render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={{ key: 'r', name: ROUTES.RobotReadyScreen, params: { deviceId: 'dev-1', assignmentId: 'asg-1' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Ready for today')).toBeTruthy());
    expect(screen.getByText('Hand it to your child')).toBeTruthy();
    expect(screen.getByText('This Is a Barn')).toBeTruthy();
  });

  it('RobotReadyScreen stops infinite PRELOADING and offers retry without enabling handoff', async () => {
    jest.useFakeTimers();
    try {
      mockedGetPreloadStatus.mockResolvedValue(preload('PRELOADING'));
      mockedGetCurrentAssignment.mockResolvedValue(current('PRELOADING'));
      const navigation = navigationFor();
      render(
        <RobotReadyScreen
          navigation={navigation as never}
          route={{ key: 'r', name: ROUTES.RobotReadyScreen, params: { deviceId: 'dev-1', assignmentId: 'asg-1' } } as never}
        />,
      );

      await act(async () => {
        await Promise.resolve();
      });
      await advancePolls(18);

      expect(screen.getAllByText('Robot is taking longer than expected.').length).toBeGreaterThan(0);
      expect(screen.getByText('Try again')).toBeTruthy();
      expect(screen.queryByText('Hand it to your child')).toBeNull();

      fireEvent.press(screen.getByText('Try again'));
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockedGetPreloadStatus).toHaveBeenCalledTimes(19);
    } finally {
      jest.useRealTimers();
    }
  });

  it('RobotReadyScreen does not strand the parent when route state is missing deviceId', () => {
    const navigation = navigationFor();
    render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={{ key: 'r', name: ROUTES.RobotReadyScreen, params: { assignmentId: 'asg-1' } } as never}
      />,
    );

    expect(mockedGetPreloadStatus).not.toHaveBeenCalled();
    expect(mockedGetCurrentAssignment).not.toHaveBeenCalled();
    expect(screen.getAllByText("We can't prepare Robot because no device was selected.").length).toBeGreaterThan(0);
    expect(screen.getByText('Pick a different lesson')).toBeTruthy();
    expect(screen.queryByText('Preparing…')).toBeNull();
  });

  // §10.4 — Progress surface: "Finished!" terminal state.
  //
  // REGRESSION GUARD (MOB-1): the real GET /devices/:id/assignment/current only
  // returns rows in an ACTIVE state — ACTIVE_ASSIGNMENT_STATES excludes
  // COMPLETED — so the endpoint returns NULL the instant the lesson finishes; it
  // can NEVER hand back a COMPLETED object. Drive completion the way prod does:
  // a live RUNNING poll, then null on the next poll. The screen must read that
  // live→null transition as completion and render "Finished!".
  it('RunningScreen renders "Finished!" on the live RUNNING→null transition (real backend contract)', async () => {
    jest.useFakeTimers();
    try {
      mockedGetCurrentAssignment
        .mockResolvedValueOnce(current('RUNNING')) // lesson is playing
        .mockResolvedValue(null); // backend drops it from current the moment it finishes
      const navigation = navigationFor();
      render(
        <RunningScreen
          navigation={navigation as never}
          route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-1' } } as never}
        />,
      );

      // First poll resolves RUNNING.
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.queryByText('Finished! 🎉')).toBeNull();

      // Advance to the next poll, which returns null → completion.
      await act(async () => {
        jest.advanceTimersByTime(2500);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.getByText('Finished! 🎉')).toBeTruthy();
      expect(screen.getByText('This Is a Barn')).toBeTruthy();
      // three-streams: the progress surface renders the privacy guarantee, never a transcript.
      expect(screen.getByText(/Audio is never saved/)).toBeTruthy();
      fireEvent.press(screen.getByText('See lesson reward'));
      expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonSummaryScreen, {
        assignmentId: 'asg-1',
        deviceId: 'dev-1',
        lessonId: 'w01-d01-barn-say-it',
        sessionId: undefined,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('RunningScreen attaches observer from route sessionId and closes it on unmount', async () => {
    mockedGetCurrentAssignment.mockResolvedValue(current('RUNNING'));
    const navigation = navigationFor();
    const rendered = render(
      <RunningScreen
        navigation={navigation as never}
        route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-1', assignmentId: 'asg-1', sessionId: 'session-route-1' } } as never}
      />,
    );

    await waitFor(() => expect(mockedOpenRealtime).toHaveBeenCalledWith('session-route-1', expect.objectContaining({ onFrame: expect.any(Function) })));
    expect(realtimeAttaches).toHaveLength(1);

    rendered.unmount();

    expect(realtimeAttaches[0].close).toHaveBeenCalledWith(1000, 'screen unmounted');
  });

  it('RunningScreen attaches observer from current assignment sessionId and renders completion from terminal frame', async () => {
    mockedGetCurrentAssignment.mockResolvedValue(currentWithSession('RUNNING', 'session-current-1'));
    const navigation = navigationFor();
    render(
      <RunningScreen
        navigation={navigation as never}
        route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-1' } } as never}
      />,
    );

    await waitFor(() => expect(mockedOpenRealtime).toHaveBeenCalledWith('session-current-1', expect.objectContaining({ onFrame: expect.any(Function) })));

    act(() => {
      emitRealtimeFrame({ type: 'session.end', end_reason: 'complete' });
    });

    expect(screen.getByText('Finished! 🎉')).toBeTruthy();
    expect(mockedGetCurrentAssignment).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('See lesson reward'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonSummaryScreen, {
      assignmentId: 'asg-1',
      deviceId: 'dev-1',
      lessonId: 'w01-d01-barn-say-it',
      sessionId: 'session-current-1',
    });
  });

  it('RunningScreen keeps polling fallback when route sessionId is blank', async () => {
    jest.useFakeTimers();
    try {
      mockedGetCurrentAssignment.mockResolvedValue(null);
      const navigation = navigationFor();
      render(
        <RunningScreen
          navigation={navigation as never}
          route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-1', sessionId: '   ' } } as never}
        />,
      );

      await act(async () => {
        await Promise.resolve();
      });
      await advancePolls(1);

      expect(mockedOpenRealtime).not.toHaveBeenCalled();
      expect(mockedGetCurrentAssignment).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('RunningScreen stops infinite pre-live null polling without faking completion', async () => {
    jest.useFakeTimers();
    try {
      mockedGetCurrentAssignment.mockResolvedValue(null);
      const navigation = navigationFor();
      render(
        <RunningScreen
          navigation={navigation as never}
          route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-1', lessonTitle: 'Counting Sheep' } } as never}
        />,
      );

      await act(async () => {
        await Promise.resolve();
      });
      await advancePolls(18);

      expect(screen.getByText("We can't confirm the lesson on Robot yet.")).toBeTruthy();
      expect(screen.getByText('Try again')).toBeTruthy();
      expect(screen.queryByText('Finished! 🎉')).toBeNull();
      expect(screen.queryByText("See what's happening")).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it.each(['FAILED', 'CANCELLED'] as const)('RunningScreen does not render %s as lesson success', async (state) => {
    mockedGetCurrentAssignment.mockResolvedValue(current(state));
    const navigation = navigationFor();
    render(
      <RunningScreen
        navigation={navigation as never}
        route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-1' } } as never}
      />,
    );

    await waitFor(() => expect(mockedGetCurrentAssignment).toHaveBeenCalledWith('dev-1'));

    expect(screen.queryByText('Finished! 🎉')).toBeNull();
    expect(screen.queryByText('Lesson finished')).toBeNull();
    expect(screen.queryByText("Today's lesson is complete.")).toBeNull();
    expect(screen.queryByText("See what's happening")).toBeNull();
  });

  it('CompanionScreen switches the face to happy on the live RUNNING→null transition (MOB-1)', async () => {
    jest.useFakeTimers();
    try {
      mockedGetCurrentAssignment
        .mockResolvedValueOnce(current('RUNNING'))
        .mockResolvedValue(null);
      const navigation = navigationFor();
      render(
        <CompanionScreen
          navigation={navigation as never}
          route={{ key: 'comp', name: ROUTES.CompanionScreen, params: { deviceId: 'dev-1' } } as never}
        />,
      );

      await act(async () => {
        await Promise.resolve();
      });
      // Still running: the "Finished!" copy is not shown.
      expect(screen.queryByText('Finished! 🎉')).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(2500);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Completion copy from presentAssignmentState('COMPLETED').
      expect(screen.getByText('Finished! 🎉')).toBeTruthy();
      // The privacy guarantee is preserved through completion.
      expect(screen.getByText('No transcript')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('CompanionScreen attaches observer from route sessionId and closes it on unmount', async () => {
    mockedGetCurrentAssignment.mockResolvedValue(current('RUNNING'));
    const navigation = navigationFor();
    const rendered = render(
      <CompanionScreen
        navigation={navigation as never}
        route={{ key: 'comp', name: ROUTES.CompanionScreen, params: { deviceId: 'dev-1', assignmentId: 'asg-1', sessionId: 'session-route-2' } } as never}
      />,
    );

    await waitFor(() => expect(mockedOpenRealtime).toHaveBeenCalledWith('session-route-2', expect.objectContaining({ onFrame: expect.any(Function) })));
    expect(realtimeAttaches).toHaveLength(1);

    rendered.unmount();

    expect(realtimeAttaches[0].close).toHaveBeenCalledWith(1000, 'screen unmounted');
  });

  it('CompanionScreen attaches observer from current assignment sessionId and renders completion from terminal frame', async () => {
    mockedGetCurrentAssignment.mockResolvedValue(currentWithSession('RUNNING', 'session-current-2'));
    const navigation = navigationFor();
    render(
      <CompanionScreen
        navigation={navigation as never}
        route={{ key: 'comp', name: ROUTES.CompanionScreen, params: { deviceId: 'dev-1' } } as never}
      />,
    );

    await waitFor(() => expect(mockedOpenRealtime).toHaveBeenCalledWith('session-current-2', expect.objectContaining({ onFrame: expect.any(Function) })));

    act(() => {
      emitRealtimeFrame({ type: 'session.end', end_reason: 'complete' });
    });

    expect(screen.getByText('Finished! 🎉')).toBeTruthy();
    expect(mockedGetCurrentAssignment).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('See lesson reward'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LessonSummaryScreen, {
      assignmentId: 'asg-1',
      deviceId: 'dev-1',
      lessonId: 'w01-d01-barn-say-it',
      sessionId: 'session-current-2',
    });
  });

  it('CompanionScreen stops infinite missing-assignment polling and keeps recovery local', async () => {
    jest.useFakeTimers();
    try {
      mockedGetCurrentAssignment.mockResolvedValue(null);
      const navigation = navigationFor();
      render(
        <CompanionScreen
          navigation={navigation as never}
          route={{ key: 'comp', name: ROUTES.CompanionScreen, params: { deviceId: 'dev-1', lessonTitle: 'Counting Sheep' } } as never}
        />,
      );

      await act(async () => {
        await Promise.resolve();
      });
      await advancePolls(18);

      expect(screen.getByText("We can't confirm the live mirror yet.")).toBeTruthy();
      expect(screen.getByText('Try again')).toBeTruthy();
      expect(screen.getByText('Back to lesson status')).toBeTruthy();
      expect(screen.queryByText('Finished! 🎉')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it.each(['FAILED', 'CANCELLED'] as const)('CompanionScreen does not render %s as lesson success', async (state) => {
    mockedGetCurrentAssignment.mockResolvedValue(current(state));
    const navigation = navigationFor();
    render(
      <CompanionScreen
        navigation={navigation as never}
        route={{ key: 'comp', name: ROUTES.CompanionScreen, params: { deviceId: 'dev-1' } } as never}
      />,
    );

    await waitFor(() => expect(mockedGetCurrentAssignment).toHaveBeenCalledWith('dev-1'));

    expect(screen.queryByText('Finished! 🎉')).toBeNull();
    expect(screen.queryByText('Robot is leading the lesson. You can put your phone away.')).toBeNull();
    expect(screen.getByText('No transcript')).toBeTruthy();
  });

  it('CompanionScreen preserves the "No transcript" guarantee while showing live state', async () => {
    mockedGetCurrentAssignment.mockResolvedValue(current('RUNNING'));
    const navigation = navigationFor();
    render(
      <CompanionScreen
        navigation={navigation as never}
        route={{ key: 'comp', name: ROUTES.CompanionScreen, params: { deviceId: 'dev-1' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('This Is a Barn')).toBeTruthy());
    expect(screen.getByText('No transcript')).toBeTruthy();
  });
});
