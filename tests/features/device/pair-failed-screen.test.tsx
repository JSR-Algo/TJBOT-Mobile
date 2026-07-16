import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import PairFailedScreen from '@/features/device/pairing/screens/PairFailedScreen';
import { ROUTES } from '@/navigation/routes';
import { getClaimStatus } from '@/services/api/claim.api';
import { getProvisioningAttemptStatus } from '@/services/api/device.api';
import { openAppSettings, openBluetoothSettings, openWifiSettings } from '@/features/device/pairing/deviceSettings';
import { CLAIM_STATUS } from '@/features/device/pairing/claimStatus';
import { captureError } from '@/services/observability/sentry';

// ---------------------------------------------------------------------------
// US-005 round-2 gap fill — exhaustive behavioural coverage for
// PairFailedScreen.tsx: late-BLE-claim recovery effect, copyForError() copy
// matrix, reason-card visibility, settings-action wiring, setup-hotspot
// affordance, and the always-on recovery buttons.
//
// No DB / no network: claim.api.getClaimStatus and the deviceSettings deep-link
// helpers are jest.fn mocks. i18n is left real (it returns the key unchanged for
// non-key strings), matching the sibling pair-failed-recovery harness.
// ---------------------------------------------------------------------------

jest.mock('@/services/api/claim.api', () => ({
  __esModule: true,
  getClaimStatus: jest.fn(),
}));

jest.mock('@/services/api/device.api', () => ({
  __esModule: true,
  getProvisioningAttemptStatus: jest.fn(),
}));

jest.mock('@/features/device/pairing/deviceSettings', () => ({
  __esModule: true,
  openWifiSettings: jest.fn(() => Promise.resolve()),
  openBluetoothSettings: jest.fn(() => Promise.resolve()),
  openAppSettings: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/services/observability/sentry', () => ({
  __esModule: true,
  captureError: jest.fn(),
}));

const mockedGetClaimStatus = getClaimStatus as jest.MockedFunction<typeof getClaimStatus>;
const mockedGetProvisioningAttemptStatus = getProvisioningAttemptStatus as jest.MockedFunction<typeof getProvisioningAttemptStatus>;
const mockedOpenWifiSettings = openWifiSettings as jest.MockedFunction<typeof openWifiSettings>;
const mockedOpenBluetoothSettings = openBluetoothSettings as jest.MockedFunction<typeof openBluetoothSettings>;
const mockedOpenAppSettings = openAppSettings as jest.MockedFunction<typeof openAppSettings>;
const mockedCaptureError = captureError as jest.MockedFunction<typeof captureError>;

type Nav = { navigate: jest.Mock; reset: jest.Mock };

function makeNav(): Nav {
  return { navigate: jest.fn(), reset: jest.fn() };
}

function renderScreen(params: Record<string, unknown> | undefined, nav: Nav = makeNav()) {
  const screen = render(
    <PairFailedScreen
      navigation={nav as never}
      route={{ params } as never}
    />,
  );
  return { screen, nav };
}

// A complete late-BLE-claim recovery payload: ble transport, all ids present,
// no `code` (zero-code BLE flow). This is the only shape that arms the recovery
// effect (canRecoverLateBleClaim).
function lateBleClaimParams(overrides: Record<string, unknown> = {}) {
  return {
    deviceId: 'device-1',
    serialNumber: 'TBT-2026-004217',
    provisioningAttemptId: 'claim-1',
    provisioningTransport: 'ble',
    deliveryUnknown: true,
    ...overrides,
  };
}

function claimStatus(overrides: Partial<{
  claimId: string;
  deviceId: string;
  status: string;
  online: boolean;
  expiresAt: string | null;
  failureCode: string | null;
}> = {}) {
  return {
    claimId: 'claim-1',
    deviceId: 'device-1',
    status: 'WAITING_PHYSICAL_CONFIRM',
    online: false,
    expiresAt: null,
    failureCode: null,
    ...overrides,
  } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: status check resolves to a still-waiting claim → no navigation.
  mockedGetClaimStatus.mockResolvedValue(claimStatus());
  mockedGetProvisioningAttemptStatus.mockResolvedValue({
    provisioningAttemptId: 'claim-1',
    deviceId: 'device-1',
    status: 'ble_paired',
  });
});

// ===========================================================================
// 1. copyForError() — distinct heading/body per error code (+ default).
// ===========================================================================
describe('PairFailedScreen copyForError matrix', () => {
  const cases: { errorCode: string; heading: string; bodyIncludes: string }[] = [
    { errorCode: 'WIFI_UNAVAILABLE', heading: 'Turn on Wi-Fi first', bodyIncludes: 'Connect this phone to Wi-Fi before pairing' },
    { errorCode: 'BLE_UNAVAILABLE', heading: "Bluetooth can't be used here", bodyIncludes: 'Check Bluetooth permissions' },
    { errorCode: 'BLE_POWERED_OFF', heading: 'Turn on Bluetooth first', bodyIncludes: 'Bluetooth is required to find Robot nearby' },
    { errorCode: 'BLE_PERMISSION_DENIED', heading: 'Allow Bluetooth access', bodyIncludes: 'Allow Nearby devices and Location' },
    { errorCode: 'BLE_SERVICE_UNAVAILABLE', heading: "We couldn't start Bluetooth setup", bodyIncludes: 'Close and reopen the app' },
    {
      errorCode: 'BLE_SCAN_TIMEOUT',
      heading: "We couldn't see Robot nearby",
      bodyIncludes: 'Double-click the BOOT button to change Wi-Fi without unpairing Robot.',
    },
    { errorCode: 'BLE_SCAN_ERROR', heading: "Bluetooth scan didn't start", bodyIncludes: 'Turn Bluetooth off and on' },
    { errorCode: 'BLE_SCAN_THROTTLED', heading: 'Bluetooth needs a short break', bodyIncludes: 'started too often' },
    { errorCode: 'DEVICE_NOT_FOUND', heading: CLAIM_STATUS.NO_DEVICE_AVAILABLE.title, bodyIncludes: CLAIM_STATUS.NO_DEVICE_AVAILABLE.body },
    { errorCode: 'INVALID_BLE_CODE', heading: CLAIM_STATUS.CLAIM_INVALID_CODE.title, bodyIncludes: CLAIM_STATUS.CLAIM_INVALID_CODE.body },
    { errorCode: 'CLAIM_CONFIRM_TIMEOUT', heading: CLAIM_STATUS.CLAIM_CONFIRM_TIMEOUT.title, bodyIncludes: CLAIM_STATUS.CLAIM_CONFIRM_TIMEOUT.body },
    { errorCode: 'PROVISIONING_ATTEMPT_NOT_READY', heading: 'Robot is not ready yet', bodyIncludes: 'Keep Robot powered on and close by' },
    { errorCode: 'DEVICE_AUTH_NOT_VERIFIED', heading: 'Robot is not ready yet', bodyIncludes: 'Keep Robot powered on and close by' },
    { errorCode: 'BLE_PROVISIONING_UNSUPPORTED', heading: "Robot didn't accept setup over Bluetooth", bodyIncludes: 'Double-click BOOT' },
    { errorCode: 'BLE_PROVISIONING_FAILED', heading: "Robot didn't accept setup over Bluetooth", bodyIncludes: 'Double-click BOOT' },
    { errorCode: 'BLE_PROVISIONING_DISCONNECTED', heading: "Robot didn't accept setup over Bluetooth", bodyIncludes: 'Double-click BOOT' },
    { errorCode: 'BLE_PROVISIONING_GATT_ERROR', heading: "Robot didn't accept setup over Bluetooth", bodyIncludes: 'Double-click BOOT' },
    { errorCode: 'BLE_PROVISIONING_WRITE_TIMEOUT', heading: "Robot didn't accept setup over Bluetooth", bodyIncludes: 'Double-click BOOT' },
    { errorCode: 'BLE_PROVISIONING_MTU_ERROR', heading: "Robot didn't accept setup over Bluetooth", bodyIncludes: 'Double-click BOOT' },
    { errorCode: 'PAIRING_CONNECT_FAILED', heading: "Robot didn't accept setup over Bluetooth", bodyIncludes: 'Double-click BOOT' },
    { errorCode: 'ESP_SERVER_UNAVAILABLE', heading: "We couldn't reach setup service", bodyIncludes: 'unavailable right now' },
    { errorCode: 'PROVISIONING_START_FAILED', heading: "We couldn't start pairing", bodyIncludes: 'keep Bluetooth on, then try scanning again' },
    { errorCode: 'PROVISIONING_TIMEOUT', heading: 'Setup timed out', bodyIncludes: 'Move Robot closer to Wi-Fi' },
    { errorCode: 'OFFLINE_BACKEND_CONFIRMATION_TIMEOUT', heading: 'Robot has not checked in yet', bodyIncludes: 'did not appear online' },
    { errorCode: 'OFFLINE_DEVICE_NOT_REGISTERED', heading: 'Wi-Fi worked, but Robot is not on your account', bodyIncludes: 'account pairing did not finish' },
    { errorCode: 'WIFI_CONNECT_TIMEOUT', heading: 'Robot did not join Wi-Fi in time', bodyIncludes: 'near the router' },
    { errorCode: 'WIFI_CONNECT_FAILED', heading: 'Wi-Fi password did not work', bodyIncludes: 'check capitalization' },
    { errorCode: 'WIFI_AUTH_FAILED', heading: 'Wi-Fi password did not work', bodyIncludes: 'check capitalization' },
    { errorCode: 'DEVICE_ALREADY_ASSIGNED', heading: 'Robot is already paired', bodyIncludes: 'assigned to another account' },
    { errorCode: 'DEVICE_ALREADY_CLAIMED', heading: CLAIM_STATUS.DEVICE_ALREADY_CLAIMED.title, bodyIncludes: CLAIM_STATUS.DEVICE_ALREADY_CLAIMED.body },
  ];

  it.each(cases)('renders distinct heading "$heading" for $errorCode', ({ errorCode, heading, bodyIncludes }) => {
    const { screen } = renderScreen({ errorCode });
    const bodyPattern = new RegExp(bodyIncludes.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    expect(screen.getByText(heading)).toBeTruthy();
    expect(screen.getByText(bodyPattern)).toBeTruthy();
  });

  it('falls back to the generic copy for an unknown error code', () => {
    const { screen } = renderScreen({ errorCode: 'SOMETHING_WE_DO_NOT_MAP' });
    expect(screen.getByText("We couldn't reach your Robot")).toBeTruthy();
    expect(screen.getByText(/Pairing usually works on the second try/)).toBeTruthy();
  });

  it('falls back to the generic copy when no errorCode is provided', () => {
    const { screen } = renderScreen(undefined);
    expect(screen.getByText("We couldn't reach your Robot")).toBeTruthy();
  });

  it('falls back to the generic copy when params has no errorCode key', () => {
    const { screen } = renderScreen({ deviceId: 'device-1' });
    expect(screen.getByText("We couldn't reach your Robot")).toBeTruthy();
  });

  it('every mapped errorCode produces a unique heading (no accidental collisions across families)', () => {
    // Headings that are intentionally shared collapse to a set; assert the set
    // has the right cardinality so a future careless edit that merges two
    // distinct families is caught.
    const headings = cases.map(c => c.heading);
    const unique = new Set(headings);
    // 27 mapped codes collapse to 20 distinct headings via two intentional
    // shared families:
    //   - BLE_PROVISIONING_* / PAIRING_CONNECT_FAILED
    //     -> "Robot didn't accept setup over Bluetooth" (7 -> 1)
    //   - PROVISIONING_ATTEMPT_NOT_READY / DEVICE_AUTH_NOT_VERIFIED -> "Robot is not ready yet" (2 -> 1)
    //   - WIFI_CONNECT_FAILED / WIFI_AUTH_FAILED share "Wi-Fi password did not work" (2 -> 1)
    // Plus OFFLINE_DEVICE_NOT_REGISTERED and WIFI_CONNECT_TIMEOUT unique headings.
    // 30 mapped cases with the shares above → 22 unique headings.
    expect(unique.size).toBe(22);
    // The two shared local headings must each still be reachable.
    expect(unique.has("Robot didn't accept setup over Bluetooth")).toBe(true);
    expect(unique.has('Robot is not ready yet')).toBe(true);
  });
});

// ===========================================================================
// 2. shouldShowReasonCards() — reason cards shown except already-owned states.
// ===========================================================================
describe('PairFailedScreen reason cards visibility', () => {
  const REASON_TITLES = ['Robot looks asleep', 'Wrong Wi-Fi password', 'Robot is too far', 'Battery is low'];

  it('shows all four reason cards for the generic (no errorCode) failure', () => {
    const { screen } = renderScreen(undefined);
    for (const title of REASON_TITLES) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  it('shows reason cards for an arbitrary mapped error (e.g. BLE_SCAN_TIMEOUT)', () => {
    const { screen } = renderScreen({ errorCode: 'BLE_SCAN_TIMEOUT' });
    for (const title of REASON_TITLES) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  it('hides reason cards for DEVICE_ALREADY_ASSIGNED', () => {
    const { screen } = renderScreen({ errorCode: 'DEVICE_ALREADY_ASSIGNED' });
    for (const title of REASON_TITLES) {
      expect(screen.queryByText(title)).toBeNull();
    }
  });

  it('hides reason cards for DEVICE_ALREADY_CLAIMED', () => {
    const { screen } = renderScreen({ errorCode: 'DEVICE_ALREADY_CLAIMED' });
    for (const title of REASON_TITLES) {
      expect(screen.queryByText(title)).toBeNull();
    }
  });
});

// ===========================================================================
// 3. Reason-card navigation — each card routes to its declared target.
// ===========================================================================
describe('PairFailedScreen reason-card navigation', () => {
  it('"Wrong Wi-Fi password" card forwards the original params to PairWifiPasswordScreen', () => {
    const params = {
      errorCode: 'WIFI_AUTH_FAILED',
      ssid: 'Casa',
      deviceId: 'device-1',
      serialNumber: 'TBOT-14C19FD1A84A',
      provisioningAttemptId: '656c46f2-882b-4738-bf6b-f82ae2e2f7d7',
      code: '123456',
    };
    const { screen, nav } = renderScreen(params);
    fireEvent.press(screen.getByText('Wrong Wi-Fi password'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen, params);
  });

  it('"Wrong Wi-Fi password" rescans instead of retrying a zero-code BLE attempt that has lost its claim token', () => {
    const params = {
      errorCode: 'NO_DEVICE_AVAILABLE',
      ssid: 'Casa',
      deviceId: 'device-1',
      serialNumber: 'TBOT-14C19FD1A84A',
      provisioningAttemptId: '656c46f2-882b-4738-bf6b-f82ae2e2f7d7',
      bleDeviceId: '14:C1:9F:D1:A8:4A',
      provisioningTransport: 'ble',
    };
    const { screen, nav } = renderScreen(params);
    fireEvent.press(screen.getByText('Wrong Wi-Fi password'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, { reconnectMode: false });
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen, expect.anything());
  });

  it('"Wrong Wi-Fi password" rescans when route params are undefined', () => {
    const { screen, nav } = renderScreen(undefined);
    fireEvent.press(screen.getByText('Wrong Wi-Fi password'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, { reconnectMode: false });
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen, expect.anything());
  });

  it('"Robot is too far" card routes to PairSearchScreen', () => {
    const { screen, nav } = renderScreen({ errorCode: 'BLE_SCAN_TIMEOUT' });
    fireEvent.press(screen.getByText('Robot is too far'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, { reconnectMode: false });
  });

  it('"Robot looks asleep" card routes to PairIntroScreen', () => {
    const { screen, nav } = renderScreen(undefined);
    fireEvent.press(screen.getByText('Robot looks asleep'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairIntroScreen);
  });

  it('"Robot looks asleep" keeps reconnect search for reconnect failures', () => {
    const { screen, nav } = renderScreen({
      errorCode: 'RECONNECT_DEVICE_OFFLINE_TIMEOUT',
      deviceId: 'device-1',
      serialNumber: 'TBOT-14C19FD1A84A',
      provisioningAttemptId: 'reconnect:device-1',
      bleDeviceId: '14:C1:9F:D1:A8:4A',
      provisioningTransport: 'ble_reconnect',
    });
    fireEvent.press(screen.getByText('Robot looks asleep'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, {
      reconnectMode: true,
      reconnectDeviceId: 'device-1',
      reconnectSerialNumber: 'TBOT-14C19FD1A84A',
    });
  });

  it('"Battery is low" card routes to PairIntroScreen', () => {
    const { screen, nav } = renderScreen(undefined);
    fireEvent.press(screen.getByText('Battery is low'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairIntroScreen);
  });

});

// ===========================================================================
// 4. settingsActionForError() — deep-link settings button.
// ===========================================================================
describe('PairFailedScreen settings action button', () => {
  it('WIFI_UNAVAILABLE shows "Open Wi-Fi settings" and triggers openWifiSettings', () => {
    const { screen } = renderScreen({ errorCode: 'WIFI_UNAVAILABLE' });
    const btn = screen.getByLabelText('Open Wi-Fi settings');
    expect(btn).toBeTruthy();
    fireEvent.press(btn);
    expect(mockedOpenWifiSettings).toHaveBeenCalledTimes(1);
    expect(mockedOpenBluetoothSettings).not.toHaveBeenCalled();
    expect(mockedOpenAppSettings).not.toHaveBeenCalled();
  });

  it('BLE_UNAVAILABLE shows "Open Bluetooth settings" and triggers openBluetoothSettings', () => {
    const { screen } = renderScreen({ errorCode: 'BLE_UNAVAILABLE' });
    const btn = screen.getByLabelText('Open Bluetooth settings');
    fireEvent.press(btn);
    expect(mockedOpenBluetoothSettings).toHaveBeenCalledTimes(1);
    expect(mockedOpenWifiSettings).not.toHaveBeenCalled();
  });

  it('BLE_POWERED_OFF shows "Open Bluetooth settings" and triggers openBluetoothSettings', () => {
    const { screen } = renderScreen({ errorCode: 'BLE_POWERED_OFF' });
    const btn = screen.getByLabelText('Open Bluetooth settings');
    fireEvent.press(btn);
    expect(mockedOpenBluetoothSettings).toHaveBeenCalledTimes(1);
  });

  it('BLE_PERMISSION_DENIED shows "Open app settings" and triggers openAppSettings', () => {
    const { screen } = renderScreen({ errorCode: 'BLE_PERMISSION_DENIED' });
    const btn = screen.getByLabelText('Open app settings');
    fireEvent.press(btn);
    expect(mockedOpenAppSettings).toHaveBeenCalledTimes(1);
    expect(mockedOpenBluetoothSettings).not.toHaveBeenCalled();
    expect(mockedOpenWifiSettings).not.toHaveBeenCalled();
  });

  it('does NOT render a settings button for an unmapped error (default branch)', () => {
    const { screen } = renderScreen({ errorCode: 'BLE_SCAN_TIMEOUT' });
    expect(screen.queryByLabelText('Open Wi-Fi settings')).toBeNull();
    expect(screen.queryByLabelText('Open Bluetooth settings')).toBeNull();
    expect(screen.queryByLabelText('Open app settings')).toBeNull();
  });

  it('does NOT render a settings button when there is no errorCode', () => {
    const { screen } = renderScreen(undefined);
    expect(screen.queryByLabelText('Open Wi-Fi settings')).toBeNull();
    expect(screen.queryByLabelText('Open Bluetooth settings')).toBeNull();
    expect(screen.queryByLabelText('Open app settings')).toBeNull();
  });
});

// ===========================================================================
// 5. BluFi-only recovery — backend/ESP credential forwarding is not supported.
// ===========================================================================
describe('PairFailedScreen BluFi-only recovery', () => {
  function hotspotParams(overrides: Record<string, unknown> = {}) {
    return {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
      code: '123456',
      ...overrides,
    };
  }

  it('never offers the removed setup-hotspot transport', () => {
    const { screen } = renderScreen(hotspotParams());
    expect(screen.queryByText('Use setup hotspot')).toBeNull();
  });

  it('retries through robot discovery instead of forwarding credentials to backend', () => {
    const { screen, nav } = renderScreen(hotspotParams());
    fireEvent.press(screen.getByText('Try Bluetooth setup again'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, { reconnectMode: false });
  });
});

// ===========================================================================
// 6. Always-on recovery buttons + back/header.
// ===========================================================================
describe('PairFailedScreen always-on actions', () => {
  it('renders Scan QR / Bluetooth retry / Contact support on every failure', () => {
    const { screen } = renderScreen(undefined);
    expect(screen.getByLabelText('Scan QR or enter code')).toBeTruthy();
    expect(screen.getByText('Try Bluetooth setup again')).toBeTruthy();
    expect(screen.getByLabelText('Contact support')).toBeTruthy();
  });

  it('"Scan QR or enter code" routes to PairQrScanScreen', () => {
    const { screen, nav } = renderScreen(undefined);
    fireEvent.press(screen.getByLabelText('Scan QR or enter code'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairQrScanScreen);
  });

  it('"Scan QR or enter code" carries recovery context into QR/code fallback', () => {
    const params = {
      errorCode: 'WIFI_CONNECT_FAILED',
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
      ssid: 'Casa',
      bleDeviceId: 'ble-device-1',
      provisioningTransport: 'ble',
    };
    const { screen, nav } = renderScreen(params);
    fireEvent.press(screen.getByLabelText('Scan QR or enter code'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairQrScanScreen, params);
  });

  it('Bluetooth retry routes to a fresh PairSearchScreen flow', () => {
    const { screen, nav } = renderScreen(undefined);
    fireEvent.press(screen.getByText('Try Bluetooth setup again'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, { reconnectMode: false });
  });

  it('Bluetooth retry keeps reconnect mode for a reconnect failure', () => {
    const { screen, nav } = renderScreen({
      errorCode: 'RECONNECT_DEVICE_OFFLINE_TIMEOUT',
      deviceId: 'device-1',
      serialNumber: 'TBOT-14C19FD1A84A',
      provisioningAttemptId: 'reconnect:device-1',
      ssid: 'Casa',
      bleDeviceId: '14:C1:9F:D1:A8:4A',
      provisioningTransport: 'ble_reconnect',
    });
    fireEvent.press(screen.getByText('Try Bluetooth setup again'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, {
      reconnectMode: true,
      reconnectDeviceId: 'device-1',
      reconnectSerialNumber: 'TBOT-14C19FD1A84A',
    });
  });

  it('"Contact support" routes to SupportScreen with the wifi/robot_offline context', () => {
    const { screen, nav } = renderScreen(undefined);
    fireEvent.press(screen.getByLabelText('Contact support'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.SupportScreen, {
      context: { topic: 'wifi', errorFamily: 'robot_offline' },
    });
  });

  it('the always-on actions are present even in the already-owned (no reason cards) state', () => {
    const { screen } = renderScreen({ errorCode: 'DEVICE_ALREADY_ASSIGNED' });
    expect(screen.getByLabelText('Scan QR or enter code')).toBeTruthy();
    expect(screen.getByText('Try Bluetooth setup again')).toBeTruthy();
    expect(screen.getByLabelText('Contact support')).toBeTruthy();
  });

  it('header back keeps reconnect search for reconnect failures', () => {
    const { screen, nav } = renderScreen({
      errorCode: 'RECONNECT_DEVICE_OFFLINE_TIMEOUT',
      deviceId: 'device-1',
      serialNumber: 'TBOT-14C19FD1A84A',
      provisioningAttemptId: 'reconnect:device-1',
      bleDeviceId: '14:C1:9F:D1:A8:4A',
      provisioningTransport: 'ble_reconnect',
    });
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, {
      reconnectMode: true,
      reconnectDeviceId: 'device-1',
      reconnectSerialNumber: 'TBOT-14C19FD1A84A',
    });
  });
});

// ===========================================================================
// 7. Late zero-code claim recovery effect — canRecoverLateClaim + getClaimStatus.
// ===========================================================================
describe('PairFailedScreen late-BLE-claim recovery effect', () => {
  it('settles its pending retry delay when the recovery screen unmounts', async () => {
    jest.useFakeTimers();
    try {
      const { screen } = renderScreen(lateBleClaimParams());
      await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalledTimes(1));

      screen.unmount();
      await act(async () => Promise.resolve());

      await act(async () => {
        await jest.advanceTimersByTimeAsync(6000);
      });
      expect(mockedGetClaimStatus).toHaveBeenCalledTimes(1);
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('does not trap a non-ambiguous BLE failure even when the backend attempt is pending', async () => {
    const { screen, nav } = renderScreen(lateBleClaimParams({
      deliveryUnknown: false,
      errorCode: 'BLE_PROVISIONING_GATT_ERROR',
    }));

    await waitFor(() => expect(true).toBe(true));
    expect(mockedGetClaimStatus).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Try Bluetooth setup again'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen, { reconnectMode: false });
  });

  it.each(['WIFI_CONNECT_FAILED', 'WIFI_AUTH_FAILED'])(
    'does not late-recover definitive %s into success',
    async (errorCode) => {
      mockedGetClaimStatus.mockResolvedValue(claimStatus({ status: 'CLAIM_CONFIRMED' }));
      const { nav } = renderScreen(lateBleClaimParams({ errorCode }));

      await waitFor(() => expect(true).toBe(true));
      expect(mockedGetClaimStatus).not.toHaveBeenCalled();
      expect(mockedGetProvisioningAttemptStatus).not.toHaveBeenCalled();
      expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
    },
  );

  it('polls a waiting zero-code claim until it becomes confirmed', async () => {
    jest.useFakeTimers();
    try {
      mockedGetClaimStatus
        .mockResolvedValueOnce(claimStatus({ status: 'WAITING_PHYSICAL_CONFIRM' }))
        .mockResolvedValueOnce(claimStatus({ status: 'CLAIM_CONFIRMED' }));
      const { nav } = renderScreen(lateBleClaimParams());

      await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalledTimes(1));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });

      await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
        deviceId: 'device-1',
        serialNumber: 'TBT-2026-004217',
        provisioningAttemptId: 'claim-1',
      }));
      expect(mockedGetClaimStatus).toHaveBeenCalledTimes(2);
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('polls a code attempt until the robot becomes device-authenticated', async () => {
    jest.useFakeTimers();
    try {
      mockedGetProvisioningAttemptStatus
        .mockResolvedValueOnce({ provisioningAttemptId: 'claim-1', deviceId: 'device-1', status: 'ble_paired' })
        .mockResolvedValueOnce({ provisioningAttemptId: 'claim-1', deviceId: 'device-1', status: 'device_authenticated' });
      const { nav } = renderScreen(lateBleClaimParams({ code: '123456' }));

      await waitFor(() => expect(mockedGetProvisioningAttemptStatus).toHaveBeenCalledTimes(1));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });

      await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
        deviceId: 'device-1',
        serialNumber: 'TBT-2026-004217',
        provisioningAttemptId: 'claim-1',
      }));
      expect(mockedGetProvisioningAttemptStatus).toHaveBeenCalledTimes(2);
      expect(mockedGetClaimStatus).not.toHaveBeenCalled();
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('retries a transient 429 while polling a code attempt', async () => {
    jest.useFakeTimers();
    try {
      mockedGetProvisioningAttemptStatus
        .mockRejectedValueOnce({ status: 429, code: 'RATE_LIMIT_EXCEEDED' })
        .mockResolvedValueOnce({ provisioningAttemptId: 'claim-1', deviceId: 'device-1', status: 'device_authenticated' });
      const { nav } = renderScreen(lateBleClaimParams({ code: '123456' }));

      await waitFor(() => expect(mockedGetProvisioningAttemptStatus).toHaveBeenCalledTimes(1));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });

      await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith(
        ROUTES.PairRenameScreen,
        expect.objectContaining({ provisioningAttemptId: 'claim-1' }),
      ));
      expect(mockedGetProvisioningAttemptStatus).toHaveBeenCalledTimes(2);
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('does not start a new search when Bluetooth retry finds the existing claim still pending', async () => {
    const { screen, nav } = renderScreen(lateBleClaimParams());
    await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByText('Try Bluetooth setup again'));

    await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalledTimes(2));
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairSearchScreen);
  });

  it('does NOT call getClaimStatus when params is undefined', async () => {
    renderScreen(undefined);
    // Flush the effect microtask queue.
    await waitFor(() => expect(true).toBe(true));
    expect(mockedGetClaimStatus).not.toHaveBeenCalled();
  });

  it('recovers a confirmed claim even when provisioningTransport is missing from the failure payload', async () => {
    mockedGetClaimStatus.mockResolvedValue(claimStatus({ status: 'CLAIM_CONFIRMED' }));
    const { nav } = renderScreen(lateBleClaimParams({ provisioningTransport: undefined }));

    await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalledWith('claim-1'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
    });
  });

  it('does NOT call getClaimStatus when a code is present (live-code flow, not zero-code BLE)', async () => {
    renderScreen(lateBleClaimParams({ code: '123456' }));
    await waitFor(() => expect(true).toBe(true));
    expect(mockedGetClaimStatus).not.toHaveBeenCalled();
  });

  it('does NOT call getClaimStatus when deviceId is missing', async () => {
    renderScreen(lateBleClaimParams({ deviceId: undefined }));
    await waitFor(() => expect(true).toBe(true));
    expect(mockedGetClaimStatus).not.toHaveBeenCalled();
  });

  it('does NOT call getClaimStatus when serialNumber is missing', async () => {
    renderScreen(lateBleClaimParams({ serialNumber: undefined }));
    await waitFor(() => expect(true).toBe(true));
    expect(mockedGetClaimStatus).not.toHaveBeenCalled();
  });

  it('does NOT call getClaimStatus when provisioningAttemptId is missing', async () => {
    renderScreen(lateBleClaimParams({ provisioningAttemptId: undefined }));
    await waitFor(() => expect(true).toBe(true));
    expect(mockedGetClaimStatus).not.toHaveBeenCalled();
  });

  it('queries getClaimStatus with the attempt id when the recovery payload is complete', async () => {
    renderScreen(lateBleClaimParams());
    await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalledWith('claim-1'));
  });

  it('CLAIM_CONFIRMED navigates to PairRenameScreen with the carried ids', async () => {
    mockedGetClaimStatus.mockResolvedValue(claimStatus({ status: 'CLAIM_CONFIRMED' }));
    const { nav } = renderScreen(lateBleClaimParams());
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
    }));
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairSuccessScreen, expect.anything());
  });

  it('CLAIMED resets to the PairSuccess terminus with the carried ids (drops the failed stack)', async () => {
    mockedGetClaimStatus.mockResolvedValue(claimStatus({ status: 'CLAIMED' }));
    const { nav } = renderScreen(lateBleClaimParams());
    await waitFor(() => expect(nav.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: ROUTES.DeviceHomeScreen },
        {
          name: ROUTES.PairSuccessScreen,
          params: {
            deviceId: 'device-1',
            serialNumber: 'TBT-2026-004217',
            provisioningAttemptId: 'claim-1',
          },
        },
      ],
    }));
    // Reset (not navigate) so swipe-back lands on DeviceHome, not this screen.
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairSuccessScreen, expect.anything());
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
  });

  it('prefers status.deviceId over the params deviceId when navigating on CLAIM_CONFIRMED', async () => {
    mockedGetClaimStatus.mockResolvedValue(claimStatus({ status: 'CLAIM_CONFIRMED', deviceId: 'server-device-99' }));
    const { nav } = renderScreen(lateBleClaimParams({ deviceId: 'stale-local-1' }));
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'server-device-99',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
    }));
  });

  it('falls back to params.deviceId when the status omits a deviceId', async () => {
    mockedGetClaimStatus.mockResolvedValue(claimStatus({ status: 'CLAIMED', deviceId: '' }));
    const { nav } = renderScreen(lateBleClaimParams({ deviceId: 'local-device-7' }));
    await waitFor(() => expect(nav.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: ROUTES.DeviceHomeScreen },
        {
          name: ROUTES.PairSuccessScreen,
          params: {
            deviceId: 'local-device-7',
            serialNumber: 'TBT-2026-004217',
            provisioningAttemptId: 'claim-1',
          },
        },
      ],
    }));
  });

  it('a still-WAITING claim status does NOT navigate anywhere', async () => {
    mockedGetClaimStatus.mockResolvedValue(claimStatus({ status: 'WAITING_PHYSICAL_CONFIRM' }));
    const { nav } = renderScreen(lateBleClaimParams());
    await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalled());
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairSuccessScreen, expect.anything());
  });

  it('a FAILED/timeout claim status does NOT navigate to a success path', async () => {
    mockedGetClaimStatus.mockResolvedValue(claimStatus({ status: 'CLAIM_CONFIRM_TIMEOUT', failureCode: 'DEVICE_AUTH_NOT_VERIFIED' }));
    const { nav } = renderScreen(lateBleClaimParams());
    await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalled());
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairSuccessScreen, expect.anything());
  });

  it('keeps the recovery screen usable and reports the status failure when getClaimStatus rejects', async () => {
    const error = new Error('network down');
    mockedGetClaimStatus.mockRejectedValue(error);
    const { screen, nav } = renderScreen(lateBleClaimParams());
    await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalled());
    // The failure screen still renders its generic copy and stays put.
    expect(screen.getByText("We couldn't reach your Robot")).toBeTruthy();
    expect(mockedCaptureError).toHaveBeenCalledWith(error);
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairSuccessScreen, expect.anything());
  });

  it('does NOT navigate if the screen unmounts before the status resolves (cancellation guard)', async () => {
    let resolveStatus: (v: unknown) => void = () => undefined;
    mockedGetClaimStatus.mockReturnValue(new Promise((res) => { resolveStatus = res; }) as never);
    const { screen, nav } = renderScreen(lateBleClaimParams());
    await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalled());

    // Unmount before the inflight status check completes.
    screen.unmount();
    resolveStatus(claimStatus({ status: 'CLAIM_CONFIRMED' }));
    // Let the resolved promise drain.
    await waitFor(() => expect(true).toBe(true));

    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairSuccessScreen, expect.anything());
  });

  it('CLAIM_CONFIRMED recovery does not also fire the CLAIMED branch (mutually exclusive)', async () => {
    mockedGetClaimStatus.mockResolvedValue(claimStatus({ status: 'CLAIM_CONFIRMED' }));
    const { nav } = renderScreen(lateBleClaimParams());
    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything()));
    const successCalls = nav.navigate.mock.calls.filter(([route]) => route === ROUTES.PairSuccessScreen);
    expect(successCalls).toHaveLength(0);
  });
});
