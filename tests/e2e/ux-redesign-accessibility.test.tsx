import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ROUTES } from '@/navigation/routes';
import AudioErrorScreen from '../../src/features/lesson-session/screens/AudioErrorScreen';
import SafetyScreen from '../../src/features/lesson-session/screens/SafetyScreen';
import ExitConfirmScreen from '../../src/features/lesson-session/screens/ExitConfirmScreen';
import PairAddScreen from '../../src/features/device/pairing/screens/PairAddScreen';
import PairSearchScreen from '../../src/features/device/pairing/screens/PairSearchScreen';
import PairWifiScreen from '../../src/features/device/pairing/screens/PairWifiScreen';
import PairWifiPasswordScreen from '../../src/features/device/pairing/screens/PairWifiPasswordScreen';
import PairFailedScreen from '../../src/features/device/pairing/screens/PairFailedScreen';
import PairCodeScreen from '../../src/features/device/pairing/screens/PairCodeScreen';
import PairConnectingScreen from '../../src/features/device/pairing/screens/PairConnectingScreen';
import PairRenameScreen from '../../src/features/device/pairing/screens/PairRenameScreen';
import PairSuccessScreen from '../../src/features/device/pairing/screens/PairSuccessScreen';
import { markLocalDevicePaired } from '../../src/features/device/pairing/localPairedDevice';
import { putPairingBootstrapToken, putPairingWifiPassword } from '../../src/features/device/pairing/pairingSecretHandoff';
import { completeDeviceProvisioning, confirmLocalBlePaired, getDeviceStatus, getProvisioningAttemptStatus, mintBootstrapToken, pairDevice, startDeviceProvisioning } from '../../src/services/api/device.api';
import { getClaimStatus, requestClaim } from '../../src/services/api/claim.api';
import { initializeBle, provisionWifiViaLocalBle, scanForTJBotDevices, scanRobotWifiNetworks } from '../../src/services/ble/service';
import { setAppLanguage } from '../../src/services/i18n/i18n';

jest.mock('../../src/services/api/device.api', () => ({
  completeDeviceProvisioning: jest.fn(),
  confirmLocalBlePaired: jest.fn(),
  getDeviceStatus: jest.fn(),
  getProvisioningAttemptStatus: jest.fn(),
  mintBootstrapToken: jest.fn(),
  pairDevice: jest.fn(),
  startDeviceProvisioning: jest.fn(),
}));

jest.mock('../../src/services/api/claim.api', () => ({
  getClaimStatus: jest.fn(),
  requestClaim: jest.fn(),
}));

jest.mock('../../src/contexts/HouseholdContext', () => {
  const child = { id: 'child-1', household_id: 'household-1', name: 'Alex' };
  // The pairing rename screen reads `activeChild` (the resolved active child),
  // not the raw children array — mirror the real context's resolution.
  return {
    useHousehold: jest.fn(() => ({ children: [child], activeChild: child })),
  };
});

jest.mock('../../src/services/ble/service', () => ({
  initializeBle: jest.fn(),
  provisionWifiViaLocalBle: jest.fn(),
  scanForTJBotDevices: jest.fn(),
  scanRobotWifiNetworks: jest.fn(),
}));

jest.mock('../../src/features/device/pairing/localPairedDevice', () => ({
  markLocalDevicePaired: jest.fn(),
}));

const apiMocks = {
  completeDeviceProvisioning: completeDeviceProvisioning as jest.MockedFunction<typeof completeDeviceProvisioning>,
  confirmLocalBlePaired: confirmLocalBlePaired as jest.MockedFunction<typeof confirmLocalBlePaired>,
  getDeviceStatus: getDeviceStatus as jest.MockedFunction<typeof getDeviceStatus>,
  getProvisioningAttemptStatus: getProvisioningAttemptStatus as jest.MockedFunction<typeof getProvisioningAttemptStatus>,
  mintBootstrapToken: mintBootstrapToken as jest.MockedFunction<typeof mintBootstrapToken>,
  pairDevice: pairDevice as jest.MockedFunction<typeof pairDevice>,
  startDeviceProvisioning: startDeviceProvisioning as jest.MockedFunction<typeof startDeviceProvisioning>,
};

const claimMocks = {
  getClaimStatus: getClaimStatus as jest.MockedFunction<typeof getClaimStatus>,
  requestClaim: requestClaim as jest.MockedFunction<typeof requestClaim>,
};

const bleMocks = {
  initializeBle: initializeBle as jest.MockedFunction<typeof initializeBle>,
  provisionWifiViaLocalBle: provisionWifiViaLocalBle as jest.MockedFunction<typeof provisionWifiViaLocalBle>,
  scanForTJBotDevices: scanForTJBotDevices as jest.MockedFunction<typeof scanForTJBotDevices>,
  scanRobotWifiNetworks: scanRobotWifiNetworks as jest.MockedFunction<typeof scanRobotWifiNetworks>,
};

const localDeviceMocks = {
  markLocalDevicePaired: markLocalDevicePaired as jest.MockedFunction<typeof markLocalDevicePaired>,
};

const netInfoFetchMock = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;

const navigate = jest.fn();
// PairRenameScreen finalizes pairing with navigation.reset (it removes the
// finished pairing screens from the back stack and makes DeviceHome the root),
// so the test navigation must expose reset as well as navigate.
const reset = jest.fn();
const navigation = { navigate, reset };
const originalPlatformOS = Platform.OS;

describe('mobile UX redesign accessibility coverage', () => {
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatformOS, configurable: true });
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    apiMocks.getProvisioningAttemptStatus.mockResolvedValue({
      provisioningAttemptId: 'attempt-1',
      deviceId: 'device-1',
      status: 'device_authenticated',
    });
    apiMocks.completeDeviceProvisioning.mockResolvedValue({
      device: {
        id: 'device-1',
        status: 'active',
        lifecycleState: 'assigned',
        displayName: 'Living-room Robot',
        assignedChildProfileId: 'child-1',
      },
    });
    apiMocks.pairDevice.mockResolvedValue({
      deviceId: 'device-1',
      provisioningAttemptId: 'attempt-1',
      status: 'esp_bind_requested',
    });
    apiMocks.confirmLocalBlePaired.mockResolvedValue({
      deviceId: 'device-1',
      provisioningAttemptId: 'attempt-1',
      status: 'ble_paired',
    });
    apiMocks.getDeviceStatus.mockResolvedValue({
      id: 'device-1',
      name: 'TJBot-001',
      online: true,
      batteryPercent: 0,
      wifiRssi: -55,
    });
    apiMocks.mintBootstrapToken.mockResolvedValue({
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      expiresAt: '2026-06-03T12:05:00.000Z',
      ttlSeconds: 300,
    });
    claimMocks.getClaimStatus.mockResolvedValue({
      claimId: 'attempt-claim',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      online: true,
      expiresAt: null,
      failureCode: null,
    });
    claimMocks.requestClaim.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'WAITING_PHYSICAL_CONFIRM',
      message: 'Press the button on your TBot to allow connection.',
      expiresAt: '2026-06-03T12:05:00.000Z',
    });
    localDeviceMocks.markLocalDevicePaired.mockResolvedValue(undefined);
    netInfoFetchMock.mockResolvedValue({ type: 'wifi', isConnected: true, isInternetReachable: true } as Awaited<ReturnType<typeof NetInfo.fetch>>);
    bleMocks.initializeBle.mockResolvedValue({ permission: 'granted', available: true });
    bleMocks.provisionWifiViaLocalBle.mockResolvedValue({ deviceId: 'ble-device-1', status: 'wifi_credentials_sent', transport: 'ble-blufi' });
    bleMocks.scanForTJBotDevices.mockResolvedValue({ allowed: [], blocked: [] });
    bleMocks.scanRobotWifiNetworks.mockResolvedValue([{ ssid: 'Casa Wi-Fi', rssi: -55 }]);
  });

  it('labels child recovery secondary actions', () => {
    const audio = render(<AudioErrorScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(audio.getByLabelText('Go home')).toBeTruthy();

    const safety = render(<SafetyScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(safety.getByLabelText('Get a grown-up')).toBeTruthy();

    const exit = render(<ExitConfirmScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    expect(exit.getByLabelText('Stop lesson for now')).toBeTruthy();
  });

  it('labels pairing choice cards and routes password recovery only when pairing context exists', () => {
    const add = render(<PairAddScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    fireEvent.press(add.getByLabelText('Pair a new Robot'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairIntroScreen);

    const failed = render(<PairFailedScreen navigation={navigation as never} route={{ params: undefined } as never} />);
    fireEvent.press(failed.getByLabelText('Fix wrong Wi-Fi password'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairSearchScreen);

    const failedWithContext = render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1', ssid: 'Casa Wi-Fi', bleDeviceId: 'ble-device-1', provisioningTransport: 'ble' } } as never}
      />,
    );
    fireEvent.press(failedWithContext.getByLabelText('Fix wrong Wi-Fi password'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'attempt-1',
      ssid: 'Casa Wi-Fi',
      bleDeviceId: 'ble-device-1',
      provisioningTransport: 'ble',
    });
  });

  it('opens Android Wi-Fi settings from a phone Wi-Fi readiness failure', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const sendIntentSpy = jest.spyOn(Linking, 'sendIntent').mockResolvedValue(undefined);
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    const failed = render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{ params: { errorCode: 'WIFI_UNAVAILABLE' } } as never}
      />,
    );

    fireEvent.press(failed.getByLabelText('Open Wi-Fi settings'));
    await waitFor(() => expect(sendIntentSpy).toHaveBeenCalledWith('android.settings.WIFI_SETTINGS'));
    expect(openSettingsSpy).not.toHaveBeenCalled();
  });

  it('opens Android Bluetooth settings from a Bluetooth readiness failure', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const sendIntentSpy = jest.spyOn(Linking, 'sendIntent').mockResolvedValue(undefined);
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    const failed = render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{ params: { errorCode: 'BLE_UNAVAILABLE' } } as never}
      />,
    );

    fireEvent.press(failed.getByLabelText('Open Bluetooth settings'));
    await waitFor(() => expect(sendIntentSpy).toHaveBeenCalledWith('android.settings.BLUETOOTH_SETTINGS'));
    expect(openSettingsSpy).not.toHaveBeenCalled();
  });

  it('falls back to iOS app settings from a phone Wi-Fi readiness failure', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const sendIntentSpy = jest.spyOn(Linking, 'sendIntent').mockResolvedValue(undefined);
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    const failed = render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{ params: { errorCode: 'WIFI_UNAVAILABLE' } } as never}
      />,
    );

    fireEvent.press(failed.getByLabelText('Open Wi-Fi settings'));
    await waitFor(() => expect(openSettingsSpy).toHaveBeenCalled());
    expect(sendIntentSpy).not.toHaveBeenCalled();
  });

  it('falls back to iOS app settings from a Bluetooth readiness failure', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const sendIntentSpy = jest.spyOn(Linking, 'sendIntent').mockResolvedValue(undefined);
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    const failed = render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{ params: { errorCode: 'BLE_UNAVAILABLE' } } as never}
      />,
    );

    fireEvent.press(failed.getByLabelText('Open Bluetooth settings'));
    await waitFor(() => expect(openSettingsSpy).toHaveBeenCalled());
    expect(sendIntentSpy).not.toHaveBeenCalled();
  });

  it('opens app settings when Android Bluetooth permissions are denied', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const sendIntentSpy = jest.spyOn(Linking, 'sendIntent').mockResolvedValue(undefined);
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    const failed = render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{ params: { errorCode: 'BLE_PERMISSION_DENIED' } } as never}
      />,
    );

    expect(failed.getByText('Allow Bluetooth access')).toBeTruthy();
    fireEvent.press(failed.getByLabelText('Open app settings'));
    await waitFor(() => expect(openSettingsSpy).toHaveBeenCalled());
    expect(sendIntentSpy).not.toHaveBeenCalled();
  });

  it('starts backend provisioning from BLE scan results instead of fake-found timeout', async () => {
    bleMocks.scanForTJBotDevices.mockResolvedValue({
      allowed: [{ id: 'TBT-2026-004217', name: 'TBT-2026-004217', localName: null, serviceUUIDs: [] }],
      blocked: [],
    });
    apiMocks.startDeviceProvisioning.mockResolvedValue({
      provisioningAttemptId: 'attempt-1',
      deviceId: 'device-1',
      deviceStatus: 'provisioning',
    });

    render(<PairSearchScreen navigation={navigation as never} route={{ params: undefined } as never} />);

    await waitFor(() => expect(apiMocks.startDeviceProvisioning).toHaveBeenCalledWith({
      serialNumber: 'TBT-2026-004217',
    }));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairFoundScreen, {
      serialNumber: 'TBT-2026-004217',
      deviceId: 'device-1',
      provisioningAttemptId: 'attempt-1',
      bleDeviceId: 'TBT-2026-004217',
      provisioningTransport: 'ble',
    });
  });

  it('routes scan timeout to failure instead of inventing a robot', async () => {
    render(<PairSearchScreen navigation={navigation as never} route={{ params: undefined } as never} />);

    await waitFor(() => expect(bleMocks.scanForTJBotDevices).toHaveBeenCalled());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'BLE_SCAN_TIMEOUT',
    }));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFoundScreen);
  });

  it('requires the phone to be online before Bluetooth scanning', async () => {
    netInfoFetchMock.mockResolvedValue({ type: 'none', isConnected: false, isInternetReachable: false } as Awaited<ReturnType<typeof NetInfo.fetch>>);

    render(<PairSearchScreen navigation={navigation as never} route={{ params: undefined } as never} />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'WIFI_UNAVAILABLE',
    }));
    expect(bleMocks.initializeBle).not.toHaveBeenCalled();
    expect(bleMocks.scanForTJBotDevices).not.toHaveBeenCalled();
  });

  it('requires Bluetooth before scanning when Wi-Fi is ready', async () => {
    bleMocks.initializeBle.mockResolvedValue({ permission: 'granted', available: false, reason: 'Bluetooth is off.' });

    render(<PairSearchScreen navigation={navigation as never} route={{ params: undefined } as never} />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'BLE_POWERED_OFF',
    }));
    expect(bleMocks.scanForTJBotDevices).not.toHaveBeenCalled();
  });

  it('labels powered-off Bluetooth separately from unsupported Bluetooth', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const sendIntentSpy = jest.spyOn(Linking, 'sendIntent').mockResolvedValue(undefined);
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    const failed = render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{ params: { errorCode: 'BLE_POWERED_OFF' } } as never}
      />,
    );

    expect(failed.getByText('Turn on Bluetooth first')).toBeTruthy();
    fireEvent.press(failed.getByLabelText('Open Bluetooth settings'));
    await waitFor(() => expect(sendIntentSpy).toHaveBeenCalledWith('android.settings.BLUETOOTH_SETTINGS'));
    expect(openSettingsSpy).not.toHaveBeenCalled();
  });

  it('routes denied Bluetooth permissions to app settings copy', async () => {
    bleMocks.initializeBle.mockResolvedValue({ permission: 'denied', available: false, reason: 'Bluetooth permission was denied.' });

    render(<PairSearchScreen navigation={navigation as never} route={{ params: undefined } as never} />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'BLE_PERMISSION_DENIED',
    }));
    expect(bleMocks.scanForTJBotDevices).not.toHaveBeenCalled();
  });

  it('routes BLE bootstrap failures to setup-service copy instead of blaming Bluetooth settings', async () => {
    bleMocks.initializeBle.mockRejectedValue(new Error('Native BLE module unavailable'));

    render(<PairSearchScreen navigation={navigation as never} route={{ params: undefined } as never} />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'BLE_SERVICE_UNAVAILABLE',
    }));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, { errorCode: 'BLE_UNAVAILABLE' });
  });

  it('routes BLE scan exceptions to scan-timeout copy', async () => {
    bleMocks.scanForTJBotDevices.mockRejectedValue(new Error('Bluetooth powered off'));

    render(<PairSearchScreen navigation={navigation as never} route={{ params: undefined } as never} />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'BLE_SCAN_TIMEOUT',
    }));
    expect(apiMocks.startDeviceProvisioning).not.toHaveBeenCalled();
  });

  it('cancels pending BLE results after manual search failure', async () => {
    let resolveScan!: (value: Awaited<ReturnType<typeof scanForTJBotDevices>>) => void;
    bleMocks.scanForTJBotDevices.mockReturnValue(new Promise((resolve) => {
      resolveScan = resolve;
    }));

    const screen = render(<PairSearchScreen navigation={navigation as never} route={{ params: undefined } as never} />);

    await waitFor(() => expect(bleMocks.scanForTJBotDevices).toHaveBeenCalled());
    fireEvent.press(screen.getByText("I don't see my Robot"));
    await act(async () => {
      resolveScan({
        allowed: [{ id: 'TBT-2026-004217', name: 'TBT-2026-004217', localName: null, serviceUUIDs: [] }],
        blocked: [],
      });
    });
    expect(apiMocks.startDeviceProvisioning).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      errorCode: 'BLE_SCAN_TIMEOUT',
    });
  });

  it('requires a 6-digit pairing code before carrying full context to Wi-Fi selection', () => {
    const screen = render(
      <PairCodeScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1' } } as never}
      />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('Pairing code'), '1234');
    fireEvent.press(screen.getByText('Confirm & continue'));
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairWifiScreen, expect.anything());

    fireEvent.changeText(screen.getByPlaceholderText('Pairing code'), '123456');
    fireEvent.press(screen.getByText('Confirm & continue'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'attempt-1',
      code: '123456',
    });
  });

  it('toggles Wi-Fi password visibility from an accessible control', () => {
    const screen = render(
      <PairWifiPasswordScreen
        navigation={navigation as never}
        route={{ params: { ssid: 'Casa Wi-Fi' } } as never}
      />,
    );

    expect(screen.getByPlaceholderText('Wi-Fi password').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByLabelText('Show Wi-Fi password'));
    expect(screen.getByPlaceholderText('Wi-Fi password').props.secureTextEntry).toBe(false);
  });

  it('labels manual Wi-Fi entry without changing pairing context', async () => {
    const screen = render(
      <PairWifiScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1', code: '123456', bleDeviceId: 'ble-device-1', provisioningTransport: 'ble' } } as never}
      />,
    );

    await waitFor(() => expect(bleMocks.scanRobotWifiNetworks).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText('Enter another Wi-Fi network'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen, {
      ssid: 'Other network',
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'attempt-1',
      code: '123456',
      bleDeviceId: 'ble-device-1',
      provisioningTransport: 'ble',
    });
  });

  it('shows every robot-scanned Wi-Fi AP even when SSIDs repeat', async () => {
    bleMocks.scanRobotWifiNetworks.mockResolvedValue([
      { ssid: 'Tam Dentist', rssi: -61 },
      { ssid: 'Van Phong Tam Dentist', rssi: -34 },
      { ssid: 'Tam Dentist', rssi: -43 },
      { ssid: 'Minh', rssi: -82 },
    ]);

    const screen = render(
      <PairWifiScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1', code: '123456', bleDeviceId: 'ble-device-1', provisioningTransport: 'ble' } } as never}
      />,
    );

    await waitFor(() => expect(bleMocks.scanRobotWifiNetworks).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryAllByText('Tam Dentist')).toHaveLength(2));
    expect(screen.getByText('Van Phong Tam Dentist')).toBeTruthy();
    expect(screen.getByText('Minh')).toBeTruthy();

    fireEvent.press(screen.getAllByLabelText('Use Wi-Fi network Tam Dentist')[0]);
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen, expect.objectContaining({
      ssid: 'Tam Dentist',
    }));
  });

  it('keeps Wi-Fi selection on manual entry when robot network scan is unavailable', async () => {
    bleMocks.scanRobotWifiNetworks.mockRejectedValue(new Error('BLE scan unsupported'));

    const screen = render(
      <PairWifiScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1', code: '123456', bleDeviceId: 'ble-device-1', provisioningTransport: 'ble' } } as never}
      />,
    );

    expect(screen.getByText('Scanning from Robot…')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Robot scan unavailable. Enter the network name manually.')).toBeTruthy());
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.anything());
  });

  it('keeps BLE provisioning context when backing out of Wi-Fi password entry', () => {
    const screen = render(
      <PairWifiPasswordScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1', code: '123456', ssid: 'Casa Wi-Fi', bleDeviceId: 'ble-device-1', provisioningTransport: 'ble' } } as never}
      />,
    );

    fireEvent.press(screen.getByLabelText('Go back'));

    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'attempt-1',
      code: '123456',
      bleDeviceId: 'ble-device-1',
      provisioningTransport: 'ble',
    });
  });

  it('sends Wi-Fi over local BLE before waiting for backend authentication', async () => {
    const passwordScreen = render(
      <PairWifiPasswordScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1', code: '123456', ssid: 'Casa Wi-Fi', bleDeviceId: 'ble-device-1', provisioningTransport: 'ble' } } as never}
      />,
    );

    fireEvent.changeText(passwordScreen.getByPlaceholderText('Wi-Fi password'), 'secret123');
    fireEvent.press(passwordScreen.getByText('Connect Robot'));
    expect(passwordScreen.getByPlaceholderText('Wi-Fi password').props.value).toBe('');
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairConnectingScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'attempt-1',
      code: '123456',
      ssid: 'Casa Wi-Fi',
      bleDeviceId: 'ble-device-1',
      provisioningTransport: 'ble',
    });
    expect(navigate.mock.calls.flat()).not.toContain('secret123');

    const connectParams = navigate.mock.calls.find(([route]) => route === ROUTES.PairConnectingScreen)?.[1];
    const screen = render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{ params: connectParams } as never}
      />,
    );

    await waitFor(() => expect(bleMocks.provisionWifiViaLocalBle).toHaveBeenCalledWith({
      device: {
        id: 'ble-device-1',
        name: 'TJBot-001',
        localName: 'TJBot-001',
        serviceUUIDs: [],
      },
      ssid: 'Casa Wi-Fi',
      password: 'secret123',
      code: '123456',
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      deviceId: 'device-1',
    }));
    expect(apiMocks.confirmLocalBlePaired).toHaveBeenCalledWith({
      deviceId: 'device-1',
      provisioningAttemptId: 'attempt-1',
      serialNumber: 'TJBot-001',
      code: '123456',
    });
    expect(apiMocks.mintBootstrapToken).toHaveBeenCalledWith({ provisioningAttemptId: 'attempt-1' });
    expect(apiMocks.pairDevice).not.toHaveBeenCalled();
    await expect(screen.findByText('Robot authenticated')).resolves.toBeTruthy();
    await waitFor(() => expect(apiMocks.getProvisioningAttemptStatus).toHaveBeenCalledWith('attempt-1'));
    expect(localDeviceMocks.markLocalDevicePaired).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairSuccessScreen, expect.anything());
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'attempt-1',
    });
  });

  it('reconnects an already paired Robot over BLE without creating a new claim token', async () => {
    const passwordScreen = render(
      <PairWifiPasswordScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'reconnect:device-1', ssid: 'Casa Wi-Fi', bleDeviceId: 'ble-device-1', provisioningTransport: 'ble_reconnect' } } as never}
      />,
    );

    fireEvent.changeText(passwordScreen.getByPlaceholderText('Wi-Fi password'), 'secret123');
    fireEvent.press(passwordScreen.getByText('Connect Robot'));

    const connectParams = navigate.mock.calls.find(([route]) => route === ROUTES.PairConnectingScreen)?.[1];
    render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{ params: connectParams } as never}
      />,
    );

    await waitFor(() => expect(bleMocks.provisionWifiViaLocalBle).toHaveBeenCalledWith({
      device: {
        id: 'ble-device-1',
        name: 'TJBot-001',
        localName: 'TJBot-001',
        serviceUUIDs: [],
      },
      ssid: 'Casa Wi-Fi',
      password: 'secret123',
      allowCredentialOnly: true,
    }));
    expect(apiMocks.confirmLocalBlePaired).not.toHaveBeenCalled();
    expect(apiMocks.mintBootstrapToken).not.toHaveBeenCalled();
    await waitFor(() => expect(apiMocks.getDeviceStatus).toHaveBeenCalledWith('device-1'));
    // Finalize resets the stack to [DeviceHome] (device_online has no PairSuccess to
    // preserve) so Back can't walk back through the finished reconnect screens.
    await waitFor(() => expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: ROUTES.DeviceHomeScreen }] }));
  });

  it('sends a pending-claim bootstrap token with Wi-Fi over BLE and waits for claim confirmation when no code is present', async () => {
    putPairingWifiPassword('claim-1', 'secret123');
    putPairingBootstrapToken('claim-1', 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC');

    const screen = render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{
          params: {
            deviceId: 'device-1',
            serialNumber: 'TJBot-001',
            provisioningAttemptId: 'claim-1',
            ssid: 'Casa Wi-Fi',
            bleDeviceId: 'ble-device-1',
            provisioningTransport: 'ble',
          },
        } as never}
      />,
    );

    await waitFor(() => expect(bleMocks.provisionWifiViaLocalBle).toHaveBeenCalledWith({
      device: {
        id: 'ble-device-1',
        name: 'TJBot-001',
        localName: 'TJBot-001',
        serviceUUIDs: [],
      },
      ssid: 'Casa Wi-Fi',
      password: 'secret123',
      token: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      code: undefined,
      deviceId: 'device-1',
    }));
    expect(apiMocks.confirmLocalBlePaired).not.toHaveBeenCalled();
    expect(apiMocks.mintBootstrapToken).not.toHaveBeenCalled();
    expect(apiMocks.getProvisioningAttemptStatus).not.toHaveBeenCalled();
    await waitFor(() => expect(claimMocks.getClaimStatus).toHaveBeenCalledWith('claim-1'));
    await expect(screen.findByText('Robot authenticated')).resolves.toBeTruthy();
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'claim-1',
    });
  });

  it('refreshes a missing pending-claim bootstrap token before sending Wi-Fi over BLE', async () => {
    putPairingWifiPassword('claim-refresh', 'secret123');

    const screen = render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{
          params: {
            deviceId: 'device-1',
            serialNumber: 'TJBot-001',
            provisioningAttemptId: 'claim-refresh',
            ssid: 'Casa Wi-Fi',
            bleDeviceId: 'ble-device-1',
            provisioningTransport: 'ble',
          },
        } as never}
      />,
    );

    await waitFor(() => expect(apiMocks.mintBootstrapToken).toHaveBeenCalledWith({ provisioningAttemptId: 'claim-refresh' }));
    await waitFor(() => expect(bleMocks.provisionWifiViaLocalBle).toHaveBeenCalledWith({
      device: {
        id: 'ble-device-1',
        name: 'TJBot-001',
        localName: 'TJBot-001',
        serviceUUIDs: [],
      },
      ssid: 'Casa Wi-Fi',
      password: 'secret123',
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      code: undefined,
      deviceId: 'device-1',
    }));
    expect(apiMocks.confirmLocalBlePaired).not.toHaveBeenCalled();
    await expect(screen.findByText('Robot authenticated')).resolves.toBeTruthy();
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'claim-refresh',
    });
  });

  it('creates a backend claim before BLE zero-code Wi-Fi provisioning when the route has only a provisioning attempt', async () => {
    putPairingWifiPassword('attempt-1', 'secret123');
    claimMocks.getClaimStatus.mockResolvedValue({
      claimId: 'claim-1',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      online: true,
      expiresAt: null,
      failureCode: null,
    });

    const screen = render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{
          params: {
            deviceId: 'device-1',
            serialNumber: 'TJBot-001',
            provisioningAttemptId: 'attempt-1',
            ssid: 'Casa Wi-Fi',
            bleDeviceId: 'ble-device-1',
            provisioningTransport: 'ble',
          },
        } as never}
      />,
    );

    await waitFor(() => expect(claimMocks.requestClaim).toHaveBeenCalledWith({ deviceId: 'device-1' }));
    await waitFor(() => expect(apiMocks.mintBootstrapToken).toHaveBeenCalledWith({ provisioningAttemptId: 'claim-1' }));
    await waitFor(() => expect(bleMocks.provisionWifiViaLocalBle).toHaveBeenCalledWith({
      device: {
        id: 'ble-device-1',
        name: 'TJBot-001',
        localName: 'TJBot-001',
        serviceUUIDs: [],
      },
      ssid: 'Casa Wi-Fi',
      password: 'secret123',
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      code: undefined,
      deviceId: 'device-1',
    }));
    await waitFor(() => expect(claimMocks.getClaimStatus).toHaveBeenCalledWith('claim-1'));
    await expect(screen.findByText('Robot authenticated')).resolves.toBeTruthy();
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'claim-1',
    });
  });

  it('fails fast when provisioning status payload is malformed', async () => {
    apiMocks.getProvisioningAttemptStatus.mockResolvedValueOnce({
      provisioningAttemptId: 'attempt-bad-status',
      deviceId: '',
      status: 'device_authenticated',
    });
    putPairingWifiPassword('attempt-bad-status', 'secret123');

    const screen = render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-bad-status', code: '123456', ssid: 'Casa Wi-Fi' } } as never}
      />,
    );

    await expect(screen.findByText('Pairing failed')).resolves.toBeTruthy();
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, expect.objectContaining({
      provisioningAttemptId: 'attempt-bad-status',
      errorCode: 'PROVISIONING_STATUS_MALFORMED',
    }));
  });

  it('translates pairing connection dynamic copy in Vietnamese', async () => {
    await setAppLanguage('vi');
    putPairingWifiPassword('attempt-vi', 'secret123');

    const screen = render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-vi', code: '123456', ssid: 'Casa Wi-Fi' } } as never}
      />,
    );

    await waitFor(() => expect(apiMocks.pairDevice).toHaveBeenCalledWith(expect.objectContaining({
      provisioningAttemptId: 'attempt-vi',
      wifiSsid: 'Casa Wi-Fi',
      wifiPassword: 'secret123',
    })));
    expect(screen.getByText('Đang chuẩn bị Casa Wi-Fi')).toBeTruthy();
  });

  it('completes provisioning from the rename screen before showing final success', async () => {
    const screen = render(
      <PairRenameScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1' } } as never}
      />,
    );

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() => expect(apiMocks.completeDeviceProvisioning).toHaveBeenCalledWith({
      provisioningAttemptId: 'attempt-1',
      deviceId: 'device-1',
      assignChildProfileId: 'child-1',
      displayName: 'Living-room Robot',
    }));
    await waitFor(() => expect(localDeviceMocks.markLocalDevicePaired).toHaveBeenCalledWith('device-1'));
    // Finalize resets the stack to [DeviceHome, PairSuccess] so Back can't walk
    // back through the finished pairing screens.
    expect(reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: ROUTES.DeviceHomeScreen },
        {
          name: ROUTES.PairSuccessScreen,
          params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1' },
        },
      ],
    });
  });

  it('keeps final success after backend completion even if local paired cache write fails', async () => {
    localDeviceMocks.markLocalDevicePaired.mockRejectedValueOnce(new Error('storage unavailable'));
    const screen = render(
      <PairRenameScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1' } } as never}
      />,
    );

    fireEvent.press(screen.getByText('Save & continue'));

    await waitFor(() => expect(apiMocks.completeDeviceProvisioning).toHaveBeenCalled());
    await waitFor(() => expect(reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: ROUTES.DeviceHomeScreen },
        {
          name: ROUTES.PairSuccessScreen,
          params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1' },
        },
      ],
    }));
  });

  it('continues from final success to first lesson instead of reopening rename', () => {
    const screen = render(
      <PairSuccessScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1' } } as never}
      />,
    );

    fireEvent.press(screen.getByText('Continue'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairFirstLessonScreen);
    expect(navigate).not.toHaveBeenCalledWith(ROUTES.PairRenameScreen, expect.anything());
  });

  it('routes pairing submit failures to the retry screen', async () => {
    bleMocks.provisionWifiViaLocalBle.mockRejectedValue(new Error('robot rejected local Wi-Fi'));
    const passwordScreen = render(
      <PairWifiPasswordScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-fail', code: '123456', ssid: 'Casa Wi-Fi', bleDeviceId: 'ble-device-1', provisioningTransport: 'ble' } } as never}
      />,
    );

    fireEvent.changeText(passwordScreen.getByPlaceholderText('Wi-Fi password'), 'secret123');
    fireEvent.press(passwordScreen.getByText('Connect Robot'));
    const connectParams = navigate.mock.calls.find(([route]) => route === ROUTES.PairConnectingScreen)?.[1];

    const screen = render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{ params: connectParams } as never}
      />,
    );

    await expect(screen.findByText('Pairing failed')).resolves.toBeTruthy();
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'attempt-fail',
      code: '123456',
      ssid: 'Casa Wi-Fi',
      bleDeviceId: 'ble-device-1',
      provisioningTransport: 'ble',
      errorCode: 'PAIRING_CONNECT_FAILED',
    });
  });

  it('starts a new provisioning attempt when retry params replace the current connecting route', async () => {
    bleMocks.provisionWifiViaLocalBle.mockImplementationOnce(() => new Promise(() => {}));
    const firstParams = {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'attempt-1',
      code: '123456',
      ssid: 'Casa Wi-Fi',
      bleDeviceId: 'ble-device-1',
      provisioningTransport: 'ble' as const,
    };
    putPairingWifiPassword('attempt-1', 'bad-secret');
    const screen = render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{ params: firstParams } as never}
      />,
    );

    await waitFor(() => expect(bleMocks.provisionWifiViaLocalBle).toHaveBeenCalledWith(expect.objectContaining({
      password: 'bad-secret',
    })));

    putPairingWifiPassword('attempt-2', 'good-secret');
    screen.rerender(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{ params: { ...firstParams, provisioningAttemptId: 'attempt-2' } } as never}
      />,
    );

    await waitFor(() => expect(bleMocks.provisionWifiViaLocalBle).toHaveBeenCalledTimes(2));
    expect(bleMocks.provisionWifiViaLocalBle.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      password: 'good-secret',
    }));
  });

  it('fails fast when the transient Wi-Fi password handoff is missing', async () => {
    const screen = render(
      <PairConnectingScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-missing', code: '123456', ssid: 'Casa Wi-Fi' } } as never}
      />,
    );

    await expect(screen.findByText('Pairing failed')).resolves.toBeTruthy();
    expect(apiMocks.pairDevice).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairFailedScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'attempt-missing',
      code: '123456',
      ssid: 'Casa Wi-Fi',
      errorCode: 'PAIRING_CONTEXT_MISSING',
    });
  });

  it('preserves pairing context when retrying a failed Wi-Fi password', () => {
    const failed = render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{ params: { deviceId: 'device-1', serialNumber: 'TJBot-001', provisioningAttemptId: 'attempt-1', code: '123456', ssid: 'Casa Wi-Fi', errorCode: 'WIFI_AUTH_FAILED' } } as never}
      />,
    );

    fireEvent.press(failed.getByLabelText('Fix wrong Wi-Fi password'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiPasswordScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'attempt-1',
      code: '123456',
      ssid: 'Casa Wi-Fi',
      errorCode: 'WIFI_AUTH_FAILED',
    });
  });

  it('recovers a stale BLE failure screen after the robot confirms the claim late', async () => {
    claimMocks.getClaimStatus.mockResolvedValueOnce({
      claimId: 'claim-late',
      deviceId: 'device-1',
      status: 'CLAIM_CONFIRMED',
      online: true,
      expiresAt: null,
      failureCode: null,
    });

    render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{
          params: {
            deviceId: 'device-1',
            serialNumber: 'TJBot-001',
            provisioningAttemptId: 'claim-late',
            ssid: 'Casa Wi-Fi',
            bleDeviceId: 'ble-device-1',
            provisioningTransport: 'ble',
            errorCode: 'CLAIM_CONFIRM_TIMEOUT',
          },
        } as never}
      />,
    );

    await waitFor(() => expect(claimMocks.getClaimStatus).toHaveBeenCalledWith('claim-late'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(ROUTES.PairRenameScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'claim-late',
    }));
  });

  it('renders typed backend pairing errors as actionable retry copy', () => {
    const failed = render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{ params: { errorCode: 'ESP_SERVER_UNAVAILABLE' } } as never}
      />,
    );

    expect(failed.getByText("We couldn't reach setup service")).toBeTruthy();
    expect(failed.getByText('Robot setup service is unavailable right now. Try again shortly.')).toBeTruthy();
  });

  it('offers same-attempt setup hotspot fallback after local BLE provisioning fails', () => {
    const failed = render(
      <PairFailedScreen
        navigation={navigation as never}
        route={{
          params: {
            deviceId: 'device-1',
            serialNumber: 'TJBot-001',
            provisioningAttemptId: 'attempt-1',
            code: '123456',
            ssid: 'Casa Wi-Fi',
            bleDeviceId: 'ble-device-1',
            provisioningTransport: 'ble',
            errorCode: 'BLE_PROVISIONING_FAILED',
          },
        } as never}
      />,
    );

    expect(failed.getByText("Robot didn't accept setup over Bluetooth")).toBeTruthy();
    fireEvent.press(failed.getByText('Use setup hotspot'));
    expect(navigate).toHaveBeenCalledWith(ROUTES.PairWifiScreen, {
      deviceId: 'device-1',
      serialNumber: 'TJBot-001',
      provisioningAttemptId: 'attempt-1',
      code: '123456',
      provisioningTransport: 'legacy_backend',
    });
  });
});
