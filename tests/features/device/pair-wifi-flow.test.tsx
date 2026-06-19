import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import PairWifiScreen from '@/features/device/pairing/screens/PairWifiScreen';
import PairWifiPasswordScreen from '@/features/device/pairing/screens/PairWifiPasswordScreen';
import { ROUTES } from '@/navigation/routes';
import { scanRobotWifiNetworks } from '@/services/ble/service';
import type { RobotWifiNetwork } from '@/services/ble/types';
import {
  consumePairingWifiPassword,
  putPairingWifiPassword,
} from '@/features/device/pairing/pairingSecretHandoff';

// US-005 [mb-pair-wifi] — PairWifiScreen + PairWifiPasswordScreen.
//
// Threat model these tests pin (mobile invariants):
//  - The robot-scanned SSID list comes ONLY from the BLE channel
//    (scanRobotWifiNetworks), never from the phone's own saved networks.
//  - The Wi-Fi password is a transient one-shot handoff keyed by the
//    provisioning attempt; it must be cleared from the screen after submit and
//    must never be persisted into navigation params or rendered anywhere.
//  - The ssid/password travel toward the BLE provisioning path
//    (PairConnectingScreen, which drives provisionWifiViaLocalBle) — never to a
//    backend Wi-Fi API from these screens.
//
// We mock only the BLE service (the credential/scan transport) and the secret
// handoff store, mirroring the existing pairing suites. The api layer is never
// imported here precisely because these two screens must not call it; we assert
// that absence structurally rather than by spying on a mock.

jest.mock('@/services/ble/service', () => ({
  __esModule: true,
  scanRobotWifiNetworks: jest.fn(),
}));

jest.mock('@/features/device/pairing/pairingSecretHandoff', () => {
  const actual = jest.requireActual('@/features/device/pairing/pairingSecretHandoff');
  return {
    __esModule: true,
    ...actual,
    putPairingWifiPassword: jest.fn(actual.putPairingWifiPassword),
  };
});

const mockedScanRobotWifi = scanRobotWifiNetworks as jest.MockedFunction<typeof scanRobotWifiNetworks>;
const mockedPutPassword = putPairingWifiPassword as jest.MockedFunction<typeof putPairingWifiPassword>;

// A realistic but obviously-fake password. It is passed INTO the encoder/handoff
// (allowed); these tests never log it.
const WIFI_PASSWORD = 'hunter2-not-real';

function net(ssid: string, rssi?: number): RobotWifiNetwork {
  return rssi === undefined ? { ssid } : { ssid, rssi };
}

function renderWifi(navigate: jest.Mock, params?: Record<string, unknown>) {
  return render(
    <PairWifiScreen navigation={{ navigate } as never} route={{ params } as never} />,
  );
}

function renderPassword(navigate: jest.Mock, params?: Record<string, unknown>) {
  return render(
    <PairWifiPasswordScreen navigation={{ navigate } as never} route={{ params } as never} />,
  );
}

const BLE_PARAMS = {
  deviceId: 'device-1',
  serialNumber: 'TBT-2026-004217',
  provisioningAttemptId: 'claim-1',
  bleDeviceId: 'ble-device-1',
  provisioningTransport: 'ble' as const,
};

// ---------------------------------------------------------------------------
// PairWifiScreen — robot-scanned SSID list over BLE + manual fallback.
// ---------------------------------------------------------------------------
describe('PairWifiScreen — robot Wi-Fi scan over BLE', () => {
  // The scan effect uses a real ~1.5s backoff between empty-result retries. Under
  // a real clock those waits are nondeterministic under parallel full-suite load
  // (the retry path can outrun waitFor's default timeout) and they also leak a
  // pending timer into the worker. Drive the backoff with fake timers so the
  // retry budget drains instantly and deterministically — assertions unchanged.
  beforeEach(() => {
    jest.clearAllMocks();
    mockedScanRobotWifi.mockReset();
    mockedScanRobotWifi.mockResolvedValue([]);
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Flush any timer the unmount cleanup left pending, then restore real timers
    // so other suites are unaffected.
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // Resolve the scan promise(s) AND advance through every retry backoff until the
  // component settles. advanceTimersByTimeAsync (Jest modern fake timers) runs the
  // backoff timers and flushes the microtask queue between each one, so the awaited
  // scan promise and its retry continuation both resolve. Wrapped in a single
  // awaited act() so every resulting React state update stays inside the act scope.
  async function drainScanRetries(): Promise<void> {
    await act(async () => {
      // Total budget: first attempt + 2 backoffs (~3s) with margin.
      await jest.advanceTimersByTimeAsync(6000);
    });
  }

  it('scans Wi-Fi networks FROM the robot over BLE using the BLE device handle, not the phone', async () => {
    mockedScanRobotWifi.mockResolvedValue([net('HomeNet', -55)]);
    const navigate = jest.fn();
    const screen = renderWifi(navigate, BLE_PARAMS);

    await drainScanRetries();
    expect(mockedScanRobotWifi).toHaveBeenCalled();
    // The scan is addressed to the discovered robot's BLE handle — this is what
    // proves the list is the robot's view, not the phone's saved networks.
    const call = mockedScanRobotWifi.mock.calls[0][0];
    expect(call.device.id).toBe('ble-device-1');
    expect(screen.getByText('HomeNet')).toBeTruthy();
  });

  it('renders the robot-scanned SSID list and sorts by signal strength (strongest first)', async () => {
    mockedScanRobotWifi.mockResolvedValue([
      net('WeakNet', -85),
      net('StrongNet', -50),
      net('MidNet', -70),
    ]);
    const navigate = jest.fn();
    const screen = renderWifi(navigate, BLE_PARAMS);

    await drainScanRetries();
    expect(screen.getByText('StrongNet')).toBeTruthy();
    const rendered = screen.getAllByText(/Net$/).map((node) => node.props.children);
    expect(rendered).toEqual(['StrongNet', 'MidNet', 'WeakNet']);
    // Signal label derives from rssi (strong/ok/weak), proving rssi is consumed.
    expect(screen.getByText('Strong')).toBeTruthy();
    expect(screen.getByText('Weak')).toBeTruthy();
  });

  it('drops blank/whitespace SSIDs from the robot list (no empty tappable rows)', async () => {
    mockedScanRobotWifi.mockResolvedValue([net('Real', -60), net('   '), net('', -40)]);
    const navigate = jest.fn();
    const screen = renderWifi(navigate, BLE_PARAMS);

    await drainScanRetries();
    expect(screen.getByText('Real')).toBeTruthy();
    // Blank/whitespace SSIDs must not become tappable network rows. The only
    // selectable Wi-Fi row is the real one — assert on the per-row a11y label
    // ("Use Wi-Fi network <ssid>") rather than incidental layout whitespace.
    const rows = screen.getAllByLabelText(/^Use Wi-Fi network /);
    expect(rows).toHaveLength(1);
    expect(rows[0].props.accessibilityLabel).toBe('Use Wi-Fi network Real');
  });

  it('falls back to manual entry when the robot returns no networks', async () => {
    mockedScanRobotWifi.mockResolvedValue([]);
    const navigate = jest.fn();
    const screen = renderWifi(navigate, BLE_PARAMS);

    // An empty result is the transient case: the screen retries (with a ~1.5s
    // backoff, twice) before settling on manual entry. Drain the retry budget via
    // fake timers so the terminal manual-entry copy is reached deterministically.
    await drainScanRetries();
    expect(
      screen.getByText('No Robot-scanned networks found. Enter the network name manually.'),
    ).toBeTruthy();
    // The retry budget is exactly 2 extra attempts after the first (3 total).
    expect(mockedScanRobotWifi).toHaveBeenCalledTimes(3);
    // The "Other network…" manual escape is always available.
    expect(screen.getByText('Other network…')).toBeTruthy();
  });

  it('treats firmware Wi-Fi scan-fail normalized to an empty list as manual fallback, not hard unavailable', async () => {
    mockedScanRobotWifi.mockResolvedValue([]);
    const navigate = jest.fn();
    const screen = renderWifi(navigate, BLE_PARAMS);

    await drainScanRetries();
    expect(screen.queryByText('Robot scan unavailable. Enter the network name manually.')).toBeNull();
    expect(
      screen.getByText('No Robot-scanned networks found. Enter the network name manually.'),
    ).toBeTruthy();
    expect(mockedScanRobotWifi).toHaveBeenCalledTimes(3);
  });

  it('surfaces manual entry immediately (no retry) when the robot scan REJECTS (unsupported/BLE error)', async () => {
    mockedScanRobotWifi.mockRejectedValue(Object.assign(new Error('x'), { code: 'BLE_WIFI_SCAN_UNSUPPORTED' }));
    const navigate = jest.fn();
    const screen = renderWifi(navigate, BLE_PARAMS);

    await drainScanRetries();
    expect(screen.getByText('Robot scan unavailable. Enter the network name manually.')).toBeTruthy();
    // A hard scan rejection means the robot cannot enumerate at all — retrying is
    // pointless, so the scan must fire exactly once and not loop.
    expect(mockedScanRobotWifi).toHaveBeenCalledTimes(1);
  });

  it('does NOT scan over BLE when there is no robot BLE handle, and goes straight to manual entry', async () => {
    const navigate = jest.fn();
    const screen = renderWifi(navigate, { deviceId: 'device-1', serialNumber: 'TBT-2026-004217' });

    // Without a BLE handle there is no robot to ask — never invoke a scan, and
    // never silently fall back to the phone's own networks.
    expect(mockedScanRobotWifi).not.toHaveBeenCalled();
    await drainScanRetries();
    expect(
      screen.getByText('No Robot-scanned networks found. Enter the network name manually.'),
    ).toBeTruthy();
  });

  it('tapping a robot-scanned SSID forwards it (and preserves the BLE context) toward the password step', async () => {
    mockedScanRobotWifi.mockResolvedValue([net('PickMe', -55)]);
    const navigate = jest.fn();
    const screen = renderWifi(navigate, BLE_PARAMS);

    await drainScanRetries();
    expect(screen.getByText('PickMe')).toBeTruthy();
    fireEvent.press(screen.getByText('PickMe'));

    expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairWifiPasswordScreen,
      expect.objectContaining({
        ssid: 'PickMe',
        bleDeviceId: 'ble-device-1',
        provisioningAttemptId: 'claim-1',
        provisioningTransport: 'ble',
      }),
    );
  });

  it('"Other network…" routes to the password screen in manual-entry mode (ssid "Other network")', async () => {
    mockedScanRobotWifi.mockResolvedValue([net('HomeNet', -55)]);
    const navigate = jest.fn();
    const screen = renderWifi(navigate, BLE_PARAMS);

    await drainScanRetries();
    expect(screen.getByText('HomeNet')).toBeTruthy();
    fireEvent.press(screen.getByText('Other network…'));

    expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairWifiPasswordScreen,
      expect.objectContaining({ ssid: 'Other network', bleDeviceId: 'ble-device-1' }),
    );
  });

  it('rescan re-asks the ROBOT over BLE (does not read phone networks)', async () => {
    mockedScanRobotWifi
      .mockResolvedValueOnce([net('First', -60)])
      .mockResolvedValueOnce([net('Second', -55)]);
    const navigate = jest.fn();
    const screen = renderWifi(navigate, BLE_PARAMS);

    await drainScanRetries();
    expect(screen.getByText('First')).toBeTruthy();
    fireEvent.press(screen.getByText('Rescan networks from Robot'));

    await drainScanRetries();
    expect(screen.getByText('Second')).toBeTruthy();
    expect(mockedScanRobotWifi).toHaveBeenCalledTimes(2);
  });

  it('does NOT pass the SSID list to any navigation param (the list never escapes the screen)', async () => {
    mockedScanRobotWifi.mockResolvedValue([net('HomeNet', -55), net('Neighbor', -80)]);
    const navigate = jest.fn();
    const screen = renderWifi(navigate, BLE_PARAMS);

    await drainScanRetries();
    expect(screen.getByText('HomeNet')).toBeTruthy();
    fireEvent.press(screen.getByText('HomeNet'));

    const forwardedParams = navigate.mock.calls[0][1] as Record<string, unknown>;
    // Only the chosen ssid is forwarded — the enumerated list (a privacy signal
    // about the home) must not ride along in route params.
    expect(forwardedParams).not.toHaveProperty('networks');
    expect(JSON.stringify(forwardedParams)).not.toContain('Neighbor');
  });
});

// ---------------------------------------------------------------------------
// PairWifiPasswordScreen — transient password handoff -> BLE provisioning path.
// ---------------------------------------------------------------------------
describe('PairWifiPasswordScreen — password handoff is transient + BLE-bound', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Drain the one-shot secret so a leaked timer/value cannot bleed across tests.
    consumePairingWifiPassword('claim-1');
  });

  it('disables Connect until both ssid and password are present', () => {
    const navigate = jest.fn();
    const screen = renderPassword(navigate, { ...BLE_PARAMS, ssid: 'HomeNet' });

    // No password yet -> submit is a no-op (guarded), so no navigation.
    fireEvent.press(screen.getByText('Connect Robot'));
    expect(navigate).not.toHaveBeenCalled();
    expect(mockedPutPassword).not.toHaveBeenCalled();
  });

  it('on submit, stashes the password as a TRANSIENT handoff keyed by the provisioning attempt', () => {
    const navigate = jest.fn();
    const screen = renderPassword(navigate, { ...BLE_PARAMS, ssid: 'HomeNet' });

    fireEvent.changeText(screen.getByLabelText('Wi-Fi password'), WIFI_PASSWORD);
    fireEvent.press(screen.getByText('Connect Robot'));

    // The password is handed off through the one-shot store keyed by the attempt,
    // not embedded in navigation params (asserted separately below).
    expect(mockedPutPassword).toHaveBeenCalledTimes(1);
    expect(mockedPutPassword).toHaveBeenCalledWith('claim-1', WIFI_PASSWORD);
  });

  it('forwards ssid/code toward the BLE provisioning path (PairConnectingScreen) and NEVER puts the password in params', () => {
    const navigate = jest.fn();
    const screen = renderPassword(navigate, { ...BLE_PARAMS, ssid: 'HomeNet', code: '123456' });

    fireEvent.changeText(screen.getByLabelText('Wi-Fi password'), WIFI_PASSWORD);
    fireEvent.press(screen.getByText('Connect Robot'));

    expect(navigate).toHaveBeenCalledTimes(1);
    const [route, params] = navigate.mock.calls[0] as [string, Record<string, unknown>];
    // The next step is the BLE-driven connecting screen (which runs
    // provisionWifiViaLocalBle) — these screens never hit a backend Wi-Fi API.
    expect(route).toBe(ROUTES.PairConnectingScreen);
    expect(params).toMatchObject({
      ssid: 'HomeNet',
      code: '123456',
      bleDeviceId: 'ble-device-1',
      provisioningAttemptId: 'claim-1',
      provisioningTransport: 'ble',
    });
    // The cardinal invariant: the raw Wi-Fi password is never a navigation param.
    expect(params).not.toHaveProperty('password');
    expect(params).not.toHaveProperty('wifiPassword');
    expect(JSON.stringify(params)).not.toContain(WIFI_PASSWORD);
  });

  it('clears the password from the input after submit (no lingering credential in screen state)', () => {
    const navigate = jest.fn();
    const screen = renderPassword(navigate, { ...BLE_PARAMS, ssid: 'HomeNet' });

    const input = screen.getByLabelText('Wi-Fi password');
    fireEvent.changeText(input, WIFI_PASSWORD);
    fireEvent.press(screen.getByText('Connect Robot'));

    // After handoff the controlled input must reset to empty so the credential
    // does not survive in the live component tree.
    expect(screen.getByLabelText('Wi-Fi password').props.value).toBe('');
  });

  it('keeps the password obscured by default and never renders the raw value as visible text', () => {
    const navigate = jest.fn();
    const screen = renderPassword(navigate, { ...BLE_PARAMS, ssid: 'HomeNet' });

    const input = screen.getByLabelText('Wi-Fi password');
    fireEvent.changeText(input, WIFI_PASSWORD);

    // secureTextEntry must default on; the value lives only in the secure input,
    // never as a free-standing <Text> node a screen reader/screenshot could leak.
    expect(input.props.secureTextEntry).toBe(true);
    expect(screen.queryByText(WIFI_PASSWORD)).toBeNull();
  });

  it('does NOT stash a password when no provisioning attempt id is present (nothing to key the handoff to)', () => {
    const navigate = jest.fn();
    const screen = renderPassword(navigate, {
      deviceId: 'device-1',
      serialNumber: 'TBT-2026-004217',
      ssid: 'HomeNet',
      // no provisioningAttemptId
    });

    fireEvent.changeText(screen.getByLabelText('Wi-Fi password'), WIFI_PASSWORD);
    fireEvent.press(screen.getByText('Connect Robot'));

    // With no attempt key there is no valid one-shot slot; the password must not
    // be written to a default/blank key, but the flow may still advance.
    expect(mockedPutPassword).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairConnectingScreen, expect.objectContaining({ ssid: 'HomeNet' }));
  });

  it('manual-entry mode: requires the typed SSID and forwards the trimmed custom SSID', () => {
    const navigate = jest.fn();
    const screen = renderPassword(navigate, { ...BLE_PARAMS, ssid: 'Other network' });

    // Password alone is not enough while the custom SSID is empty.
    fireEvent.changeText(screen.getByLabelText('Wi-Fi password'), WIFI_PASSWORD);
    fireEvent.press(screen.getByText('Connect Robot'));
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Wi-Fi network name'), '  MyHiddenNet  ');
    fireEvent.press(screen.getByText('Connect Robot'));

    expect(navigate).toHaveBeenCalledWith(
      ROUTES.PairConnectingScreen,
      expect.objectContaining({ ssid: 'MyHiddenNet' }),
    );
    expect(mockedPutPassword).toHaveBeenCalledWith('claim-1', WIFI_PASSWORD);
  });

  it('back navigation strips the password context from the params handed back to the Wi-Fi list', () => {
    const navigate = jest.fn();
    const screen = renderPassword(navigate, { ...BLE_PARAMS, ssid: 'HomeNet', code: '123456' });

    // The DeviceShell back control navigates to the Wi-Fi list. Whatever params it
    // carries back must not include a password or an ssid carried from this step.
    fireEvent.changeText(screen.getByLabelText('Wi-Fi password'), WIFI_PASSWORD);
    // Trigger back via the shell's back button (accessibilityLabel "Go back").
    fireEvent.press(screen.getByLabelText('Go back'));

    const backCall = navigate.mock.calls.find((c) => c[0] === ROUTES.PairWifiScreen);
    expect(backCall).toBeDefined();
    const backParams = (backCall as unknown[])[1] as Record<string, unknown>;
    expect(JSON.stringify(backParams ?? {})).not.toContain(WIFI_PASSWORD);
    expect(backParams).not.toHaveProperty('password');
    // The bleDeviceId/attempt context is preserved so the list can re-scan.
    expect(backParams).toMatchObject({ bleDeviceId: 'ble-device-1', provisioningAttemptId: 'claim-1' });
  });

  it('does not leak the password into any rendered text even when "Show password" is toggled on', () => {
    const navigate = jest.fn();
    const screen = renderPassword(navigate, { ...BLE_PARAMS, ssid: 'HomeNet' });

    const input = screen.getByLabelText('Wi-Fi password');
    fireEvent.changeText(input, WIFI_PASSWORD);
    fireEvent.press(screen.getByLabelText('Show Wi-Fi password'));

    // Even revealed, the value stays inside the single TextInput; it is never
    // duplicated into a separate <Text> node (which would survive screenshots/logs).
    expect(screen.getByLabelText('Wi-Fi password').props.secureTextEntry).toBe(false);
    expect(screen.queryByText(WIFI_PASSWORD)).toBeNull();
  });
});
