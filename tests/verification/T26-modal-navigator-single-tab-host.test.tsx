import React from 'react';
import { render } from '@testing-library/react-native';
import { ROUTES } from '@/navigation/routes';

const mockCapturedMainTabProps: Array<{
  initialTabName?: string;
  initialRouteName?: string;
  initialRouteParams?: unknown;
}> = [];

jest.mock('@/navigation/MainTabNavigator', () => {
  const actual = jest.requireActual('@/navigation/MainTabNavigator');
  return {
    ...actual,
    MainTabNavigator: (props: {
      initialTabName?: string;
      initialRouteName?: string;
      initialRouteParams?: unknown;
    }): React.JSX.Element => {
      mockCapturedMainTabProps.push(props);
      return actual.MainTabNavigator(props);
    },
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => {
    const ReactNative = require('react-native');
    const React = require('react');

    return {
      Navigator: ({ children }: { children: React.ReactNode }): React.JSX.Element =>
        React.createElement(ReactNative.View, { testID: 'protectedStackNavigator' }, children),
      Screen: ({
        name,
        component: Component,
        children,
      }: {
        name: string;
        component?: React.ComponentType;
        children?: React.ReactNode;
      }): React.JSX.Element | null => {
        if (children) {
          return React.createElement(ReactNative.View, { testID: `screen-${name}` }, children);
        }
        if (Component) {
          return React.createElement(
            ReactNative.View,
            { testID: `screen-${name}` },
            React.createElement(Component),
          );
        }
        return null;
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
