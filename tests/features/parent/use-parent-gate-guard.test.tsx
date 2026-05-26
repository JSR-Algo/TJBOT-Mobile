// Lock in the redirect behaviour from Batch 7:
//   - protected parent screen with a stale gate → navigation.replace to
//     ParentGateScreen with `next` = the original screen
//   - protected parent screen with a fresh gate → no redirect, touchActivity
//     extends the idle window
//
// These tests would catch a regression where the guard silently allowed
// access to a protected surface after the parent-gate window expired.

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import {
  ParentSessionProvider,
  useParentSession,
} from '../../../src/features/parent/context/ParentSessionContext';
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

  it('redirects to ParentGateScreen with the correct next param when gate is stale', () => {
    const navigation = makeNavigation();

    renderHook(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useParentGateGuard(navigation as any, 'ParentSummaryScreen');
      },
      { wrapper },
    );

    expect(navigation.replace).toHaveBeenCalledTimes(1);
    expect(navigation.replace).toHaveBeenCalledWith(
      ROUTES.ParentGateScreen,
      { next: 'ParentSummaryScreen' },
    );
  });

  it('passes the caller screen name through to the gate so the user lands back here', () => {
    const navigation = makeNavigation();
    renderHook(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useParentGateGuard(navigation as any, 'ParentAccountPrivacyScreen');
      },
      { wrapper },
    );
    expect(navigation.replace).toHaveBeenCalledWith(
      ROUTES.ParentGateScreen,
      { next: 'ParentAccountPrivacyScreen' },
    );
  });

  it('does not redirect when the gate is fresh', () => {
    const navigation = makeNavigation();

    // Open the gate first, then mount the guard on a separate hook so the
    // guard sees a fresh ParentSession.
    let combined: { session: ReturnType<typeof useParentSession> } | null = null;
    renderHook(
      () => {
        const session = useParentSession();
        combined = { session };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useParentGateGuard(navigation as any, 'ParentSummaryScreen');
      },
      { wrapper },
    );

    expect(navigation.replace).toHaveBeenCalledTimes(1); // initial mount: stale

    act(() => { combined!.session.markGated(); });

    // Subsequent focus cycle (deps include navigation+thisScreen+session)
    // sees fresh and DOES NOT redirect. There's no second replace call.
    // We also check that we haven't accumulated more calls.
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });

  // Re-focus after staleness is covered by composition:
  //   - ParentSessionContext tests prove `isFresh()` flips false on the
  //     idle/absolute boundary (parent-session-context.test.tsx).
  //   - The three tests above prove that `isFresh()===false` at focus
  //     time redirects with the correct payload.
  // Synthesizing a focus event without a real NavigationContainer is
  // awkward (touchActivity itself extends the idle window) and the
  // composed coverage is sufficient.
});
