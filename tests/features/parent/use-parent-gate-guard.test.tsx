// Parent PIN is no longer part of the mobile product flow. The guard remains
// as a compatibility hook for existing screens, but it must not redirect.

import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { ParentSessionProvider } from '../../../src/features/parent/context/ParentSessionContext';
import { useParentGateGuard } from '../../../src/features/parent/hooks/useParentGateGuard';
import { ROUTES } from '../../../src/navigation/routes';

// Override useFocusEffect locally — the real implementation needs a
// NavigationContainer that we don't mount here. Treat it as a regular
// useEffect so the callback runs on mount and when deps change.
// (`require` is needed inside jest.mock factories — top-level imports are
// not in scope when the factory runs.)
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

interface FakeNavigation {
  replace: jest.Mock;
}

function makeNavigation(): FakeNavigation {
  return { replace: jest.fn() };
}

const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <ParentSessionProvider>{children}</ParentSessionProvider>
);

describe('useParentGateGuard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-19T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not redirect when the former gate session is stale', () => {
    const navigation = makeNavigation();

    renderHook(
      () => {
        useParentGateGuard(navigation, ROUTES.ParentSummaryScreen);
      },
      { wrapper },
    );

    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('does not redirect any protected parent detail screen through the old PIN gate', () => {
    const navigation = makeNavigation();
    renderHook(
      () => {
        useParentGateGuard(navigation, ROUTES.ParentAccountPrivacyScreen);
      },
      { wrapper },
    );
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('does not require a fresh parent session before showing parent surfaces', () => {
    const navigation = makeNavigation();

    renderHook(
      () => {
        useParentGateGuard(navigation, ROUTES.ParentSummaryScreen);
      },
      { wrapper },
    );

    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
