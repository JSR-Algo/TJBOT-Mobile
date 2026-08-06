import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

const phases: readonly LessonPhase[] = ['connecting', 'greeting', 'listening', 'speaking', 'done'];

function activeCheckpoint(phase: LessonPhase): LessonCheckpoint {
  return {
    lessonTitle: 'Greetings',
    progressLabel: '2 of 5',
    resumeTarget: ROUTES.SendToRobotScreen,
    reason: 'voice_failed',
    phase,
    sessionState: 'active',
    authState: 'authenticated',
  };
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
        phase: 'speaking',
        sessionState: 'active',
        authState: 'authenticated',
      },
    });
  });
});

describe('mobile lesson recovery screen matrix', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders resume UI for app-killed active lesson phases and ended UI for done', () => {
    for (const phase of phases.filter((value) => value !== 'done')) {
      const navigation = createNavigation();
      const checkpoint = activeCheckpoint(phase);
      const view = render(
        <LessonResumeScreen
          navigation={navigation as never}
          route={routeFor(ROUTES.LessonResumeScreen, { checkpoint })}
        />,
      );

      expect(view.getByText('Greetings')).toBeTruthy();
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

  it('uses reauth UI for expired auth and routes sign-in without crashing', () => {
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
    fireEvent.press(screen.getByText('Sign in again'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.LoginScreen);
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

  it('guards resume double taps and honors active HomeHub resume targets', () => {
    const navigation = createNavigation();
    render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={routeFor(ROUTES.LessonResumeScreen, {
          checkpoint: { ...activeCheckpoint('speaking'), resumeTarget: ROUTES.HomeHubScreen },
        })}
      />,
    );

    const keepGoing = screen.getByText('Keep going');
    fireEvent.press(keepGoing);
    fireEvent.press(keepGoing);
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });

  it('honors HomeHub resume target before course resume context', () => {
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

    fireEvent.press(screen.getByText('Keep going'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
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
