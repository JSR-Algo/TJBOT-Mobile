import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeviceOverviewScreen from '../../../src/features/device/screens/DeviceOverviewScreen';
import { ROUTES } from '../../../src/navigation/routes';
import { getDeviceStatus } from '../../../src/services/api/device.api';
import { getLocalPairedDeviceId } from '../../../src/features/device/pairing/localPairedDevice';
import { setAppLanguage } from '../../../src/services/i18n/i18n';

jest.mock('../../../src/services/api/device.api', () => ({
  getDeviceStatus: jest.fn(),
}));

jest.mock('../../../src/features/device/pairing/localPairedDevice', () => ({
  getLocalPairedDeviceId: jest.fn(),
}));

const apiMocks = {
  getDeviceStatus: getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>,
};
const localDeviceMocks = {
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

function renderScreen() {
  const navigation = { navigate: jest.fn() };
  const screen = renderWithQuery(
    <DeviceOverviewScreen navigation={navigation as never} route={{ params: undefined } as never} />,
  );
  return { navigation, screen };
}

describe('DeviceOverviewScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await setAppLanguage('en');
    localDeviceMocks.getLocalPairedDeviceId.mockResolvedValue(null);
  });

  it('renders real device status and none of the fabricated values', async () => {
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: 'Seed Robot',
      online: true,
      batteryPercent: 87,
      wifiSsid: 'Casa',
    });
    const { screen } = renderScreen();

    await expect(screen.findByText('Seed Robot')).resolves.toBeTruthy();
    expect(screen.getAllByText('Online')).toHaveLength(2);
    expect(screen.getAllByText('87%')).toHaveLength(2);
    expect(screen.getAllByText('Casa')).toHaveLength(2);
    expect(screen.queryByText('Online · idle')).toBeNull();
    expect(screen.queryByText('78%')).toBeNull();
    expect(screen.queryByText('Home')).toBeNull();
  });

  it('routes status, firmware, find, and reset rows to real device screens', async () => {
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: 'Seed Robot',
      online: true,
      batteryPercent: 87,
      wifiSsid: 'Casa',
    });
    const { navigation, screen } = renderScreen();

    await expect(screen.findByText('Seed Robot')).resolves.toBeTruthy();
    fireEvent.press(screen.getByTestId('deviceStatusRow'));
    fireEvent.press(screen.getByTestId('deviceFirmwareRow'));
    fireEvent.press(screen.getByTestId('deviceFindRow'));
    fireEvent.press(screen.getByTestId('deviceResetRow'));

    expect(navigation.navigate).toHaveBeenNthCalledWith(1, ROUTES.RobotStatusScreen);
    expect(navigation.navigate).toHaveBeenNthCalledWith(2, ROUTES.DeviceFirmwareScreen, { deviceId: 'device-1' });
    expect(navigation.navigate).toHaveBeenNthCalledWith(3, ROUTES.DeviceLostScreen);
    expect(navigation.navigate).toHaveBeenNthCalledWith(4, ROUTES.FactoryResetScreen);
  });

  it('renders the connector notice when status is blocked, with working retry', async () => {
    apiMocks.getDeviceStatus.mockRejectedValue({ code: 'ROBOT_OFFLINE', message: 'robot unreachable' });
    const { screen } = renderScreen();

    await expect(screen.findByText('Robot is offline')).resolves.toBeTruthy();
    expect(screen.getByTestId('connector-state-robot_offline')).toBeTruthy();
    expect(screen.queryByText('Online · idle')).toBeNull();

    apiMocks.getDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: 'Seed Robot',
      online: true,
      batteryPercent: 64,
      wifiSsid: 'Casa',
    });
    fireEvent.press(screen.getByText('Try again'));
    await expect(screen.findByText('Seed Robot')).resolves.toBeTruthy();
    await waitFor(() => expect(apiMocks.getDeviceStatus.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('renders not_connected instead of a status when no robot is paired', async () => {
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: '',
      name: 'TJBot',
      online: false,
      batteryPercent: 0,
    });
    const { screen } = renderScreen();

    await expect(screen.findByText('No robot connected yet')).resolves.toBeTruthy();
    expect(screen.getByTestId('connector-state-not_connected')).toBeTruthy();
    expect(screen.queryByText('78%')).toBeNull();
  });

  it('keeps the no-device state focused on recovery instead of marketing copy', async () => {
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: '',
      name: 'TJBot',
      online: false,
      batteryPercent: 0,
    });
    const { navigation, screen } = renderScreen();

    await expect(screen.findByText('No robot connected yet')).resolves.toBeTruthy();
    expect(screen.queryByText('Why a device, not a screen')).toBeNull();
    expect(screen.queryByText('Robot does')).toBeNull();
    expect(screen.queryByText('Phone does')).toBeNull();

    fireEvent.press(screen.getByText('Set up your Robot'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PairAddScreen);
  });
});
