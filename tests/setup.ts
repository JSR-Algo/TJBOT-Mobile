// Unit tests default to the normal app path. Investor-demo mode is exercised by
// dedicated tests that mock the flag explicitly.
process.env.EXPO_PUBLIC_INVESTOR_DEMO = 'false';

// Silence React Navigation warnings in tests
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
    }),
    useRoute: () => ({ params: {} }),
    NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  }),
  CardStyleInterpolators: {},
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  PanGestureHandler: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  const LinearGradient = (props: Record<string, unknown>) => React.createElement(View, props);
  return { LinearGradient };
});

// Inline manual mock for react-native-reanimated (the package's own /mock
// entry uses ES imports that jest can't transform). No-ops everything.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const View = (props: Record<string, unknown>) =>
    React.createElement('View', props);
  const id = <T,>(v: T): T => v;
  const noop = (): void => {};
  const useSharedValue = <T,>(v: T): { value: T } => ({ value: v });
  const useAnimatedStyle = (): Record<string, unknown> => ({});
  const useAnimatedReaction = noop;
  const useDerivedValue = useSharedValue;
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    View,
    Text: (props: Record<string, unknown>) => React.createElement('Text', props),
    Image: (props: Record<string, unknown>) =>
      React.createElement('Image', props),
    ScrollView: (props: Record<string, unknown>) =>
      React.createElement('ScrollView', props),
    createAnimatedComponent: (c: unknown) => c,
    useSharedValue,
    useAnimatedStyle,
    useAnimatedReaction,
    useDerivedValue,
    useAnimatedRef: () => ({ current: null }),
    useAnimatedScrollHandler: () => noop,
    withTiming: id,
    withSpring: id,
    withDelay: (_: number, x: unknown) => x,
    withRepeat: (x: unknown) => x,
    withSequence: id,
    runOnJS: (fn: (...a: unknown[]) => unknown) => fn,
    runOnUI: (fn: (...a: unknown[]) => unknown) => fn,
    Easing: {
      linear: noop, ease: noop, in: () => noop, out: () => noop, inOut: () => noop,
      bezier: () => noop, quad: noop, cubic: noop, sin: noop, exp: noop, back: noop,
    },
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    interpolate: (v: number) => v,
    interpolateColor: () => '#000',
  };
});

// react-native-svg components — render as plain Text/View so screens with
// inline SVG illustrations mount cleanly in jsdom. Avoids native-bridge
// requirements for Path/Circle/etc.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const stub = (name: string) => (props: Record<string, unknown>) =>
    React.createElement('Text', { testID: `svg-${name}`, ...props });
  return new Proxy(
    { __esModule: true, default: stub('Svg') },
    {
      get: (_t, prop: string) => {
        if (prop === '__esModule') return true;
        if (prop === 'default') return stub('Svg');
        return stub(prop);
      },
    }
  );
});

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
}));

jest.mock('lucide-react-native', () => {
  // jest.mock factory runs before top-level imports resolve, so require() is the
  // only portable way to grab React here.
  const React = require('react');
  const makeIcon = (name: string) => (props: Record<string, unknown>) =>
    React.createElement('Text', { testID: `icon-${name}`, ...props });
  const namedIcons = {
    BookOpen: makeIcon('BookOpen'),
    Bot: makeIcon('Bot'),
    Home: makeIcon('Home'),
    TrendingUp: makeIcon('TrendingUp'),
    User: makeIcon('User'),
  };
  return new Proxy(
    { __esModule: true, ...namedIcons },
    {
      get: (_target, prop: string) => {
        if (prop === '__esModule') return true;
        if (typeof prop !== 'string') return undefined;
        if (prop in namedIcons) return namedIcons[prop as keyof typeof namedIcons];
        return makeIcon(prop);
      },
      has: () => true,
    },
  );
});

export const mockToastShow = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    identify: jest.fn(),
    capture: jest.fn(),
    reset: jest.fn(),
  },
}));

jest.mock('../src/components/Toast', () => ({
  useToast: () => ({ show: mockToastShow }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));
