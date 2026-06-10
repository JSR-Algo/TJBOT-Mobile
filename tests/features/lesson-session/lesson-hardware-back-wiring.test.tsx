// MOB-2 regression guard: the hardware-back confirm-gate must be LIVE in the
// shipped in-lesson voice screens, not just unit-tested on the hook in
// isolation. Mount each active voice screen, fire the Android hardwareBackPress,
// and assert it routes to ExitConfirmScreen (carrying the screen's voice state)
// instead of popping the back stack.
//
// Audit finding this locks down: "Zero BackHandler usage in lesson-session ...
// hardware back during RobotSpeakingScreen pops the back stack, bypassing
// ExitConfirm." The hook existed but had no consumers.

import React from 'react';
import { render } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';

// Capture the registered 'hardwareBackPress' listener so we can fire it.
let backPressListener: (() => boolean) | null = null;

jest.mock('react-native/Libraries/Utilities/BackHandler', () => ({
  __esModule: true,
  default: {
    addEventListener: (event: string, cb: () => boolean) => {
      if (event === 'hardwareBackPress') {
        backPressListener = cb;
      }
      return {
        remove: () => {
          backPressListener = null;
        },
      };
    },
  },
}));

// Imported after the mocks so the screens pick up the mocked BackHandler.
 
const RobotSpeakingScreen = require('@/features/lesson-session/screens/RobotSpeakingScreen').default;
 
const RobotListeningScreen = require('@/features/lesson-session/screens/RobotListeningScreen').default;
 
const UserSpeakingScreen = require('@/features/lesson-session/screens/UserSpeakingScreen').default;
 
const ThinkingScreen = require('@/features/lesson-session/screens/ThinkingScreen').default;

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

function routeFor(name: string) {
  return { key: name, name, params: {} };
}

// The four screens share a (navigation, route) prop shape; type them loosely so
// the test can mount any of them without per-screen prop generics.
type VoiceScreen = React.ComponentType<{ navigation: unknown; route: unknown }>;

describe('MOB-2 — hardware-back confirm-gate is wired into in-lesson voice screens', () => {
  beforeEach(() => {
    backPressListener = null;
    jest.useFakeTimers(); // ThinkingScreen schedules a setTimeout navigation
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const cases: Array<{ name: string; Screen: VoiceScreen; voiceState: string }> = [
    { name: ROUTES.RobotSpeakingScreen, Screen: RobotSpeakingScreen as VoiceScreen, voiceState: 'ASSISTANT_SPEAKING' },
    { name: ROUTES.RobotListeningScreen, Screen: RobotListeningScreen as VoiceScreen, voiceState: 'LISTENING' },
    { name: ROUTES.UserSpeakingScreen, Screen: UserSpeakingScreen as VoiceScreen, voiceState: 'USER_SPEAKING' },
    { name: ROUTES.ThinkingScreen, Screen: ThinkingScreen as VoiceScreen, voiceState: 'WAITING_AI' },
  ];

  it.each(cases)('$name routes hardware-back to ExitConfirm with its voice state', ({ name, Screen, voiceState }) => {
    const navigation = navigationFor();
    render(<Screen navigation={navigation} route={routeFor(name)} />);

    // The screen mounted the guard, so a hardware-back listener is registered.
    expect(backPressListener).not.toBeNull();

    const handled = backPressListener!();

    // Consumed (no default pop) and funneled through ExitConfirm.
    expect(handled).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.ExitConfirmScreen,
      { voiceStateBeforeInterruption: voiceState, resumeReason: 'exit_confirm' },
    );
  });
});
