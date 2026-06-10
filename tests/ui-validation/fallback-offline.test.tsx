import React from 'react';
import NetInfo, { type NetInfoNoConnectionState, type NetInfoState } from '@react-native-community/netinfo';
import { act, fireEvent, render } from '@testing-library/react-native';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import AppErrorScreen from '../../src/features/fallback/screens/AppErrorScreen';
import AudioRecoveryScreen from '../../src/features/fallback/screens/AudioRecoveryScreen';
import CourseLockedScreen from '../../src/features/course-library/screens/CourseLockedScreen';
import LessonResumeScreen from '../../src/features/fallback/screens/LessonResumeScreen';
import HelpFaqScreen from '../../src/features/fallback/screens/HelpFaqScreen';
import MicMissingScreen from '../../src/features/fallback/screens/MicMissingScreen';
import NeedsSyncScreen from '../../src/features/course-library/screens/NeedsSyncScreen';
import NetworkErrorScreen from '../../src/features/fallback/screens/NetworkErrorScreen';
import ReconnectingOverlay from '../../src/features/fallback/ReconnectingOverlay';
import SafetyRedirectScreen from '../../src/features/fallback/screens/SafetyRedirectScreen';
import VoiceFailedScreen from '../../src/features/fallback/screens/VoiceFailedScreen';
import PairFailedScreen from '../../src/features/device/pairing/screens/PairFailedScreen';
import PairOfflineScreen from '../../src/features/device/pairing/screens/PairOfflineScreen';
import { fallbackCheckpoint } from '../../src/features/fallback/recoveryTypes';
import { ROUTES } from '../../src/navigation/routes';

type FallbackRouteName =
  | typeof ROUTES.AppErrorScreen
  | typeof ROUTES.AudioRecoveryScreen
  | typeof ROUTES.LessonResumeScreen
  | typeof ROUTES.MicMissingScreen
  | typeof ROUTES.NetworkErrorScreen
  | typeof ROUTES.VoiceFailedScreen
  | typeof ROUTES.HelpFaqScreen
  | typeof ROUTES.PairOfflineScreen
  | typeof ROUTES.PairFailedScreen
  | typeof ROUTES.SafetyRedirectScreen
  | typeof ROUTES.NeedsSyncScreen;

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

function createRoute(name: FallbackRouteName) {
  return { key: name, name, params: undefined };
}

describe('fallback and offline UI stability', () => {
  it('accepts typed fallback recovery context in route params', () => {
    const checkpoint = fallbackCheckpoint();
    const resumeRoute = {
      key: ROUTES.LessonResumeScreen,
      name: ROUTES.LessonResumeScreen,
      params: {
        checkpoint,
      },
    };

    expect(resumeRoute.params.checkpoint.resumeTarget).toBe(ROUTES.UserSpeakingScreen);
  });

  it('renders network fallback and navigates only through route constants', () => {
    const navigation = createNavigation();
    const { getByLabelText, getByText } = render(
      <NetworkErrorScreen navigation={navigation as never} route={createRoute(ROUTES.NetworkErrorScreen) as never} />,
    );

    fireEvent.press(getByLabelText('Back to home'));
    fireEvent.press(getByLabelText('Back home'));
    fireEvent.press(getByText('Try again'));
    fireEvent.press(getByText('Back home'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ReconnectingOverlay, {
      attempt: 1,
      checkpoint: undefined,
      failureTarget: ROUTES.HelpFaqScreen,
      maxAttempts: 3,
      reconnectDelayMs: 15000,
    });
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });

  it('does not send exhausted retry attempts from network fallback CTA', () => {
    const navigation = createNavigation();
    const route = {
      key: ROUTES.NetworkErrorScreen,
      name: ROUTES.NetworkErrorScreen,
      params: { attemptCount: 3 },
    };
    const { getByText } = render(
      <NetworkErrorScreen navigation={navigation as never} route={route as never} />,
    );

    fireEvent.press(getByText('Try again'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.ReconnectingOverlay, {
      attempt: 3,
      checkpoint: undefined,
      failureTarget: ROUTES.HelpFaqScreen,
      maxAttempts: 3,
      reconnectDelayMs: 15000,
    });
  });

  it('uses explicit reconnect failure target after retry attempts are exhausted', () => {
    jest.useFakeTimers();
    const navigation = createNavigation();

    render(
      <ReconnectingOverlay
        navigation={navigation as never}
        route={{
          key: ROUTES.ReconnectingOverlay,
          name: ROUTES.ReconnectingOverlay,
          params: { attempt: 3, maxAttempts: 3, failureTarget: ROUTES.HomeHubScreen },
        } as never}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(2400);
    });

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
    jest.useRealTimers();
  });

  it('clamps reconnect overlay route attempts before rendering retry state', () => {
    const navigation = createNavigation();

    const screen = render(
      <ReconnectingOverlay
        navigation={navigation as never}
        route={{
          key: ROUTES.ReconnectingOverlay,
          name: ROUTES.ReconnectingOverlay,
          params: { attempt: 0, maxAttempts: 0 },
        } as never}
      />,
    );

    expect(screen.getByText('Attempt 1 of 1')).toBeTruthy();
  });

  it('tells families network progress is safe before retrying', () => {
    const navigation = createNavigation();
    const { getByText } = render(
      <NetworkErrorScreen navigation={navigation as never} route={createRoute(ROUTES.NetworkErrorScreen) as never} />,
    );

    expect(getByText('Your place is saved. Try again, or go home and keep your lesson ready.')).toBeTruthy();
  });

  it('renders server app-error fallback with user-safe copy', () => {
    const navigation = createNavigation();
    const reset = jest.fn();
    const { getByText, queryByText } = render(
      <AppErrorScreen
        navigation={navigation as never}
        route={createRoute(ROUTES.AppErrorScreen) as never}
        error={new Error('database password leaked for parent@example.com')}
        reset={reset}
      />,
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Something did not load. Your account and progress are safe.')).toBeTruthy();
    expect(queryByText(/parent@example.com/)).toBeNull();
    expect(queryByText(/database password/i)).toBeNull();
    expect(queryByText(/Error:/i)).toBeNull();
    expect(queryByText(/at /i)).toBeNull();
    fireEvent.press(getByText('Try again'));
    fireEvent.press(getByText('Back home'));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });

  it('keeps pair-offline copy parent-readable and free of implementation terms', () => {
    const navigation = createNavigation();
    const screen = render(
      <PairOfflineScreen navigation={navigation as never} route={createRoute(ROUTES.PairOfflineScreen) as never} />,
    );

    expect(screen.getByText('Robot is offline')).toBeTruthy();
    expect(screen.getByText('Pairing is safe. Plug Robot in, bring it near your phone, then reconnect.')).toBeTruthy();
    expect(screen.queryByText(/\b(telemetry|contract|schema|backend|BLE)\b/i)).toBeNull();
    fireEvent.press(screen.getByText('Reconnect now'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, { reconnectMode: true });
  });

  it('routes voice failure through checkpoint-aware resume copy', () => {
    const voiceNavigation = createNavigation();
    const checkpoint = {
      lessonTitle: 'How are you?',
      progressLabel: '60%',
      resumeTarget: ROUTES.UserSpeakingScreen,
      reason: 'voice_failed' as const,
    };

    const voice = render(
      <VoiceFailedScreen
        navigation={voiceNavigation as never}
        route={{ key: ROUTES.VoiceFailedScreen, name: ROUTES.VoiceFailedScreen, params: { checkpoint } } as never}
      />,
    );

    expect(voice.getByText('Robot voice paused')).toBeTruthy();
    expect(voice.getByText('Your progress is safe. The voice session was interrupted.')).toBeTruthy();
    fireEvent.press(voice.getByText('Resume lesson'));
    expect(voiceNavigation.navigate).toHaveBeenCalledWith(ROUTES.LessonResumeScreen, { checkpoint });
  });

  it('renders lesson resume from checkpoint and navigates to target', () => {
    const navigation = createNavigation();
    const checkpoint = {
      lessonTitle: 'How are you?',
      progressLabel: '60%',
      resumeTarget: ROUTES.UserSpeakingScreen,
      reason: 'voice_failed' as const,
      activityLabel: 'Speaking practice',
    };

    const screen = render(
      <LessonResumeScreen
        navigation={navigation as never}
        route={{ key: ROUTES.LessonResumeScreen, name: ROUTES.LessonResumeScreen, params: { checkpoint } } as never}
      />,
    );

    expect(screen.getByText('How are you?')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('Speaking practice')).toBeTruthy();
    fireEvent.press(screen.getByText('Keep going'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.UserSpeakingScreen);
  });

  it('does not promise resume when voice checkpoint is missing', () => {
    const navigation = createNavigation();
    const screen = render(
      <VoiceFailedScreen navigation={navigation as never} route={createRoute(ROUTES.VoiceFailedScreen) as never} />,
    );

    expect(screen.getByText('Robot voice paused')).toBeTruthy();
    expect(screen.getByText('Progress is safe. This activity needs to start again.')).toBeTruthy();
    expect(screen.queryByText('Pick up where we left off')).toBeNull();
  });

  it('renders audio recovery route without navigation errors', () => {
    const recoveryNavigation = createNavigation();
    const recovery = render(
      <AudioRecoveryScreen navigation={recoveryNavigation as never} route={createRoute(ROUTES.AudioRecoveryScreen) as never} />,
    );
    fireEvent.press(recovery.getByText('Back to play area'));
    expect(recoveryNavigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });

  it('routes microphone recovery through help when settings do not resolve the issue', () => {
    const micNavigation = createNavigation();
    const mic = render(
      <MicMissingScreen navigation={micNavigation as never} route={createRoute(ROUTES.MicMissingScreen) as never} />,
    );
    expect(mic.getByText('No recordings are saved. You can come back after the microphone is fixed.')).toBeTruthy();
    fireEvent.press(mic.getByText('Need help?'));
    expect(micNavigation.navigate).toHaveBeenCalledWith(ROUTES.HelpFaqScreen);

    const recoveryNavigation = createNavigation();
    const recovery = render(
      <AudioRecoveryScreen navigation={recoveryNavigation as never} route={createRoute(ROUTES.AudioRecoveryScreen) as never} />,
    );
    fireEvent.press(recovery.getByText('Need help?'));
    expect(recoveryNavigation.navigate).toHaveBeenCalledWith(ROUTES.HelpFaqScreen);
  });

  it('exposes FAQ expanded state and help links to assistive technology', () => {
    const navigation = createNavigation();
    const screen = render(
      <HelpFaqScreen navigation={navigation as never} route={createRoute(ROUTES.HelpFaqScreen) as never} />,
    );

    expect(screen.getByLabelText("FAQ: Is my child's voice recorded?").props.accessibilityState).toEqual({ expanded: true });
    expect(screen.getByLabelText('FAQ: Why does the app need a microphone?').props.accessibilityState).toEqual({ expanded: false });

    fireEvent.press(screen.getByLabelText('FAQ: Why does the app need a microphone?'));

    expect(screen.getByLabelText("FAQ: Is my child's voice recorded?").props.accessibilityState).toEqual({ expanded: false });
    expect(screen.getByLabelText('FAQ: Why does the app need a microphone?').props.accessibilityState).toEqual({ expanded: true });

    fireEvent.press(screen.getByLabelText('Contact support'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SupportScreen);
    expect(screen.getByLabelText('Open user guide')).toBeTruthy();
  });

  it('keeps app-error fallback recoverable even when reset is missing', () => {
    const navigation = createNavigation();
    const screen = render(
      <AppErrorScreen
        navigation={navigation as never}
        route={createRoute(ROUTES.AppErrorScreen) as never}
      />,
    );

    fireEvent.press(screen.getByText('Contact support'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SupportScreen, {
      context: { topic: 'app_error', errorFamily: 'app_error' },
    });
  });

  it('gives safety redirect an explicit back path', () => {
    const navigation = createNavigation();
    const screen = render(
      <SafetyRedirectScreen navigation={navigation as never} route={createRoute(ROUTES.SafetyRedirectScreen) as never} />,
    );

    expect(screen.getByText('Your place is saved. A grown-up can help, or you can take a break.')).toBeTruthy();
    fireEvent.press(screen.getByText('Need help?'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HelpFaqScreen);
    fireEvent.press(screen.getAllByLabelText('Back to home')[0]!);
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });

  it('states reconnecting keeps lesson progress safe while retrying', () => {
    jest.useFakeTimers();
    const navigation = createNavigation();

    const screen = render(
      <ReconnectingOverlay
        navigation={navigation as never}
        route={{
          key: ROUTES.ReconnectingOverlay,
          name: ROUTES.ReconnectingOverlay,
          params: { attempt: 1, maxAttempts: 3 },
        } as never}
      />,
    );

    expect(screen.getByText('Your lesson is still here. You can wait, or stop and go home.')).toBeTruthy();
    jest.useRealTimers();
  });

  it('lets families stop reconnecting without waiting for retry timers', () => {
    jest.useFakeTimers();
    const navigation = createNavigation();

    const screen = render(
      <ReconnectingOverlay
        navigation={navigation as never}
        route={{
          key: ROUTES.ReconnectingOverlay,
          name: ROUTES.ReconnectingOverlay,
          params: { attempt: 1, maxAttempts: 3, failureTarget: ROUTES.HelpFaqScreen },
        } as never}
      />,
    );

    fireEvent.press(screen.getByLabelText('Stop reconnecting and go home'));

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
    jest.useRealTimers();
  });

  it('routes pairing recovery screens to support without trapping the parent', () => {
    const failedNavigation = createNavigation();
    const failed = render(
      <PairFailedScreen navigation={failedNavigation as never} route={createRoute(ROUTES.PairFailedScreen) as never} />,
    );
    fireEvent.press(failed.getByText('Contact support'));
    expect(failedNavigation.navigate).toHaveBeenCalledWith(ROUTES.SupportScreen, {
      context: { topic: 'wifi', errorFamily: 'robot_offline' },
    });

    const offlineNavigation = createNavigation();
    const offline = render(
      <PairOfflineScreen navigation={offlineNavigation as never} route={createRoute(ROUTES.PairOfflineScreen) as never} />,
    );
    fireEvent.press(offline.getByText('Contact support'));
    expect(offlineNavigation.navigate).toHaveBeenCalledWith(ROUTES.SupportScreen, {
      context: { topic: 'wifi', errorFamily: 'robot_offline' },
    });
  });

  it('keeps course lock and sync recovery paths actionable', () => {
    const lockedNavigation = createNavigation();
    const locked = render(
      <CourseLockedScreen
        navigation={lockedNavigation as never}
        route={{ key: ROUTES.CourseLockedScreen, name: ROUTES.CourseLockedScreen, params: { courseId: 'c_stories' } } as never}
      />,
    );
    fireEvent.press(locked.getByText('Contact support'));
    expect(lockedNavigation.navigate).toHaveBeenCalledWith(ROUTES.SupportScreen, {
      context: { topic: 'app_error', errorFamily: 'app_error' },
    });

    const syncNavigation = createNavigation();
    const sync = render(
      <NeedsSyncScreen navigation={syncNavigation as never} route={createRoute(ROUTES.NeedsSyncScreen) as never} />,
    );
    fireEvent.press(sync.getByLabelText('Go back'));
    expect(syncNavigation.navigate).toHaveBeenCalledWith(ROUTES.CourseLibraryScreen);
    fireEvent.press(sync.getByText('Check Robot connection'));
    expect(syncNavigation.navigate).toHaveBeenCalledWith(ROUTES.DeviceHomeScreen);
  });

  it('renders offline banner as non-blocking status chrome', () => {
    let listener: ((state: NetInfoState) => void) | null = null;
    const addEventListener = jest.fn((handler: (state: NetInfoState) => void) => {
      listener = handler;
      return jest.fn();
    });
    jest.spyOn(NetInfo, 'addEventListener').mockImplementation(addEventListener);

    const { getByTestId } = render(<OfflineBanner />);

    act(() => {
      const offlineState: NetInfoNoConnectionState = {
        type: 'none' as NetInfoNoConnectionState['type'],
        isConnected: false,
        isInternetReachable: false,
        details: null,
      };
      listener?.(offlineState);
    });

    const banner = getByTestId('offline-banner');
    expect(banner?.props.pointerEvents).toBe('none');
    expect(banner?.props.accessibilityLiveRegion).toBe('polite');
  });
});
