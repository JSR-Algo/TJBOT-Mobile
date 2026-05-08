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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const makeIcon = (name: string) => (props: Record<string, unknown>) =>
    React.createElement('Text', { testID: `icon-${name}`, ...props });
  return new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === '__esModule') return true;
        if (typeof prop !== 'string') return undefined;
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
