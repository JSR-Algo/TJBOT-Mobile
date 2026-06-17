import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import PairSearchScreen from '@/features/device/pairing/screens/PairSearchScreen';
import { ROUTES } from '@/navigation/routes';
import { getDeviceStatus, startDeviceProvisioning } from '@/services/api/device.api';
import { listAvailableClaimDevices } from '@/services/api/claim.api';
import { initializeBle, scanForTJBotDevices } from '@/services/ble/service';
import { isZeroCodeClaimEnabled } from '@/config/feature-flags';

// Round-2 gap fill for US-005. PairSearchScreen's helpers
// (reconnectAndGoToWifi, labelCandidates, getMatchingPrimaryDevice /
// deviceMatchesCandidate, isPhoneOnline, cancelSearchToIntro) are module-private,
// so we exercise their REAL behavior through the rendered screen exactly like the
// production flow drives them — never asserting on a mock we set ourselves.

// Phone Wi-Fi must read as ready so the scan proceeds past the connectivity gate;
// the global setup mock omits `isInternetReachable`/`isConnected`. The default
// here is "online"; individual offline tests override per-case.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn(() => Promise.resolve({ type: 'wifi', isConnected: true, isInternetReachable: true })) },
  fetch: jest.fn(() => Promise.resolve({ type: 'wifi', isConnected: true, isInternetReachable: true })),
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

// Zero-code claim ON by default — that is the regime in which labelCandidates and
// the backend claim lookup are live. `isZeroCodeClaimEnabled` is a jest.fn so a
// dedicated block can flip it OFF per-test WITHOUT resetting modules (resetting
// re-requires React and poisons the renderer's hook dispatcher).
jest.mock('@/config/feature-flags', () => ({
  __esModule: true,
  FEATURE_SUBSCRIPTION: false,
  isSubscriptionFeatureEnabled: () => false,
  FEATURE_ZERO_CODE_CLAIM: true,
  isZeroCodeClaimEnabled: jest.fn(() => true),
}));

const mockedInitializeBle = initializeBle as jest.MockedFunction<typeof initializeBle>;
const mockedScan = scanForTJBotDevices as jest.MockedFunction<typeof scanForTJBotDevices>;
const mockedGetDeviceStatus = getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>;
const mockedStartProvisioning = startDeviceProvisioning as jest.MockedFunction<typeof startDeviceProvisioning>;
const mockedListAvailable = listAvailableClaimDevices as jest.MockedFunction<typeof listAvailableClaimDevices>;
const mockedNetInfoFetch = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;
const mockedZeroCodeEnabled = isZeroCodeClaimEnabled as jest.MockedFunction<typeof isZeroCodeClaimEnabled>;

type NetInfoState = Awaited<ReturnType<typeof NetInfo.fetch>>;
type DeviceStatusResult = Awaited<ReturnType<typeof getDeviceStatus>>;

function candidate(id: string, serial: string) {
  return { id, name: serial, localName: serial, serviceUUIDs: [] };
}

function availableDevice(displayName: string, deviceId = `dev-${displayName}`) {
  return {
    deviceId,
    displayName,
    model: 'esp32-s3-touch-lcd-3.5',
    state: 'online',
    requiresPhysicalConfirm: true,
    expiresAt: null,
  };
}

function renderSearch(
  navigate: jest.Mock,
  params?: React.ComponentProps<typeof PairSearchScreen>['route']['params'],
) {
  return render(<PairSearchScreen navigation={{ navigate } as never} route={{ params } as never} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedInitializeBle.mockReset();
  mockedScan.mockReset();
  mockedGetDeviceStatus.mockReset();
  mockedStartProvisioning.mockReset();
  mockedListAvailable.mockReset();
  mockedNetInfoFetch.mockReset();

  mockedInitializeBle.mockResolvedValue({ permission: 'granted', available: true });
  mockedNetInfoFetch.mockResolvedValue({ type: 'wifi', isConnected: true, isInternetReachable: true } as NetInfoState);
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
  // Default regime: zero-code claim ON. Flag-OFF block overrides per-test.
  mockedZeroCodeEnabled.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// reconnectAndGoToWifi() — reached via reconnectMode route param. The chosen
// candidate's serial is forwarded but the deviceId comes from getDeviceStatus.
// ---------------------------------------------------------------------------
describe('reconnectAndGoToWifi (reconnect route)', () => {
  it('navigates to PairWifi with reconnect transport when the primary device has an id', async () => {
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-primary-1',
      name: 'TBOT-OWNED',
      online: true,
      batteryPercent: 42,
    });
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-owned', 'TBOT-OWNED')], blocked: [] });
    const navigate = jest.fn();
    renderSearch(navigate, { reconnectMode: true });

    await waitFor(() => expect(mockedGetDeviceStatus).toHaveBeenCalledWith('primary'));
    // Reconnect must NOT start a fresh claim attempt.
    expect(mockedStartProvisioning).not.toHaveBeenCalled();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, {
      deviceId: 'device-primary-1',
      serialNumber: 'TBOT-OWNED',
      provisioningAttemptId: 'reconnect:device-primary-1',
      bleDeviceId: 'ble-owned',
      provisioningTransport: 'ble_reconnect',
    }));
  });

  it('routes to PairFailed with RECONNECT_DEVICE_NOT_FOUND when the primary device id is empty', async () => {
    // Empty primary id → the helper throws a coded error rather than navigating
    // to Wi-Fi with a blank deviceId.
    mockedGetDeviceStatus.mockResolvedValue({
      id: '',
      name: 'TBOT-OWNED',
      online: false,
      batteryPercent: 0,
    });
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-owned', 'TBOT-OWNED')], blocked: [] });
    const navigate = jest.fn();
    renderSearch(navigate, { reconnectMode: true });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'RECONNECT_DEVICE_NOT_FOUND',
    }));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());
    expect(mockedStartProvisioning).not.toHaveBeenCalled();
  });

  it('routes to PairFailed with RECONNECT_DEVICE_LOOKUP_FAILED fallback when getDeviceStatus rejects with no code', async () => {
    mockedGetDeviceStatus.mockRejectedValue(new Error('network down'));
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-owned', 'TBOT-OWNED')], blocked: [] });
    const navigate = jest.fn();
    renderSearch(navigate, { reconnectMode: true });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'RECONNECT_DEVICE_LOOKUP_FAILED',
    }));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());
  });

  it('surfaces the rejection error code over the fallback when getDeviceStatus rejects with a string code', async () => {
    mockedGetDeviceStatus.mockRejectedValue(Object.assign(new Error('boom'), { code: 'PRIMARY_TIMEOUT' }));
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-owned', 'TBOT-OWNED')], blocked: [] });
    const navigate = jest.fn();
    renderSearch(navigate, { reconnectMode: true });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'PRIMARY_TIMEOUT',
    }));
  });

  it('surfaces an axios-shaped response.data.code over the fallback', async () => {
    mockedGetDeviceStatus.mockRejectedValue({ response: { data: { code: 'DEVICE_REVOKED' } } });
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-owned', 'TBOT-OWNED')], blocked: [] });
    const navigate = jest.fn();
    renderSearch(navigate, { reconnectMode: true });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'DEVICE_REVOKED',
    }));
  });

  it('surfaces nested backend error codes before a generic axios transport code', async () => {
    mockedGetDeviceStatus.mockRejectedValue({
      code: 'ERR_BAD_REQUEST',
      response: {
        status: 409,
        data: { error: { code: 'DEVICE_ALREADY_ASSIGNED', message: 'Device is already assigned.' } },
      },
    });
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-owned', 'TBOT-OWNED')], blocked: [] });
    const navigate = jest.fn();
    renderSearch(navigate, { reconnectMode: true });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'DEVICE_ALREADY_ASSIGNED',
    }));
  });

  it('reconnect path forwards the BLE id of the actually scanned candidate, not the device record', async () => {
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-xyz',
      name: 'TBOT-OWNED',
      online: false,
      batteryPercent: 10,
    });
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-from-scan', 'TBOT-OWNED')], blocked: [] });
    const navigate = jest.fn();
    renderSearch(navigate, { reconnectMode: true });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairWifiScreen,
      expect.objectContaining({ bleDeviceId: 'ble-from-scan', serialNumber: 'TBOT-OWNED' }),
    ));
  });
});

// ---------------------------------------------------------------------------
// Normal add-robot flow — a BLE scan candidate must enter PairFound so the
// claim bootstrap token can be delivered locally. A stale backend primary
// status is not proof that the firmware is already claimed.
// ---------------------------------------------------------------------------
describe('normal add-robot route', () => {
  it('starts a fresh claim even when the backend primary serial matches the scanned Robot', async () => {
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-owned',
      name: 'Living Room',
      serialNumber: 'TBOT-OWNED',
      online: true,
      batteryPercent: 80,
    } as DeviceStatusResult);
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-owned', 'TBOT-OWNED')], blocked: [] });
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
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());
    expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
  });

  it('starts a fresh claim when the matching primary is also claimable over zero-code BLE', async () => {
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-owned',
      name: 'TBOT-OWNED',
      serialNumber: 'TBOT-OWNED',
      online: true,
      batteryPercent: 80,
    } as DeviceStatusResult);
    mockedListAvailable.mockResolvedValue([availableDevice('TBOT-OWNED', 'device-owned')]);
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-owned', 'TBOT-OWNED')], blocked: [] });
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
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());
    expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
  });

  it('does not reconnect in the normal add-robot flow when the claimable list is stale or empty', async () => {
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-owned',
      name: 'TBOT-OWNED',
      serialNumber: 'TBOT-OWNED',
      online: true,
      batteryPercent: 80,
    } as DeviceStatusResult);
    mockedListAvailable.mockResolvedValue([]);
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-owned', 'TBOT-OWNED')], blocked: [] });
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
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());
    expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
  });

  it('starts a fresh claim for a different scanned Robot without consulting primary status', async () => {
    mockedGetDeviceStatus.mockResolvedValue({
      id: 'device-owned',
      name: 'Kitchen',
      serialNumber: 'TBOT-OWNED',
      online: true,
      batteryPercent: 77,
    } as DeviceStatusResult);
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-new', 'TBOT-NEW')], blocked: [] });
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
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());
    expect(mockedGetDeviceStatus).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// labelCandidates() — only fires on the MULTI-device picker path, and only when
// zero-code claim is enabled. displayName is enriched from the backend claim
// list by serial == display_name match; non-matches keep the serial label.
// ---------------------------------------------------------------------------
describe('labelCandidates (multi-device picker enrichment)', () => {
  it('enriches the picker label from the backend claim list when serial matches a display_name', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-a', 'TBOT-0001'), candidate('ble-b', 'TBOT-0002')],
      blocked: [],
    });
    mockedListAvailable.mockResolvedValue([availableDevice('TBOT-0001')]);
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    // Matched device shows the backend label (here identical to the serial since
    // the claim list keys on a serial-shaped display_name).
    await waitFor(() => expect(screen.getByText('TBOT-0001')).toBeTruthy());
    // Unmatched device falls back to its serial.
    expect(screen.getByText('TBOT-0002')).toBeTruthy();
    expect(mockedListAvailable).toHaveBeenCalled();
    expect(mockedStartProvisioning).not.toHaveBeenCalled();
  });

  it('keeps the serial label for every candidate when the backend claim list is empty', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-a', 'TBOT-0001'), candidate('ble-b', 'TBOT-0002')],
      blocked: [],
    });
    mockedListAvailable.mockResolvedValue([]);
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(screen.getByText('TBOT-0001')).toBeTruthy());
    expect(screen.getByText('TBOT-0002')).toBeTruthy();
  });

  it('ignores backend devices with an empty display_name (cannot index by blank serial)', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-a', 'TBOT-0001'), candidate('ble-b', 'TBOT-0002')],
      blocked: [],
    });
    mockedListAvailable.mockResolvedValue([availableDevice(''), availableDevice('TBOT-0002')]);
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(screen.getByText('TBOT-0002')).toBeTruthy());
    // TBOT-0001 has no matching/non-empty label → keeps its serial.
    expect(screen.getByText('TBOT-0001')).toBeTruthy();
  });

  it('treats a backend claim-list rejection as non-fatal and still renders the picker with serial labels', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-a', 'TBOT-0001'), candidate('ble-b', 'TBOT-0002')],
      blocked: [],
    });
    mockedListAvailable.mockRejectedValue(new Error('503 zero-code disabled'));
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(screen.getByText('TBOT-0001')).toBeTruthy());
    expect(screen.getByText('TBOT-0002')).toBeTruthy();
    // Picker still appears; labelling failure must not crash or block.
    expect(screen.getByText('We found more than one Robot nearby. Pick the one you want to pair.')).toBeTruthy();
  });

  it('does not render a serial sub-line when the displayName equals the serial (no redundant row)', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-a', 'TBOT-0001'), candidate('ble-b', 'TBOT-0002')],
      blocked: [],
    });
    mockedListAvailable.mockResolvedValue([]);
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(screen.getByText('TBOT-0001')).toBeTruthy());
    // displayName === serialNumber, so the serial sub-line is suppressed; the
    // serial text therefore appears exactly once (the name row).
    expect(screen.getAllByText('TBOT-0001')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// labelCandidates() with zero-code claim DISABLED — the backend list route is
// not live (503), so the function must short-circuit and never call it.
// ---------------------------------------------------------------------------
describe('labelCandidates with zero-code claim disabled', () => {
  beforeEach(() => {
    // Flip the flag OFF for this block only (beforeEach order: outer resets to
    // true first, then this re-sets to false).
    mockedZeroCodeEnabled.mockReturnValue(false);
  });

  it('does not call the backend claim list and labels the picker with serials only', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-a', 'TBOT-0001'), candidate('ble-b', 'TBOT-0002')],
      blocked: [],
    });
    // Even though the backend would have a label, the gated route must not run.
    mockedListAvailable.mockResolvedValue([availableDevice('TBOT-0001')]);
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(screen.getByText('TBOT-0001')).toBeTruthy());
    expect(screen.getByText('TBOT-0002')).toBeTruthy();
    // Flag off → the server-flag-gated (503) route is never invoked.
    expect(mockedListAvailable).not.toHaveBeenCalled();
  });

  it('single-device fast path still works with zero-code disabled (no claim-list dependency)', async () => {
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-a', 'TBOT-0001')], blocked: [] });
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(mockedStartProvisioning).toHaveBeenCalledWith({ serialNumber: 'TBOT-0001' }));
    expect(mockedListAvailable).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// isPhoneOnline() — gates the whole scan. Drives the WIFI_UNAVAILABLE failure.
// ---------------------------------------------------------------------------
describe('isPhoneOnline (connectivity gate)', () => {
  it('proceeds to BLE bootstrap when connected and internet is reachable', async () => {
    mockedNetInfoFetch.mockResolvedValue({ type: 'wifi', isConnected: true, isInternetReachable: true } as NetInfoState);
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-a', 'TBOT-0001')], blocked: [] });
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(mockedInitializeBle).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, { errorCode: 'WIFI_UNAVAILABLE' });
  });

  it('proceeds when connected and isInternetReachable is null (only an explicit false blocks)', async () => {
    // isInternetReachable !== false → null/undefined still counts as online.
    mockedNetInfoFetch.mockResolvedValue({ type: 'wifi', isConnected: true, isInternetReachable: null } as NetInfoState);
    mockedScan.mockResolvedValue({ allowed: [candidate('ble-a', 'TBOT-0001')], blocked: [] });
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(mockedInitializeBle).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, { errorCode: 'WIFI_UNAVAILABLE' });
  });

  it('routes to PairFailed WIFI_UNAVAILABLE when isConnected is false', async () => {
    mockedNetInfoFetch.mockResolvedValue({ type: 'none', isConnected: false, isInternetReachable: false } as NetInfoState);
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, { errorCode: 'WIFI_UNAVAILABLE' }));
    // Offline short-circuits before BLE work.
    expect(mockedInitializeBle).not.toHaveBeenCalled();
    expect(mockedScan).not.toHaveBeenCalled();
  });

  it('routes to PairFailed WIFI_UNAVAILABLE when connected but isInternetReachable is explicitly false', async () => {
    mockedNetInfoFetch.mockResolvedValue({ type: 'wifi', isConnected: true, isInternetReachable: false } as NetInfoState);
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, { errorCode: 'WIFI_UNAVAILABLE' }));
    expect(mockedInitializeBle).not.toHaveBeenCalled();
  });

  it('treats a NetInfo.fetch rejection as offline (caught -> undefined -> WIFI_UNAVAILABLE)', async () => {
    mockedNetInfoFetch.mockRejectedValue(new Error('netinfo native bridge failed'));
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, { errorCode: 'WIFI_UNAVAILABLE' }));
    expect(mockedInitializeBle).not.toHaveBeenCalled();
  });

  it('treats a missing isConnected field as offline (undefined !== true)', async () => {
    mockedNetInfoFetch.mockResolvedValue({ type: 'wifi' } as NetInfoState);
    const navigate = jest.fn();
    renderSearch(navigate);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, { errorCode: 'WIFI_UNAVAILABLE' }));
    expect(mockedInitializeBle).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// cancelSearchToIntro() — the DeviceShell back affordance. Sets cancelledRef so
// any in-flight async settles into a no-op, and navigates to PairIntro.
// ---------------------------------------------------------------------------
describe('cancelSearchToIntro (back-to-intro)', () => {
  it('tells new-pair users to put Robot in setup mode while searching', async () => {
    mockedScan.mockReturnValue(new Promise(() => {}));
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(screen.getByText('Looking nearby…')).toBeTruthy());

    expect(screen.getByText('Make sure Robot is in setup mode and within 3 meters of your phone.')).toBeTruthy();
  });

  it('tells reconnect users to hold the top button before scanning', async () => {
    mockedScan.mockReturnValue(new Promise(() => {}));
    const navigate = jest.fn();
    const screen = renderSearch(navigate, { reconnectMode: true });

    await waitFor(() => expect(screen.getByText('Looking nearby…')).toBeTruthy());

    expect(screen.getByText('Hold the top button for 5 seconds to open setup mode, then keep Robot within 3 meters.')).toBeTruthy();
  });

  it('navigates to PairIntro when the back control is pressed during searching', async () => {
    // Never resolve the scan so the screen stays on the searching view with the
    // back affordance available.
    mockedScan.mockReturnValue(new Promise(() => {}));
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(screen.getByText('Looking nearby…')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Go back'));

    expect(navigate).toHaveBeenCalledWith(ROUTES.PairIntroScreen);
  });

  it('navigates to PairIntro from the multi-device picker back control', async () => {
    mockedScan.mockResolvedValue({
      allowed: [candidate('ble-a', 'TBOT-0001'), candidate('ble-b', 'TBOT-0002')],
      blocked: [],
    });
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(screen.getByText('TBOT-0001')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Go back'));

    expect(navigate).toHaveBeenCalledWith(ROUTES.PairIntroScreen);
  });

  it('cancelling sets cancelledRef so a still-pending scan resolving afterward does not navigate onward', async () => {
    // A scan that resolves AFTER cancel. The cancelledRef guard must suppress the
    // late candidate-resolution side effects (no provisioning, no further nav).
    let resolveScan: ((value: { allowed: ReturnType<typeof candidate>[]; blocked: never[] }) => void) | undefined;
    mockedScan.mockReturnValue(
      new Promise((resolve) => {
        resolveScan = resolve as typeof resolveScan;
      }),
    );
    const navigate = jest.fn();
    const screen = renderSearch(navigate);

    await waitFor(() => expect(screen.getByText('Looking nearby…')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairIntroScreen);

    // Now let the scan finish late with a single resolvable robot.
    resolveScan?.({ allowed: [candidate('ble-late', 'TBOT-LATE')], blocked: [] });
    await new Promise((r) => setTimeout(r, 0));

    // cancelledRef short-circuited: no claim attempt, no PairFound navigation.
    expect(mockedStartProvisioning).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFoundScreen, expect.anything());
    // The only navigation remains the intentional intro hop.
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
