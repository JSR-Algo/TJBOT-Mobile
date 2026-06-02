import { BLE_CONFIG, isAllowlistedDevice } from '../../src/services/ble/config';
import { BLUFI_DATA_CUSTOM, buildBluFiStationProvisioningFrames } from '../../src/services/ble/blufiProtocol';
import { disposeBle, initializeBle, provisionWifiViaLocalBle, scanForTJBotDevices, scanRobotWifiNetworks, splitDevicesByAllowlist } from '../../src/services/ble/service';

let mockBleState = 'PoweredOn';
let mockBleStateQueue: string[] = [];
const mockStartDeviceScan = jest.fn();
const mockStopDeviceScan = jest.fn();

jest.mock('react-native-ble-plx', () => ({
  BleManager: jest.fn().mockImplementation(() => ({
    state: jest.fn(() => Promise.resolve(mockBleStateQueue.shift() ?? mockBleState)),
    startDeviceScan: mockStartDeviceScan,
    stopDeviceScan: mockStopDeviceScan,
    destroy: jest.fn(),
    connectToDevice: jest.fn(),
  })),
}));

jest.mock('../../src/services/ble/permissions', () => ({
  requestBlePermissions: jest.fn(),
}));

const { requestBlePermissions } = jest.requireMock('../../src/services/ble/permissions') as {
  requestBlePermissions: jest.Mock;
};
describe('BLE service', () => {
  beforeEach(async () => {
    await disposeBle();
    jest.clearAllMocks();
    mockBleState = 'PoweredOn';
    mockBleStateQueue = [];
  });

  test('initializes BLE when permission is granted', async () => {
    requestBlePermissions.mockResolvedValue('granted');
    const result = await initializeBle();
    expect(result).toEqual({ permission: 'granted', available: true });
  });

  test('returns unavailable state when permission is denied', async () => {
    requestBlePermissions.mockResolvedValue('denied');
    const result = await initializeBle();
    expect(result.available).toBe(false);
    expect(result.permission).toBe('denied');
  });

  test('returns unavailable state when Bluetooth is powered off', async () => {
    requestBlePermissions.mockResolvedValue('granted');
    mockBleState = 'PoweredOff';

    const result = await initializeBle();

    expect(result.available).toBe(false);
    expect(result.permission).toBe('granted');
    expect(result.reason).toMatch(/Bluetooth is off/i);
  });

  test('waits for transient BLE manager state before failing search bootstrap', async () => {
    requestBlePermissions.mockResolvedValue('granted');
    mockBleStateQueue = ['Unknown', 'PoweredOn'];

    const result = await initializeBle({ stateRetryDelayMs: 0 });

    expect(result).toEqual({ permission: 'granted', available: true });
  });

  test('waits for Android BLE stack to settle when it briefly reports powered off', async () => {
    requestBlePermissions.mockResolvedValue('granted');
    mockBleStateQueue = ['PoweredOff', 'PoweredOn'];

    const result = await initializeBle({ stateRetryDelayMs: 0 });

    expect(result).toEqual({ permission: 'granted', available: true });
  });

  test('enforces allowlist filtering before pairing', () => {
    const result = splitDevicesByAllowlist([
      { id: 'TBot-Blufi-001', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      { id: 'XYZ-001', name: 'Speaker', localName: 'Speaker', serviceUUIDs: [BLE_CONFIG.SERVICE_UUID] },
    ]);

    expect(result.allowed).toHaveLength(1);
    expect(result.blocked).toHaveLength(1);
    expect(isAllowlistedDevice('TBot-Blufi-001', 'TBot-Blufi')).toBe(true);
    expect(isAllowlistedDevice('XYZ-001', 'Speaker')).toBe(false);
  });

  test('scans without a service UUID filter so BluFi name-only advertisements are visible', async () => {
    mockStartDeviceScan.mockImplementation((_uuids, _options, listener) => {
      listener(null, { id: 'AA:BB:CC:DD:EE:FF', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: null });
    });

    await expect(scanForTJBotDevices(1)).resolves.toMatchObject({
      allowed: [{ name: 'TBot-Blufi' }],
      blocked: [],
    });

    expect(mockStartDeviceScan).toHaveBeenCalledWith(null, null, expect.any(Function));
    expect(mockStopDeviceScan).toHaveBeenCalled();
  });

  test('sends Wi-Fi credentials through a local BLE write instead of an HTTP bridge', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const discoverAllServicesAndCharacteristics = jest.fn().mockResolvedValue({
      writeCharacteristicWithResponseForService,
      cancelConnection,
    });
    const connect = jest.fn().mockResolvedValue({
      discoverAllServicesAndCharacteristics,
      writeCharacteristicWithResponseForService,
      cancelConnection,
    });

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connectDevice: connect,
    })).resolves.toEqual({
      deviceId: 'ble-device-1',
      status: 'wifi_credentials_sent',
      transport: 'ble-blufi',
    });

    expect(connect).toHaveBeenCalledWith('ble-device-1');
    expect(writeCharacteristicWithResponseForService).toHaveBeenCalledWith(
      BLE_CONFIG.BLUFI_SERVICE_UUID,
      BLE_CONFIG.BLUFI_WRITE_CHARACTERISTIC_UUID,
      expect.any(String),
    );
    expect(writeCharacteristicWithResponseForService).toHaveBeenCalledTimes(4);
    const writes = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string));
    expect(writes[0]).toEqual([0x08, 0x00, 0x00, 0x01, 0x01]);
    expect(writes[1]).toEqual([0x09, 0x00, 0x01, 0x04, ...asciiBytes('Casa')]);
    expect(writes[2]).toEqual([0x0d, 0x00, 0x02, 0x0b, ...asciiBytes('secret-pass')]);
    expect(writes[3]).toEqual([0x0c, 0x00, 0x03, 0x00]);
    expect(cancelConnection).toHaveBeenCalled();
  });

  test('fragments long BluFi payloads using ESP-IDF frame format', () => {
    const frames = buildBluFiStationProvisioningFrames({
      ssid: 'Casa-Wifi-Network',
      password: 'correct-horse-battery-staple',
    }).map(decodeBase64);

    const ssidFrames = frames.filter((frame) => frame[0] === 0x09);
    const passwordFrames = frames.filter((frame) => frame[0] === 0x0d);

    expect(ssidFrames.length).toBeGreaterThan(1);
    expect(ssidFrames[0][1]).toBe(0x10);
    expect(ssidFrames[0][4] | (ssidFrames[0][5] << 8)).toBe(asciiBytes('Casa-Wifi-Network').length);
    expect(ssidFrames[ssidFrames.length - 1][1]).toBe(0x00);
    expect(passwordFrames.length).toBeGreaterThan(1);
    expect(passwordFrames[0][1]).toBe(0x10);
    expect(passwordFrames[passwordFrames.length - 1][1]).toBe(0x00);
  });

  test('preserves exact Wi-Fi password bytes for local BLE provisioning', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const discoverAllServicesAndCharacteristics = jest.fn().mockResolvedValue({ writeCharacteristicWithResponseForService });
    const connect = jest.fn().mockResolvedValue({ discoverAllServicesAndCharacteristics, cancelConnection });

    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: ' pass ',
      code: '123456',
      connectDevice: connect,
    });

    const passwordFrame = writeCharacteristicWithResponseForService.mock.calls
      .map((call) => decodeBase64(call[2] as string))
      .find((frame) => frame[0] === 0x0d);
    expect(passwordFrame).toEqual([0x0d, 0x00, 0x02, 0x06, ...asciiBytes(' pass ')]);
  });

  test('writes custom-data TLV frame before SSID/PASSWD frames when token is present', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const discoverAllServicesAndCharacteristics = jest.fn().mockResolvedValue({
      writeCharacteristicWithResponseForService,
      cancelConnection,
    });
    const connect = jest.fn().mockResolvedValue({
      discoverAllServicesAndCharacteristics,
      writeCharacteristicWithResponseForService,
      cancelConnection,
    });

    // 43-char base64url token as specified in plan
    const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      token,
      connectDevice: connect,
    })).resolves.toMatchObject({ status: 'wifi_credentials_sent' });

    const allWrites = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string));

    // First write must be the custom-data frame: type = (BLUFI_TYPE_DATA=0x01 | BLUFI_DATA_CUSTOM=0x13 << 2) = 0x4d
    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);
    expect(allWrites[0][0]).toBe(customDataType);

    // Station opmode frame must come AFTER custom-data frames
    const opModeIdx = allWrites.findIndex((frame) => frame[0] === 0x08);
    const customDataIdx = allWrites.findIndex((frame) => frame[0] === customDataType);
    expect(customDataIdx).toBeLessThan(opModeIdx);

    // Sequence numbers must be monotonically increasing across all frames
    const sequences = allWrites.map((frame) => frame[2]);
    for (let idx = 1; idx < sequences.length - 1; idx += 1) {
      expect(sequences[idx]).toBe((sequences[idx - 1]! + 1) & 0xff);
    }
  });

  test('rejects Wi-Fi credentials that exceed ESP byte limits before connecting', async () => {
    const connect = jest.fn();

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'a'.repeat(64),
      code: '123456',
      connectDevice: connect,
    })).rejects.toMatchObject({ code: 'WIFI_PASSWORD_INVALID' });

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: '😀'.repeat(9),
      password: 'secret-pass',
      code: '123456',
      connectDevice: connect,
    })).rejects.toMatchObject({ code: 'WIFI_SSID_INVALID' });

    expect(connect).not.toHaveBeenCalled();
  });

  test('reads robot Wi-Fi scan results from BluFi notify frames', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      listener(null, { value: encodeBase64([0x45, 0x04, 0x00, 0x06, 0x05, 0xc9, ...asciiBytes('Casa')]) });
      return { remove };
    });
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const discoverAllServicesAndCharacteristics = jest.fn().mockResolvedValue({
      writeCharacteristicWithResponseForService,
      monitorCharacteristicForService,
      cancelConnection,
    });
    const connect = jest.fn().mockResolvedValue({
      discoverAllServicesAndCharacteristics,
      writeCharacteristicWithResponseForService,
      monitorCharacteristicForService,
      cancelConnection,
    });

    await expect(scanRobotWifiNetworks({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: connect,
    })).resolves.toEqual([{ ssid: 'Casa', rssi: -55 }]);

    expect(monitorCharacteristicForService).toHaveBeenCalledWith(
      BLE_CONFIG.BLUFI_SERVICE_UUID,
      BLE_CONFIG.BLUFI_NOTIFY_CHARACTERISTIC_UUID,
      expect.any(Function),
    );
    expect(decodeBase64(writeCharacteristicWithResponseForService.mock.calls[0][2])).toEqual([0x24, 0x00, 0x00, 0x00]);
    expect(remove).toHaveBeenCalled();
    expect(cancelConnection).toHaveBeenCalled();
  });
});

function asciiBytes(value: string): number[] {
  return Array.from(value).map((char) => char.charCodeAt(0));
}

function decodeBase64(value: string): number[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i += 4) {
    const a = alphabet.indexOf(value[i]);
    const b = alphabet.indexOf(value[i + 1]);
    const c = value[i + 2] === '=' ? 0 : alphabet.indexOf(value[i + 2]);
    const d = value[i + 3] === '=' ? 0 : alphabet.indexOf(value[i + 3]);
    const triplet = (a << 18) | (b << 12) | (c << 6) | d;
    bytes.push((triplet >> 16) & 0xff);
    if (value[i + 2] !== '=') bytes.push((triplet >> 8) & 0xff);
    if (value[i + 3] !== '=') bytes.push(triplet & 0xff);
  }
  return bytes;
}

function encodeBase64(bytes: number[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triplet = (a << 16) | (b << 8) | c;
    output += alphabet[(triplet >> 18) & 0x3f];
    output += alphabet[(triplet >> 12) & 0x3f];
    output += i + 1 < bytes.length ? alphabet[(triplet >> 6) & 0x3f] : '=';
    output += i + 2 < bytes.length ? alphabet[triplet & 0x3f] : '=';
  }
  return output;
}
