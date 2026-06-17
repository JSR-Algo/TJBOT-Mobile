import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import PairSearchScreen from '@/features/device/pairing/screens/PairSearchScreen';
import { ROUTES } from '@/navigation/routes';
import { getDeviceStatus, startDeviceProvisioning } from '@/services/api/device.api';
import { listAvailableClaimDevices } from '@/services/api/claim.api';
import { initializeBle, scanForTJBotDevices } from '@/services/ble/service';

// Phone Wi-Fi must read as ready (type 'wifi') so the scan proceeds past the
// connectivity gate; the global setup mock omits `type`.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn(() => Promise.resolve({ type: 'wifi', isConnected: true })) },
  fetch: jest.fn(() => Promise.resolve({ type: 'wifi', isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('@/services/ble/service', () => ({
  __esModule: true,
  initializeBle: jest.fn(),
  scanForTJBotDevices: jest.fn(),
}));

jest.mock('@/services/api/device.api', () => ({
  __esModule: true,
  getDeviceStatus: jest.fn(),
  startDeviceProvisioning: jest.fn(),
}));

jest.mock('@/services/api/claim.api', () => ({
  __esModule: true,
  listAvailableClaimDevices: jest.fn(),
}));

jest.mock('@/config/feature-flags', () => ({
  __esModule: true,
  FEATURE_SUBSCRIPTION: false,
  isSubscriptionFeatureEnabled: () => false,
  FEATURE_ZERO_CODE_CLAIM: true,
  isZeroCodeClaimEnabled: () => true,
}));

const mockedInitializeBle = initializeBle as jest.MockedFunction<typeof initializeBle>;
const mockedScan = scanForTJBotDevices as jest.MockedFunction<typeof scanForTJBotDevices>;
const mockedGetDeviceStatus = getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>;
const mockedStartProvisioning = startDeviceProvisioning as jest.MockedFunction<typeof startDeviceProvisioning>;
const mockedListAvailable = listAvailableClaimDevices as jest.MockedFunction<typeof listAvailableClaimDevices>;
const mockedNetInfoFetch = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;

function candidate(id: string, serial: string) {
  return { id, name: serial, localName: serial, serviceUUIDs: [] };
}

function renderSearch(navigate: jest.Mock, params?: React.ComponentProps<typeof PairSearchScreen>['route']['params']) {
  return render(<PairSearchScreen navigation={{ navigate } as never} route={{ params } as never} />);
}

describe('PairSearchScreen multi-device picker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedInitializeBle.mockReset();
    mockedScan.mockReset();
    mockedGetDeviceStatus.mockReset();
    mockedStartProvisioning.mockReset();
    mockedListAvailable.mockReset();
    mockedNetInfoFetch.mockReset();
    mockedInitializeBle.mockResolvedValue({ permission: 'granted', available: true });
    mockedNetInfoFetch.mockResolvedValue({ type: 'wifi', isConnected: true } as Awaited<ReturnType<typeof NetInfo.fetch>>);
    mockedStartProvisioning.mockResolvedValue({
      provisioningAttemptId: 'attempt-9',
      deviceId: 'device-9',
      deviceStatus: 'started',
    });
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-owned',
      name: 'TBOT-OWNED',
      online: false,
      batteryPercent: 0,
    });
    mockedListAvailable.mockResolvedValue([]);
  });

  it('routes offline reconnect scans to Wi-Fi setup without starting a new claim attempt', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-owned', 'TBOT-OWNED')],
      blocked: [],
    });
    const navigate = jest.fn();
    renderSearch(navigate, { reconnectMode: true });

    await waitFor(() => expect(mockedGetDeviceStatus).toHaveBeenCalledWith('primary'));
    expect(mockedStartProvisioning).not.toHaveBeenCalled();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, {
      deviceId: 'device-owned',
      serialNumber: 'TBOT-OWNED',
      provisioningAttemptId: 'reconnect:device-owned',
      bleDeviceId: 'ble-owned',
      provisioningTransport: 'ble_reconnect',
    }));
  });

  it('routes a normal scan of the already paired primary robot to PairFound so claim token delivery still runs', async () => {
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-owned',
      name: 'Van phong Tam',
      serialNumber: 'TBOT-OWNED',
      online: true,
      batteryPercent: 77,
    } as unknown as Awaited<ReturnType<typeof getDeviceStatus>>);
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-owned', 'TBOT-OWNED')],
      blocked: [],
    });
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(mockedStartProvisioning).toHaveBeenCalledWith({ serialNumber: 'TBOT-OWNED' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFoundScreen, {
      serialNumber: 'TBOT-OWNED',
      deviceId: 'device-9',
      provisioningAttemptId: 'attempt-9',
      bleDeviceId: 'ble-owned',
      provisioningTransport: 'ble',
    }));
    expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());
  });

  it('keeps the normal new-pairing path when the scanned robot is not the paired primary robot', async () => {
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-owned',
      name: 'Van phong Tam',
      serialNumber: 'TBOT-OWNED',
      online: true,
      batteryPercent: 77,
    } as unknown as Awaited<ReturnType<typeof getDeviceStatus>>);
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-new', 'TBOT-NEW')],
      blocked: [],
    });
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(mockedStartProvisioning).toHaveBeenCalledWith({ serialNumber: 'TBOT-NEW' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFoundScreen, {
      serialNumber: 'TBOT-NEW',
      deviceId: 'device-9',
      provisioningAttemptId: 'attempt-9',
      bleDeviceId: 'ble-new',
      provisioningTransport: 'ble',
    }));
  });

  it('presents a picker when more than one robot is found and does not auto-provision', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-a', 'TBOT-0001'), candidate('ble-b', 'TBOT-0002')],
      blocked: [],
    });
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(screen.getByText('TBOT-0001')).toBeTruthy());
    expect(screen.getByText('TBOT-0002')).toBeTruthy();

    // The wrong-device hazard: provisioning must NOT fire until the user picks.
    expect(mockedStartProvisioning).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFoundScreen, expect.anything());
  });

  it('provisions the chosen robot and forwards to PairFound', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-a', 'TBOT-0001'), candidate('ble-b', 'TBOT-0002')],
      blocked: [],
    });
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(screen.getByText('TBOT-0002')).toBeTruthy());
    fireEvent.press(screen.getByText('TBOT-0002'));

    await waitFor(() => expect(mockedStartProvisioning).toHaveBeenCalledWith({ serialNumber: 'TBOT-0002' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFoundScreen, {
      serialNumber: 'TBOT-0002',
      deviceId: 'device-9',
      provisioningAttemptId: 'attempt-9',
      bleDeviceId: 'ble-b',
      provisioningTransport: 'ble',
    }));
  });

  it('keeps the single-device fast path: one robot auto-provisions without a picker', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-a', 'TBOT-0001')],
      blocked: [],
    });
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(mockedStartProvisioning).toHaveBeenCalledWith({ serialNumber: 'TBOT-0001' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFoundScreen, {
      serialNumber: 'TBOT-0001',
      deviceId: 'device-9',
      provisioningAttemptId: 'attempt-9',
      bleDeviceId: 'ble-a',
      provisioningTransport: 'ble',
    }));
    // No picker copy rendered on the fast path.
    expect(screen.queryByText('We found more than one Robot nearby. Pick the one you want to pair.')).toBeNull();
  });

  it('retries BLE discovery before failing when the robot starts advertising late', async () => {
    mockedScan
      .mockResolvedValueOnce({ allowed: [], blocked: [] })
      .mockResolvedValueOnce({ allowed: [candidate('ble-late', 'TBOT-LATE-1')], blocked: [] });
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(mockedScan).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockedStartProvisioning).toHaveBeenCalledWith({ serialNumber: 'TBOT-LATE-1' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFoundScreen, {
      serialNumber: 'TBOT-LATE-1',
      deviceId: 'device-9',
      provisioningAttemptId: 'attempt-9',
      bleDeviceId: 'ble-late',
      provisioningTransport: 'ble',
    }));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, { errorCode: 'BLE_SCAN_TIMEOUT' });
  });

  it('de-duplicates the same robot seen under multiple BLE ids (no false multi-device picker)', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-a', 'TBOT-0001'), candidate('ble-a2', 'TBOT-0001')],
      blocked: [],
    });
    const navigate = jest.fn();
    renderSearch(navigate);

    // One distinct serial → fast path, not a picker.
    await waitFor(() => expect(mockedStartProvisioning).toHaveBeenCalledWith({ serialNumber: 'TBOT-0001' }));
    expect(mockedStartProvisioning).toHaveBeenCalledTimes(1);
  });

  it('does not enter zero-code claim from backend-only devices without a BLE token channel', async () => {
    mockedScan.mockResolvedValue({ allowed: [], blocked: [] });
    mockedListAvailable.mockResolvedValue([{ 
      deviceId: 'device-online-1',
      displayName: 'TBOT-ONLINE-1',
      model: 'esp32-s3-touch-lcd-3.5',
      state: 'online',
      requiresPhysicalConfirm: true,
      expiresAt: null,
    }]);
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(mockedListAvailable).toHaveBeenCalled());
    expect(mockedStartProvisioning).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFoundScreen, expect.anything());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'BLE_SCAN_TIMEOUT',
    }));
  });

  it('allows BLE discovery over cellular but still requires a BLE device before zero-code claim', async () => {
    mockedNetInfoFetch.mockResolvedValue({
      type: 'cellular',
      isConnected: true,
      isInternetReachable: true,
    } as Awaited<ReturnType<typeof NetInfo.fetch>>);
    mockedScan.mockResolvedValue({ allowed: [], blocked: [] });
    mockedListAvailable.mockResolvedValue([{
      deviceId: 'device-online-cellular',
      displayName: 'TBOT-CELL-1',
      model: 'esp32-s3-touch-lcd-3.5',
      state: 'online',
      requiresPhysicalConfirm: true,
      expiresAt: null,
    }]);
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(mockedListAvailable).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, { errorCode: 'WIFI_UNAVAILABLE' });
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFoundScreen, expect.anything());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'BLE_SCAN_TIMEOUT',
    }));
  });
});
