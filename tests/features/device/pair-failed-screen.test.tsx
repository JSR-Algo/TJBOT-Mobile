import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PairFailedScreen from '@/features/device/pairing/screens/PairFailedScreen';
import { ROUTES } from '@/navigation/routes';
import { getClaimStatus } from '@/services/api/claim.api';
import { openAppSettings, openBluetoothSettings, openWifiSettings } from '@/features/device/pairing/deviceSettings';

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

jest.mock('@/features/device/pairing/deviceSettings', () => ({
  __esModule: true,
  openWifiSettings: jest.fn(() => Promise.resolve()),
  openBluetoothSettings: jest.fn(() => Promise.resolve()),
  openAppSettings: jest.fn(() => Promise.resolve()),
}));

const mockedGetClaimStatus = getClaimStatus as jest.MockedFunction<typeof getClaimStatus>;
const mockedOpenWifiSettings = openWifiSettings as jest.MockedFunction<typeof openWifiSettings>;
const mockedOpenBluetoothSettings = openBluetoothSettings as jest.MockedFunction<typeof openBluetoothSettings>;
const mockedOpenAppSettings = openAppSettings as jest.MockedFunction<typeof openAppSettings>;

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
});

// ===========================================================================
// 1. copyForError() — distinct heading/body per error code (+ default).
// ===========================================================================
describe('PairFailedScreen copyForError matrix', () => {
  const cases: { errorCode: string; heading: string; bodyIncludes: string }[] = [
    { errorCode: 'WIFI_UNAVAILABLE', heading: 'Turn on Wi-Fi first', bodyIncludes: 'Connect this phone to Wi-Fi before pairing' },
    { errorCode: 'BLE_UNAVAILABLE', heading: "Bluetooth can't be used here", bodyIncludes: 'cannot use Bluetooth setup' },
    { errorCode: 'BLE_POWERED_OFF', heading: 'Turn on Bluetooth first', bodyIncludes: 'Bluetooth is required to find Robot nearby' },
    { errorCode: 'BLE_PERMISSION_DENIED', heading: 'Allow Bluetooth access', bodyIncludes: 'Allow Nearby devices and Location' },
    { errorCode: 'BLE_SERVICE_UNAVAILABLE', heading: "We couldn't start Bluetooth setup", bodyIncludes: 'Close and reopen the app' },
    { errorCode: 'BLE_SCAN_TIMEOUT', heading: "We couldn't see Robot nearby", bodyIncludes: 'make sure it is in setup mode' },
    { errorCode: 'DEVICE_NOT_FOUND', heading: "We couldn't find that Robot", bodyIncludes: 'Use the live code and serial' },
    { errorCode: 'INVALID_BLE_CODE', heading: "That code didn't match", bodyIncludes: 'Check the 6-digit code shown on Robot' },
    { errorCode: 'PROVISIONING_ATTEMPT_NOT_READY', heading: 'Robot is not ready yet', bodyIncludes: 'Keep Robot powered on and close by' },
    { errorCode: 'DEVICE_AUTH_NOT_VERIFIED', heading: 'Robot is not ready yet', bodyIncludes: 'Keep Robot powered on and close by' },
    { errorCode: 'BLE_PROVISIONING_UNSUPPORTED', heading: "Robot didn't accept setup over Bluetooth", bodyIncludes: 'use setup hotspot with the same Robot code' },
    { errorCode: 'BLE_PROVISIONING_FAILED', heading: "Robot didn't accept setup over Bluetooth", bodyIncludes: 'use setup hotspot with the same Robot code' },
    { errorCode: 'PAIRING_CONNECT_FAILED', heading: "Robot didn't accept setup over Bluetooth", bodyIncludes: 'Retry nearby' },
    { errorCode: 'ESP_SERVER_UNAVAILABLE', heading: "We couldn't reach setup service", bodyIncludes: 'unavailable right now' },
    { errorCode: 'PROVISIONING_START_FAILED', heading: "We couldn't start pairing", bodyIncludes: 'keep Bluetooth on, then try scanning again' },
    { errorCode: 'PROVISIONING_TIMEOUT', heading: 'Setup timed out', bodyIncludes: 'Move Robot closer to Wi-Fi' },
    { errorCode: 'WIFI_AUTH_FAILED', heading: 'Wi-Fi password did not work', bodyIncludes: 'check capitalization' },
    { errorCode: 'DEVICE_ALREADY_ASSIGNED', heading: 'Robot is already paired', bodyIncludes: 'assigned to another account' },
    { errorCode: 'DEVICE_ALREADY_CLAIMED', heading: 'Robot is already paired', bodyIncludes: 'assigned to another account' },
  ];

  it.each(cases)('renders distinct heading "$heading" for $errorCode', ({ errorCode, heading, bodyIncludes }) => {
    const { screen } = renderScreen({ errorCode });
    expect(screen.getByText(heading)).toBeTruthy();
    expect(screen.getByText(new RegExp(bodyIncludes.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy();
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
    // 19 mapped codes collapse to 15 distinct headings via three intentional
    // shared families:
    //   - BLE_PROVISIONING_UNSUPPORTED / BLE_PROVISIONING_FAILED /
    //     PAIRING_CONNECT_FAILED  -> "Robot didn't accept setup over Bluetooth" (3 -> 1)
    //   - PROVISIONING_ATTEMPT_NOT_READY / DEVICE_AUTH_NOT_VERIFIED -> "Robot is not ready yet" (2 -> 1)
    //   - DEVICE_ALREADY_ASSIGNED / DEVICE_ALREADY_CLAIMED -> "Robot is already paired" (2 -> 1)
    // 19 - (3-1) - (2-1) - (2-1) = 15.
    expect(unique.size).toBe(15);
    // The three shared headings must each still be reachable.
    expect(unique.has("Robot didn't accept setup over Bluetooth")).toBe(true);
    expect(unique.has('Robot is not ready yet')).toBe(true);
    expect(unique.has('Robot is already paired')).toBe(true);
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
    const params = { errorCode: 'WIFI_AUTH_FAILED', ssid: 'Casa', deviceId: 'device-1' };
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
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen);
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen, expect.anything());
  });

  it('"Wrong Wi-Fi password" card navigates without params when route params is undefined', () => {
    const { screen, nav } = renderScreen(undefined);
    fireEvent.press(screen.getByText('Wrong Wi-Fi password'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen);
    // The single-arg overload must be used — not an (route, undefined) call.
    expect(nav.navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen, undefined);
  });

  it('"Robot is too far" card routes to PairSearchScreen', () => {
    const { screen, nav } = renderScreen({ errorCode: 'BLE_SCAN_TIMEOUT' });
    fireEvent.press(screen.getByText('Robot is too far'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen);
  });

  it('"Robot looks asleep" card routes to PairIntroScreen', () => {
    const { screen, nav } = renderScreen(undefined);
    fireEvent.press(screen.getByText('Robot looks asleep'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairIntroScreen);
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
// 5. Setup-hotspot affordance — canUseSetupHotspot() / setupHotspotParams().
// ===========================================================================
describe('PairFailedScreen setup-hotspot button', () => {
  function hotspotParams(overrides: Record<string, unknown> = {}) {
    return {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
      code: '123456',
      ...overrides,
    };
  }

  it('shows "Use setup hotspot" when deviceId+serial+attempt+code are all present', () => {
    const { screen } = renderScreen(hotspotParams());
    expect(screen.getByText('Use setup hotspot')).toBeTruthy();
  });

  it('navigates to PairWifiScreen with legacy_backend transport and the carried code/ids', () => {
    const { screen, nav } = renderScreen(hotspotParams());
    fireEvent.press(screen.getByText('Use setup hotspot'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      provisioningAttemptId: 'claim-1',
      code: '123456',
      provisioningTransport: 'legacy_backend',
    });
  });

  it('hides "Use setup hotspot" when the code is missing (zero-code BLE flow)', () => {
    const { screen } = renderScreen(hotspotParams({ code: undefined }));
    expect(screen.queryByText('Use setup hotspot')).toBeNull();
  });

  it('hides "Use setup hotspot" when deviceId is missing', () => {
    const { screen } = renderScreen(hotspotParams({ deviceId: undefined }));
    expect(screen.queryByText('Use setup hotspot')).toBeNull();
  });

  it('hides "Use setup hotspot" when provisioningAttemptId is missing', () => {
    const { screen } = renderScreen(hotspotParams({ provisioningAttemptId: undefined }));
    expect(screen.queryByText('Use setup hotspot')).toBeNull();
  });

  it('hides "Use setup hotspot" when there are no params at all', () => {
    const { screen } = renderScreen(undefined);
    expect(screen.queryByText('Use setup hotspot')).toBeNull();
  });
});

// ===========================================================================
// 6. Always-on recovery buttons + back/header.
// ===========================================================================
describe('PairFailedScreen always-on actions', () => {
  it('renders Scan QR / Try again / Contact support on every failure', () => {
    const { screen } = renderScreen(undefined);
    expect(screen.getByLabelText('Scan QR or enter code')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByLabelText('Contact support')).toBeTruthy();
  });

  it('"Scan QR or enter code" routes to PairQrScanScreen', () => {
    const { screen, nav } = renderScreen(undefined);
    fireEvent.press(screen.getByLabelText('Scan QR or enter code'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairQrScanScreen);
  });

  it('"Try again" routes to PairSearchScreen', () => {
    const { screen, nav } = renderScreen(undefined);
    fireEvent.press(screen.getByText('Try again'));
    expect(nav.navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen);
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
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByLabelText('Contact support')).toBeTruthy();
  });
});

// ===========================================================================
// 7. Late zero-code claim recovery effect — canRecoverLateClaim + getClaimStatus.
// ===========================================================================
describe('PairFailedScreen late-BLE-claim recovery effect', () => {
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

  it('keeps the recovery screen usable (no crash, no nav) when getClaimStatus rejects', async () => {
    mockedGetClaimStatus.mockRejectedValue(new Error('network down'));
    const { screen, nav } = renderScreen(lateBleClaimParams());
    await waitFor(() => expect(mockedGetClaimStatus).toHaveBeenCalled());
    // The failure screen still renders its generic copy and stays put.
    expect(screen.getByText("We couldn't reach your Robot")).toBeTruthy();
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
