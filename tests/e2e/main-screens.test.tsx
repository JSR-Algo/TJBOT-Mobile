/**
 * E2E tests for Main app screens — covers all buttons in:
 * DashboardScreen, DeviceListScreen, ProfileScreen, DeviceSetupScreen, ParentControlsScreen
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { DashboardScreen } from '../../src/screens/dashboard/DashboardScreen';
import { DeviceListScreen } from '../../src/screens/device/DeviceListScreen';
import { ProfileScreen } from '../../src/screens/profile/ProfileScreen';
import { DeviceSetupScreen } from '../../src/screens/device/DeviceSetupScreen';
import { ParentControlsScreen } from '../../src/screens/controls/ParentControlsScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockPopToTop = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn(), popToTop: mockPopToTop } as any;
const mockLogout = jest.fn();

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
  useHousehold: () => ({
    activeHousehold: { id: 'hh-1', name: 'The Smiths' },
    children: [{ id: 'c1', name: 'Emma', birth_year: 2018 }],
    isLoading: false,
    refresh: jest.fn().mockResolvedValue(undefined),
    pendingDeviceSetup: false,
    clearPendingDeviceSetup: jest.fn(),
  }),
}));

jest.mock('../../src/contexts/InteractionContext', () => ({
  useInteractions: () => ({
    interactions: [],
    refresh: jest.fn(),
  }),
}));

jest.mock('../../src/api/devices', () => ({
  listByHousehold: jest.fn().mockResolvedValue([]),
  register: jest.fn(),
}));

jest.mock('../../src/api/controls', () => ({
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

// ─── DashboardScreen ──────────────────────────────────────────────────────────

describe('DashboardScreen', () => {
  const mockRoute = { params: undefined, key: 'Home', name: 'Home' as const };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Start conversation button', () => {
    const { getByText } = render(
      <DashboardScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('Start conversation')).toBeTruthy();
  });

  it('navigates to Interaction when Start conversation is pressed', () => {
    const { getByText } = render(
      <DashboardScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Start conversation'));
    expect(mockNavigate).toHaveBeenCalledWith('Interaction');
  });

  it('shows household name', () => {
    const { getByText } = render(
      <DashboardScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('The Smiths')).toBeTruthy();
  });

  it('shows empty activity message when no interactions', () => {
    const { getByText } = render(
      <DashboardScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('No conversations yet')).toBeTruthy();
  });
});

// ─── DeviceListScreen ─────────────────────────────────────────────────────────

describe('DeviceListScreen', () => {
  const devicesApi = require('../../src/api/devices');

  beforeEach(() => {
    jest.clearAllMocks();
    devicesApi.listByHousehold.mockResolvedValue([]);
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
    devicesApi.listByHousehold.mockResolvedValue([
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
      const signOutBtn = buttons?.find((b: any) => b.text === 'Sign out');
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
  const devicesApi = require('../../src/api/devices');
  const mockRoute = { params: undefined, key: 'DeviceSetup', name: 'DeviceSetup' as const };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Register Device button and inputs', () => {
    const { getByText, getByPlaceholderText } = render(
      <DeviceSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('Register Device')).toBeTruthy();
    expect(getByPlaceholderText('e.g. TBOT-2024-XXXX')).toBeTruthy();
    expect(getByPlaceholderText('e.g. 1.0')).toBeTruthy();
  });

  it('shows error when serial number is empty', async () => {
    const { getByText } = render(
      <DeviceSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.press(getByText('Register Device'));
    await waitFor(() => {
      expect(getByText(/Serial number is required/)).toBeTruthy();
    });
  });

  it('calls register and shows success state', async () => {
    devicesApi.register.mockResolvedValueOnce({});
    const { getByText, getByPlaceholderText } = render(
      <DeviceSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. TBOT-2024-XXXX'), 'TBOT-2024-0001');
    fireEvent.press(getByText('Register Device'));
    await waitFor(() => {
      expect(devicesApi.register).toHaveBeenCalledWith({
        serial_number: 'TBOT-2024-0001',
        hardware_revision: '1.0',
      });
      expect(getByText('Your TBOT is registered!')).toBeTruthy();
      expect(getByText('Go to Home')).toBeTruthy();
    });
  });

  it('returns to the home stack when "Go to Home" is pressed after success', async () => {
    devicesApi.register.mockResolvedValueOnce({});
    const { getByText, getByPlaceholderText } = render(
      <DeviceSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. TBOT-2024-XXXX'), 'TBOT-2024-0001');
    fireEvent.press(getByText('Register Device'));
    await waitFor(() => expect(getByText('Go to Home')).toBeTruthy());
    fireEvent.press(getByText('Go to Home'));
    expect(mockPopToTop).toHaveBeenCalled();
  });

  it('shows the normalized API failure message', async () => {
    devicesApi.register.mockRejectedValueOnce(new Error('Device already registered'));
    const { getByText, getByPlaceholderText } = render(
      <DeviceSetupScreen navigation={mockNavigation} route={mockRoute} />
    );
    fireEvent.changeText(getByPlaceholderText('e.g. TBOT-2024-XXXX'), 'TBOT-2024-0001');
    fireEvent.press(getByText('Register Device'));
    await waitFor(() => {
      expect(getByText(/device already registered/i)).toBeTruthy();
    });
  });
});

// ─── ParentControlsScreen ─────────────────────────────────────────────────────

describe('ParentControlsScreen', () => {
  const { controlsApi } = require('../../src/api/controls');
  const mockRoute = {
    params: { deviceId: 'dev-1' },
    key: 'ParentControls',
    name: 'ParentControls' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controlsApi.getControls.mockResolvedValue({
      daily_limit_minutes: 30,
      quiet_hours_start: '21:00',
      quiet_hours_end: '07:00',
      content_categories_enabled: { stories: true, games: true, stem: true },
    });
    controlsApi.updateControls.mockResolvedValue({});
  });

  it('renders Save Changes button after loading', async () => {
    const { getByLabelText } = render(
      <ParentControlsScreen navigation={mockNavigation} route={mockRoute} />
    );
    await waitFor(() => {
      expect(getByLabelText('Save changes')).toBeTruthy();
    });
  });

  it('renders all three content switches', async () => {
    const { getByLabelText } = render(
      <ParentControlsScreen navigation={mockNavigation} route={mockRoute} />
    );
    await waitFor(() => {
      expect(getByLabelText('Enable stories')).toBeTruthy();
      expect(getByLabelText('Enable games')).toBeTruthy();
      expect(getByLabelText('Enable STEM')).toBeTruthy();
    });
  });

  it('calls updateControls when Save Changes is pressed', async () => {
    const { getByLabelText } = render(
      <ParentControlsScreen navigation={mockNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByLabelText('Save changes')).toBeTruthy());
    fireEvent.press(getByLabelText('Save changes'));
    await waitFor(() => {
      expect(controlsApi.updateControls).toHaveBeenCalledWith('dev-1', expect.objectContaining({
        daily_limit_minutes: 30,
        quiet_hours_start: '21:00',
        quiet_hours_end: '07:00',
      }));
    });
  });

  it('shows success message after save', async () => {
    const { getByLabelText, getByText } = render(
      <ParentControlsScreen navigation={mockNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByLabelText('Save changes')).toBeTruthy());
    fireEvent.press(getByLabelText('Save changes'));
    await waitFor(() => {
      expect(getByText('Settings saved!')).toBeTruthy();
    });
  });

  it('toggles Stories switch', async () => {
    const { getByLabelText } = render(
      <ParentControlsScreen navigation={mockNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByLabelText('Enable stories')).toBeTruthy());
    const storiesSwitch = getByLabelText('Enable stories');
    fireEvent(storiesSwitch, 'valueChange', false);
    fireEvent.press(getByLabelText('Save changes'));
    await waitFor(() => {
      expect(controlsApi.updateControls).toHaveBeenCalledWith(
        'dev-1',
        expect.objectContaining({
          content_categories_enabled: expect.objectContaining({ stories: false }),
        })
      );
    });
  });

  it('shows error on save failure', async () => {
    controlsApi.updateControls.mockRejectedValueOnce(new Error('Server error'));
    const { getByLabelText, getByText } = render(
      <ParentControlsScreen navigation={mockNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByLabelText('Save changes')).toBeTruthy());
    fireEvent.press(getByLabelText('Save changes'));
    await waitFor(() => {
      expect(getByText(/server error/i)).toBeTruthy();
    });
  });

  it('updates daily limit input', async () => {
    const { getByLabelText } = render(
      <ParentControlsScreen navigation={mockNavigation} route={mockRoute} />
    );
    await waitFor(() => expect(getByLabelText('Daily limit in minutes')).toBeTruthy());
    fireEvent.changeText(getByLabelText('Daily limit in minutes'), '60');
    fireEvent.press(getByLabelText('Save changes'));
    await waitFor(() => {
      expect(controlsApi.updateControls).toHaveBeenCalledWith(
        'dev-1',
        expect.objectContaining({ daily_limit_minutes: 60 })
      );
    });
  });
});
