import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FactoryResetScreen from '@/features/robot-mgmt/screens/FactoryResetScreen';
import { ROUTES } from '@/navigation/routes';
import { getDeviceStatus, unpairDevice } from '@/services/api/device.api';
import { clearLocalPairedDevice, getLocalPairedDeviceId } from '@/features/device/pairing/localPairedDevice';

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

const route = {
  key: 'FactoryResetScreen',
  name: 'FactoryResetScreen',
  params: undefined,
} as never;

function pressKeypadDigit(screen: ReturnType<typeof render>, digit: string): void {
  const matches = screen.getAllByText(digit);
  fireEvent.press(matches[matches.length - 1]);
}

describe('FactoryResetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localDeviceMocks.getLocalPairedDeviceId.mockResolvedValue('device-1');
    localDeviceMocks.clearLocalPairedDevice.mockResolvedValue(undefined);
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: 'TBOT-14C19FD1A84A',
      online: true,
      batteryPercent: 87,
    });
    apiMocks.unpairDevice.mockResolvedValue(undefined);
  });

  it('releases the paired Robot before leaving factory reset', async () => {
    const navigation = { navigate: jest.fn() };
    const screen = renderWithQuery(
      <FactoryResetScreen navigation={navigation as never} route={route} />,
    );

    await waitFor(() => expect(apiMocks.getDeviceStatus).toHaveBeenCalledWith('device-1'));

    fireEvent.press(screen.getByText('I understand · continue'));

    const target = screen.getByText(/^\d{3}$/).props.children as number;
    for (const digit of String(target)) {
      pressKeypadDigit(screen, digit);
    }

    await expect(screen.findByText('Erase Robot TBOT-14C19FD1A84A?')).resolves.toBeTruthy();
    fireEvent.press(screen.getByText('Yes, erase Robot'));

    await waitFor(() => expect(apiMocks.unpairDevice).toHaveBeenCalledWith('device-1'));
    await waitFor(() => expect(localDeviceMocks.clearLocalPairedDevice).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.MyRobotScreen));
  });

  it('keeps the parent on the last-check screen when release fails', async () => {
    apiMocks.unpairDevice.mockRejectedValueOnce(new Error('backend unavailable'));
    const navigation = { navigate: jest.fn() };
    const screen = renderWithQuery(
      <FactoryResetScreen navigation={navigation as never} route={route} />,
    );

    await waitFor(() => expect(apiMocks.getDeviceStatus).toHaveBeenCalledWith('device-1'));

    fireEvent.press(screen.getByText('I understand · continue'));

    const target = screen.getByText(/^\d{3}$/).props.children as number;
    for (const digit of String(target)) {
      pressKeypadDigit(screen, digit);
    }

    await expect(screen.findByText('Erase Robot TBOT-14C19FD1A84A?')).resolves.toBeTruthy();
    fireEvent.press(screen.getByText('Yes, erase Robot'));

    await waitFor(() => expect(apiMocks.unpairDevice).toHaveBeenCalledWith('device-1'));
    expect(localDeviceMocks.clearLocalPairedDevice).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.MyRobotScreen);
    await expect(screen.findByText('Could not erase Robot. Try again.')).resolves.toBeTruthy();
  });
});
