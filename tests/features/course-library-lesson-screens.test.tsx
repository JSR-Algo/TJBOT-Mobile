import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
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

// Partial mock — keep the pure helpers (isPreloadReady / presentAssignmentState)
// real, mock ONLY the two network reads.
jest.mock('@/services/api/course-library.api', () => {
  const actual = jest.requireActual('@/services/api/course-library.api');
  return { ...actual, getPreloadStatus: jest.fn(), getCurrentAssignment: jest.fn() };
});

const mockedGetPreloadStatus = getPreloadStatus as jest.MockedFunction<typeof getPreloadStatus>;
const mockedGetCurrentAssignment = getCurrentAssignment as jest.MockedFunction<typeof getCurrentAssignment>;

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
  return { assignmentId: 'asg-1', assignmentVersion: 1, lessonId: 'w01-d01-barn-say-it', lessonTitle: 'This Is a Barn', lessonVersion: 1, state, childId: 'ch-1', profile: 'espTft' };
}

describe('US-006 S11 — lesson screens render real data (M2/M3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    } finally {
      jest.useRealTimers();
    }
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
