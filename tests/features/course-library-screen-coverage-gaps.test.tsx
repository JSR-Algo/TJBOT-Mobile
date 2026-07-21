import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import CourseAddedScreen from '@/features/course-library/screens/CourseAddedScreen';
import CourseCompleteScreen from '@/features/course-library/screens/CourseCompleteScreen';
import NeedsSyncScreen from '@/features/course-library/screens/NeedsSyncScreen';
import RobotReadyScreen from '@/features/course-library/screens/RobotReadyScreen';
import RunningScreen from '@/features/course-library/screens/RunningScreen';
import CompanionScreen from '@/features/course-library/screens/CompanionScreen';
import {
  getCurrentAssignment,
  getPreloadStatus,
  getRobotSyncStatus,
  type CurrentAssignment,
  type PreloadStatus,
  type RobotSyncStatus,
} from '@/services/api/course-library.api';

// Partial mock — keep the pure helpers (isPreloadReady / presentAssignmentState)
// REAL, mock ONLY the three network reads these screens depend on. This mirrors
// course-library-lesson-screens.test.tsx so the assertions exercise the same
// real render + presentation code paths the live app runs.
jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return {
    ...actual,
    getPreloadStatus: jest.fn(),
    getCurrentAssignment: jest.fn(),
    getRobotSyncStatus: jest.fn(),
  };
});

const mockedGetPreloadStatus = getPreloadStatus as jest.MockedFunction<typeof getPreloadStatus>;
const mockedGetCurrentAssignment = getCurrentAssignment as jest.MockedFunction<typeof getCurrentAssignment>;
const mockedGetRobotSyncStatus = getRobotSyncStatus as jest.MockedFunction<typeof getRobotSyncStatus>;

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
  return {
    assignmentId: 'asg-1',
    state,
    profile: 'espTft',
    criticalTotal: 2,
    criticalReady: state === 'READY' ? 2 : 1,
    assets: [],
  };
}

function current(state: CurrentAssignment['state']): CurrentAssignment {
  return {
    assignmentId: 'asg-1',
    sessionId: null,
    assignmentVersion: 1,
    lessonId: 'w01-d01-barn-say-it',
    lessonTitle: 'This Is a Barn',
    lessonVersion: 1,
    manifestChecksum: 'sha256:w01-d01',
    state,
    childId: 'ch-1',
    profile: 'espTft',
  };
}

function currentWithSession(state: CurrentAssignment['state']): CurrentAssignment {
  return {
    ...current(state),
    sessionId: 'sess-1',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // CourseAddedScreen reads the device's real seat on mount; default to "no
  // seat known" so tests that do not care about it still get a Promise back.
  mockedGetCurrentAssignment.mockResolvedValue(null);
});

// ───────────────────────────────────────────────────────────────────────────
// CourseCompleteScreen — cl_complete terminal of the assignment lifecycle. The
// screen is a static summary (no network), so the gap is purely render + the
// two navigation CTAs. Covers lines 16-73.
// ───────────────────────────────────────────────────────────────────────────
describe('CourseCompleteScreen — completion terminal render + nav', () => {
  it('renders the privacy guarantee, the stat grid, and the taught-words legend', () => {
    const navigation = navigationFor();
    render(
      <CourseCompleteScreen
        navigation={navigation as never}
        route={{ key: 'cc', name: ROUTES.CourseCompleteScreen, params: undefined } as never}
      />,
    );

    // Three-streams privacy invariant must survive into the completion summary.
    expect(screen.getByText('Synced from Robot just now. Audio was never saved.')).toBeTruthy();
    // STATS rows render their values + labels (maps over STATS, lines 41-46).
    expect(screen.getByText('Words played with')).toBeTruthy();
    expect(screen.getByText('Time together')).toBeTruthy();
    // WORDS map renders both a "good" and a "revisit" chip (lines 53-57 + the
    // ternary on line 54/55 hits BOTH the t.good true and false branches).
    expect(screen.getByText('cat')).toBeTruthy(); // good: true
    expect(screen.getByText('rabbit')).toBeTruthy(); // good: false
  });

  it('"Plan tomorrow\'s lesson" routes back to SendToRobotScreen', () => {
    const navigation = navigationFor();
    render(
      <CourseCompleteScreen
        navigation={navigation as never}
        route={{ key: 'cc', name: ROUTES.CourseCompleteScreen, params: undefined } as never}
      />,
    );

    fireEvent.press(screen.getByText("Plan tomorrow's lesson"));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SendToRobotScreen);
  });

  it('"Done" routes to DeviceHomeScreen', () => {
    const navigation = navigationFor();
    render(
      <CourseCompleteScreen
        navigation={navigation as never}
        route={{ key: 'cc', name: ROUTES.CourseCompleteScreen, params: undefined } as never}
      />,
    );

    fireEvent.press(screen.getByText('Done'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
  });
});

describe('CourseAddedScreen — assignment handoff integrity', () => {
  it('does not open RobotReady from a course assignment route until manifestChecksum is present', async () => {
    const navigation = navigationFor();
    render(
      <CourseAddedScreen
        navigation={navigation as never}
        route={{
          key: 'ca',
          name: ROUTES.CourseAddedScreen,
          params: {
            courseId: 'c_food',
            deviceId: 'dev-1',
            assignmentId: 'asg-1',
            assignmentVersion: 2,
            manifestChecksum: null,
          },
        } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText("Open today's lesson"));
    });

    expect(navigation.navigate).not.toHaveBeenCalledWith(
      ROUTES.RobotReadyScreen,
      expect.objectContaining({ assignmentId: 'asg-1' }),
    );
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SendToRobotScreen, { courseId: 'c_food' });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// NeedsSyncScreen — FAILED→needs_sync terminal. The gap is handleReconnect's
// three outcomes (synced / not-synced / throw) + the render body + the
// DeviceRow onClick. Covers lines 20, 28, 33, 38-87.
// ───────────────────────────────────────────────────────────────────────────
describe('NeedsSyncScreen — reconnect handler + render', () => {
  function syncStatus(synced: boolean): RobotSyncStatus {
    return { courseId: 'c_food', synced } as RobotSyncStatus;
  }

  it('reconnect → synced: navigates to CourseAddedScreen with the route courseId', async () => {
    mockedGetRobotSyncStatus.mockResolvedValue(syncStatus(true));
    const navigation = navigationFor();
    render(
      <NeedsSyncScreen
        navigation={navigation as never}
        route={{ key: 'ns', name: ROUTES.NeedsSyncScreen, params: { courseId: 'c_zoo' } } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Reconnect Robot now'));
    });

    await waitFor(() => expect(mockedGetRobotSyncStatus).toHaveBeenCalledWith('c_zoo'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseAddedScreen, { courseId: 'c_zoo' });
    // No failure copy on the success path.
    expect(screen.queryByText(/Robot has not synced this course yet/)).toBeNull();
  });

  it('reconnect → not synced: shows the "not synced yet" message, does NOT navigate forward', async () => {
    mockedGetRobotSyncStatus.mockResolvedValue(syncStatus(false));
    const navigation = navigationFor();
    render(
      <NeedsSyncScreen
        navigation={navigation as never}
        route={{ key: 'ns', name: ROUTES.NeedsSyncScreen, params: undefined } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Reconnect Robot now'));
    });

    // route.params?.courseId is undefined → falls back to default 'c_food' (line 20).
    await waitFor(() => expect(mockedGetRobotSyncStatus).toHaveBeenCalledWith('c_food'));
    expect(
      screen.getByText('Robot has not synced this course yet. Check Wi-Fi and try again.'),
    ).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalledWith(
      ROUTES.CourseAddedScreen,
      expect.anything(),
    );
  });

  it('reconnect → network throw: catch branch shows the same fallback message', async () => {
    mockedGetRobotSyncStatus.mockRejectedValue(new Error('offline'));
    const navigation = navigationFor();
    render(
      <NeedsSyncScreen
        navigation={navigation as never}
        route={{ key: 'ns', name: ROUTES.NeedsSyncScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Reconnect Robot now'));
    });

    await waitFor(() =>
      expect(
        screen.getByText('Robot has not synced this course yet. Check Wi-Fi and try again.'),
      ).toBeTruthy(),
    );
    expect(navigation.navigate).not.toHaveBeenCalledWith(
      ROUTES.CourseAddedScreen,
      expect.anything(),
    );
  });

  it('the "Check Robot connection" troubleshooting row routes to DeviceHomeScreen (line 72)', () => {
    const navigation = navigationFor();
    render(
      <NeedsSyncScreen
        navigation={navigation as never}
        route={{ key: 'ns', name: ROUTES.NeedsSyncScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    fireEvent.press(screen.getByText('Check Robot connection'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
  });

  it('the DeviceShell back action routes to CourseLibraryScreen, "I\'ll do it later" to DeviceHomeScreen', () => {
    const navigation = navigationFor();
    render(
      <NeedsSyncScreen
        navigation={navigation as never}
        route={{ key: 'ns', name: ROUTES.NeedsSyncScreen, params: { courseId: 'c_food' } } as never}
      />,
    );

    // onBack arrow (DeviceShell header) → CourseLibraryScreen (line 38).
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CourseLibraryScreen);

    fireEvent.press(screen.getByText("I'll do it later"));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// RobotReadyScreen — remaining gaps: the poll catch-retry (line 66) and the
// READY-state primary CTA navigate into RunningScreen (lines 139-148).
// ───────────────────────────────────────────────────────────────────────────
describe('RobotReadyScreen — poll-error retry + ready CTA', () => {
  it('READY: the primary CTA navigates to RunningScreen carrying deviceId/assignmentId/lessonTitle', async () => {
    mockedGetPreloadStatus.mockResolvedValue(preload('READY'));
    mockedGetCurrentAssignment.mockResolvedValue(currentWithSession('READY'));
    const navigation = navigationFor();
    render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={
          {
            key: 'rr',
            name: ROUTES.RobotReadyScreen,
            params: { deviceId: 'dev-9', assignmentId: 'asg-1' },
          } as never
        }
      />,
    );

    await waitFor(() => expect(screen.getByText('Hand it to your child')).toBeTruthy());
    fireEvent.press(screen.getByText('Hand it to your child'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RunningScreen, {
      deviceId: 'dev-9',
      assignmentId: 'asg-1',
      sessionId: 'sess-1',
      lessonTitle: 'This Is a Barn',
    });
  });

  it('READY: sessionId null does not block the primary CTA or synthesize assignmentId as sessionId', async () => {
    mockedGetPreloadStatus.mockResolvedValue(preload('READY'));
    mockedGetCurrentAssignment.mockResolvedValue(current('READY'));
    const navigation = navigationFor();
    render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={{ key: 'rr', name: ROUTES.RobotReadyScreen, params: { deviceId: 'dev-9' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Hand it to your child')).toBeTruthy());
    fireEvent.press(screen.getByText('Hand it to your child'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.RunningScreen, {
      deviceId: 'dev-9',
      assignmentId: 'asg-1',
      sessionId: undefined,
      lessonTitle: 'This Is a Barn',
    });
  });

  it('READY: keeps the primary CTA gated when the current assignment has no manifest checksum', async () => {
    mockedGetPreloadStatus.mockResolvedValue(preload('READY'));
    mockedGetCurrentAssignment.mockResolvedValue({ ...current('READY'), manifestChecksum: null });
    const navigation = navigationFor();

    render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={{ key: 'rr', name: ROUTES.RobotReadyScreen, params: { deviceId: 'dev-9' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Preparing…')).toBeTruthy());
    expect(screen.queryByText('Hand it to your child')).toBeNull();
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.RunningScreen, expect.anything());
  });

  it('READY: keeps the primary CTA gated when preload belongs to a stale assignment', async () => {
    mockedGetPreloadStatus.mockResolvedValue({ ...preload('READY'), assignmentId: 'asg-old' });
    mockedGetCurrentAssignment.mockResolvedValue({
      ...current('READY'),
      assignmentId: 'asg-new',
      lessonTitle: 'Barn Colors',
      manifestChecksum: 'sha256:w01-d02',
    });
    const navigation = navigationFor();

    render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={{ key: 'rr', name: ROUTES.RobotReadyScreen, params: { deviceId: 'dev-9', assignmentId: 'asg-old' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Preparing…')).toBeTruthy());
    expect(screen.queryByText('Hand it to your child')).toBeNull();
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.RunningScreen, expect.anything());
  });

  it('"Pick a different lesson" routes back to SendToRobotScreen', async () => {
    mockedGetPreloadStatus.mockResolvedValue(preload('READY'));
    mockedGetCurrentAssignment.mockResolvedValue(current('READY'));
    const navigation = navigationFor();
    render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={
          { key: 'rr', name: ROUTES.RobotReadyScreen, params: { deviceId: 'dev-9' } } as never
        }
      />,
    );

    await waitFor(() => expect(screen.getByText('Pick a different lesson')).toBeTruthy());
    fireEvent.press(screen.getByText('Pick a different lesson'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SendToRobotScreen);
  });

  it('renders the M4 error copy when preload carries an errorCode (lines 80, 96)', async () => {
    mockedGetPreloadStatus.mockResolvedValue({ ...preload('FAILED'), errorCode: 'PRELOAD_TIMEOUT' });
    mockedGetCurrentAssignment.mockResolvedValue(current('FAILED'));
    const navigation = navigationFor();
    render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={{ key: 'rr', name: ROUTES.RobotReadyScreen, params: { deviceId: 'dev-9' } } as never}
      />,
    );

    // The errorCode → getErrorMessage → formatLessonCopy chain produces visible
    // copy (errorCopy non-null arm of L80 + the L96 render arm). The exact copy
    // is owned by the error map; assert the disabled-CTA + non-ready state that
    // the FAILED+errorCode path forces, proving the error branch was taken.
    await waitFor(() => expect(mockedGetPreloadStatus).toHaveBeenCalledWith('dev-9'));
    expect(screen.queryByText('Ready for today')).toBeNull();
    expect(screen.getByText('Preparing…')).toBeTruthy();
  });

  it('unmount mid-poll: the resolved poll is dropped via the active guard, no setState after unmount (lines 53/66)', async () => {
    // Hold both reads pending so the component can unmount WHILE poll() is
    // awaiting — exercising the `if (!active) return` guard (L53) and the
    // cleanup that flips active=false so the catch/retry no-ops (L66 else arm).
    let resolvePreload!: (v: PreloadStatus) => void;
    let resolveCurrent!: (v: CurrentAssignment) => void;
    mockedGetPreloadStatus.mockReturnValue(
      new Promise<PreloadStatus>((r) => {
        resolvePreload = r;
      }),
    );
    mockedGetCurrentAssignment.mockReturnValue(
      new Promise<CurrentAssignment>((r) => {
        resolveCurrent = r;
      }),
    );
    const navigation = navigationFor();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={{ key: 'rr', name: ROUTES.RobotReadyScreen, params: { deviceId: 'dev-9' } } as never}
      />,
    );

    // poll() has dispatched both reads and is parked on the await.
    await waitFor(() => expect(mockedGetPreloadStatus).toHaveBeenCalled());
    // Unmount → cleanup sets active=false BEFORE the promises resolve.
    unmount();
    // Now resolve: poll() wakes up, hits `if (!active) return` and bails —
    // no setPreload/setAssignment fire after unmount (no React act warning).
    await act(async () => {
      resolvePreload(preload('READY'));
      resolveCurrent(current('READY'));
      await Promise.resolve();
      await Promise.resolve();
    });

    // The unmount-after-await guard means React never warns about a state
    // update on an unmounted component.
    expect(
      errorSpy.mock.calls.some((c) => String(c[0]).includes("can't perform a React state update")),
    ).toBe(false);
    errorSpy.mockRestore();
  });

  it('unmount mid-poll then the read REJECTS: catch sees active=false and schedules no retry (line 66 else arm)', async () => {
    let rejectPreload!: (e: unknown) => void;
    mockedGetPreloadStatus.mockReturnValue(
      new Promise<PreloadStatus>((_, rej) => {
        rejectPreload = rej;
      }),
    );
    mockedGetCurrentAssignment.mockReturnValue(
      new Promise<CurrentAssignment>(() => {
        /* never settles */
      }),
    );
    const navigation = navigationFor();
    const { unmount } = render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={{ key: 'rr', name: ROUTES.RobotReadyScreen, params: { deviceId: 'dev-9' } } as never}
      />,
    );

    await waitFor(() => expect(mockedGetPreloadStatus).toHaveBeenCalled());
    unmount(); // active := false
    // The rejection wakes the catch; active is false so the `if (active)` retry
    // is skipped (L66 else). getPreloadStatus must therefore NOT be called again.
    await act(async () => {
      rejectPreload(new Error('boom after unmount'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockedGetPreloadStatus).toHaveBeenCalledTimes(1);
  });

  it('no deviceId → the poll effect returns early and never reads the network (line 43)', () => {
    const navigation = navigationFor();
    render(
      <RobotReadyScreen
        navigation={navigation as never}
        route={{ key: 'rr', name: ROUTES.RobotReadyScreen, params: {} } as never}
      />,
    );

    expect(mockedGetPreloadStatus).not.toHaveBeenCalled();
    expect(mockedGetCurrentAssignment).not.toHaveBeenCalled();
    // Falls back to the static heading with no assignment.
    expect(screen.getByText("Today's lesson")).toBeTruthy();
  });

  it('poll throw → catch retries on the same cadence, then succeeds (line 66)', async () => {
    jest.useFakeTimers();
    try {
      // First poll rejects (both reads in Promise.all) → catch schedules a retry.
      // Second poll resolves READY → render settles.
      mockedGetPreloadStatus
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValue(preload('READY'));
      mockedGetCurrentAssignment
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValue(current('READY'));
      const navigation = navigationFor();
      render(
        <RobotReadyScreen
          navigation={navigation as never}
          route={
            { key: 'rr', name: ROUTES.RobotReadyScreen, params: { deviceId: 'dev-9' } } as never
          }
        />,
      );

      // Let the first (rejecting) poll settle — the screen is still "Preparing…".
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.queryByText('Hand it to your child')).toBeNull();

      // Fire the retry timer scheduled by the catch (line 66) → READY resolves.
      await act(async () => {
        jest.advanceTimersByTime(2500);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockedGetPreloadStatus).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Hand it to your child')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// RunningScreen — remaining gaps: the non-terminal keep-polling branch (lines
// 69-71: current===null BEFORE any live assignment, the read-after-write race)
// and the live-state "See what's happening" CTA (lines 131-135).
// ───────────────────────────────────────────────────────────────────────────
describe('RunningScreen — read-after-write race + companion CTA', () => {
  it('current===null before any live read keeps polling (does NOT finish prematurely), lines 69-71', async () => {
    jest.useFakeTimers();
    try {
      // Race: createAssignment just ran but the current-assignment read returns
      // null on the first poll (not yet visible). sawLiveRef is still false, so
      // this is NON-terminal — the screen must keep polling, NOT show Finished.
      mockedGetCurrentAssignment
        .mockResolvedValueOnce(null) // read-after-write race → keep polling
        .mockResolvedValue(current('RUNNING')); // assignment becomes visible
      const navigation = navigationFor();
      render(
        <RunningScreen
          navigation={navigation as never}
          route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-1' } } as never}
        />,
      );

      await act(async () => {
        await Promise.resolve();
      });
      // First poll saw null with no prior live read → must NOT be finished.
      expect(screen.queryByText('Finished! 🎉')).toBeNull();

      // The keep-polling timer fires → RUNNING becomes visible.
      await act(async () => {
        jest.advanceTimersByTime(2500);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockedGetCurrentAssignment).toHaveBeenCalledTimes(2);
      expect(screen.getByText('This Is a Barn')).toBeTruthy();
      expect(screen.queryByText('Finished! 🎉')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('a thrown current-assignment read is caught and retried on the same cadence (line 71)', async () => {
    jest.useFakeTimers();
    try {
      // First poll throws (transient read failure) → catch schedules a retry.
      // Second poll resolves RUNNING → the screen recovers without crashing.
      mockedGetCurrentAssignment
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValue(current('RUNNING'));
      const navigation = navigationFor();
      render(
        <RunningScreen
          navigation={navigation as never}
          route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-1' } } as never}
        />,
      );

      // Let the rejecting poll settle — no live data yet, not finished.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.queryByText('This Is a Barn')).toBeNull();
      expect(screen.queryByText('Finished! 🎉')).toBeNull();

      // The catch-scheduled retry timer fires → RUNNING resolves.
      await act(async () => {
        jest.advanceTimersByTime(2500);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockedGetCurrentAssignment).toHaveBeenCalledTimes(2);
      expect(screen.getByText('This Is a Barn')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('while live, "See what\'s happening" navigates to CompanionScreen with assignment identity and lesson title', async () => {
    mockedGetCurrentAssignment.mockResolvedValue(currentWithSession('RUNNING'));
    const navigation = navigationFor();
    render(
      <RunningScreen
        navigation={navigation as never}
        route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-7' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText("See what's happening")).toBeTruthy());
    fireEvent.press(screen.getByText("See what's happening"));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CompanionScreen, {
      deviceId: 'dev-7',
      assignmentId: 'asg-1',
      sessionId: 'sess-1',
      lessonTitle: 'This Is a Barn',
    });
  });

  it('while live, sessionId null keeps the companion CTA on polling fallback without synthesizing assignmentId', async () => {
    mockedGetCurrentAssignment.mockResolvedValue(current('RUNNING'));
    const navigation = navigationFor();
    render(
      <RunningScreen
        navigation={navigation as never}
        route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-7' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText("See what's happening")).toBeTruthy());
    fireEvent.press(screen.getByText("See what's happening"));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CompanionScreen, {
      deviceId: 'dev-7',
      assignmentId: 'asg-1',
      sessionId: undefined,
      lessonTitle: 'This Is a Barn',
    });
  });

  it('"Done for now" routes to DeviceHomeScreen', async () => {
    mockedGetCurrentAssignment.mockResolvedValue(current('RUNNING'));
    const navigation = navigationFor();
    render(
      <RunningScreen
        navigation={navigation as never}
        route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-7' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Done for now')).toBeTruthy());
    fireEvent.press(screen.getByText('Done for now'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
  });

  it('unmount mid-poll: the resolved read is dropped via the active guard (line 44)', async () => {
    let resolveCurrent!: (v: CurrentAssignment) => void;
    mockedGetCurrentAssignment.mockReturnValue(
      new Promise<CurrentAssignment>((r) => {
        resolveCurrent = r;
      }),
    );
    const navigation = navigationFor();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <RunningScreen
        navigation={navigation as never}
        route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-7' } } as never}
      />,
    );

    await waitFor(() => expect(mockedGetCurrentAssignment).toHaveBeenCalled());
    unmount(); // active := false BEFORE the read resolves
    await act(async () => {
      resolveCurrent(current('RUNNING'));
      await Promise.resolve();
      await Promise.resolve();
    });

    // poll() resumed, hit `if (!active) return` (L44) → no post-unmount setState.
    expect(
      errorSpy.mock.calls.some((c) => String(c[0]).includes("can't perform a React state update")),
    ).toBe(false);
    errorSpy.mockRestore();
  });

  it('unmount mid-poll then the read REJECTS: catch sees active=false, no retry scheduled (line 71 else arm)', async () => {
    let rejectCurrent!: (e: unknown) => void;
    mockedGetCurrentAssignment.mockReturnValue(
      new Promise<CurrentAssignment>((_, rej) => {
        rejectCurrent = rej;
      }),
    );
    const navigation = navigationFor();
    const { unmount } = render(
      <RunningScreen
        navigation={navigation as never}
        route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-7' } } as never}
      />,
    );

    await waitFor(() => expect(mockedGetCurrentAssignment).toHaveBeenCalled());
    unmount(); // active := false
    await act(async () => {
      rejectCurrent(new Error('boom after unmount'));
      await Promise.resolve();
      await Promise.resolve();
    });
    // catch ran with active=false → `if (active)` retry skipped (L71 else); the
    // read is never re-issued.
    expect(mockedGetCurrentAssignment).toHaveBeenCalledTimes(1);
  });

  it('no deviceId → the poll effect returns early and never reads the network (line 37)', () => {
    jest.useFakeTimers();
    try {
      const navigation = navigationFor();
      render(
        <RunningScreen
          navigation={navigation as never}
          route={
            {
              key: 'run',
              name: ROUTES.RunningScreen,
              params: { lessonTitle: 'Counting Sheep' },
            } as never
          }
        />,
      );

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockedGetCurrentAssignment).not.toHaveBeenCalled();
      // With no assignment yet, the heading falls back to the route lessonTitle
      // (the route-param arm of the lessonTitle ternary, line 85).
      expect(screen.getByText('Counting Sheep')).toBeTruthy();
      expect(screen.getByText('Lesson status unavailable')).toBeTruthy();
      expect(screen.getByText("We can't confirm the lesson on Robot yet.")).toBeTruthy();
      expect(screen.queryByText('Lesson playing')).toBeNull();
      expect(screen.queryByText("See what's happening")).toBeNull();
      expect(screen.queryByText('Try again')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('an explicit COMPLETED assignment object renders Finished directly (line 55 + terminal arm)', async () => {
    // The endpoint normally drops finished rows, but a COMPLETED object IS a
    // valid terminal payload: this drives the `if (current) setAssignment` write
    // (line 55) AND the explicit current?.state === 'COMPLETED' terminal arm,
    // distinct from the live→null inference path the lesson-screens test covers.
    mockedGetCurrentAssignment.mockResolvedValue(current('COMPLETED'));
    const navigation = navigationFor();
    render(
      <RunningScreen
        navigation={navigation as never}
        route={{ key: 'run', name: ROUTES.RunningScreen, params: { deviceId: 'dev-7' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByText('Finished! 🎉')).toBeTruthy());
    // The completed object's own title is rendered (assignment arm of L82-87).
    expect(screen.getByText('This Is a Barn')).toBeTruthy();
    // Completed → the live "See what's happening" CTA is gone.
    expect(screen.queryByText("See what's happening")).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CompanionScreen — same current-assignment read-after-write race as
// RunningScreen, but the companion route must preserve the known lesson title
// while waiting for the first live assignment object.
// ───────────────────────────────────────────────────────────────────────────
describe('CompanionScreen — read-after-write race', () => {
  it('current===null before any live read keeps polling and preserves the route lesson title', async () => {
    jest.useFakeTimers();
    try {
      mockedGetCurrentAssignment
        .mockResolvedValueOnce(null)
        .mockResolvedValue(current('RUNNING'));
      const navigation = navigationFor();
      render(
        <CompanionScreen
          navigation={navigation as never}
          route={{
            key: 'comp',
            name: ROUTES.CompanionScreen,
            params: { deviceId: 'dev-1', lessonTitle: 'Counting Sheep' },
          } as never}
        />,
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText('Counting Sheep')).toBeTruthy();
      expect(screen.queryByText('Finished! 🎉')).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(2500);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockedGetCurrentAssignment).toHaveBeenCalledTimes(2);
      expect(screen.getByText('This Is a Barn')).toBeTruthy();
      expect(screen.queryByText('Finished! 🎉')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('no deviceId → does not render a fake live mirror or poll current assignment', () => {
    jest.useFakeTimers();
    try {
      const navigation = navigationFor();
      render(
        <CompanionScreen
          navigation={navigation as never}
          route={{
            key: 'comp',
            name: ROUTES.CompanionScreen,
            params: { lessonTitle: 'Counting Sheep' },
          } as never}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockedGetCurrentAssignment).not.toHaveBeenCalled();
      expect(screen.getByText('Counting Sheep')).toBeTruthy();
      expect(screen.getByText('Waiting')).toBeTruthy();
      expect(screen.getByText("We can't confirm the live mirror yet.")).toBeTruthy();
      expect(screen.queryByText('Live')).toBeNull();
      expect(screen.queryByText('Lesson running on Robot')).toBeNull();
      expect(screen.queryByText('Try again')).toBeNull();
      expect(screen.queryByText('Back to lesson status')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('stale after a live read does not keep rendering the previous live mirror copy', async () => {
    jest.useFakeTimers();
    try {
      mockedGetCurrentAssignment
        .mockResolvedValueOnce(current('RUNNING'))
        .mockRejectedValue(new Error('current-assignment unavailable'));
      const navigation = navigationFor();
      render(
        <CompanionScreen
          navigation={navigation as never}
          route={{
            key: 'comp',
            name: ROUTES.CompanionScreen,
            params: { deviceId: 'dev-1', lessonTitle: 'Counting Sheep' },
          } as never}
        />,
      );

      await waitFor(() => expect(screen.getByText('Lesson running on Robot')).toBeTruthy());

      for (let poll = 0; poll < 18; poll += 1) {
        await act(async () => {
          await jest.advanceTimersByTimeAsync(2500);
        });
      }

      expect(mockedGetCurrentAssignment).toHaveBeenCalledTimes(19);
      expect(screen.getByText('Waiting')).toBeTruthy();
      expect(screen.getByText("We can't confirm the live mirror yet.")).toBeTruthy();
      expect(screen.queryByText('Lesson running on Robot')).toBeNull();
      expect(screen.queryByText('Live')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
