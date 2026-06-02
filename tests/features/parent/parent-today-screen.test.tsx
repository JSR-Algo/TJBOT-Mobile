// Mirrors parent-summary-screen.test.tsx — same audit-CRITICAL fix
// applied in Batch 1: ParentTodayScreen used to flip a successful API
// response to the failure-copy state. Lock in the corrected branching.

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

const mockGetParentToday = jest.fn();
jest.mock('../../../src/services/api/parent.api', () => ({
  getParentToday: () => mockGetParentToday(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ParentTodayScreen = require('../../../src/features/parent/screens/ParentTodayScreen').default;

function renderScreen() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  const route = { key: 't', name: 'ParentTodayScreen', params: undefined };
  return render(
    <ParentSessionProvider>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ParentTodayScreen navigation={navigation as any} route={route as any} />
    </ParentSessionProvider>,
  );
}

describe('ParentTodayScreen', () => {
  beforeEach(() => {
    mockGetParentToday.mockReset();
  });

  it('does not render the failure copy when the API call succeeds', async () => {
    mockGetParentToday.mockResolvedValueOnce({ minutes: 12 });

    const { queryByText } = renderScreen();

    await waitFor(() => {
      expect(queryByText("Loading today's progress")).toBeNull();
    });

    expect(queryByText('Today summary unavailable')).toBeNull();
    expect(queryByText('Try again.')).toBeNull();
    expect(queryByText('Today summary offline')).toBeNull();
  });

  it('renders the retry affordance when the API call rejects', async () => {
    mockGetParentToday.mockRejectedValueOnce(Object.assign(new Error('network'), { isAxiosError: true }));
    const { findByText, queryByText } = renderScreen();
    await findByText('Retry');
    expect(queryByText("Loading today's progress")).toBeNull();
  });

  it('clears the loading message after a successful fetch', async () => {
    let resolveIt: ((v: unknown) => void) | null = null;
    mockGetParentToday.mockImplementationOnce(
      () => new Promise(res => { resolveIt = res; }),
    );

    const { queryByText } = renderScreen();
    expect(queryByText("Loading today's progress")).not.toBeNull();

    await act(async () => { resolveIt!({ ok: true }); });
    await waitFor(() => {
      expect(queryByText("Loading today's progress")).toBeNull();
    });
  });
});
