import { Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { render, waitFor } from '@testing-library/react-native';
import { BLE_CONFIG } from '@/services/ble/config';
import * as bleService from '@/services/ble/service';
import { requestBlePermissions } from '@/services/ble/permissions';
import PairSearchScreen from '@/features/device/pairing/screens/PairSearchScreen';

jest.mock('react-native-ble-plx', () => {
  const noop = () => {};
  const mockStartDeviceScan = jest.fn();
  const mockStopDeviceScan = jest.fn();
  const mockDestroy = jest.fn();
  const mockOnStateChange = jest.fn();

  class MockBleManager {
    static mockState = 'PoweredOn';
    startDeviceScan = mockStartDeviceScan;
    stopDeviceScan = mockStopDeviceScan;
    destroy = mockDestroy;
    onStateChange = mockOnStateChange;
  }

  mockOnStateChange.mockImplementation(
    (listener: (state: string) => void, emitCurrent = true) => {
      if (emitCurrent) listener(MockBleManager.mockState);
      return { remove: noop };
    },
  );

  return {
    BleManager: MockBleManager,
    State: {
      Unknown: 'Unknown',
      Resetting: 'Resetting',
      Unsupported: 'Unsupported',
      Unauthorized: 'Unauthorized',
      PoweredOff: 'PoweredOff',
      PoweredOn: 'PoweredOn',
    },
  };
});

jest.mock('@/services/provisioning/espProvisioning', () => ({
  searchProvisionableDevices: jest.fn(() => Promise.resolve([])),
}));

describe('T04 BLE scan readiness, RSSI capture, and timeout alignment', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    (BleManager as unknown as { mockState: string }).mockState = 'PoweredOn';

    const manager = bleService.getBleManager();
    (manager.startDeviceScan as jest.Mock).mockImplementation(() => {});
    (manager.stopDeviceScan as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  test('SCAN_TIMEOUT_MS is aligned with XState machine spec (30000 ms)', () => {
    expect(BLE_CONFIG.SCAN_TIMEOUT_MS).toBe(30000);
  });

  describe('iOS Bluetooth state readiness', () => {
    test('returns poweredOff when CBCentralManager is PoweredOff', async () => {
      (BleManager as unknown as { mockState: string }).mockState = 'PoweredOff';
      const result = await requestBlePermissions();
      expect(result as string).toBe('poweredOff');
    });

    test('returns unauthorized when CBCentralManager is Unauthorized', async () => {
      (BleManager as unknown as { mockState: string }).mockState = 'Unauthorized';
      const result = await requestBlePermissions();
      expect(result as string).toBe('unauthorized');
    });
  });

  describe('RSSI capture and candidate selection', () => {
    function mockScanWithDevices(
      devices: Array<{ id: string; name: string; rssi: number }>,
    ) {
      const manager = bleService.getBleManager();
      (manager.startDeviceScan as jest.Mock).mockImplementation(
        (_uuids: string[], _options: unknown, callback: (error: Error | null, device: unknown | null) => void) => {
          devices.forEach((device) =>
            callback(null, { ...device, serviceUUIDs: [BLE_CONFIG.SERVICE_UUID] } as Record<string, unknown>),
          );
        },
      );
    }

    test('BleDeviceCandidate preserves rssi from scanned device', async () => {
      mockScanWithDevices([{ id: 'TJBot-001', name: 'TJBot Living Room', rssi: -55 }]);
      const result = await bleService.scanForTJBotDevices(100);
      expect(result.allowed).toHaveLength(1);
      expect((result.allowed[0] as { rssi?: number }).rssi).toBe(-55);
    });

    test('scanForTJBotDevices sorts allowed candidates by descending RSSI', async () => {
      mockScanWithDevices([
        { id: 'TJBot-FAR', name: 'TJBot Far', rssi: -85 },
        { id: 'TJBot-NEAR', name: 'TJBot Near', rssi: -45 },
      ]);
      const result = await bleService.scanForTJBotDevices(100);
      expect(result.allowed).toHaveLength(2);
      expect(result.allowed[0].id).toBe('TJBot-NEAR');
      expect(result.allowed[1].id).toBe('TJBot-FAR');
    });

    test('scanForTJBotDevices rejects signals below the configurable RSSI threshold', async () => {
      const threshold = (BLE_CONFIG as { MIN_RSSI_THRESHOLD?: number }).MIN_RSSI_THRESHOLD ?? -85;
      mockScanWithDevices([
        { id: 'TJBot-STRONG', name: 'TJBot Strong', rssi: threshold + 10 },
        { id: 'TJBot-WEAK', name: 'TJBot Weak', rssi: threshold - 10 },
      ]);
      const result = await bleService.scanForTJBotDevices(100);
      expect(result.allowed.some((d) => d.id === 'TJBot-STRONG')).toBe(true);
      expect(result.allowed.some((d) => d.id === 'TJBot-WEAK')).toBe(false);
    });
  });

  describe('PairSearchScreen Bluetooth-off prompt', () => {
    let scanSpy: jest.SpyInstance;

    beforeEach(() => {
      scanSpy = jest
        .spyOn(bleService, 'scanForTJBotDevices')
        .mockResolvedValue({ allowed: [], blocked: [] });
    });

    afterEach(() => {
      scanSpy.mockRestore();
    });

    test('surfaces a clear Turn on Bluetooth prompt when Bluetooth is not poweredOn', async () => {
      (BleManager as unknown as { mockState: string }).mockState = 'PoweredOff';

      const { getByText } = render(
        <PairSearchScreen
          navigation={{
            navigate: jest.fn(),
            replace: jest.fn(),
            goBack: jest.fn(),
          } as unknown as Parameters<typeof PairSearchScreen>[0]['navigation']}
          route={{ key: 'PairSearchScreen', name: 'PairSearchScreen' } as Parameters<typeof PairSearchScreen>[0]['route']}
        />,
      );

      await waitFor(() => {
        expect(getByText(/Turn on Bluetooth/i)).toBeTruthy();
      });
    });
  });
});
