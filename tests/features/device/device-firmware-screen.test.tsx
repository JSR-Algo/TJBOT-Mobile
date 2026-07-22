import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeviceFirmwareScreen from '../../../src/features/device/screens/DeviceFirmwareScreen';
import { ROUTES } from '../../../src/navigation/routes';
import { firmwareUpdateConnector } from '../../../src/services/connectors/firmware-update.connector';
import { linkBlocked, ok } from '../../../src/services/connectors/types';
import { getLocalPairedDeviceId } from '../../../src/features/device/pairing/localPairedDevice';
import { setAppLanguage } from '../../../src/services/i18n/i18n';

jest.mock('../../../src/services/connectors/firmware-update.connector', () => ({
  firmwareUpdateConnector: {
    getVersion: jest.fn(),
    scheduleUpdate: jest.fn(),
    updateNow: jest.fn(),
  },
}));

jest.mock('../../../src/features/device/pairing/localPairedDevice', () => ({
  getLocalPairedDeviceId: jest.fn(),
}));

const connectorMocks = firmwareUpdateConnector as jest.Mocked<typeof firmwareUpdateConnector>;
const localDeviceMocks = {
  getLocalPairedDeviceId: getLocalPairedDeviceId as jest.MockedFunction<typeof getLocalPairedDeviceId>,
};

type AlertButton = { text?: string; style?: string; onPress?: () => void };

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
    <DeviceFirmwareScreen navigation={navigation as never} route={{ params: undefined } as never} />,
  );
  return { navigation, screen };
}

let alertSpy: jest.SpyInstance;

function latestAlertButtons(): AlertButton[] {
  const calls = alertSpy.mock.calls;
  const last = calls[calls.length - 1];
  return (last?.[2] ?? []) as AlertButton[];
}

describe('DeviceFirmwareScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await setAppLanguage('en');
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    localDeviceMocks.getLocalPairedDeviceId.mockResolvedValue('device-1');
    connectorMocks.getVersion.mockResolvedValue(linkBlocked('unsupported_until_connector', undefined, false));
    connectorMocks.updateNow.mockResolvedValue(linkBlocked('unsupported_until_connector', undefined, false));
    connectorMocks.scheduleUpdate.mockResolvedValue(linkBlocked('unsupported_until_connector', undefined, false));
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('shows the honest connector state instead of a fabricated version and changelog', async () => {
    const { screen } = renderScreen();

    await expect(screen.findByText('Not available yet')).resolves.toBeTruthy();
    expect(screen.getByTestId('connector-state-unsupported_until_connector')).toBeTruthy();
    expect(screen.queryByText('v1.5.0 · 24 MB')).toBeNull();
    expect(screen.queryByText("What's new")).toBeNull();
    expect(screen.queryByText(/24 MB/)).toBeNull();
    expect(connectorMocks.getVersion).toHaveBeenCalledWith('device-1');
  });

  it('confirms "Update now" per BEHAVIOR §5, then renders the blocked state — never a success navigation', async () => {
    const { navigation, screen } = renderScreen();
    await screen.findByText('Not available yet');

    fireEvent.press(screen.getByText('Update now'));

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, body] = alertSpy.mock.calls[0] as [string, string];
    expect(title).toBe('Update Robot now?');
    expect(body).toContain('restarts');
    expect(body).toContain('stay as they are');
    expect(body).toContain('cannot be undone');
    expect(connectorMocks.updateNow).not.toHaveBeenCalled();

    const confirm = latestAlertButtons().find(b => b.text === 'Update now');
    expect(confirm).toBeTruthy();
    confirm?.onPress?.();

    await waitFor(() => expect(connectorMocks.updateNow).toHaveBeenCalledWith('device-1'));
    await expect(screen.findByTestId('connector-state-unsupported_until_connector')).resolves.toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('confirms "Update tonight" with scheduling copy and maps the result honestly', async () => {
    const { screen } = renderScreen();
    await screen.findByText('Not available yet');

    fireEvent.press(screen.getByText('Update tonight (recommended)'));

    const [title] = alertSpy.mock.calls[0] as [string];
    expect(title).toBe('Update Robot tonight?');
    const confirm = latestAlertButtons().find(b => b.text === 'Schedule update');
    confirm?.onPress?.();

    await waitFor(() => expect(connectorMocks.scheduleUpdate).toHaveBeenCalledWith('device-1'));
    expect(connectorMocks.updateNow).not.toHaveBeenCalled();
  });

  it('shows an honest started message only when the connector returns ok', async () => {
    connectorMocks.updateNow.mockResolvedValue(ok(null));
    const { screen } = renderScreen();
    await screen.findByText('Not available yet');

    fireEvent.press(screen.getByText('Update now'));
    latestAlertButtons().find(b => b.text === 'Update now')?.onPress?.();

    await expect(screen.findByText('Update started. Robot will restart when it finishes.')).resolves.toBeTruthy();
  });

  it('renders not_connected and skips the connector when no robot is paired', async () => {
    localDeviceMocks.getLocalPairedDeviceId.mockResolvedValue(null);
    const { navigation, screen } = renderScreen();

    await expect(screen.findByText('No robot connected yet')).resolves.toBeTruthy();
    expect(connectorMocks.getVersion).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Connect Robot'));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PairAddScreen);
  });

  it('offers retry for retryable states only', async () => {
    connectorMocks.getVersion.mockResolvedValue(linkBlocked('server_unavailable', undefined, true));
    const { screen } = renderScreen();

    await expect(screen.findByText("Can't reach the server")).resolves.toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(connectorMocks.getVersion).toHaveBeenCalledTimes(2));
  });
});
