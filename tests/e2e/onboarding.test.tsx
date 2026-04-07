/**
 * E2E tests for Onboarding flow — covers all buttons in:
 * HouseholdCreateScreen, AddChildScreen, InterestSetupScreen, DeviceSetupIntroScreen
 *
 * Note: ErrorMessage renders "⚠️ {message}" — use regex for matching.
 * normalizeError maps plain Error objects to ERROR_MESSAGES.UNKNOWN_ERROR:
 * "An unexpected error occurred. Please try again."
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { HouseholdCreateScreen } from '../../src/screens/onboarding/HouseholdCreateScreen';
import { AddChildScreen } from '../../src/screens/onboarding/AddChildScreen';
import { InterestSetupScreen } from '../../src/screens/onboarding/InterestSetupScreen';
import { DeviceSetupIntroScreen } from '../../src/screens/onboarding/DeviceSetupIntroScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn() } as any;

const mockCreateHousehold = jest.fn();
const mockAddChild = jest.fn();
const mockCompleteOnboarding = jest.fn();

jest.mock('../../src/contexts/HouseholdContext', () => ({
  useHousehold: () => ({
    createHousehold: mockCreateHousehold,
    addChild: mockAddChild,
    completeOnboarding: mockCompleteOnboarding,
    activeHousehold: null,
    children: [],
    isLoading: false,
    refresh: jest.fn(),
    pendingDeviceSetup: false,
    clearPendingDeviceSetup: jest.fn(),
  }),
}));

jest.mock('../../src/api/learning', () => ({
  updateChildProfile: jest.fn().mockResolvedValue({}),
}));

// ─── HouseholdCreateScreen ────────────────────────────────────────────────────

describe('HouseholdCreateScreen', () => {
  const mockRoute = { params: undefined, key: 'HouseholdCreate', name: 'HouseholdCreate' as const };

  beforeEach(() => jest.clearAllMocks());

  it('renders Create Household button', () => {
    const { getByText } = render(
      <HouseholdCreateScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('Create Household')).toBeTruthy();
  });

  it('shows error when name is empty', async () => {
    const { getAllByText, getByText } = render(
      <HouseholdCreateScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Create Household'));
    await waitFor(() => {
      // Input renders inline error + ErrorMessage renders ⚠️ version — both match
      expect(getAllByText(/Please enter a household name/).length).toBeGreaterThan(0);
    });
  });

  it('calls createHousehold and navigates to AddChild on success', async () => {
    mockCreateHousehold.mockResolvedValueOnce({ id: 'hh-123', name: 'The Smiths' });
    const { getByText, getByPlaceholderText } = render(
      <HouseholdCreateScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. The Smith Family'), 'The Smiths');
    fireEvent.press(getByText('Create Household'));
    await waitFor(() => {
      expect(mockCreateHousehold).toHaveBeenCalledWith('The Smiths');
      expect(mockNavigate).toHaveBeenCalledWith('AddChild', { householdId: 'hh-123' });
    });
  });

  it('shows error on API failure', async () => {
    mockCreateHousehold.mockRejectedValueOnce(new Error('Network error'));
    const { getAllByText, getByPlaceholderText, getByText } = render(
      <HouseholdCreateScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. The Smith Family'), 'The Smiths');
    fireEvent.press(getByText('Create Household'));
    await waitFor(() => {
      // normalizeError maps plain Error → UNKNOWN_ERROR message
      // Input + ErrorMessage both render it, so use getAllByText
      expect(getAllByText(/unexpected error/i).length).toBeGreaterThan(0);
    });
  });
});

// ─── AddChildScreen ───────────────────────────────────────────────────────────

describe('AddChildScreen', () => {
  const mockRoute = { params: { householdId: 'hh-123' }, key: 'AddChild', name: 'AddChild' as const };

  beforeEach(() => jest.clearAllMocks());

  it('renders Add Child and Skip buttons', () => {
    const { getByText } = render(
      <AddChildScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('Add Child')).toBeTruthy();
    expect(getByText('Skip for now')).toBeTruthy();
  });

  it('shows error when name is empty', async () => {
    const { getByText } = render(
      <AddChildScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Add Child'));
    await waitFor(() => {
      expect(getByText(/Please enter a name/)).toBeTruthy();
    });
  });

  it('shows error for invalid birth year (non-numeric)', async () => {
    const { getByText, getByPlaceholderText } = render(
      <AddChildScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. Emma'), 'Emma');
    fireEvent.changeText(getByPlaceholderText('e.g. 2018'), 'abcd');
    fireEvent.press(getByText('Add Child'));
    await waitFor(() => {
      expect(getByText(/valid 4-digit birth year/)).toBeTruthy();
    });
  });

  it('shows error for birth year before 2000', async () => {
    const { getByText, getByPlaceholderText } = render(
      <AddChildScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. Emma'), 'Emma');
    fireEvent.changeText(getByPlaceholderText('e.g. 2018'), '1999');
    fireEvent.press(getByText('Add Child'));
    await waitFor(() => {
      expect(getByText(/Birth year must be 2000/)).toBeTruthy();
    });
  });

  it('calls addChild on valid input', async () => {
    mockAddChild.mockResolvedValueOnce({ id: 'child-1', household_id: 'hh-123', name: 'Emma' });
    const { getByText, getByPlaceholderText } = render(
      <AddChildScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. Emma'), 'Emma');
    fireEvent.changeText(getByPlaceholderText('e.g. 2018'), '2018');
    fireEvent.press(getByText('Add Child'));
    await waitFor(() => {
      expect(mockAddChild).toHaveBeenCalledWith({ name: 'Emma', date_of_birth: '2018-01-01' });
    });
  });

  it('navigates to DeviceSetupIntro when Skip is pressed', () => {
    const { getByText } = render(
      <AddChildScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Skip for now'));
    expect(mockNavigate).toHaveBeenCalledWith('DeviceSetupIntro');
  });
});

// ─── InterestSetupScreen ──────────────────────────────────────────────────────

describe('InterestSetupScreen', () => {
  const learningApi = require('../../src/api/learning');
  const mockRoute = {
    params: { childId: 'child-1', householdId: 'hh-123' },
    key: 'InterestSetup',
    name: 'InterestSetup' as const,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders all 9 interest chips', () => {
    const { getByText } = render(
      <InterestSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    ['Animals', 'Cars', 'Princess', 'Space', 'Dinosaurs', 'Music', 'Cooking', 'Sports', 'Art'].forEach(
      (label) => expect(getByText(label)).toBeTruthy()
    );
  });

  it('shows "Skip for now" when no interests selected', () => {
    const { getByText } = render(
      <InterestSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('Skip for now')).toBeTruthy();
  });

  it('navigates to DeviceSetupIntro when Skip is pressed', () => {
    const { getByText } = render(
      <InterestSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Skip for now'));
    expect(mockNavigate).toHaveBeenCalledWith('DeviceSetupIntro');
  });

  it('updates button label after selecting 1 interest', () => {
    const { getByText } = render(
      <InterestSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Animals'));
    expect(getByText('Save 1 interest')).toBeTruthy();
  });

  it('updates button label after selecting 2 interests', () => {
    const { getByText } = render(
      <InterestSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Animals'));
    fireEvent.press(getByText('Cars'));
    expect(getByText('Save 2 interests')).toBeTruthy();
  });

  it('deselects interest chip on second press', () => {
    const { getByText } = render(
      <InterestSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Animals'));
    fireEvent.press(getByText('Animals'));
    expect(getByText('Skip for now')).toBeTruthy();
  });

  it('calls updateChildProfile and navigates on Save', async () => {
    learningApi.updateChildProfile.mockResolvedValueOnce({});
    const { getByText } = render(
      <InterestSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Animals'));
    fireEvent.press(getByText('Cars'));
    fireEvent.press(getByText('Save 2 interests'));
    await waitFor(() => {
      expect(learningApi.updateChildProfile).toHaveBeenCalledWith('child-1', {
        interests: ['animals', 'cars'],
      });
      expect(mockNavigate).toHaveBeenCalledWith('DeviceSetupIntro');
    });
  });
});

// ─── DeviceSetupIntroScreen ───────────────────────────────────────────────────

describe('DeviceSetupIntroScreen', () => {
  const mockRoute = { params: undefined, key: 'DeviceSetupIntro', name: 'DeviceSetupIntro' as const };

  beforeEach(() => jest.clearAllMocks());

  it('renders both action buttons', () => {
    const { getByText } = render(
      <DeviceSetupIntroScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText("I'm ready, let's pair")).toBeTruthy();
    expect(getByText('Skip for now')).toBeTruthy();
  });

  it('calls completeOnboarding(true) when pair button is pressed', () => {
    const { getByText } = render(
      <DeviceSetupIntroScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText("I'm ready, let's pair"));
    expect(mockCompleteOnboarding).toHaveBeenCalledWith(true);
  });

  it('calls completeOnboarding(false) when Skip is pressed', () => {
    const { getByText } = render(
      <DeviceSetupIntroScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Skip for now'));
    expect(mockCompleteOnboarding).toHaveBeenCalledWith(false);
  });
});
