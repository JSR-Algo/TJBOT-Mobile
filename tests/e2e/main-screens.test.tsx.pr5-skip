/**
 * E2E tests for Main app screens — covers all buttons in:
 * DashboardScreen, DeviceListScreen, ProfileScreen, DeviceSetupScreen, ParentControlsScreen
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import { DashboardScreen } from '../../src/screens/dashboard/DashboardScreen';
import { DeviceListScreen } from '../../src/screens/device/DeviceListScreen';
import { ProfileScreen } from '../../src/screens/profile/ProfileScreen';
import { DeviceSetupScreen } from '../../src/screens/device/DeviceSetupScreen';
import { ParentControlsScreen } from '../../src/screens/controls/ParentControlsScreen';
import * as devicesApi from '../../src/services/api/devices';
import { controlsApi } from '../../src/services/api/controls';
import type { MainStackScreenProps, MainTabScreenProps } from '../../src/navigation/types';

jest.mock('../src/services/ble/service', () => ({
  initializeBle: jest.fn(async () => ({ permission: 'granted', available: true })),
  scanForTbotDevices: jest.fn(async () => ({ allowed: [], blocked: [] })),
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockPopToTop = jest.fn();
const mockMainTabNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  popToTop: mockPopToTop,
} as unknown as MainTabScreenProps<'Home'>['navigation'];
const mockMainStackNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  popToTop: mockPopToTop,
} as unknown as MainStackScreenProps<'DeviceSetup'>['navigation'];
const mockParentControlsNavigation = mockMainStackNavigation as unknown as MainStackScreenProps<'ParentControls'>['navigation'];
const mockLogout = jest.fn();
const mockHouseholdRefresh = jest.fn().mockResolvedValue(undefined);
const mockClearPendingDeviceSetup = jest.fn();
let mockHouseholdState: {
  activeHousehold: { id: string; name: string } | null;
  children: Array<{ id: string; name: string; birth_year: number }>;
  isLoading: boolean;
  error: string | null;
  refresh: typeof mockHouseholdRefresh;
  pendingDeviceSetup: boolean;
  clearPendingDeviceSetup: typeof mockClearPendingDeviceSetup;
};
let mockInteractionState: {
  interactions: Array<{ id: string; message: string; response: string; created_at: string }>;
  addInteraction: jest.Mock;
  clearInteractions: jest.Mock;
  error: string | null;
  isLoading: boolean;
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), popToTop: mockPopToTop }),
  useFocusEffect: (cb: () => void) => { cb(); },
}));

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Jane Smith', email: 'jane@test.com' },
    logout: mockLogout,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../src/contexts/HouseholdContext', () => ({
  useHousehold: () => mockHouseholdState,
}));

jest.mock('../../src/contexts/InteractionContext', () => ({
  useInteractions: () => mockInteractionState,
}));

jest.mock('../src/services/api/devices', () => ({
  listByHousehold: jest.fn().mockResolvedValue([]),
  register: jest.fn(),
}));

jest.mock('../src/services/api/learning', () => ({
  getKPIs: jest.fn().mockResolvedValue({ daily_streak: 0 }),
  getPronunciationTrend: jest.fn(),
}));

jest.mock('../src/services/api/controls', () => ({
  controlsApi: {
    getControls: jest.fn().mockResolvedValue({
      daily_limit_minutes: 30,
      quiet_hours_start: '21:00',
      quiet_hours_end: '07:00',
      content_categories_enabled: { stories: true, games: true, stem: true },
    }),
    updateControls: jest.fn().mockResolvedValue({}),
  },
}));

const listByHouseholdMock = jest.mocked(devicesApi.listByHousehold);
const registerDeviceMock = jest.mocked(devicesApi.register);
const getControlsMock = jest.mocked(controlsApi.getControls);
const updateControlsMock = jest.mocked(controlsApi.updateControls);

// ─── DashboardScreen ──────────────────────────────────────────────────────────

describe('DashboardScreen', () => {
  const mockRoute = { params: undefined, key: 'Home', name: 'Home' as const };
  const learningApi = require('../src/services/api/learning');

  beforeEach(() => {
    jest.clearAllMocks();
    mockHouseholdState = {
      activeHousehold: { id: 'hh-1', name: 'The Smiths' },
      children: [{ id: 'c1', name: 'Emma', birth_year: 2018 }],
      isLoading: false,
      error: null,
      refresh: mockHouseholdRefresh,
      pendingDeviceSetup: false,
      clearPendingDeviceSetup: mockClearPendingDeviceSetup,
    };
    mockInteractionState = {
      interactions: [],
      addInteraction: jest.fn(),
      clearInteractions: jest.fn(),
      error: null,
      isLoading: false,
    };
  });

  it('renders the Start conversation button', () => {
    const { getByText } = render(
      <DashboardScreen navigation={mockMainTabNavigation} route={mockRoute} />
    );
    expect(getByText('Start conversation')).toBeTruthy();
  });

  it('navigates to GeminiConversation when Start conversation is pressed', () => {
    const { getByText } = render(
      <DashboardScreen navigation={mockMainTabNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Start conversation'));
    expect(mockNavigate).toHaveBeenCalledWith('GeminiConversation');
  });

  it('shows household name', () => {
    const { getByText } = render(
      <DashboardScreen navigation={mockMainTabNavigation} route={mockRoute} />
    );
    expect(getByText('The Smiths')).toBeTruthy();
  });

  it('shows empty activity message when no interactions', () => {
    const { getByText } = render(
      <DashboardScreen navigation={mockMainTabNavigation} route={mockRoute} />
    );
    expect(getByText('No conversations yet')).toBeTruthy();
  });

  it('shows the inline add-child action when the household has no child profiles yet', () => {
    mockHouseholdState = {
      ...mockHouseholdState,
      children: [],
    };

    const { getByText } = render(
      <DashboardScreen navigation={mockMainTabNavigation} route={mockRoute} />
    );

    expect(getByText('Add child')).toBeTruthy();
    expect(getByText('0 children')).toBeTruthy();
  });

  it('shows an explicit progress error state when KPI loading fails', async () => {
    learningApi.getKPIs.mockRejectedValueOnce(new Error('KPI service offline'));

    const { getByText } = render(
      <DashboardScreen navigation={mockMainTabNavigation} route={mockRoute} />
    );

    await waitFor(() => {
      expect(getByText("We couldn't load today's summary")).toBeTruthy();
      expect(getByText(/kpi service offline/i)).toBeTruthy();
      expect(getByText('Try again')).toBeTruthy();
    });
  });
});

// ─── DeviceListScreen ─────────────────────────────────────────────────────────

describe('DeviceListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listByHouseholdMock.mockResolvedValue([]);
  });

  it('renders the FAB + button', async () => {
    const { getByText } = render(<DeviceListScreen />);
    await waitFor(() => {
      expect(getByText('+')).toBeTruthy();
    });
  });

  it('navigates to DeviceSetup when FAB is pressed', async () => {
    const { getByText } = render(<DeviceListScreen />);
    await waitFor(() => expect(getByText('+')).toBeTruthy());
    fireEvent.press(getByText('+'));
    expect(mockNavigate).toHaveBeenCalledWith('DeviceSetup');
  });

  it('shows empty-state onboarding copy when no devices exist', async () => {
    const { getByText } = render(<DeviceListScreen />);
    await waitFor(() => {
      expect(getByText('Set up your TBOT')).toBeTruthy();
      expect(getByText('Tap + below to register your device.')).toBeTruthy();
    });
  });

  it('uses the FAB as the primary path to DeviceSetup when no devices exist', async () => {
    const { getByText } = render(<DeviceListScreen />);
    await waitFor(() => expect(getByText('+')).toBeTruthy());
    fireEvent.press(getByText('+'));
    expect(mockNavigate).toHaveBeenCalledWith('DeviceSetup');
  });

  it('navigates to DeviceDetail when real device card is pressed', async () => {
    // Use mockResolvedValue (not Once) so re-renders from useFocusEffect mock don't reset to []
    listByHouseholdMock.mockResolvedValue([
      { id: 'dev-1', serial_number: 'TBOT-2024-0001', hardware_revision: '1.0', firmware_version: '1.0', status: 'online' },
    ]);
    const { findByText } = render(<DeviceListScreen />);
    const card = await findByText('TBOT-2024-0001');
    fireEvent.press(card);
    expect(mockNavigate).toHaveBeenCalledWith('DeviceDetail', { deviceId: 'dev-1' });
  });
});

// ─── ProfileScreen ────────────────────────────────────────────────────────────

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      // Auto-press "Sign out" button
      const signOutBtn = buttons?.find((button): button is AlertButton => button?.text === 'Sign out');
      if (signOutBtn?.onPress) signOutBtn.onPress();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders Sign out button', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('Sign out')).toBeTruthy();
  });

  it('shows user name and email', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('Jane Smith')).toBeTruthy();
    expect(getByText('jane@test.com')).toBeTruthy();
  });

  it('shows confirmation alert when Sign out is pressed', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Sign out'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign out',
      'Are you sure you want to sign out?',
      expect.any(Array)
    );
  });

  it('calls logout when confirmed', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Sign out'));
    expect(mockLogout).toHaveBeenCalled();
  });
});

// ─── DeviceSetupScreen ────────────────────────────────────────────────────────

describe('DeviceSetupScreen', () => {
  const mockRoute = { params: undefined, key: 'DeviceSetup', name: 'DeviceSetup' as const };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Register Device button and inputs', async () => {
    const { getByText, getByPlaceholderText } = render(
      <DeviceSetupScreen navigation={mockMainStackNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByText('Bluetooth pairing')).toBeTruthy());
    expect(getByText('Register Device')).toBeTruthy();
    expect(getByPlaceholderText('e.g. TBOT-2024-XXXX')).toBeTruthy();
    expect(getByPlaceholderText('e.g. 1.0')).toBeTruthy();
  });

  it('shows error when serial number is empty', async () => {
    const { getByText } = render(
      <DeviceSetupScreen navigation={mockMainStackNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByText('Bluetooth pairing')).toBeTruthy());
    fireEvent.press(getByText('Register Device'));
    await waitFor(() => {
      expect(getByText(/Serial number is required/)).toBeTruthy();
    });
  });

  it('calls register and shows success state', async () => {
    registerDeviceMock.mockResolvedValueOnce({} as never);
    const { getByText, getByPlaceholderText } = render(
      <DeviceSetupScreen navigation={mockMainStackNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByText('Bluetooth pairing')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('e.g. TBOT-2024-XXXX'), 'TBOT-2024-0001');
    fireEvent.press(getByText('Register Device'));
    await waitFor(() => {
      expect(registerDeviceMock).toHaveBeenCalledWith({
        serial_number: 'TBOT-2024-0001',
        hardware_revision: '1.0',
      });
      expect(getByText('Your TBOT is registered!')).toBeTruthy();
      expect(getByText('Go to Home')).toBeTruthy();
    });
  });

  it('returns to the home stack when "Go to Home" is pressed after success', async () => {
    registerDeviceMock.mockResolvedValueOnce({} as never);
    const { getByText, getByPlaceholderText } = render(
      <DeviceSetupScreen navigation={mockMainStackNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByText('Bluetooth pairing')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('e.g. TBOT-2024-XXXX'), 'TBOT-2024-0001');
    fireEvent.press(getByText('Register Device'));
    await waitFor(() => expect(getByText('Go to Home')).toBeTruthy());
    fireEvent.press(getByText('Go to Home'));
    expect(mockPopToTop).toHaveBeenCalled();
  });

  it('shows the normalized API failure message', async () => {
    registerDeviceMock.mockRejectedValueOnce(new Error('Device already registered'));
    const { getByText, getByPlaceholderText } = render(
      <DeviceSetupScreen navigation={mockMainStackNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByText('Bluetooth pairing')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('e.g. TBOT-2024-XXXX'), 'TBOT-2024-0001');
    fireEvent.press(getByText('Register Device'));
    await waitFor(() => {
      expect(getByText(/device already registered/i)).toBeTruthy();
    });
  });
});

// ─── ParentControlsScreen ─────────────────────────────────────────────────────

describe('ParentControlsScreen', () => {
  const mockRoute = {
    params: { deviceId: 'dev-1' },
    key: 'ParentControls',
    name: 'ParentControls' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getControlsMock.mockResolvedValue({
      daily_limit_minutes: 30,
      quiet_hours_start: '21:00',
      quiet_hours_end: '07:00',
      content_categories_enabled: { stories: true, games: true, stem: true },
    });
    updateControlsMock.mockResolvedValue({} as never);
  });

  it('renders the controls hero and saved-state action after loading', async () => {
    const { getByText } = render(
      <ParentControlsScreen navigation={mockParentControlsNavigation} route={mockRoute} />
    );
    await waitFor(() => {
      expect(getByText("Tonight's guardrails")).toBeTruthy();
      expect(getByText('All changes saved')).toBeTruthy();
    });
  });

  it('renders all three content switches', async () => {
    const { getByLabelText } = render(
      <ParentControlsScreen navigation={mockParentControlsNavigation} route={mockRoute} />
    );
    await waitFor(() => {
      expect(getByLabelText('Enable stories')).toBeTruthy();
      expect(getByLabelText('Enable games')).toBeTruthy();
      expect(getByLabelText('Enable STEM')).toBeTruthy();
    });
  });

  it('calls updateControls when a daily limit preset is changed and saved', async () => {
    const { getByLabelText } = render(
      <ParentControlsScreen navigation={mockParentControlsNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByLabelText('Set daily limit to 45 minutes')).toBeTruthy());
    fireEvent.press(getByLabelText('Set daily limit to 45 minutes'));
    fireEvent.press(getByLabelText('Save changes'));
    await waitFor(() => {
      expect(updateControlsMock).toHaveBeenCalledWith('dev-1', expect.objectContaining({
        daily_limit_minutes: 45,
        quiet_hours_start: '21:00',
        quiet_hours_end: '07:00',
      }));
    });
  });

  it('shows success message after save', async () => {
    const { getByLabelText, getByText } = render(
      <ParentControlsScreen navigation={mockParentControlsNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByLabelText('Increase daily limit by five minutes')).toBeTruthy());
    fireEvent.press(getByLabelText('Increase daily limit by five minutes'));
    fireEvent.press(getByLabelText('Save changes'));
    await waitFor(() => {
      expect(getByText('Controls updated. TBOT will use these guardrails on the next sync.')).toBeTruthy();
    });
  });

  it('toggles Stories switch', async () => {
    const { getByLabelText } = render(
      <ParentControlsScreen navigation={mockParentControlsNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByLabelText('Enable stories')).toBeTruthy());
    const storiesSwitch = getByLabelText('Enable stories');
    fireEvent(storiesSwitch, 'valueChange', false);
    fireEvent.press(getByLabelText('Save changes'));
    await waitFor(() => {
      expect(updateControlsMock).toHaveBeenCalledWith(
        'dev-1',
        expect.objectContaining({
          content_categories_enabled: expect.objectContaining({ stories: false }),
        })
      );
    });
  });

  it('shows error on save failure', async () => {
    updateControlsMock.mockRejectedValueOnce(new Error('Server error'));
    const { getByLabelText, getByText } = render(
      <ParentControlsScreen navigation={mockParentControlsNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByLabelText('Apply early bedtime quiet hours preset')).toBeTruthy());
    fireEvent.press(getByLabelText('Apply early bedtime quiet hours preset'));
    fireEvent.press(getByLabelText('Save changes'));
    await waitFor(() => {
      expect(getByText(/server error/i)).toBeTruthy();
    });
  });

  it('updates daily limit input', async () => {
    const { getByLabelText } = render(
      <ParentControlsScreen navigation={mockParentControlsNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByLabelText('Set daily limit to 60 minutes')).toBeTruthy());
    fireEvent.press(getByLabelText('Set daily limit to 60 minutes'));
    fireEvent.press(getByLabelText('Save changes'));
    await waitFor(() => {
      expect(updateControlsMock).toHaveBeenCalledWith(
        'dev-1',
        expect.objectContaining({ daily_limit_minutes: 60 })
      );
    });
  });

  it('resets unsaved changes back to the original control state', async () => {
    const { getByLabelText, getByText, queryByText } = render(
      <ParentControlsScreen navigation={mockParentControlsNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByLabelText('Set daily limit to 90 minutes')).toBeTruthy());
    fireEvent.press(getByLabelText('Set daily limit to 90 minutes'));
    expect(getByText('Save changes')).toBeTruthy();
    fireEvent.press(getByLabelText('Reset parental controls changes'));
    await waitFor(() => {
      expect(getByText('All changes saved')).toBeTruthy();
      expect(queryByText('Save changes')).toBeNull();
    });
  });
});
