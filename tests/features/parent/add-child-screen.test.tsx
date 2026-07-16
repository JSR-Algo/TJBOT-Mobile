import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AddChildScreen from '@/features/parent/screens/AddChildScreen';
import { ROUTES } from '@/navigation/routes';
import { saveOnboardingChildProfile } from '@/features/onboarding/childProfileSave';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { Child } from '@/types';

// Parent-entry "Add child" screen. It reuses the COPPA-safe creation step
// (saveOnboardingChildProfile, unit-tested in its own suite) and then sets the
// new child as the app-local active child. We mock the creation step + the
// household context and assert only this screen's branching/wiring.

jest.mock('@/features/onboarding/childProfileSave', () => {
  const actual = jest.requireActual('@/features/onboarding/childProfileSave');
  return {
    __esModule: true,
    ...actual,
    saveOnboardingChildProfile: jest.fn(),
  };
});

jest.mock('@/contexts/HouseholdContext', () => ({
  __esModule: true,
  useHousehold: jest.fn(),
}));

jest.mock('@/services/api/auth', () => ({
  __esModule: true,
  sendConsent: jest.fn(),
}));

const mockedSave = saveOnboardingChildProfile as jest.MockedFunction<typeof saveOnboardingChildProfile>;
const mockedUseHousehold = useHousehold as jest.MockedFunction<typeof useHousehold>;

const CREATED_CHILD: Child = {
  id: 'child-new-1',
  household_id: 'household-1',
  name: 'Panda friend',
  birth_year: 2018,
  age_gate_passed: true,
  created_at: '2026-06-15T00:00:00.000Z',
};

const setActiveChild = jest.fn();

function householdValue() {
  return {
    activeHousehold: { id: 'household-1', name: 'Home', owner_id: 'p1', created_at: '2026-06-15T00:00:00.000Z' },
    addChild: jest.fn(),
    createHousehold: jest.fn(),
    setActiveChild,
  };
}

function renderScreen(navigate: jest.Mock) {
  return render(<AddChildScreen navigation={{ navigate } as never} route={{} as never} />);
}

// The save handler short-circuits unless an age band is picked, so the happy
// path taps an age band first.
function pickAgeAndSave(screen: ReturnType<typeof renderScreen>): void {
  fireEvent.press(screen.getByTestId('addChildAgeBand_PRE_K'));
  fireEvent.press(screen.getByTestId('addChildSaveButton'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseHousehold.mockReturnValue(householdValue() as never);
  mockedSave.mockResolvedValue(CREATED_CHILD);
});

describe('AddChildScreen', () => {
  it('shows a buddy suggestion and saves a normalized custom child name', async () => {
    const screen = renderScreen(jest.fn());
    const input = screen.getByTestId('addChildDisplayNameInput');

    expect(input.props.value).toBe('Panda friend');
    fireEvent.changeText(input, '  Bé   Nima  ');
    pickAgeAndSave(screen);

    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Bé Nima' }),
        expect.anything(),
      ),
    );
  });

  it('uses the selected buddy suggestion when the name is blank', async () => {
    const screen = renderScreen(jest.fn());

    fireEvent.press(screen.getByLabelText('Buddy Cat'));
    fireEvent.changeText(screen.getByTestId('addChildDisplayNameInput'), '   ');
    pickAgeAndSave(screen);

    await waitFor(() =>
      expect(mockedSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Cat friend' }),
        expect.anything(),
      ),
    );
  });

  it('creates the child, sets it as the active child, and returns to Parent Settings', async () => {
    const navigate = jest.fn();
    const screen = renderScreen(navigate);

    expect(screen.getByTestId('addChildScroll')).toBeTruthy();

    pickAgeAndSave(screen);

    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(setActiveChild).toHaveBeenCalledWith('child-new-1'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.ParentSettingsScreen);
  });

  it('requires an age range before saving (no creation attempt)', () => {
    const navigate = jest.fn();
    const screen = renderScreen(navigate);

    fireEvent.press(screen.getByTestId('addChildSaveButton'));

    expect(screen.getByText('Pick an age range before saving.')).toBeTruthy();
    expect(mockedSave).not.toHaveBeenCalled();
    expect(setActiveChild).not.toHaveBeenCalled();
  });

  it('surfaces a save error and neither sets the active child nor navigates', async () => {
    mockedSave.mockRejectedValue(Object.assign(new Error('x'), { code: 'MAX_CHILD_LIMIT_REACHED' }));
    const navigate = jest.fn();
    const screen = renderScreen(navigate);

    pickAgeAndSave(screen);

    await waitFor(() => expect(screen.getByText('Your plan has reached its child profile limit.')).toBeTruthy());
    expect(setActiveChild).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.ParentSettingsScreen);
  });
});
