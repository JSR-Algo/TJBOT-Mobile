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
import { VoiceTestScreen } from '../../src/screens/onboarding/VoiceTestScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn() } as any;

const mockCreateHousehold = jest.fn();
const mockAddChild = jest.fn();
const mockCompleteOnboarding = jest.fn();
const mockShowToast = jest.fn();

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

jest.mock('../../src/components/Toast', () => ({
  useToast: () => ({
    show: mockShowToast,
  }),
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
    expect(getByText('Step 3 of 7')).toBeTruthy();
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
      // normalizeError maps a plain network-like Error to the user-facing
      // NETWORK_ERROR message. Input + ErrorMessage both render it.
      expect(getAllByText(/network error/i).length).toBeGreaterThan(0);
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
    expect(getByText('Step 4 of 7')).toBeTruthy();
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
      expect(mockShowToast).toHaveBeenCalledWith({ severity: 'info', text: 'Emma đã được thêm!' });
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
    expect(getByText('Step 5 of 7')).toBeTruthy();
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
    expect(getByText('Continue to voice check')).toBeTruthy();
    expect(getByText('Skip for now')).toBeTruthy();
    expect(getByText('Step 6 of 7')).toBeTruthy();
  });

  it('navigates to VoiceTest without completing onboarding when pair button is pressed', () => {
    const { getByText } = render(
      <DeviceSetupIntroScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Continue to voice check'));
    expect(mockNavigate).toHaveBeenCalledWith('VoiceTest');
    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
  });

  it('calls completeOnboarding(false) when Skip is pressed', () => {
    const { getByText } = render(
      <DeviceSetupIntroScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Skip for now'));
    expect(mockCompleteOnboarding).toHaveBeenCalledWith(false);
  });
});

describe('VoiceTestScreen', () => {
  const mockRoute = { params: undefined, key: 'VoiceTest', name: 'VoiceTest' as const };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the final onboarding step', () => {
    const { getByText } = render(
      <VoiceTestScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('Step 7 of 7')).toBeTruthy();
    expect(getByText('Allow Microphone Access')).toBeTruthy();
  });

  it('completes onboarding only after the voice check finishes', async () => {
    const { getByText } = render(
      <VoiceTestScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Allow Microphone Access'));
    await waitFor(() => {
      expect(getByText('Tap to speak')).toBeTruthy();
    });

    fireEvent.press(getByText('Tap to speak'));
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(getByText('Finish setup')).toBeTruthy();
    });

    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
    fireEvent.press(getByText('Finish setup'));
    expect(mockCompleteOnboarding).toHaveBeenCalledWith(true);
  });
});
