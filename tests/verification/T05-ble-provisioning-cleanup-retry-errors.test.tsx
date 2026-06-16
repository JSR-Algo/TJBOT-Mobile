import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
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

jest.mock('@/services/api/device.api', () => ({
  pairDevice: jest.fn(),
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
  });

  describe('PairWifiScreen', () => {
    it('disconnects the ESP device and stops provision search on unmount', async () => {
      orbitalMocks.mockConnect.mockResolvedValue(undefined);
      // Keep the scan hanging so the effect is still "active" when we unmount.
      orbitalMocks.mockScanWifiList.mockReturnValue(new Promise(() => {}));

      const { unmount } = render(
        <PairWifiScreen
          navigation={navigationFor<'PairWifiScreen'>()}
          route={routeFor('PairWifiScreen', {
            code: '1234',
            espDeviceName: 'TJBot-TEST',
          })}
        />,
      );

      await waitFor(() => expect(orbitalMocks.mockConnect).toHaveBeenCalled());
      unmount();

      expect(orbitalMocks.mockDisconnect).toHaveBeenCalled();
      expect(orbitalMocks.mockStopSearch).toHaveBeenCalled();
    });

    it('exposes a "Scan again" action to refresh the Wi-Fi list', async () => {
      orbitalMocks.mockConnect.mockResolvedValue(undefined);
      orbitalMocks.mockScanWifiList.mockResolvedValue([
        { ssid: 'Home-5G', rssi: -45 },
      ]);

      const { getByText, queryByText } = render(
        <PairWifiScreen
          navigation={navigationFor<'PairWifiScreen'>()}
          route={routeFor('PairWifiScreen', {
            code: '1234',
            espDeviceName: 'TJBot-TEST',
          })}
        />,
      );

      await waitFor(() => expect(getByText('Home-5G')).toBeTruthy());
      expect(queryByText('Scan again')).toBeTruthy();
    });
  });

  describe('PairConnectingScreen', () => {
    it('disconnects the ESP device and stops provision search on unmount', async () => {
      orbitalMocks.mockConnect.mockResolvedValue(undefined);
      // Keep provision hanging so cleanup is the only path that would disconnect.
      orbitalMocks.mockProvision.mockReturnValue(new Promise(() => {}));

      const { unmount } = render(
        <PairConnectingScreen
          navigation={navigationFor<'PairConnectingScreen'>()}
          route={routeFor('PairConnectingScreen', {
            code: '1234',
            ssid: 'Home-5G',
            password: 'secret',
            espDeviceName: 'TJBot-TEST',
          })}
        />,
      );

      await waitFor(() => expect(orbitalMocks.mockConnect).toHaveBeenCalled());
      unmount();

      expect(orbitalMocks.mockDisconnect).toHaveBeenCalled();
      expect(orbitalMocks.mockStopSearch).toHaveBeenCalled();
    });
  });

  describe('espProvisioning retry and error mapping', () => {
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
            error: 'Robot did not respond in time',
            code: '1234',
            ssid: 'Home-5G',
          })}
        />,
      );

      // The current screen always shows a generic "Wrong Wi-Fi password" card.
      // After the fix, E-PROV-001 (BLE timeout) should not surface Wi-Fi password recovery.
      expect(queryByText('Wrong Wi-Fi password')).toBeNull();
      expect(queryByText('Robot looks asleep')).toBeTruthy();
    });
  });
});
