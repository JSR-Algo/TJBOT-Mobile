import React from 'react';
import { render } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';

const mockCapturedMainTabProps: Array<{
  initialTabName?: string;
  initialRouteName?: string;
  initialRouteParams?: unknown;
}> = [];

jest.mock('@/navigation/MainTabNavigator', () => {
  const React = require('react');
  const ReactNative = require('react-native');
  return {
    MainTabNavigator: (props: {
      initialTabName?: string;
      initialRouteName?: string;
      initialRouteParams?: unknown;
    }): React.JSX.Element => {
      mockCapturedMainTabProps.push(props);
      return React.createElement(ReactNative.View, { testID: 'mainTabs' });
    },
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => {
    const ReactNative = require('react-native');
    const React = require('react');

    const createNavigation = () => ({
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

    return {
      Navigator: ({
        children,
        initialRouteName,
      }: {
        children: React.ReactNode;
        initialRouteName?: string;
      }): React.JSX.Element => {
        currentInitialRouteName = initialRouteName;
        return React.createElement(ReactNative.View, { testID: 'protectedStackNavigator' }, children);
      },
      Group: ({ children }: { children: React.ReactNode }): React.JSX.Element =>
        React.createElement(ReactNative.View, { testID: 'modalGroup' }, children),
      Screen: ({
        name,
        children,
      }: {
        name: string;
        component?: React.ComponentType;
        children?: React.ReactNode | ((props: { navigation: unknown; route: unknown }) => React.ReactNode);
        initialParams?: Record<string, unknown>;
      }): React.JSX.Element | null => {
        const navigation = createNavigation();
        const route = { key: `screen-${name}`, name, params: {} };
        const isActive = name === currentInitialRouteName;

        if (typeof children === 'function') {
          return React.createElement(
            ReactNative.View,
            { testID: `screen-${name}` },
            isActive ? children({ navigation, route }) : null,
          );
        }
        if (children) {
          return React.createElement(ReactNative.View, { testID: `screen-${name}` }, isActive ? children : null);
        }
        return React.createElement(ReactNative.View, { testID: `screen-${name}` });
      },
    };
  },
}));

import { ModalNavigator } from '@/navigation/ModalNavigator';

describe('T26 ModalNavigator single tab host', () => {
  beforeEach(() => {
    mockCapturedMainTabProps.length = 0;
  });

  it('renders exactly one MainTabNavigator host regardless of entry route', () => {
    const screen = render(<ModalNavigator initialRouteName={ROUTES.HomeHubScreen} />);

    expect(screen.getAllByTestId('mainTabs')).toHaveLength(1);
    expect(mockCapturedMainTabProps).toHaveLength(1);
  });

  it('selects the active tab from the entry route params on deep-link entry', () => {
    render(
      <ModalNavigator
        initialRouteName={ROUTES.DeviceHomeScreen}
        initialRouteParams={{ deviceId: 'device-1' }}
      />,
    );

    expect(mockCapturedMainTabProps).toHaveLength(1);
    expect(mockCapturedMainTabProps[0].initialTabName).toBe('Devices');
  });

  it('preserves non-tab route params for the single host', () => {
    render(
      <ModalNavigator
        initialRouteName={ROUTES.DeviceHomeScreen}
        initialRouteParams={{ deviceId: 'device-1' }}
      />,
    );

    expect(mockCapturedMainTabProps).toHaveLength(1);
    expect(mockCapturedMainTabProps[0].initialRouteParams).toEqual({ deviceId: 'device-1' });
  });
});
