import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeviceHomeScreen from '@/features/device/screens/DeviceHomeScreen';
import { ROUTES } from '@/navigation/routes';
import { getDeviceStatus, unpairDevice } from '@/services/api/device.api';
import { clearLocalPairedDevice, getLocalPairedDeviceId } from '@/features/device/pairing/localPairedDevice';
import { setAppLanguage } from '@/services/i18n/i18n';

jest.mock('@/services/api/device.api', () => ({
  getDeviceStatus: jest.fn(),
  unpairDevice: jest.fn(),
}));

jest.mock('@/features/device/pairing/localPairedDevice', () => ({
  clearLocalPairedDevice: jest.fn(),
  getLocalPairedDeviceId: jest.fn(),
}));

const apiMocks = {
  getDeviceStatus: getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>,
  unpairDevice: unpairDevice as jest.MockedFunction<typeof unpairDevice>,
};

const localDeviceMocks = {
  clearLocalPairedDevice: clearLocalPairedDevice as jest.MockedFunction<typeof clearLocalPairedDevice>,
  getLocalPairedDeviceId: getLocalPairedDeviceId as jest.MockedFunction<typeof getLocalPairedDeviceId>,
};

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('DeviceHomeScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await setAppLanguage('en');
    localDeviceMocks.clearLocalPairedDevice.mockResolvedValue(undefined);
    localDeviceMocks.getLocalPairedDeviceId.mockResolvedValue(null);
  });

  it('shows connect setup when no local or backend Robot is paired', async () => {
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: '',
      name: 'TJBot',
      online: false,
      batteryPercent: 0,
    });
    const navigation = { navigate: jest.fn() };

    const screen = renderWithQuery(
      <DeviceHomeScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    await expect(screen.findByText('No Robot connected')).resolves.toBeTruthy();
    expect(apiMocks.getDeviceStatus).toHaveBeenCalledWith('primary');

    fireEvent.press(screen.getByText('Connect Robot'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PairAddScreen);
  });

  it('falls back to backend primary Robot status when local paired id is absent', async () => {
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: 'seed-device',
      name: 'Seed Robot',
      online: true,
      batteryPercent: 87,
    });
    const navigation = { navigate: jest.fn() };

    const screen = renderWithQuery(
      <DeviceHomeScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    await expect(screen.findByText('Seed Robot')).resolves.toBeTruthy();
    expect(screen.queryByText('No Robot connected')).toBeNull();
    expect(apiMocks.getDeviceStatus).toHaveBeenCalledWith('primary');
  });

  it('does not translate Robot names that match app copy keys', async () => {
    await setAppLanguage('vi');
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: 'device-copy-key',
      name: 'Settings',
      online: true,
      batteryPercent: 87,
      wifiSsid: 'Language',
    });
    const navigation = { navigate: jest.fn() };

    const screen = renderWithQuery(
      <DeviceHomeScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    await expect(screen.findByText('Settings')).resolves.toBeTruthy();
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByLabelText('Hủy ghép nối Robot. Đưa Robot này về chế độ thiết lập')).toBeTruthy();
    expect(screen.queryByText('Cài đặt')).toBeNull();
    expect(screen.queryByLabelText('Unpair this Robot. Return this Robot to setup mode')).toBeNull();
  });

  it('unpairs the backend primary device from the device screen', async () => {
    localDeviceMocks.getLocalPairedDeviceId.mockResolvedValue('device-1');
    apiMocks.getDeviceStatus.mockResolvedValueOnce({
      id: 'device-1',
      name: 'TJBot-0001',
      online: true,
      batteryPercent: 87,
      wifiSsid: 'Casa',
      lastSeenAt: '2026-05-16T00:00:00.000Z',
    }).mockResolvedValue({
      id: '',
      name: 'TJBot',
      online: false,
      batteryPercent: 0,
    });
    apiMocks.unpairDevice.mockResolvedValue(undefined);
    const navigation = { navigate: jest.fn() };

    const screen = renderWithQuery(
      <DeviceHomeScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    await expect(screen.findByText('TJBot-0001')).resolves.toBeTruthy();
    fireEvent.press(screen.getByLabelText('Unpair this Robot. Return this Robot to setup mode'));

    await waitFor(() => expect(localDeviceMocks.clearLocalPairedDevice).toHaveBeenCalled());
    await waitFor(() => expect(apiMocks.unpairDevice).toHaveBeenCalledWith('device-1'));
    await expect(screen.findByText('No Robot connected')).resolves.toBeTruthy();
  });

  it('keeps the Robot visible when backend unpair fails', async () => {
    localDeviceMocks.getLocalPairedDeviceId.mockResolvedValue('device-1');
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: 'TJBot-0001',
      online: true,
      batteryPercent: 87,
    });
    apiMocks.unpairDevice.mockRejectedValue(new Error('backend unavailable'));
    const navigation = { navigate: jest.fn() };

    const screen = renderWithQuery(
      <DeviceHomeScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    await expect(screen.findByText('TJBot-0001')).resolves.toBeTruthy();
    fireEvent.press(screen.getByLabelText('Unpair this Robot. Return this Robot to setup mode'));

    await waitFor(() => expect(apiMocks.unpairDevice).toHaveBeenCalledWith('device-1'));
    expect(localDeviceMocks.clearLocalPairedDevice).not.toHaveBeenCalled();
    await expect(screen.findByText('Could not unpair Robot. Try again.')).resolves.toBeTruthy();
  });
});
