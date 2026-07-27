import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeviceSessionScreen from '../../../src/features/device/screens/DeviceSessionScreen';
import DeviceLostScreen from '../../../src/features/device/screens/DeviceLostScreen';
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

describe('DeviceSessionScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await setAppLanguage('en');
  });

  it('renders the honest unsupported state instead of a scripted live session', () => {
    const navigation = { navigate: jest.fn() };
    const screen = renderWithQuery(
      <DeviceSessionScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    expect(screen.getByText('Lesson on Robot')).toBeTruthy();
    expect(screen.getByTestId('device-session-unsupported')).toBeTruthy();
    expect(screen.getByText('Live lesson view is not ready yet')).toBeTruthy();
    expect(
      screen.getByText(
        'This screen will show what Robot is teaching when the live lesson view is ready. Pairing a Robot does not enable this view yet.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Not available yet')).toBeNull();
    expect(screen.queryByText(/not available in this build/i)).toBeNull();
    expect(screen.queryByText('Live · what Robot sees')).toBeNull();
    expect(screen.queryByText('Unit 2 · Animals')).toBeNull();
    expect(screen.queryByText('Currently: 6 of 10')).toBeNull();
    expect(screen.queryByText('Pause Robot')).toBeNull();
    expect(screen.getByText('Audio stays between Robot and your child. Recordings are not saved.')).toBeTruthy();

    fireEvent.press(screen.getByText('Browse courses'));
    expect(navigation.navigate).toHaveBeenCalledWith(expect.stringMatching(/CourseLibrary/));

    fireEvent.press(screen.getByText('Back to Robot home'));
    expect(navigation.navigate).toHaveBeenCalledWith(expect.stringMatching(/DeviceHome/));
  });
});

describe('DeviceLostScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await setAppLanguage('en');
    localDeviceMocks.getLocalPairedDeviceId.mockResolvedValue('device-1');
  });

  it('shows real status data and no fabricated last-seen or location claims', async () => {
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: 'Seed Robot',
      online: true,
      batteryPercent: 87,
      wifiSsid: 'Casa',
    });
    const navigation = { navigate: jest.fn() };
    const screen = renderWithQuery(
      <DeviceLostScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    await expect(screen.findByText('Online · Casa · 87%')).resolves.toBeTruthy();
    expect(screen.queryByText(/Last seen: 2 min ago/)).toBeNull();
    expect(screen.queryByText(/Probably in/)).toBeNull();
    expect(screen.queryByText(/the living room/)).toBeNull();
  });

  it('renders ordinary error UX when status fails without a link state', async () => {
    apiMocks.getDeviceStatus.mockRejectedValue(new Error('backend unavailable'));
    const navigation = { navigate: jest.fn() };
    const screen = renderWithQuery(
      <DeviceLostScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    await expect(screen.findByText('Robot status unavailable')).resolves.toBeTruthy();
    await expect(screen.findByText('backend unavailable')).resolves.toBeTruthy();
    expect(screen.queryByTestId('connector-state-server_unavailable')).toBeNull();
  });

  it('renders the connector notice for transport link failures', async () => {
    apiMocks.getDeviceStatus.mockRejectedValue(new Error('Network Error'));
    const navigation = { navigate: jest.fn() };
    const screen = renderWithQuery(
      <DeviceLostScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    await expect(screen.findByText("Can't reach the server")).resolves.toBeTruthy();
  });

  it('answers the chime request with the honest blocked state, never a fake chime', async () => {
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: 'Seed Robot',
      online: true,
      batteryPercent: 87,
      wifiSsid: 'Casa',
    });
    const navigation = { navigate: jest.fn() };
    const screen = renderWithQuery(
      <DeviceLostScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    await screen.findByText('Online · Casa · 87%');
    fireEvent.press(screen.getByText('Make Robot chime'));

    await expect(screen.findByTestId('connector-state-unsupported_until_connector')).resolves.toBeTruthy();
    expect(screen.queryByText('Robot is chiming!')).toBeNull();
    expect(screen.queryByText('Stop chime')).toBeNull();
  });

  it('renders not_connected when no robot is paired', async () => {
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: '',
      name: 'TJBot',
      online: false,
      batteryPercent: 0,
    });
    const navigation = { navigate: jest.fn() };
    const screen = renderWithQuery(
      <DeviceLostScreen navigation={navigation as never} route={{ params: undefined } as never} />,
    );

    await expect(screen.findByText('No robot connected yet')).resolves.toBeTruthy();
  });
});
