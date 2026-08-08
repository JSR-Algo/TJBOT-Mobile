import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ChildProfileScreen from '@/features/onboarding/screens/ChildProfileScreen';
import { saveOnboardingChildProfile } from '@/features/onboarding/childProfileSave';
import { finalizeDevicePairing } from '@/features/device/pairing/finalizeDevicePairing';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { Child } from '@/types';

// F-T54-09b — the child cap must not be an unrecoverable dead end.
//
// RootStackNavigator.tsx renders ONLY OnboardingNavigator while
// `onboardingComplete` is false, and the sole screen that can archive or delete a
// child (ParentSettingsScreen, deleteChild) lives outside it. So a household that
// hits MAX_CHILDREN_REACHED mid-pairing had no way forward and no way back — with
// the robot already claimed. The recovery is to continue with a child that
// already exists, which by definition is available precisely when the cap fires.

jest.mock('@/features/onboarding/childProfileSave', () => {
  const actual = jest.requireActual('@/features/onboarding/childProfileSave');
  return { __esModule: true, ...actual, saveOnboardingChildProfile: jest.fn() };
});

jest.mock('@/features/device/pairing/finalizeDevicePairing', () => ({
  __esModule: true,
  finalizeDevicePairing: jest.fn(),
}));

jest.mock('@/contexts/HouseholdContext', () => ({
  __esModule: true,
  useHousehold: jest.fn(),
}));

jest.mock('@/services/api/auth', () => ({ __esModule: true, sendConsent: jest.fn() }));

const mockedSave = saveOnboardingChildProfile as jest.MockedFunction<typeof saveOnboardingChildProfile>;
const mockedFinalize = finalizeDevicePairing as jest.MockedFunction<typeof finalizeDevicePairing>;
const mockedUseHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;

const EXISTING_CHILD: Child = {
  id: 'child-existing-1',
  household_id: 'household-1',
  name: 'Mai',
  birth_year: 2019,
  age_gate_passed: true,
  created_at: '2026-06-15T00:00:00.000Z',
};

const PAIRING = { deviceId: 'device-1', provisioningAttemptId: 'claim-1', serialNumber: 'TBT-2026-004217' };

function householdValue(children: Child[]) {
  return {
    activeHousehold: { id: 'household-1', name: 'Home', owner_id: 'p1', created_at: '2026-06-15T00:00:00.000Z' },
    addChild: jest.fn(),
    createHousehold: jest.fn(),
    children,
  };
}

function renderScreen(params?: Record<string, unknown>) {
  const navigate = jest.fn();
  const reset = jest.fn();
  const screen = render(
    <ChildProfileScreen navigation={{ navigate, reset } as never} route={{ params } as never} />,
  );
  return { screen, navigate, reset };
}

function pickAgeAndSave(screen: ReturnType<typeof render>): void {
  fireEvent.press(screen.getByTestId('childAgeBand_PRE_K'));
  fireEvent.press(screen.getByTestId('childProfileSaveButton'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedFinalize.mockResolvedValue(undefined);
});

describe('child-limit recovery inside onboarding', () => {
  it('offers the existing children when the cap blocks a new profile', async () => {
    mockedUseHousehold.mockReturnValue(householdValue([EXISTING_CHILD]) as never);
    mockedSave.mockRejectedValue(Object.assign(new Error('x'), { code: 'MAX_CHILDREN_REACHED', status: 409 }));

    const { screen } = renderScreen({ pairing: PAIRING });
    pickAgeAndSave(screen);

    await waitFor(() => expect(screen.getByTestId('existingChildPicker')).toBeTruthy());
    expect(screen.getByTestId(`existingChild_${EXISTING_CHILD.id}`)).toBeTruthy();
  });

  it('finishes the pairing with the picked child instead of dead-ending', async () => {
    mockedUseHousehold.mockReturnValue(householdValue([EXISTING_CHILD]) as never);
    mockedSave.mockRejectedValue(Object.assign(new Error('x'), { code: 'MAX_CHILDREN_REACHED', status: 409 }));

    const { screen } = renderScreen({ pairing: PAIRING });
    pickAgeAndSave(screen);
    await waitFor(() => expect(screen.getByTestId('existingChildPicker')).toBeTruthy());

    fireEvent.press(screen.getByTestId(`existingChild_${EXISTING_CHILD.id}`));

    // The already-claimed robot gets finalized against the existing child — the
    // whole point of the recovery. Without it the parent could only re-pair.
    await waitFor(() => expect(mockedFinalize).toHaveBeenCalledTimes(1));
    expect(mockedFinalize).toHaveBeenCalledWith(
      expect.anything(),
      PAIRING,
      EXISTING_CHILD.id,
    );
    // And it must NOT have created a second profile.
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  it('advances plain onboarding with the picked child when there is no pairing', async () => {
    mockedUseHousehold.mockReturnValue(householdValue([EXISTING_CHILD]) as never);
    mockedSave.mockRejectedValue(Object.assign(new Error('x'), { code: 'MAX_CHILDREN_REACHED', status: 409 }));

    const { screen, navigate } = renderScreen();
    pickAgeAndSave(screen);
    await waitFor(() => expect(screen.getByTestId('existingChildPicker')).toBeTruthy());

    fireEvent.press(screen.getByTestId(`existingChild_${EXISTING_CHILD.id}`));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(mockedFinalize).not.toHaveBeenCalled();
  });

  it('does not offer the picker for a non-cap failure', async () => {
    mockedUseHousehold.mockReturnValue(householdValue([EXISTING_CHILD]) as never);
    mockedSave.mockRejectedValue(Object.assign(new Error('x'), { code: 'COPPA_NOT_VERIFIED', status: 403 }));

    const { screen } = renderScreen({ pairing: PAIRING });
    pickAgeAndSave(screen);

    await waitFor(() => expect(mockedSave).toHaveBeenCalled());
    expect(screen.queryByTestId('existingChildPicker')).toBeNull();
  });

  it('does not offer an empty picker when the household has no children', async () => {
    // A cap of zero (or a stale list) must not render a picker with nothing in
    // it — that would be a second dead end wearing a way out.
    mockedUseHousehold.mockReturnValue(householdValue([]) as never);
    mockedSave.mockRejectedValue(Object.assign(new Error('x'), { code: 'MAX_CHILDREN_REACHED', status: 409 }));

    const { screen } = renderScreen({ pairing: PAIRING });
    pickAgeAndSave(screen);

    await waitFor(() => expect(mockedSave).toHaveBeenCalled());
    expect(screen.queryByTestId('existingChildPicker')).toBeNull();
  });
});
