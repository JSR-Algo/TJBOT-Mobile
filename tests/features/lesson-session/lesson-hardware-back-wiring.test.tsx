// MOB-2 regression guard: the hardware-back confirm-gate must be LIVE in the
// shipped in-lesson screens, not just unit-tested on the hook in isolation.
// Mount each screen, fire the Android hardwareBackPress, and assert it routes
// to ExitConfirmScreen (carrying the screen's resume token) instead of popping
// the back stack.
//
// Audit finding this locks down: "Zero BackHandler usage in lesson-session ...
// hardware back during RobotSpeakingScreen pops the back stack, bypassing
// ExitConfirm." The hook existed but had no consumers.
//
// T3.2 extends the guard from the four voice screens to EVERY screen where the
// lesson is still live (LIVE_LESSON_SCREENS), and adds the negative half: a
// terminal screen must NOT swallow back — leaving a finished lesson is the
// expected return-to-home path, and confirming an exit from a session that has
// already ended is a dead end.

import React from 'react';
import { render } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';
import {
  LESSON_RESUME_TOKEN_BY_SCREEN,
  LIVE_LESSON_SCREENS,
  TERMINAL_LESSON_SCREENS,
} from '@/features/lesson-session/stateProjection';

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

function componentName(screenId: string): string {
  return `${screenId.replace(/(^|_)(\w)/g, (_match, _sep, char: string) => char.toUpperCase())}Screen`;
}

// Imported after the mocks so the screens pick up the mocked BackHandler.
function loadScreen(screenId: string): VoiceScreen {

  return require(`@/features/lesson-session/screens/${componentName(screenId)}`).default as VoiceScreen;
}

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

// The screens share a (navigation, route) prop shape; type them loosely so the
// test can mount any of them without per-screen prop generics.
type VoiceScreen = React.ComponentType<{ navigation: unknown; route: unknown }>;

describe('MOB-2 / T3.2 — hardware-back confirm-gate covers every live lesson screen', () => {
  beforeEach(() => {
    backPressListener = null;
    jest.useFakeTimers(); // ThinkingScreen schedules a setTimeout navigation
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const cases = LIVE_LESSON_SCREENS.map(screenId => ({
    screenId,
    route: componentName(screenId),
    token: LESSON_RESUME_TOKEN_BY_SCREEN[screenId],
  }));

  it('covers all 14 live screens (nothing silently dropped from the table)', () => {
    expect(cases).toHaveLength(14);
    expect(cases.every(entry => typeof entry.token === 'string' && entry.token.length > 0)).toBe(true);
  });

  it.each(cases)('$route routes hardware-back to ExitConfirm with token $token', ({ screenId, route, token }) => {
    const Screen = loadScreen(screenId);
    const navigation = navigationFor();
    render(<Screen navigation={navigation} route={routeFor(route)} />);

    // The screen mounted the guard, so a hardware-back listener is registered.
    expect(backPressListener).not.toBeNull();

    const handled = backPressListener!();

    // Consumed (no default pop) and funneled through ExitConfirm.
    expect(handled).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.ExitConfirmScreen,
      { voiceStateBeforeInterruption: token, resumeReason: 'exit_confirm' },
    );
  });

  it.each(TERMINAL_LESSON_SCREENS.map(screenId => ({ screenId, route: componentName(screenId) })))(
    '$route does NOT swallow hardware-back (terminal, direct exit)',
    ({ screenId, route }) => {
      const Screen = loadScreen(screenId);
      const navigation = navigationFor();
      render(<Screen navigation={navigation} route={routeFor(route)} />);

      expect(backPressListener).toBeNull();
      expect(navigation.navigate).not.toHaveBeenCalledWith(
        ROUTES.ExitConfirmScreen,
        expect.anything(),
      );
    },
  );

  it('ExitConfirm itself does not re-enter the confirm gate', () => {
    const Screen = loadScreen('exit_confirm');
    const navigation = navigationFor();
    render(<Screen navigation={navigation} route={routeFor(ROUTES.ExitConfirmScreen)} />);

    expect(backPressListener).toBeNull();
  });
});
