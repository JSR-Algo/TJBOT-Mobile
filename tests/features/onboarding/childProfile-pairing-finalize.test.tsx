import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ChildProfileScreen from '@/features/onboarding/screens/ChildProfileScreen';
import { ROUTES } from '@/navigation/routes';
import { saveOnboardingChildProfile } from '@/features/onboarding/childProfileSave';
import { finalizeDevicePairing } from '@/features/device/pairing/finalizeDevicePairing';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { Child } from '@/types';

// The zero-child pairing dead-end fix lives here: PairRenameScreen routes a
// parent with no child profile into this COPPA-safe creation screen carrying a
// `pairing` context. After the child is created this screen must FINISH the
// pairing (finalizeDevicePairing) for that child rather than dropping the parent
// into onboarding (MicAskScreen). With no pairing context it stays plain
// onboarding and advances to MicAskScreen — unchanged.
//
// We mock the COPPA-safe creation step (childProfileSave) and the shared
// finalize step (finalizeDevicePairing) — both are unit-tested in their own
// suites — and assert only this screen's branching/wiring.

jest.mock('@/features/onboarding/childProfileSave', () => {
  const actual = jest.requireActual('@/features/onboarding/childProfileSave');
  return {
    __esModule: true,
    ...actual,
    saveOnboardingChildProfile: jest.fn(),
  };
});

jest.mock('@/features/device/pairing/finalizeDevicePairing', () => ({
  __esModule: true,
  finalizeDevicePairing: jest.fn(),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  __esModule: true,
  useHousehold: jest.fn(),
}));

// authApi.sendConsent is only reached on the staging dev COPPA bypass, which is
// off under test; mock it so the module import is inert.
jest.mock('@/services/api/auth', () => ({
  __esModule: true,
  sendConsent: jest.fn(),
}));

const mockedSave = saveOnboardingChildProfile as jest.MockedFunction<typeof saveOnboardingChildProfile>;
const mockedFinalize = finalizeDevicePairing as jest.MockedFunction<typeof finalizeDevicePairing>;
const mockedUseHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;

const CREATED_CHILD: Child = {
  id: 'child-new-1',
  household_id: 'household-1',
  name: 'Panda friend',
  birth_year: 2018,
  age_gate_passed: true,
  created_at: '2026-06-15T00:00:00.000Z',
};

const PAIRING = { deviceId: 'device-1', provisioningAttemptId: 'claim-1', serialNumber: 'TBT-2026-004217' };

function householdValue() {
  return {
    activeHousehold: { id: 'household-1', name: 'Home', owner_id: 'p1', created_at: '2026-06-15T00:00:00.000Z' },
    addChild: jest.fn(),
    createHousehold: jest.fn(),
  };
}

function renderScreen(navigate: jest.Mock, reset: jest.Mock, params?: Record<string, unknown>) {
  return render(
    <ChildProfileScreen navigation={{ navigate, reset } as never} route={{ params } as never} />,
  );
}

// The save handler short-circuits unless an age band is picked, so every flow
// taps an age band first.
function pickAgeAndSave(screen: ReturnType<typeof renderScreen>): void {
  fireEvent.press(screen.getByTestId('childAgeBand_PRE_K'));
  fireEvent.press(screen.getByTestId('childProfileSaveButton'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseHousehold.mockReturnValue(householdValue() as never);
  mockedSave.mockResolvedValue(CREATED_CHILD);
  mockedFinalize.mockResolvedValue(undefined);
});

describe('ChildProfileScreen — from-pairing finalize', () => {
  it('after creating the child, finalizes the pairing for that child and does NOT go to MicAskScreen', async () => {
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, reset, { pairing: PAIRING });

    expect(screen.getByTestId('onboardingScroll')).toBeTruthy();

    pickAgeAndSave(screen);

    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedFinalize).toHaveBeenCalledTimes(1));
    // Finalize is called with the screen's navigation, the carried pairing context
    // and the just-created child's id.
    expect(mockedFinalize).toHaveBeenCalledWith({ navigate, reset }, PAIRING, 'child-new-1');
    // The pairing terminus replaces onboarding: MicAskScreen must NOT be visited.
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.MicAskScreen);
  });

  it('surfaces an error (not a silent dead-end) when finalize fails, without re-creating the child on retry', async () => {
    mockedFinalize
      .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'PROVISIONING_COMPLETE_FAILED' }))
      .mockResolvedValueOnce(undefined);
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, reset, { pairing: PAIRING });

    pickAgeAndSave(screen);

    // The finalize failure produces a visible, sensible error message.
    await waitFor(() =>
      expect(
        screen.getByText('Saved your child, but could not finish setting up the robot. Check your connection and try again.'),
      ).toBeTruthy(),
    );
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.MicAskScreen);

    // Retry: the child already exists, so we must NOT create a duplicate — only
    // finalize is retried.
    fireEvent.press(screen.getByTestId('childProfileSaveButton'));
    await waitFor(() => expect(mockedFinalize).toHaveBeenCalledTimes(2));
    expect(mockedSave).toHaveBeenCalledTimes(1); // not re-created on retry
  });

  it('surfaces the child-creation error and never attempts to finalize when the child cannot be created', async () => {
    mockedSave.mockRejectedValue(Object.assign(new Error('x'), { code: 'MAX_CHILD_LIMIT_REACHED' }));
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, reset, { pairing: PAIRING });

    pickAgeAndSave(screen);

    await waitFor(() => expect(screen.getByText('Your plan has reached its child profile limit.')).toBeTruthy());
    expect(mockedFinalize).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.MicAskScreen);
  });
});

describe('ChildProfileScreen — plain onboarding (no pairing context) is unchanged', () => {
  it('after creating the child, advances to MicAskScreen and never finalizes pairing', async () => {
    const navigate = jest.fn();
    const reset = jest.fn();
    const screen = renderScreen(navigate, reset, undefined);

    pickAgeAndSave(screen);

    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.MicAskScreen));
    expect(mockedFinalize).not.toHaveBeenCalled();
  });
});
