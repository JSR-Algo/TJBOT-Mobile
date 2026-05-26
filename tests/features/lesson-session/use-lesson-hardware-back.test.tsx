// Lock in the hardware-back funneling from Batch 4:
//   - Android hardware back during an in-lesson voice screen MUST route
//     through ExitConfirmScreen rather than popping the back stack
//     (spec — child must not drop out mid-turn by accident).
//   - The handler must return true so RN does NOT also perform the
//     default back action.
//   - voiceStateBeforeInterruption is propagated so "Keep playing" can
//     resume to the right state.
//
// A regression here would silently re-introduce the audit's MAJOR finding
// "Zero BackHandler usage in lesson-session ... hardware back during
// RobotSpeakingScreen pops the back stack, bypassing ExitConfirm."

import { renderHook } from '@testing-library/react-native';
import { ROUTES } from '../../../src/navigation/routes';

// Capture the registered 'hardwareBackPress' listener so we can fire it
// synchronously. The real BackHandler talks to the native bridge; for a
// unit test we only need to verify our handler's return value + side
// effects, not the bridge wiring.
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

// useFocusEffect: same simplification as the parent-gate-guard test —
// behave as a regular useEffect so the back-handler registration runs.
jest.mock('@react-navigation/native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactInner = require('react') as typeof import('react');
  return {
    useFocusEffect: (cb: () => undefined | (() => void)) => {
      ReactInner.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [cb]);
    },
  };
});

// Imported lazily after mocks so the hook picks up our mocked modules.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useLessonHardwareBack } = require('../../../src/features/lesson-session/hooks/useLessonHardwareBack') as typeof import('../../../src/features/lesson-session/hooks/useLessonHardwareBack');

interface FakeNavigation {
  navigate: jest.Mock;
}

function makeNavigation(): FakeNavigation {
  return { navigate: jest.fn() };
}

describe('useLessonHardwareBack', () => {
  beforeEach(() => {
    backPressListener = null;
  });

  it('registers a hardware-back listener on focus', () => {
    const navigation = makeNavigation();
    renderHook(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLessonHardwareBack(navigation as any, 'LISTENING');
    });
    expect(backPressListener).not.toBeNull();
  });

  it('routes hardware back to ExitConfirmScreen with the captured voice state', () => {
    const navigation = makeNavigation();
    renderHook(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLessonHardwareBack(navigation as any, 'USER_SPEAKING');
    });

    const handled = backPressListener!();

    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.ExitConfirmScreen,
      { voiceStateBeforeInterruption: 'USER_SPEAKING', resumeReason: 'exit_confirm' },
    );
    // Critical: must consume the back press so RN does not also pop.
    expect(handled).toBe(true);
  });

  it('propagates each in-lesson state distinctly', () => {
    for (const voiceState of ['LISTENING', 'USER_SPEAKING', 'ASSISTANT_SPEAKING', 'WAITING_AI'] as const) {
      const navigation = makeNavigation();
      const { unmount } = renderHook(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useLessonHardwareBack(navigation as any, voiceState);
      });
      backPressListener!();
      expect(navigation.navigate).toHaveBeenCalledWith(
        ROUTES.ExitConfirmScreen,
        expect.objectContaining({ voiceStateBeforeInterruption: voiceState }),
      );
      unmount();
    }
  });

  it('cleans up the listener on unmount', () => {
    const navigation = makeNavigation();
    const { unmount } = renderHook(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useLessonHardwareBack(navigation as any, 'LISTENING');
    });
    expect(backPressListener).not.toBeNull();
    unmount();
    expect(backPressListener).toBeNull();
  });
});
