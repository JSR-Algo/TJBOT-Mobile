import React from 'react';
import { DevSettings } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { RootErrorBoundary } from '../../src/services/observability/RootErrorBoundary';

jest.mock('react-native', () => {
  const reactNative = jest.requireActual('react-native');
  return Object.defineProperty(Object.create(reactNative), 'DevSettings', {
    value: { reload: jest.fn() },
  });
});

function Thrower(): React.JSX.Element {
  throw new Error('boom');
}

describe('RootErrorBoundary', () => {
  let reloadSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    // DevSettings.reload is provided by the react-native jest preset as a stub;
    // we spy to capture the call instead of jest.mock'ing the full module
    // (which triggers TurboModule native loading).
    reloadSpy = jest.spyOn(DevSettings, 'reload').mockImplementation(() => undefined);
    // React logs error-boundary catches to console.error; silence during test.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    try {
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    } finally {
      reloadSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }
  });

  it('renders fallback and restarts the app', () => {
    const { getByText, getByTestId } = render(
      <RootErrorBoundary>
        <Thrower />
      </RootErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    fireEvent.press(getByTestId('root-error-boundary-restart'));
    expect(reloadSpy).toHaveBeenCalled();
  });
});
