// Lock in the success-branch fix from Batch 1:
//   - When `getParentSummary` resolves, the screen MUST move to a
//     'success' state and NOT render the "Parent summary unavailable"
//     failure copy.
//
// This regression would have re-introduced the audit's CRITICAL finding
// "ParentSummaryScreen flips successful API response to failure state —
// child screen never renders real data even when API returns 200".

import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { ParentSessionProvider } from '../../../src/features/parent/context/ParentSessionContext';

// Treat useFocusEffect as useEffect so the load runs on mount without a
// real NavigationContainer mounted.
jest.mock('@react-navigation/native', () => {
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

// Disable the parent-gate guard for this test — we are exercising the
// API/render path, not the gate behaviour. Guard behaviour has its own
// dedicated test (use-parent-gate-guard.test.tsx).
jest.mock('../../../src/features/parent/hooks/useParentGateGuard', () => ({
  useParentGateGuard: () => undefined,
}));

const mockGetParentSummary = jest.fn();
jest.mock('../../../src/services/api/parent.api', () => ({
  getParentSummary: () => mockGetParentSummary(),
}));

// Imported after mocks so the screen module picks up the mocked seams.
const ParentSummaryScreen = require('../../../src/features/parent/screens/ParentSummaryScreen').default;

function fakeNavigation() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
  };
}

function fakeRoute() {
  return { key: 'p', name: 'ParentSummaryScreen', params: undefined };
}

function renderScreen() {
  const navigation = fakeNavigation() as any;
  const route = fakeRoute() as any;
  return render(
    <ParentSessionProvider>
      <ParentSummaryScreen navigation={navigation} route={route} />
    </ParentSessionProvider>,
  );
}

describe('ParentSummaryScreen', () => {
  beforeEach(() => {
    mockGetParentSummary.mockReset();
  });

  it('does not render the failure copy when the API call succeeds', async () => {
    mockGetParentSummary.mockResolvedValueOnce({ today: { lessonsCompleted: 2 } });

    const { queryByText } = renderScreen();

    // Wait until the load has resolved — the loading message should be gone
    // and the failure message must NEVER have appeared.
    await waitFor(() => {
      expect(queryByText('Loading parent summary')).toBeNull();
    });

    expect(queryByText('Parent summary unavailable')).toBeNull();
    expect(queryByText('Try again.')).toBeNull();
    expect(queryByText('Parent summary offline')).toBeNull();
  });

  it('renders the failure copy with retry when the API call rejects', async () => {
    mockGetParentSummary.mockRejectedValueOnce(Object.assign(new Error('network'), { isAxiosError: true }));

    const { queryByText, findByText } = renderScreen();

    // Should land on a failure title — exact wording varies by error
    // classification, but the retry button is the load-bearing affordance.
    await findByText('Retry');

    // Loading should also be gone by this point.
    expect(queryByText('Loading parent summary')).toBeNull();
  });

  it('eventually clears the loading message after a successful fetch', async () => {
    let resolveIt: ((v: unknown) => void) | null = null;
    mockGetParentSummary.mockImplementationOnce(
      () => new Promise(res => { resolveIt = res; }),
    );

    const { queryByText } = renderScreen();

    // Mid-flight: loading is shown.
    expect(queryByText('Loading parent summary')).not.toBeNull();

    await act(async () => {
      resolveIt!({ ok: true });
    });

    await waitFor(() => {
      expect(queryByText('Loading parent summary')).toBeNull();
    });

    // After load, neither loading nor failure copy is on screen.
    expect(queryByText('Parent summary unavailable')).toBeNull();
  });
});
