import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import PairWifiScreen from '@/features/device/pairing/screens/PairWifiScreen';
import PairConnectingScreen from '@/features/device/pairing/screens/PairConnectingScreen';
import PairFailedScreen from '@/features/device/pairing/screens/PairFailedScreen';
import {
  connectProvisionableDevice,
  provisionWifi,
  type ProvisioningConnectResult,
} from '@/services/provisioning/espProvisioning';
import { clearPairingSession } from '@/features/device/pairing/pairingSession';
import { putPairingWifiPassword } from '@/features/device/pairing/pairingSecretHandoff';
import { provisionWifiViaLocalBle, scanRobotWifiNetworks } from '@/services/ble/service';

jest.mock('@orbital-systems/react-native-esp-idf-provisioning', () => {
  const mockDisconnect = jest.fn();
  const mockStopSearch = jest.fn();
  const mockScanWifiList = jest.fn();
  const mockProvision = jest.fn();
  const mockConnect = jest.fn();
  const mockSearchESPDevices = jest.fn();

  class ESPDevice {
    name: string;
    constructor({ name }: { name: string }) {
      this.name = name;
    }
    connect = mockConnect;
    disconnect = mockDisconnect;
    scanWifiList = mockScanWifiList;
    provision = mockProvision;
  }

  return {
    __esModule: true,
    ESPDevice,
    ESPProvisionManager: {
      searchESPDevices: mockSearchESPDevices,
      stopESPDevicesSearch: mockStopSearch,
    },
    ESPTransport: { ble: 'ble' },
    ESPSecurity: { unsecure: 0, secure: 1, secure2: 2 },
    __mocks: {
      mockDisconnect,
      mockStopSearch,
      mockScanWifiList,
      mockProvision,
      mockConnect,
      mockSearchESPDevices,
    },
  };
});

jest.mock('@/services/ble/service', () => ({
  __esModule: true,
  scanRobotWifiNetworks: jest.fn(),
  provisionWifiViaLocalBle: jest.fn(),
}));

jest.mock('@/services/api/device.api', () => ({
  pairDevice: jest.fn(),
  confirmLocalBlePaired: jest.fn(),
  getProvisioningAttemptStatus: jest.fn(),
  getDeviceStatus: jest.fn(),
  mintBootstrapToken: jest.fn(),
  getClaimStatus: jest.fn(),
  requestClaim: jest.fn(),
}));

const orbitalMocks = (
  jest.requireMock('@orbital-systems/react-native-esp-idf-provisioning') as {
    __mocks: {
      mockDisconnect: jest.Mock;
      mockStopSearch: jest.Mock;
      mockScanWifiList: jest.Mock;
      mockProvision: jest.Mock;
      mockConnect: jest.Mock;
      mockSearchESPDevices: jest.Mock;
    };
  }
).__mocks;

const mockedScanRobotWifi = scanRobotWifiNetworks as jest.MockedFunction<typeof scanRobotWifiNetworks>;
const mockedProvisionWifiViaLocalBle = provisionWifiViaLocalBle as jest.MockedFunction<typeof provisionWifiViaLocalBle>;

const BLE_WIFI_PARAMS = {
  deviceId: 'device-1',
  serialNumber: 'TJBot-TEST',
  provisioningAttemptId: 'attempt-1',
  bleDeviceId: 'ble-device-1',
  provisioningTransport: 'ble' as const,
  code: '1234',
};

type RouteName = Extract<keyof RootStackParamList, string>;

function navigationFor<Name extends RouteName>(): NativeStackNavigationProp<
  RootStackParamList,
  Name
> {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    isFocused: () => true,
    canGoBack: () => true,
    getId: () => undefined,
    getParent: () => undefined,
    getState: () => ({
      type: 'stack',
      key: 'test-stack',
      index: 0,
      routeNames: [],
      routes: [],
      stale: false,
      preloadedRoutes: [],
    }),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
  } as unknown as NativeStackNavigationProp<RootStackParamList, Name>;
}

function routeFor<Name extends RouteName>(
  name: Name,
  params?: RootStackParamList[Name],
): RouteProp<RootStackParamList, Name> {
  return {
    key: name,
    name,
    params: params ?? {},
  } as unknown as RouteProp<RootStackParamList, Name>;
}

function makeDevice(): ProvisioningConnectResult['device'] {
  const ESPDeviceClass = jest.requireMock(
    '@orbital-systems/react-native-esp-idf-provisioning',
  ).ESPDevice as new (args: { name: string }) => ProvisioningConnectResult['device'];
  return new ESPDeviceClass({ name: 'TJBot-TEST' });
}

describe('T05: BLE provisioning cleanup, retry, and error mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPairingSession();
    mockedScanRobotWifi.mockReset();
    mockedProvisionWifiViaLocalBle.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('PairWifiScreen', () => {
    it('cancels an in-flight robot Wi-Fi scan on unmount', async () => {
      mockedScanRobotWifi.mockReturnValue(new Promise(() => {}));

      const { unmount } = render(
        <PairWifiScreen
          navigation={navigationFor<'PairWifiScreen'>()}
          route={routeFor('PairWifiScreen', BLE_WIFI_PARAMS)}
        />,
      );

      await waitFor(() => expect(mockedScanRobotWifi).toHaveBeenCalled());
      unmount();

      expect(mockedScanRobotWifi).toHaveBeenCalledTimes(1);
    });

    it('exposes a rescan action to refresh the Wi-Fi list', async () => {
      mockedScanRobotWifi.mockResolvedValue([
        { ssid: 'Home-5G', rssi: -45 },
      ]);

      const { getByText, queryByText } = render(
        <PairWifiScreen
          navigation={navigationFor<'PairWifiScreen'>()}
          route={routeFor('PairWifiScreen', BLE_WIFI_PARAMS)}
        />,
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(6000);
      });
      await waitFor(() => expect(getByText('Home-5G')).toBeTruthy());
      expect(queryByText('Rescan networks from Robot')).toBeTruthy();
    });
  });

  describe('PairConnectingScreen', () => {
    it('does not navigate after unmount while local BLE provisioning is still running', async () => {
      jest.useRealTimers();
      putPairingWifiPassword('attempt-1', 'secret');
      mockedProvisionWifiViaLocalBle.mockReturnValue(new Promise(() => {}));

      const navigation = navigationFor<'PairConnectingScreen'>();
      const { unmount } = render(
        <PairConnectingScreen
          navigation={navigation}
          route={routeFor('PairConnectingScreen', {
            deviceId: 'device-1',
            serialNumber: 'TJBot-TEST',
            provisioningAttemptId: 'attempt-1',
            bleDeviceId: 'ble-device-1',
            provisioningTransport: 'ble_reconnect',
            ssid: 'Home-5G',
          })}
        />,
      );

      await waitFor(() => expect(mockedProvisionWifiViaLocalBle).toHaveBeenCalled());
      unmount();

      expect(navigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('espProvisioning retry and error mapping', () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    it('retries a transient BLE disconnect during connectProvisionableDevice', async () => {
      orbitalMocks.mockConnect
        .mockRejectedValueOnce(new Error('Peripheral disconnected'))
        .mockResolvedValueOnce(undefined);

      const result = await connectProvisionableDevice({ deviceName: 'TJBot-TEST' });

      expect(orbitalMocks.mockConnect).toHaveBeenCalledTimes(2);
      expect(result.device).toBeDefined();
    });

    it('maps connection failures to the XState E-PROV-001 code', async () => {
      orbitalMocks.mockConnect.mockRejectedValue(new Error('Connection timed out'));

      await expect(
        connectProvisionableDevice({ deviceName: 'TJBot-TEST' }),
      ).rejects.toMatchObject({ code: 'E-PROV-001' });
    });

    it('maps Wi-Fi authentication failures to the XState E-PROV-002 code', async () => {
      orbitalMocks.mockProvision.mockRejectedValue(new Error('Authentication failed'));
      const device = makeDevice();

      await expect(provisionWifi(device, 'Home-5G', 'wrong')).rejects.toMatchObject({
        code: 'E-PROV-002',
      });
    });
  });

  describe('PairFailedScreen', () => {
    it('shows context-aware recovery actions instead of a generic list for E-PROV-001', () => {
      const { queryByText } = render(
        <PairFailedScreen
          navigation={navigationFor<'PairFailedScreen'>()}
          route={routeFor('PairFailedScreen', {
            errorCode: 'E-PROV-001',
            code: '1234',
            ssid: 'Home-5G',
          })}
        />,
      );

      expect(queryByText('Wrong Wi-Fi password')).toBeNull();
      expect(queryByText('Robot looks asleep')).toBeTruthy();
    });
  });
});