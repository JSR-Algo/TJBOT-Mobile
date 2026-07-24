import React from 'react';
import { render } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';

const mockCapturedShellProps: Array<{
  routeName?: string;
}> = [];
const mockCapturedInitialParams: Array<{ name: string; params: unknown }> = [];

type MockNavigation = {
  navigate: jest.Mock;
  goBack: jest.Mock;
  replace: jest.Mock;
  push: jest.Mock;
  pop: jest.Mock;
  popToTop: jest.Mock;
  dispatch: jest.Mock;
  setParams: jest.Mock;
  setOptions: jest.Mock;
  addListener: jest.Mock;
  removeListener: jest.Mock;
  isFocused: jest.Mock;
  canGoBack: jest.Mock;
  getId: jest.Mock;
  getParent: jest.Mock;
  getState: jest.Mock;
};

jest.mock('@/navigation/MainTabNavigator', () => {
  const React = require('react');
  const ReactNative = require('react-native');
  return {
    MainTabNavigator: ({
      children,
      routeName,
    }: {
      children?: React.ReactNode;
      routeName?: string;
    }): React.JSX.Element => {
      mockCapturedShellProps.push({ routeName });
      return React.createElement(ReactNative.View, { testID: 'mainTabs' }, children);
    },
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => {
    const ReactNative = require('react-native');
    const React = require('react');

    const createNavigation = (): MockNavigation => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
      push: jest.fn(),
      pop: jest.fn(),
      popToTop: jest.fn(),
      dispatch: jest.fn(),
      setParams: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      removeListener: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => true),
      getId: jest.fn(),
      getParent: jest.fn(),
      getState: jest.fn(),
    });

    let currentInitialRouteName: string | undefined;
    let currentScreenLayout:
      | ((props: {
          children: React.ReactElement;
          navigation: MockNavigation;
          route: { key: string; name: string; params: unknown };
        }) => React.ReactElement)
      | undefined;

    return {
      Navigator: ({
        children,
        initialRouteName,
        screenLayout,
      }: {
        children: React.ReactNode;
        initialRouteName?: string;
        screenLayout?: typeof currentScreenLayout;
      }): React.JSX.Element => {
        currentInitialRouteName = initialRouteName;
        currentScreenLayout = screenLayout;
        return React.createElement(ReactNative.View, { testID: 'protectedStackNavigator' }, children);
      },
      Group: ({ children }: { children: React.ReactNode }): React.JSX.Element =>
        React.createElement(ReactNative.View, { testID: 'modalGroup' }, children),
      Screen: ({
        name,
        initialParams,
      }: {
        name: string;
        component?: React.ComponentType;
        initialParams?: Record<string, unknown>;
      }): React.JSX.Element | null => {
        if (name !== currentInitialRouteName) return null;
        const navigation = createNavigation();
        const route = { key: `screen-${name}`, name, params: initialParams };
        mockCapturedInitialParams.push({ name, params: initialParams });
        const page = React.createElement(ReactNative.View, { testID: `page-${name}` });
        return currentScreenLayout
          ? currentScreenLayout({ children: page, navigation, route })
          : page;
      },
    };
  },
}));

import { ModalNavigator } from '@/navigation/ModalNavigator';

describe('T26 ModalNavigator single shared shell', () => {
  beforeEach(() => {
    mockCapturedShellProps.length = 0;
    mockCapturedInitialParams.length = 0;
  });

  it('renders exactly one shared shell for a tab root entry', () => {
    const screen = render(<ModalNavigator initialRouteName={ROUTES.HomeHubScreen} />);

    expect(screen.getAllByTestId('mainTabs')).toHaveLength(1);
    expect(mockCapturedShellProps).toEqual([{ routeName: ROUTES.HomeHubScreen }]);
  });

  it('renders the same shell for a non-tab direct deep-link entry', () => {
    const screen = render(<ModalNavigator initialRouteName={ROUTES.CourseLockedScreen} />);

    expect(screen.getAllByTestId('mainTabs')).toHaveLength(1);
    expect(screen.getByTestId(`page-${ROUTES.CourseLockedScreen}`)).toBeTruthy();
    expect(mockCapturedShellProps).toEqual([{ routeName: ROUTES.CourseLockedScreen }]);
  });

  it('preserves direct-entry route params while applying the shell', () => {
    render(
      <ModalNavigator
        initialRouteName={ROUTES.DeviceHomeScreen}
        initialRouteParams={{ deviceId: 'device-1' }}
      />,
    );

    expect(mockCapturedShellProps).toEqual([{ routeName: ROUTES.DeviceHomeScreen }]);
    expect(mockCapturedInitialParams).toEqual([
      { name: ROUTES.DeviceHomeScreen, params: { deviceId: 'device-1' } },
    ]);
  });
});
