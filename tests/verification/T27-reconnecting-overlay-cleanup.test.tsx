import React from 'react';
import { act, render } from '@testing-library/react-native';
import ReconnectingOverlay from '@/features/fallback/ReconnectingOverlay';
import { ROUTES } from '@/navigation/routes';

type BeforeRemoveCallback = (event: { preventDefault: () => void }) => void;

function createNavigation() {
  const listeners: Record<string, BeforeRemoveCallback[]> = {};
  const navigate = jest.fn();

  return {
    navigate,
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
    addListener: jest.fn((event: string, callback: BeforeRemoveCallback) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(callback);
      return jest.fn(() => {
        listeners[event] = listeners[event].filter(cb => cb !== callback);
      });
    }),
    removeListener: jest.fn(),
    emitBeforeRemove: () => {
      listeners.beforeRemove?.forEach(cb => cb({ preventDefault: jest.fn() }));
    },
  };
}

function createRoute(params: Record<string, unknown>) {
  return {
    key: ROUTES.ReconnectingOverlay,
    name: ROUTES.ReconnectingOverlay,
    params,
  };
}

describe('T27: ReconnectingOverlay timeout cleanup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers a beforeRemove listener on mount', () => {
    const navigation = createNavigation();
    const route = createRoute({ attempt: 1, maxAttempts: 3, failureTarget: ROUTES.HelpFaqScreen });

    render(
      <ReconnectingOverlay navigation={navigation as never} route={route as never} />,
    );

    expect(navigation.addListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));
  });

  it('does not navigate if the screen is removed before the timeout fires', () => {
    const navigation = createNavigation();
    const route = createRoute({ attempt: 3, maxAttempts: 3, failureTarget: ROUTES.HomeHubScreen });

    const screen = render(
      <ReconnectingOverlay navigation={navigation as never} route={route as never} />,
    );

    expect(navigation.addListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));

    act(() => {
      navigation.emitBeforeRemove();
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(navigation.navigate).not.toHaveBeenCalled();

    screen.unmount();
  });

  it('preserves the happy-path navigation when the timeout is allowed to fire', () => {
    const navigation = createNavigation();
    const route = createRoute({ attempt: 3, maxAttempts: 3, failureTarget: ROUTES.HomeHubScreen });

    render(
      <ReconnectingOverlay navigation={navigation as never} route={route as never} />,
    );

    act(() => {
      jest.advanceTimersByTime(2400);
    });

    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.HomeHubScreen);
  });
});
