/**
 * Regression test for the 2026-05-03 onboarding cold-start race.
 *
 * Bug B2 (.omc/plans/2026-05-03-mobile-onboarding-network-error-fix.md):
 * HouseholdContext useEffect at HouseholdContext.tsx:110-127 used to call
 * clearOnboardingCompleteStore() whenever isAuthenticated === false, which
 * fires during the brief cold-start window where AuthContext has not yet
 * finished hydrating SecureStore. That wiped the persisted
 * onboarding_complete_v1 flag and bounced returning users back into
 * OnboardingStack on every launch.
 *
 * This test asserts:
 *  1. Mid-hydration (authLoading=true) — destructive clear is NOT called
 *  2. Post-hydration with isAuthenticated=true — persisted flag survives
 *  3. Real logout (authLoading=false, isAuthenticated=false) — flag IS cleared
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// The expo-secure-store mock at tests/__mocks__/expo-secure-store.ts exposes
// these as jest.fn()s; cast for the per-test mock-state inspection below.
const SecureStoreMock = SecureStore as unknown as {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};

afterEach(() => {
  SecureStoreMock.deleteItemAsync.mockClear();
  SecureStoreMock.setItemAsync.mockClear();
  SecureStoreMock.getItemAsync.mockClear();
});

// Controllable AuthContext stub. The HouseholdProvider only consumes
// { isAuthenticated, isLoading } from useAuth, so we can satisfy the
// contract without standing up the real AuthProvider tree.
const authState = {
  isAuthenticated: false,
  isLoading: true,
};
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Stub the households API so refresh() doesn't try to make a real HTTP call
// when isAuthenticated flips true. Default: empty list (returning user with
// stale local cache scenario; persisted flag should still survive because
// refresh's catch branch never flips onboardingComplete=false).
const mockList = jest.fn();
const mockListChildren = jest.fn();
jest.mock('../../src/api/households', () => ({
  list: () => mockList(),
  listChildren: () => mockListChildren(),
  create: jest.fn(),
  addChild: jest.fn(),
  get: jest.fn(),
}));

import { HouseholdProvider, useHousehold } from '../../src/contexts/HouseholdContext';

const ONBOARDING_KEY = 'onboarding_complete_v1';

function HouseholdProbe(): React.JSX.Element {
  const ctx = useHousehold();
  return (
    <Text testID="probe">
      {ctx.onboardingComplete ? 'COMPLETE' : 'NOT_COMPLETE'}
    </Text>
  );
}

describe('HouseholdContext cold-start race fix (B2)', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.isLoading = true;
    mockList.mockReset();
    mockListChildren.mockReset();
  });

  it('does NOT clear onboarding_complete_v1 while AuthContext is still hydrating', async () => {
    // Pre-seed the persisted flag (returning user)
    await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
    SecureStoreMock.deleteItemAsync.mockClear();

    // Initial mount with authLoading=true, isAuthenticated=false
    render(
      <HouseholdProvider>
        <HouseholdProbe />
      </HouseholdProvider>,
    );

    // Let any microtasks flush. The destructive useEffect MUST early-return
    // when authLoading is true, so deleteItemAsync(ONBOARDING_KEY) must not
    // have been called.
    await act(async () => {
      await Promise.resolve();
    });

    const deleteCalls = SecureStoreMock.deleteItemAsync.mock.calls.filter(
      (call: unknown[]) => call[0] === ONBOARDING_KEY,
    );
    expect(deleteCalls).toHaveLength(0);
  });

  it('hydrated persisted flag survives the cold-start hydration window', async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
    SecureStoreMock.deleteItemAsync.mockClear();
    mockList.mockResolvedValue([]); // returning user, but server list empty

    const { getByTestId, rerender } = render(
      <HouseholdProvider>
        <HouseholdProbe />
      </HouseholdProvider>,
    );

    // Hydrate-from-store useEffect runs — should set onboardingComplete=true
    await waitFor(() => {
      expect(getByTestId('probe').props.children).toBe('COMPLETE');
    });

    // Now AuthContext finishes hydrating: still no token (logged-out cold start)
    // We don't flip isAuthenticated yet — just authLoading→false. Without the
    // fix, this would also trigger the clear effect and wipe the flag.
    authState.isLoading = false;
    rerender(
      <HouseholdProvider>
        <HouseholdProbe />
      </HouseholdProvider>,
    );

    // After authLoading=false + isAuthenticated=false, the clear branch DOES
    // run (real logged-out state). Flag gets cleared and state resets.
    await waitFor(() => {
      expect(getByTestId('probe').props.children).toBe('NOT_COMPLETE');
    });
    const cleared = SecureStoreMock.deleteItemAsync.mock.calls.some(
      (call: unknown[]) => call[0] === ONBOARDING_KEY,
    );
    expect(cleared).toBe(true);
  });

  it('authenticated returning user keeps onboardingComplete=true after refresh', async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
    mockList.mockResolvedValue([{ id: 'hh-1', name: 'Test Household' }]);
    mockListChildren.mockResolvedValue([]);

    authState.isLoading = false;
    authState.isAuthenticated = true;

    const { getByTestId } = render(
      <HouseholdProvider>
        <HouseholdProbe />
      </HouseholdProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('probe').props.children).toBe('COMPLETE');
    });
    expect(mockList).toHaveBeenCalled();
  });
});
