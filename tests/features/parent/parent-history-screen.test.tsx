// Mirrors parent-summary-screen.test.tsx — ParentHistoryScreen had the
// same success-stays-loading bug pattern (caught + fixed in Batch 6).
// The original useEffect never set a 'success' state, leaving the UI
// pinned at "Loading history" forever after a successful response.

import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { ParentSessionProvider } from '../../../src/features/parent/context/ParentSessionContext';

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

jest.mock('../../../src/features/parent/hooks/useParentGateGuard', () => ({
  useParentGateGuard: () => undefined,
}));

const mockGetParentHistory = jest.fn();
jest.mock('../../../src/services/api/parent.api', () => ({
  getParentHistory: () => mockGetParentHistory(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ParentHistoryScreen = require('../../../src/features/parent/screens/ParentHistoryScreen').default;

function renderScreen() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  const route = { key: 'h', name: 'ParentHistoryScreen', params: undefined };
  return render(
    <ParentSessionProvider>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ParentHistoryScreen navigation={navigation as any} route={route as any} />
    </ParentSessionProvider>,
  );
}

describe('ParentHistoryScreen', () => {
  beforeEach(() => {
    mockGetParentHistory.mockReset();
  });

  it('does not stay stuck on the loading message after a successful fetch', async () => {
    mockGetParentHistory.mockResolvedValueOnce([{ date: '2026-05-18', minutes: 5 }]);

    const { queryByText } = renderScreen();

    await waitFor(() => {
      expect(queryByText('Loading history')).toBeNull();
    });

    // No failure copy either — success branch is now properly handled.
    expect(queryByText('History unavailable')).toBeNull();
    expect(queryByText('Retry')).toBeNull();
  });

  it('renders the retry affordance when the API call rejects', async () => {
    mockGetParentHistory.mockRejectedValueOnce(Object.assign(new Error('network'), { isAxiosError: true }));
    const { findByText, queryByText } = renderScreen();
    await findByText('Retry');
    expect(queryByText('Loading history')).toBeNull();
  });

  it('shows loading copy while the API is in flight', async () => {
    let resolveIt: ((v: unknown) => void) | null = null;
    mockGetParentHistory.mockImplementationOnce(
      () => new Promise(res => { resolveIt = res; }),
    );

    const { queryByText } = renderScreen();
    expect(queryByText('Loading history')).not.toBeNull();

    await act(async () => { resolveIt!([]); });
    await waitFor(() => {
      expect(queryByText('Loading history')).toBeNull();
    });
  });
});
