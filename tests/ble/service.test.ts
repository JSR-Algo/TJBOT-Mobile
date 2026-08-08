import { BLE_CONFIG, isAllowlistedDevice } from '../../src/services/ble/config';
import { BLUFI_DATA_CUSTOM, buildBluFiStationProvisioningFrames, parseBluFiConnReport } from '../../src/services/ble/blufiProtocol';
import { disposeBle, getBleManager, initializeBle, provisionWifiViaLocalBle, scanForTJBotDevices, scanRobotWifiNetworks, sendClaimBootstrapTokenViaBle, splitDevicesByAllowlist } from '../../src/services/ble/service';

let mockBleState = 'PoweredOn';
let mockBleStateQueue: string[] = [];
const mockStartDeviceScan = jest.fn();
const mockStopDeviceScan = jest.fn();
const mockConnectToDevice = jest.fn();
const mockIsDeviceConnected = jest.fn();
const mockCancelDeviceConnection = jest.fn();

jest.mock('react-native-ble-plx', () => ({
  ScanMode: { LowPower: 0, Balanced: 1, LowLatency: 2 },
  BleManager: jest.fn().mockImplementation(() => ({
    state: jest.fn(() => Promise.resolve(mockBleStateQueue.shift() ?? mockBleState)),
    startDeviceScan: mockStartDeviceScan,
    stopDeviceScan: mockStopDeviceScan,
    destroy: jest.fn(),
    connectToDevice: mockConnectToDevice,
    isDeviceConnected: mockIsDeviceConnected,
    cancelDeviceConnection: mockCancelDeviceConnection,
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

  test('splitDevicesByAllowlist blocks generic BluFi peripherals without robot identity', () => {
    const result = splitDevicesByAllowlist([
      { id: 'AA:BB:CC:DD:EE:FF', name: 'ES3C35P-001', localName: 'ES3C35P-001', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      { id: 'ZZ:00', name: 'Speaker', localName: 'Speaker', serviceUUIDs: [BLE_CONFIG.SERVICE_UUID] },
    ]);

    expect(result.allowed).toEqual([]);
    expect(result.blocked.map((d) => d.name)).toEqual(['ES3C35P-001', 'Speaker']);
  });

  test('serializes BLE diagnostics without raw robot identifiers or secrets', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const rawSerial = 'TBOT-14C19FD1AC20';
    const rawMac = 'AA:BB:CC:DD:EE:FF';
    const rawPassword = 'home-password';
    const rawToken = 'bootstrap-token';
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const connect = jest.fn().mockResolvedValue({
      discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue({ cancelConnection }),
      cancelConnection,
    });

    await expect(scanRobotWifiNetworks({
      device: { id: rawMac, name: rawSerial, localName: rawSerial, serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: connect,
    })).rejects.toMatchObject({ code: 'BLE_WIFI_SCAN_UNSUPPORTED' });
    await expect(scanRobotWifiNetworks({
      device: { id: rawMac, name: rawSerial, localName: rawSerial, serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: jest.fn().mockRejectedValue(Object.assign(
        new Error(`${rawPassword} ${rawToken}`),
        { code: 'BLE_WIFI_SCAN_UNSUPPORTED' },
      )),
    })).rejects.toMatchObject({ code: 'BLE_WIFI_SCAN_UNSUPPORTED' });

    const serialized = JSON.stringify(info.mock.calls);
    info.mockRestore();
    expect(serialized).not.toContain(rawSerial);
    expect(serialized).not.toContain(rawMac);
    expect(serialized).not.toContain(rawPassword);
    expect(serialized).not.toContain(rawToken);
    expect(serialized).not.toContain('hasWriter');
    expect(serialized).not.toContain('hasMonitor');
  });

  test('requires TBOT-family identity even when the generic BluFi UUID is present', () => {
    expect(isAllowlistedDevice('ES3C35P-001', 'ES3C35P-001', [BLE_CONFIG.BLUFI_SERVICE_UUID])).toBe(false);
    expect(isAllowlistedDevice('ES3C35P-002', 'ES3C35P-002', [BLE_CONFIG.BLUFI_SERVICE_UUID.toLowerCase()])).toBe(false);

    // Still blocked: non-TBOT name AND no BluFi service UUID advertised.
    expect(isAllowlistedDevice('ES3C35P-003', 'ES3C35P-003', [BLE_CONFIG.SERVICE_UUID])).toBe(false);
    expect(isAllowlistedDevice('ES3C35P-004', 'ES3C35P-004', [])).toBe(false);
    expect(isAllowlistedDevice('ES3C35P-005', 'ES3C35P-005')).toBe(false);

    // The existing name-prefix path keeps working even with no service UUIDs.
    expect(isAllowlistedDevice('TBot-Blufi-001', 'TBot-Blufi', [])).toBe(true);
  });

  test('scans without a service UUID filter so BluFi name-only advertisements are visible', async () => {
    mockStartDeviceScan.mockImplementation((_uuids, _options, listener) => {
      listener(null, { id: 'AA:BB:CC:DD:EE:FF', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: null });
    });

    await expect(scanForTJBotDevices(1)).resolves.toMatchObject({
      allowed: [{ name: 'TBot-Blufi' }],
      blocked: [],
    });

    expect(mockStartDeviceScan).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ allowDuplicates: true, scanMode: 2 }),
      expect.any(Function),
    );
    expect(mockStopDeviceScan).toHaveBeenCalledTimes(1);
  });

  test('scans Android raw advertisements when name and service UUID fields are empty', async () => {
    mockStartDeviceScan.mockImplementation((_uuids, _options, listener) => {
      listener(null, {
        id: 'AA:BB:CC:DD:EE:FF',
        name: null,
        localName: null,
        serviceUUIDs: [],
        rawScanRecord: 'BglUQk9ULQ==',
      });
      listener(null, {
        id: 'ZZ:00:11:22:33:44',
        name: null,
        localName: null,
        serviceUUIDs: [],
        rawScanRecord: 'BAlTcGVha2Vy',
      });
    });

    const result = await scanForTJBotDevices(1);

    expect(result.allowed.map((d) => d.id)).toEqual(['AA:BB:CC:DD:EE:FF']);
    expect(result.blocked.map((d) => d.id)).toEqual(['ZZ:00:11:22:33:44']);
  });

  test('rejects BLE_SCAN_ERROR when the native discovery callback reports a scan failure', async () => {
    mockStartDeviceScan.mockImplementation((_uuids, _options, listener) => {
      listener(Object.assign(new Error('Adapter unavailable'), { errorCode: 1 }), null);
    });

    await expect(scanForTJBotDevices(1)).rejects.toMatchObject({
      code: 'BLE_SCAN_ERROR',
    });
    expect(mockStopDeviceScan).toHaveBeenCalled();
  });

  test('rejects BLE_SCAN_THROTTLED for Android scan-too-frequently failures', async () => {
    mockStartDeviceScan.mockImplementation((_uuids, _options, listener) => {
      listener(new Error('Cannot start scanning operation because scanning is too frequently'), null);
    });

    await expect(scanForTJBotDevices(1)).rejects.toMatchObject({
      code: 'BLE_SCAN_THROTTLED',
    });
    expect(mockStopDeviceScan).toHaveBeenCalled();
  });

  test('sends Wi-Fi credentials through a local BLE write instead of an HTTP bridge', async () => {
    const { writeCharacteristicWithResponseForService, cancelConnection, connect } = createSecureProvisioningMocks();

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
    const writes = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string));
    expect(writes[0][0]).toBe(0x01);
    expect(writes.some((frame) => frame[0] === 0x04)).toBe(true);
    const opMode = writes.find((frame) => frame[0] === 0x08);
    const ssid = writes.find((frame) => frame[0] === 0x09);
    const password = writes.find((frame) => frame[0] === 0x0d);
    const connectAp = writes.find((frame) => frame[0] === 0x0c);
    // After DH, opmode is encrypted+checksum like SSID/password (Espressif Android parity).
    expect(opMode?.slice(0, 2)).toEqual([0x08, 0x03]);
    expect(opMode?.[3]).toBe(0x01);
    expect(ssid?.slice(0, 2)).toEqual([0x09, 0x03]);
    expect(ssid?.[3]).toBe(0x04);
    expect(password?.slice(0, 2)).toEqual([0x0d, 0x03]);
    expect(password?.[3]).toBe(0x0b);
    expect(hasByteSequence(writes.flat(), asciiBytes('Casa'))).toBe(false);
    expect(hasByteSequence(writes.flat(), asciiBytes('secret-pass'))).toBe(false);
    expect(connectAp?.slice(0, 2)).toEqual([0x0c, 0x00]);
    expect(connectAp?.slice(3)).toEqual([0x00]);
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
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();

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
    expect(passwordFrame?.slice(0, 2)).toEqual([0x0d, 0x03]);
    expect(passwordFrame?.[3]).toBe(0x06);
    expect(hasByteSequence(passwordFrame ?? [], asciiBytes(' pass '))).toBe(false);
  });

  test('writes custom-data TLV frame before SSID/PASSWD frames when token is present', async () => {
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();

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

    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);
    const setSecurityIdx = allWrites.findIndex((frame) => frame[0] === 0x04);

    // Station opmode frame must come AFTER custom-data frames; the security
    // handshake is now the only permitted prelude before token/credential data.
    const opModeIdx = allWrites.findIndex((frame) => frame[0] === 0x08);
    const customDataIdx = allWrites.findIndex((frame) => frame[0] === customDataType);
    expect(customDataIdx).toBeGreaterThan(setSecurityIdx);
    expect(customDataIdx).toBeLessThan(opModeIdx);

    // Sequence numbers must be monotonically increasing across all frames
    const sequences = allWrites.map((frame) => frame[2]);
    for (let idx = 1; idx < sequences.length - 1; idx += 1) {
      expect(sequences[idx]).toBe((sequences[idx - 1]! + 1) & 0xff);
    }
  });

  test('negotiates BluFi security before sending token and Wi-Fi credentials', async () => {
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();

    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      code: '123456',
      connectDevice: connect,
    });

    const allWrites = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string));
    const securityNegIdx = allWrites.findIndex((frame) => frame[0] === 0x01);
    const setSecurityIdx = allWrites.findIndex((frame) => frame[0] === 0x04);
    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);
    const customDataIdx = allWrites.findIndex((frame) => frame[0] === customDataType);
    const ssidIdx = allWrites.findIndex((frame) => frame[0] === 0x09);
    const passwordIdx = allWrites.findIndex((frame) => frame[0] === 0x0d);

    expect(securityNegIdx).toBe(0);
    expect(setSecurityIdx).toBeGreaterThan(securityNegIdx);
    expect(customDataIdx).toBeGreaterThan(setSecurityIdx);
    expect(ssidIdx).toBeGreaterThan(setSecurityIdx);
    expect(passwordIdx).toBeGreaterThan(setSecurityIdx);
  });

  test('waits for the robot DH response before sending token and Wi-Fi credentials', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const listeners: Array<(error: Error | null, characteristic: { value: string | null } | null) => void> = [];
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      listeners.push(listener);
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

    const provisioning = provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      code: '123456',
      connReportTimeoutMs: 1000,
      connectDevice: connect,
    });

    await flushPromises();
    await flushPromises();

    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);
    let writtenTypes = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string)[0]);
    expect(writtenTypes).not.toContain(customDataType);
    expect(writtenTypes).not.toContain(0x08);
    expect(writtenTypes).not.toContain(0x09);
    expect(writtenTypes).not.toContain(0x0d);
    expect(writtenTypes).not.toContain(0x0c);

    for (const listener of listeners) listener(null, { value: mockSecurityResponseFrame() });
    await flushPromises();
    await flushPromises();

    writtenTypes = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string)[0]);
    expect(writtenTypes).toContain(customDataType);
    expect(writtenTypes).toContain(0x08);
    expect(writtenTypes).toContain(0x09);
    expect(writtenTypes).toContain(0x0d);
    expect(writtenTypes).toContain(0x0c);

    for (const listener of listeners) listener(null, { value: connReportFrame(0) });
    await expect(provisioning).resolves.toMatchObject({ status: 'wifi_credentials_sent' });
    expect(cancelConnection).toHaveBeenCalled();
  });

  test('rejects malformed robot DH response before writing protected token or credential frames', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: BleNotifyListener) => {
      listener(null, { value: encodeBase64([0x01, 0x00, 0x00, 0x00]) });
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

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      code: '123456',
      connectDevice: connect,
    })).rejects.toMatchObject({ code: 'BLE_PROVISIONING_GATT_ERROR' });

    const writtenTypes = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string)[0]);
    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);
    expect(writtenTypes).not.toContain(0x04);
    expect(writtenTypes).not.toContain(customDataType);
    expect(writtenTypes).not.toContain(0x08);
    expect(writtenTypes).not.toContain(0x09);
    expect(writtenTypes).not.toContain(0x0d);
    expect(writtenTypes).not.toContain(0x0c);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(cancelConnection).toHaveBeenCalledTimes(1);
  });

  test('allows pending-claim Wi-Fi provisioning with a bootstrap token and no pairing code', async () => {
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();
    const token = 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token,
      connectDevice: connect,
    })).resolves.toMatchObject({ status: 'wifi_credentials_sent' });

    const allWrites = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string));
    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);
    const customFrames = allWrites.filter((frame) => frame[0] === customDataType);
    expect(customFrames.length).toBeGreaterThan(0);
    expect(customFrames.every((frame) => (frame[1] & 0x03) === 0x03)).toBe(true);
    expect(hasByteSequence(customFrames.flat(), asciiBytes(token))).toBe(false);
    expect(allWrites.some((frame) => frame[0] === 0x08)).toBe(true);
    expect(allWrites.some((frame) => frame[0] === 0x09)).toBe(true);
    expect(allWrites.some((frame) => frame[0] === 0x0d)).toBe(true);
  });

  test('sends a claim bootstrap token as custom-data only for physical confirmation', async () => {
    const { writeCharacteristicWithResponseForService, cancelConnection, connect } = createSecureProvisioningMocks();

    const token = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

    await expect(sendClaimBootstrapTokenViaBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      token,
      connectDevice: connect,
    })).resolves.toEqual({
      deviceId: 'ble-device-1',
      status: 'claim_token_sent',
      transport: 'ble-blufi',
    });

    const writes = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string));
    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);
    const customFrames = writes.filter((frame) => frame[0] === customDataType);
    expect(writes.length).toBeGreaterThan(0);
    expect(customFrames.length).toBeGreaterThan(0);
    expect(customFrames.every((frame) => (frame[1] & 0x03) === 0x03)).toBe(true);
    expect(hasByteSequence(writes.flat(), asciiBytes(token))).toBe(false);
    expect(writes.some((frame) => frame[0] === 0x08 || frame[0] === 0x09 || frame[0] === 0x0d)).toBe(false);
    expect(cancelConnection).toHaveBeenCalled();
  });

  test('pushes the claim device_id as TLV tag 0x03 alongside the token when provided', async () => {
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();

    const token = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    const deviceId = '4206ee1a-1f1b-4437-9401-9ca2bc4adc69';

    await sendClaimBootstrapTokenViaBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      token,
      deviceId,
      connectDevice: connect,
    });

    const idBytes = asciiBytes(deviceId);
    const writes = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string));
    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);
    const customFrames = writes.filter((frame) => frame[0] === customDataType);
    expect(customFrames.length).toBeGreaterThan(0);
    expect(customFrames.every((frame) => (frame[1] & 0x03) === 0x03)).toBe(true);
    expect(hasByteSequence(writes.flat(), asciiBytes(token))).toBe(false);
    expect(hasByteSequence(writes.flat(), idBytes)).toBe(false);
  });

  test('retries claim bootstrap token delivery after a transient BLE write failure', async () => {
    const firstWrite = jest.fn().mockRejectedValueOnce(new Error('GATT write failed'));
    const firstCancel = jest.fn().mockResolvedValue(undefined);
    const firstMonitor = createSecurityMonitor();
    const firstDiscover = jest.fn().mockResolvedValue({
      writeCharacteristicWithResponseForService: firstWrite,
      monitorCharacteristicForService: firstMonitor,
      cancelConnection: firstCancel,
    });
    const secondWrite = jest.fn().mockResolvedValue({});
    const secondCancel = jest.fn().mockResolvedValue(undefined);
    const secondMonitor = createSecurityMonitor();
    const secondDiscover = jest.fn().mockResolvedValue({
      writeCharacteristicWithResponseForService: secondWrite,
      monitorCharacteristicForService: secondMonitor,
      cancelConnection: secondCancel,
    });
    const connect = jest.fn()
      .mockResolvedValueOnce({
        discoverAllServicesAndCharacteristics: firstDiscover,
        writeCharacteristicWithResponseForService: firstWrite,
        monitorCharacteristicForService: firstMonitor,
        cancelConnection: firstCancel,
      })
      .mockResolvedValueOnce({
        discoverAllServicesAndCharacteristics: secondDiscover,
        writeCharacteristicWithResponseForService: secondWrite,
        monitorCharacteristicForService: secondMonitor,
        cancelConnection: secondCancel,
      });

    await expect(sendClaimBootstrapTokenViaBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      connectDevice: connect,
    })).resolves.toEqual({
      deviceId: 'ble-device-1',
      status: 'claim_token_sent',
      transport: 'ble-blufi',
    });

    expect(connect).toHaveBeenCalledTimes(2);
    expect(firstCancel).toHaveBeenCalled();
    expect(secondCancel).toHaveBeenCalled();
    expect(secondWrite).toHaveBeenCalledWith(
      BLE_CONFIG.BLUFI_SERVICE_UUID,
      BLE_CONFIG.BLUFI_WRITE_CHARACTERISTIC_UUID,
      expect.any(String),
    );
  });

  test('retries claim bootstrap token delivery after a native coded BLE connect failure', async () => {
    const transientConnectError = Object.assign(new Error('Device disconnected'), {
      code: 'DeviceDisconnected',
    });
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const monitorCharacteristicForService = createSecurityMonitor();
    const discoverAllServicesAndCharacteristics = jest.fn().mockResolvedValue({
      writeCharacteristicWithResponseForService,
      monitorCharacteristicForService,
      cancelConnection,
    });
    const connect = jest.fn()
      .mockRejectedValueOnce(transientConnectError)
      .mockResolvedValueOnce({
        discoverAllServicesAndCharacteristics,
        writeCharacteristicWithResponseForService,
        monitorCharacteristicForService,
        cancelConnection,
      });

    await expect(sendClaimBootstrapTokenViaBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      connectDevice: connect,
    })).resolves.toEqual({
      deviceId: 'ble-device-1',
      status: 'claim_token_sent',
      transport: 'ble-blufi',
    });

    expect(connect).toHaveBeenCalledTimes(2);
    expect(writeCharacteristicWithResponseForService).toHaveBeenCalled();
    expect(cancelConnection).toHaveBeenCalled();
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

  test('maps a stuck BLE service discovery during Wi-Fi provisioning to BLE_PROVISIONING_GATT_ERROR', async () => {
    jest.useFakeTimers();
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const discoverAllServicesAndCharacteristics = jest.fn(() => new Promise(() => undefined));
    const connect = jest.fn().mockResolvedValue({
      discoverAllServicesAndCharacteristics,
      cancelConnection,
    });
    const observed = jest.fn();

    void provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      connectDevice: connect,
    }).catch(observed);

    await Promise.resolve();
    await Promise.resolve();
    expect(discoverAllServicesAndCharacteristics).toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(10000);

    expect(observed).toHaveBeenCalledWith(expect.objectContaining({ code: 'BLE_PROVISIONING_GATT_ERROR' }));
    expect(cancelConnection).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('does not let an older Wi-Fi-list scan cancel a newer provisioning connection', async () => {
    let releaseWifiList: (() => void) | undefined;
    const remove = jest.fn();
    const oldCancel = jest.fn().mockResolvedValue(undefined);
    const oldMonitor = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      releaseWifiList = () => listener(null, { value: encodeBase64([0x45, 0x04, 0x00, 0x06, 0x05, 0xc9, ...asciiBytes('Casa')]) });
      return { remove };
    });
    const oldWriter = jest.fn().mockResolvedValue({});
    const oldConnected = {
      discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue({
        writeCharacteristicWithResponseForService: oldWriter,
        monitorCharacteristicForService: oldMonitor,
        cancelConnection: oldCancel,
      }),
      writeCharacteristicWithResponseForService: oldWriter,
      monitorCharacteristicForService: oldMonitor,
      cancelConnection: oldCancel,
    };
    const scan = scanRobotWifiNetworks({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: jest.fn().mockResolvedValue(oldConnected),
    });
    await flushPromises();
    expect(releaseWifiList).toBeDefined();

    const newer = createSecureProvisioningMocks();
    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      connectDevice: newer.connect,
    });

    releaseWifiList?.();
    await expect(scan).resolves.toEqual([{ ssid: 'Casa', rssi: -55 }]);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(oldCancel).not.toHaveBeenCalled();
    expect(newer.cancelConnection).toHaveBeenCalledTimes(1);
  });

  test('does not let an aborted pending scan disconnect a newer same-device session when its connect resolves late', async () => {
    type ConnectedDevice = Awaited<ReturnType<ReturnType<typeof createSecureProvisioningMocks>['connect']>>;
    let resolveOldConnect: (device: ConnectedDevice) => void = () => undefined;
    const old = createSecureProvisioningMocks();
    const oldConnected = await old.connect('ble-device-1') as ConnectedDevice;
    old.connect.mockClear();
    const oldConnect = jest.fn(() => new Promise<ConnectedDevice>((resolve) => {
      resolveOldConnect = resolve;
    }));
    const controller = new AbortController();
    const oldScan = scanRobotWifiNetworks({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: oldConnect,
      signal: controller.signal,
    });
    await flushPromises();
    controller.abort();
    await expect(oldScan).rejects.toMatchObject({ code: 'BLE_WIFI_SCAN_CANCELLED' });

    const newer = createSecureProvisioningMocks();
    const newerRun = provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      connectDevice: newer.connect,
    });
    await flushPromises();

    resolveOldConnect(oldConnected);
    await flushPromises();
    expect(old.cancelConnection).not.toHaveBeenCalled();
    await expect(newerRun).resolves.toMatchObject({ status: 'wifi_credentials_sent' });
  });

  test('a different-device provisioning operation does not suppress Wi-Fi scan cleanup', async () => {
    let releaseWifiList: (() => void) | undefined;
    const remove = jest.fn();
    const scanCancel = jest.fn().mockResolvedValue(undefined);
    const scanMonitor = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: BleNotifyListener) => {
      releaseWifiList = () => listener(null, { value: encodeBase64([0x45, 0x04, 0x00, 0x06, 0x05, 0xc9, ...asciiBytes('Casa')]) });
      return { remove };
    });
    const scanWriter = jest.fn().mockResolvedValue({});
    const scan = scanRobotWifiNetworks({
      device: { id: 'ble-device-a', name: 'TBot-A', localName: 'TBot-A', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: jest.fn().mockResolvedValue({
        discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue({
          writeCharacteristicWithResponseForService: scanWriter,
          monitorCharacteristicForService: scanMonitor,
          cancelConnection: scanCancel,
        }),
        writeCharacteristicWithResponseForService: scanWriter,
        monitorCharacteristicForService: scanMonitor,
        cancelConnection: scanCancel,
      }),
    });
    await flushPromises();
    expect(releaseWifiList).toBeDefined();

    const deviceB = createSecureProvisioningMocks();
    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-b', name: 'TBot-B', localName: 'TBot-B', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      connectDevice: deviceB.connect,
    });

    releaseWifiList?.();
    await expect(scan).resolves.toEqual([{ ssid: 'Casa', rssi: -55 }]);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(scanCancel).toHaveBeenCalledTimes(1);
    expect(deviceB.cancelConnection).toHaveBeenCalledTimes(1);
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
    expect(remove).toHaveBeenCalledTimes(1);
    expect(cancelConnection).toHaveBeenCalledTimes(1);
  });

  test('stops the native pre-scan exactly once on the default Wi-Fi scan path', async () => {
    requestBlePermissions.mockResolvedValue('granted');
    await initializeBle();

    const remove = jest.fn();
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: BleNotifyListener) => {
      listener(null, { value: encodeBase64([0x45, 0x04, 0x00, 0x06, 0x05, 0xc9, ...asciiBytes('Casa')]) });
      return { remove };
    });
    const connected = {
      discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue({
        writeCharacteristicWithResponseForService,
        monitorCharacteristicForService,
        cancelConnection,
      }),
      writeCharacteristicWithResponseForService,
      monitorCharacteristicForService,
      cancelConnection,
    };
    mockIsDeviceConnected.mockResolvedValue(false);
    mockConnectToDevice.mockResolvedValue(connected);
    mockStartDeviceScan.mockImplementation((_uuids, _options, listener) => {
      listener(null, { id: 'ble-device-1' });
    });

    await expect(scanRobotWifiNetworks({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
    })).resolves.toEqual([{ ssid: 'Casa', rssi: -55 }]);

    expect(mockStopDeviceScan).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(cancelConnection).toHaveBeenCalledTimes(1);
  });

  // Contract change (adhoc-2026-08-08-blufi-mtu-frag-leak): WIFI_SCAN_FAIL used to
  // resolve to [], which the pairing screen rendered as "No Robot-scanned networks
  // found" — blaming the environment for a robot-side failure. It now surfaces the
  // raw BluFi code so the screen can say the robot's scan was unavailable.
  test('surfaces ESP-IDF Wi-Fi scan-fail error-info as a coded robot error, not an empty list', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      listener(null, { value: encodeBase64([0x49, 0x00, 0x00, 0x01, 0x0b]) });
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
    })).rejects.toMatchObject({ code: 'BLE_WIFI_SCAN_ROBOT_ERROR', blufiErrorCode: 0x0b });

    // Retried once — a robot whose Wi-Fi driver is still starting reports scan-fail
    // transiently — then surfaced rather than silently downgraded to "no networks".
    expect(connect).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalled();
    expect(cancelConnection).toHaveBeenCalled();
  });

  test('skips hidden SSID entries without dropping later Robot Wi-Fi scan results', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const payload = [
      0x05, 0xc9, ...asciiBytes('Casa'),
      0x01, 0xb0,
      0x07, 0xd8, ...asciiBytes('Office'),
    ];
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      listener(null, { value: encodeBase64([0x45, 0x04, 0x00, payload.length, ...payload]) });
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
    })).resolves.toEqual([
      { ssid: 'Casa', rssi: -55 },
      { ssid: 'Office', rssi: -40 },
    ]);
  });

  test('skips malformed zero-length Wi-Fi list entries without dropping later scan results', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const payload = [
      0x00,
      0x05, 0xc9, ...asciiBytes('Casa'),
    ];
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      listener(null, { value: encodeBase64([0x45, 0x04, 0x00, payload.length, ...payload]) });
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
  });

  // ---------------------------------------------------------------------------
  // US-005 mobile invariants MB1–MB5 (provisionWifiViaLocalBle service layer).
  // ---------------------------------------------------------------------------

  test('[MB1] writes BluFi custom TLV tag 0x01 = bootstrap_token when a token exists', async () => {
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();

    const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token,
      connectDevice: connect,
    })).resolves.toMatchObject({ status: 'wifi_credentials_sent' });

    const allWrites = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string));
    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);

    const customFrames = allWrites.filter((frame) => frame[0] === customDataType);
    expect(customFrames.length).toBeGreaterThan(0);
    expect(customFrames.every((frame) => (frame[1] & 0x03) === 0x03)).toBe(true);
    expect(hasByteSequence(customFrames.flat(), [0x01, token.length, ...asciiBytes(token)])).toBe(false);
  });

  test('[MB2] writes BluFi custom TLV tag 0x02 = provisioning_code alongside the bootstrap token (claim flow)', async () => {
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();

    // The real claim flow ALWAYS mints/forwards a bootstrap token whenever a
    // provisioning code is present (PairConnectingScreen.tsx mints a token before
    // calling provisionWifiViaLocalBle), so token+code travel together. The
    // invariant under test is that, in that flow, the provisioning_code is
    // delivered to the robot as custom TLV tag 0x02 (which the firmware consumes
    // to bind device_authenticated to the live code). A code without a token is
    // not a real flow and would be a BLE message-schema change to support, so we
    // assert the contract that actually ships.
    const token = 'bootstrap-token-abc123';
    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token,
      code: '123456',
      connectDevice: connect,
    })).resolves.toMatchObject({ status: 'wifi_credentials_sent' });

    const allWrites = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string));
    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);

    const customFrames = allWrites.filter((frame) => frame[0] === customDataType);
    expect(customFrames.length).toBeGreaterThan(0);
    expect(customFrames.every((frame) => (frame[1] & 0x03) === 0x03)).toBe(true);
    expect(hasByteSequence(customFrames.flat(), [0x01, token.length, ...asciiBytes(token)])).toBe(false);
    expect(hasByteSequence(customFrames.flat(), [0x02, 6, ...asciiBytes('123456')])).toBe(false);
  });

  test('[MB3] custom TLV frames are written BEFORE the station credential (SSID/password) frames', async () => {
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();

    const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      token,
      connectDevice: connect,
    });

    const allWrites = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string));
    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);

    const lastCustomIdx = allWrites.map((frame) => frame[0]).lastIndexOf(customDataType);
    const opModeIdx = allWrites.findIndex((frame) => frame[0] === 0x08); // SET_WIFI_OPMODE control
    const ssidIdx = allWrites.findIndex((frame) => frame[0] === 0x09); // STA_SSID data
    const passwordIdx = allWrites.findIndex((frame) => frame[0] === 0x0d); // STA_PASSWORD data

    expect(lastCustomIdx).toBeGreaterThanOrEqual(0);
    expect(opModeIdx).toBeGreaterThan(lastCustomIdx);
    expect(ssidIdx).toBeGreaterThan(lastCustomIdx);
    expect(passwordIdx).toBeGreaterThan(lastCustomIdx);
  });

  test('[MB4] return status is wifi_credentials_sent (a local handoff), NOT a final success/claim-complete status', async () => {
    const { connect } = createSecureProvisioningMocks();

    const result = await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      connectDevice: connect,
    });

    expect(result).toEqual({
      deviceId: 'ble-device-1',
      status: 'wifi_credentials_sent',
      transport: 'ble-blufi',
    });
    // It is a local handoff signal only — never a claim-complete / authenticated
    // / online terminal status.
    expect(['claim_confirmed', 'device_authenticated', 'completed', 'online', 'paired']).not.toContain(result.status);
  });

  test('[MB5] a BLE write failure maps to BLE_PROVISIONING_GATT_ERROR without leaking credential values into errors/logs', async () => {
    const secretPassword = 'sup3r-secret-wifi-pw';
    const secretToken = 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';
    const secretCode = '987654';
    const secretSsid = 'PrivateHomeNet';

    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const writeCharacteristicWithResponseForService = jest.fn().mockRejectedValue(new Error('GATT write failed'));
      const cancelConnection = jest.fn().mockResolvedValue(undefined);
      const monitorCharacteristicForService = createSecurityMonitor();
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

      let captured: unknown;
      await provisionWifiViaLocalBle({
        device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
        ssid: secretSsid,
        password: secretPassword,
        code: secretCode,
        token: secretToken,
        connectDevice: connect,
      }).catch((error) => { captured = error; });

      // Typed sub-code with the documented static provisioning message.
      expect((captured as { code?: string }).code).toBe('BLE_PROVISIONING_GATT_ERROR');
      expect((captured as Error).message).toBe('Robot did not accept local Wi-Fi provisioning.');

      // No credential value leaks into the thrown error (message/code/serialized).
      const serializedError = JSON.stringify(captured) + String((captured as Error).message) + String((captured as { code?: string }).code);
      for (const secret of [secretPassword, secretToken, secretCode, secretSsid]) {
        expect(serializedError).not.toContain(secret);
      }

      // No credential value leaks into ANY console channel.
      const allLogArgs = [...infoSpy.mock.calls, ...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls]
        .flat()
        .map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry)))
        .join('\n');
      for (const secret of [secretPassword, secretToken, secretCode, secretSsid]) {
        expect(allLogArgs).not.toContain(secret);
      }
      expect(cancelConnection).toHaveBeenCalled();
    } finally {
      infoSpy.mockRestore();
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  test('marks a disconnect after encrypted custom-data delivery as delivery-unknown', async () => {
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();
    writeCharacteristicWithResponseForService.mockImplementation(
      (_serviceUuid: string, _characteristicUuid: string, value: string) => {
        const frameType = decodeBase64(value)[0];
        if (frameType === 0x08) {
          return Promise.reject(Object.assign(new Error('Device disconnected'), { code: 'DeviceDisconnected' }));
        }
        return Promise.resolve({});
      },
    );

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      deviceId: 'device-1',
      connectDevice: connect,
    })).rejects.toMatchObject({
      code: 'BLE_PROVISIONING_DISCONNECTED',
      deliveryUnknown: true,
    });
  });

  test('marks a disconnect in the middle of encrypted custom-data writes as delivery-unknown', async () => {
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();
    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);
    let customFramesWritten = 0;
    writeCharacteristicWithResponseForService.mockImplementation(
      (_serviceUuid: string, _characteristicUuid: string, value: string) => {
        if (decodeBase64(value)[0] === customDataType) {
          customFramesWritten += 1;
          if (customFramesWritten === 2) {
            return Promise.reject(Object.assign(new Error('Write timed out'), { code: 'OperationTimedOut' }));
          }
        }
        return Promise.resolve({});
      },
    );

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      deviceId: '4206ee1a-1f1b-4437-9401-9ca2bc4adc69',
      connectDevice: connect,
    })).rejects.toMatchObject({
      code: 'BLE_PROVISIONING_WRITE_TIMEOUT',
      deliveryUnknown: true,
    });
    expect(customFramesWritten).toBe(2);
  });

  test('an older overlapping provision run does not cancel the newer session', async () => {
    let rejectOldDiscovery: (error: Error) => void = () => undefined;
    const oldCancel = jest.fn().mockResolvedValue(undefined);
    const oldDiscovery = new Promise<never>((_resolve, reject) => {
      rejectOldDiscovery = reject;
    });
    const oldConnect = jest.fn().mockResolvedValue({
      discoverAllServicesAndCharacteristics: jest.fn(() => oldDiscovery),
      cancelConnection: oldCancel,
    });
    const oldRun = provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      connectDevice: oldConnect,
    });
    await flushPromises();

    const newer = createSecureProvisioningMocks();
    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      connectDevice: newer.connect,
    });

    rejectOldDiscovery(new Error('Old discovery failed'));
    await expect(oldRun).rejects.toMatchObject({ code: 'BLE_PROVISIONING_GATT_ERROR' });
    expect(oldCancel).not.toHaveBeenCalled();
    expect(newer.cancelConnection).toHaveBeenCalled();
  });

  test('does not reuse a completed provisioning epoch while an older run is still pending', async () => {
    let rejectFirstDiscovery: (error: Error) => void = () => undefined;
    const firstCancel = jest.fn().mockResolvedValue(undefined);
    const firstRun = provisionWifiViaLocalBle({
      device: { id: 'ble-device-aba', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      connectDevice: jest.fn().mockResolvedValue({
        discoverAllServicesAndCharacteristics: jest.fn(() => new Promise<never>((_resolve, reject) => {
          rejectFirstDiscovery = reject;
        })),
        cancelConnection: firstCancel,
      }),
    });
    await flushPromises();

    const second = createSecureProvisioningMocks();
    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-aba', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      connectDevice: second.connect,
    });
    expect(second.cancelConnection).toHaveBeenCalledTimes(1);

    let rejectThirdDiscovery: (error: Error) => void = () => undefined;
    const thirdCancel = jest.fn().mockResolvedValue(undefined);
    const thirdRun = provisionWifiViaLocalBle({
      device: { id: 'ble-device-aba', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      token: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      connectDevice: jest.fn().mockResolvedValue({
        discoverAllServicesAndCharacteristics: jest.fn(() => new Promise<never>((_resolve, reject) => {
          rejectThirdDiscovery = reject;
        })),
        cancelConnection: thirdCancel,
      }),
    });
    await flushPromises();

    rejectFirstDiscovery(new Error('First discovery failed'));
    await expect(firstRun).rejects.toMatchObject({ code: 'BLE_PROVISIONING_GATT_ERROR' });

    rejectThirdDiscovery(new Error('Third discovery failed'));
    await expect(thirdRun).rejects.toMatchObject({ code: 'BLE_PROVISIONING_GATT_ERROR' });
    expect(firstCancel).not.toHaveBeenCalled();
    expect(thirdCancel).toHaveBeenCalledTimes(1);
  });

  test('waits long enough for a fresh robot Wi-Fi scan instead of returning an early empty list', async () => {
    jest.useFakeTimers();

    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      setTimeout(() => {
        listener(null, { value: encodeBase64([0x45, 0x04, 0x00, 0x06, 0x05, 0xc9, ...asciiBytes('Casa')]) });
      }, 6000);
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

    const scan = scanRobotWifiNetworks({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: connect,
    });

    await jest.advanceTimersByTimeAsync(0);
    expect(monitorCharacteristicForService).toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(6000);
    await expect(scan).resolves.toEqual([{ ssid: 'Casa', rssi: -55 }]);
    expect(remove).toHaveBeenCalled();
    expect(cancelConnection).toHaveBeenCalled();

    jest.useRealTimers();
  });

  test('rejects BLE_WIFI_SCAN_FAILED when the robot never sends a Wi-Fi list notification', async () => {
    jest.useFakeTimers();

    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn(() => ({ remove }));
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

    const scan = scanRobotWifiNetworks({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: connect,
    });

    await jest.advanceTimersByTimeAsync(0);
    expect(monitorCharacteristicForService).toHaveBeenCalled();

    const scanExpectation = expect(scan).rejects.toMatchObject({ code: 'BLE_WIFI_SCAN_FAILED' });
    await jest.advanceTimersByTimeAsync(15000);
    await jest.advanceTimersByTimeAsync(300);
    await jest.advanceTimersByTimeAsync(15000);
    await scanExpectation;
    expect(remove).toHaveBeenCalledTimes(2);
    expect(cancelConnection).toHaveBeenCalledTimes(2);
    expect(connect).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  test('retries a transient Robot Wi-Fi scan service-discovery timeout before surfacing unavailable', async () => {
    jest.useFakeTimers();

    const firstCancel = jest.fn().mockResolvedValue(undefined);
    const firstDiscover = jest.fn(() => new Promise(() => undefined));
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      listener(null, { value: encodeBase64([0x45, 0x04, 0x00, 0x06, 0x05, 0xc9, ...asciiBytes('Casa')]) });
      return { remove };
    });
    const secondCancel = jest.fn().mockResolvedValue(undefined);
    const secondDiscover = jest.fn().mockResolvedValue({
      writeCharacteristicWithResponseForService,
      monitorCharacteristicForService,
      cancelConnection: secondCancel,
    });
    const connect = jest.fn()
      .mockResolvedValueOnce({
        discoverAllServicesAndCharacteristics: firstDiscover,
        cancelConnection: firstCancel,
      })
      .mockResolvedValueOnce({
        discoverAllServicesAndCharacteristics: secondDiscover,
        writeCharacteristicWithResponseForService,
        monitorCharacteristicForService,
        cancelConnection: secondCancel,
      });

    const scan = scanRobotWifiNetworks({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: connect,
    });

    await jest.advanceTimersByTimeAsync(0);
    expect(firstDiscover).toHaveBeenCalled();

    const scanExpectation = expect(scan).resolves.toEqual([{ ssid: 'Casa', rssi: -55 }]);
    await jest.advanceTimersByTimeAsync(10000);
    await jest.advanceTimersByTimeAsync(300);
    await jest.advanceTimersByTimeAsync(0);
    await scanExpectation;

    expect(connect).toHaveBeenCalledTimes(2);
    expect(firstCancel).toHaveBeenCalled();
    expect(secondDiscover).toHaveBeenCalled();
    expect(writeCharacteristicWithResponseForService).toHaveBeenCalledWith(
      BLE_CONFIG.BLUFI_SERVICE_UUID,
      BLE_CONFIG.BLUFI_WRITE_CHARACTERISTIC_UUID,
      expect.any(String),
    );
    expect(secondCancel).toHaveBeenCalled();

    jest.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Real-time BLE Wi-Fi connect feedback via the firmware conn-report frame.
  // Firmware emits a BluFi notify "conn-report" on the notify char (0xFF02):
  // on-wire type byte 0x3D (DATA 0x01 | WIFI_REP subtype 0x0f<<2). After
  // reassembly the payload is [opmode, conn_state] where conn_state:
  // 0 = STA_CONN_SUCCESS, 1 = STA_CONN_FAIL, 2 = STA_CONNECTING. This surfaces a
  // wrong Wi-Fi password immediately instead of only via backend-poll timeout.
  // ---------------------------------------------------------------------------

  // conn-report frame: [type=0x3D, frameControl=0x00, sequence, dataLength=2, opmode, conn_state]
  const connReportFrame = (connState: number): string =>
    encodeBase64([0x3d, 0x00, 0x00, 0x02, 0x01, connState]);
  const securityResponseFrame = (): string => mockSecurityResponseFrame();

  test('rejects Wi-Fi provisioning with WIFI_CONNECT_FAILED when the robot reports STA_CONN_FAIL (conn_state=1)', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      listener(null, { value: securityResponseFrame() });
      listener(null, { value: connReportFrame(1) });
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

    const secretPassword = 'sup3r-secret-wifi-pw';
    const secretSsid = 'PrivateHomeNet';
    const secretCode = '987654';

    let captured: unknown;
    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: secretSsid,
      password: secretPassword,
      code: secretCode,
      connReportTimeoutMs: 1000,
      connectDevice: connect,
    }).catch((error) => { captured = error; });

    expect((captured as { code?: string }).code).toBe('WIFI_CONNECT_FAILED');

    // Static message + code only — no credential value leaks into the error.
    const serializedError = JSON.stringify(captured) + String((captured as Error).message) + String((captured as { code?: string }).code);
    for (const secret of [secretPassword, secretSsid, secretCode]) {
      expect(serializedError).not.toContain(secret);
    }

    expect(monitorCharacteristicForService).toHaveBeenCalledWith(
      BLE_CONFIG.BLUFI_SERVICE_UUID,
      BLE_CONFIG.BLUFI_NOTIFY_CHARACTERISTIC_UUID,
      expect.any(Function),
    );
    expect(cancelConnection).toHaveBeenCalled();
  });

  test('resolves wifi_credentials_sent (NOT a final-success status) when the robot reports STA_CONN_SUCCESS (conn_state=0)', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      listener(null, { value: securityResponseFrame() });
      listener(null, { value: connReportFrame(0) });
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

    const result = await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connReportTimeoutMs: 1000,
      connectDevice: connect,
    });

    // DD4: a BLE STA_CONN_SUCCESS is at most an early "wifi connected" signal,
    // never a final success. Backend polling stays authoritative.
    expect(result).toEqual({
      deviceId: 'ble-device-1',
      status: 'wifi_credentials_sent',
      transport: 'ble-blufi',
    });
    expect(['claim_confirmed', 'device_authenticated', 'completed', 'online', 'paired', 'success', 'authenticated']).not.toContain(result.status);
    expect(cancelConnection).toHaveBeenCalled();
  });

  test('swallows a post-success disconnect/monitor-error (firmware tears down BLE right after STA_CONN_SUCCESS)', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      // Terminal success first, then a disconnect error arrives after teardown.
      listener(null, { value: securityResponseFrame() });
      listener(null, { value: connReportFrame(0) });
      listener(new Error('Device disconnected'), null);
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

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connReportTimeoutMs: 1000,
      connectDevice: connect,
    })).resolves.toMatchObject({ status: 'wifi_credentials_sent' });

    expect(cancelConnection).toHaveBeenCalled();
  });

  test('resolves wifi_credentials_sent on conn-report timeout (backend-poll fallback preserved)', async () => {
    jest.useFakeTimers();

    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    // Subscribed, but the robot never emits a conn-report (e.g. STA_CONNECTING then silence).
    const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
      listener(null, { value: securityResponseFrame() });
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

    const provisioning = provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connReportTimeoutMs: 1000,
      connectDevice: connect,
    });

    await jest.advanceTimersByTimeAsync(1000);

    await expect(provisioning).resolves.toMatchObject({ status: 'wifi_credentials_sent' });
    expect(remove).toHaveBeenCalled();
    expect(cancelConnection).toHaveBeenCalled();

    jest.useRealTimers();
  });

  test('parseBluFiConnReport returns connState for a 0x3D frame and null for other types', () => {
    // conn_state=1 (STA_CONN_FAIL); payload = [opmode, conn_state].
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00, 0x02, 0x01, 0x01])).toEqual({ connState: 1 });
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00, 0x02, 0x01, 0x00])).toEqual({ connState: 0 });
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00, 0x02, 0x01, 0x02])).toEqual({ connState: 2 });
    // Wi-Fi list frame (0x45) is NOT a conn-report.
    expect(parseBluFiConnReport([0x45, 0x04, 0x00, 0x06, 0x05, 0xc9, 0x43, 0x61])).toBeNull();
    // Malformed / too short frames return null rather than throwing.
    expect(parseBluFiConnReport([0x3d, 0x00, 0x00, 0x00])).toBeNull();
    expect(parseBluFiConnReport([])).toBeNull();
  });

  // ===========================================================================
  // US-005 gap-fill: provisionWifiViaLocalBle pre-connect validation guards.
  // These never touch the radio — a bad code/token/missing-secret must reject
  // BEFORE connectDevice is called (so we never hold a GATT link for a request
  // the backend would reject anyway), and the rejection must be typed.
  // ===========================================================================

  test('rejects provisioning with INVALID_BLE_CODE and never connects when neither code nor token is provided', async () => {
    const connect = jest.fn();

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      connectDevice: connect,
    })).rejects.toMatchObject({ code: 'INVALID_BLE_CODE' });

    expect(connect).not.toHaveBeenCalled();
  });

  test('rejects provisioning with INVALID_BLE_CODE and never connects when the pairing code is not exactly 6 digits', async () => {
    const connect = jest.fn();

    for (const badCode of ['12345', '1234567', '12a456', '', '00000a']) {
      await expect(provisionWifiViaLocalBle({
        device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
        ssid: 'Casa',
        password: 'secret-pass',
        code: badCode,
        connectDevice: connect,
      })).rejects.toMatchObject({ code: 'INVALID_BLE_CODE' });
    }

    expect(connect).not.toHaveBeenCalled();
  });

  test('rejects provisioning with CLAIM_BOOTSTRAP_TOKEN_INVALID and never connects when the token is malformed', async () => {
    const connect = jest.fn();

    // Too short (<16), too long (>64), and an illegal character respectively.
    for (const badToken of ['short', 'A'.repeat(65), 'has space token here pad___']) {
      await expect(provisionWifiViaLocalBle({
        device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
        ssid: 'Casa',
        password: 'secret-pass',
        token: badToken,
        connectDevice: connect,
      })).rejects.toMatchObject({ code: 'CLAIM_BOOTSTRAP_TOKEN_INVALID' });
    }

    expect(connect).not.toHaveBeenCalled();
  });

  test('allowCredentialOnly lets a credentials-only Wi-Fi push proceed without a code or token when STA_CONN_SUCCESS arrives', async () => {
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      allowCredentialOnly: true,
      connectDevice: connect,
    })).resolves.toMatchObject({ status: 'wifi_credentials_sent' });

    // No custom-data (token/code) frame is written — only the station frames.
    const allWrites = writeCharacteristicWithResponseForService.mock.calls.map((call) => decodeBase64(call[2] as string));
    const customDataType = (0x01 & 0x03) | (BLUFI_DATA_CUSTOM << 2);
    expect(allWrites.some((frame) => frame[0] === customDataType)).toBe(false);
    expect(allWrites.some((frame) => frame[0] === 0x08)).toBe(true); // SET_WIFI_OPMODE
    expect(allWrites.some((frame) => frame[0] === 0x09 && (frame[1] & 0x03) === 0x03)).toBe(true); // STA_SSID
    expect(allWrites.some((frame) => frame[0] === 0x0d && (frame[1] & 0x03) === 0x03)).toBe(true); // STA_PASSWORD
  });

  test('credential-only rejects when no STA_CONN_SUCCESS report arrives', async () => {
    jest.useFakeTimers();
    try {
      const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
      const remove = jest.fn();
      // Security OK, but no Wi-Fi conn-report. Existing backend online state can
      // be stale, so this handoff must not report success without firmware proof.
      const monitorCharacteristicForService = jest.fn((_serviceUuid: string, _characteristicUuid: string, listener: (error: Error | null, characteristic: { value: string | null } | null) => void) => {
        listener(null, { value: mockSecurityResponseFrame() });
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

      const provisioning = provisionWifiViaLocalBle({
        device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
        ssid: 'Casa',
        password: 'secret-pass',
        allowCredentialOnly: true,
        connReportTimeoutMs: 1000,
        connectDevice: connect,
      });
      const assertion = expect(provisioning).rejects.toMatchObject({ code: 'WIFI_CONNECT_TIMEOUT' });
      await jest.advanceTimersByTimeAsync(1000);
      await assertion;
      expect(cancelConnection).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  // ===========================================================================
  // US-005/G15 gap-fill: provisionWifiViaLocalBle BLE timeout / failure paths
  // use typed sub-codes, the GATT link is always released (cancelConnection),
  // and NO credential value leaks.
  // ===========================================================================

  test('maps a stuck BLE connect to BLE_PROVISIONING_GATT_ERROR (connect-window timeout)', async () => {
    jest.useFakeTimers();
    // connectDevice never resolves: the connect-window op timeout must fire
    // (prescan + connect budget, longer than a single GATT write).
    const connect = jest.fn(() => new Promise<never>(() => undefined));
    const observed = jest.fn();

    void provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connectDevice: connect,
    }).catch(observed);

    // 10s is no longer enough — the outer guard covers both internal attempts,
    // including prescan, native connect timeout, release settling, and retry delay.
    await jest.advanceTimersByTimeAsync(10000);
    expect(observed).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(50000);

    expect(observed).toHaveBeenCalledWith(expect.objectContaining({ code: 'BLE_PROVISIONING_GATT_ERROR' }));
    expect(connect).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test('outer provisioning timeout covers the complete default two-attempt connect budget', async () => {
    jest.useFakeTimers();
    try {
      const { connect: secureConnect } = createSecureProvisioningMocks();
      const connected = await secureConnect('ble-device-1');
      const manager = getBleManager() as unknown as { connectToDevice: jest.Mock };
      manager.connectToDevice
        .mockImplementationOnce(() => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('first connect timed out')), 20000);
        }))
        .mockImplementationOnce(() => new Promise((resolve) => {
          setTimeout(() => resolve(connected), 5000);
        }));
      const resolved = jest.fn();
      const rejected = jest.fn();

      void provisionWifiViaLocalBle({
        device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
        ssid: 'Casa',
        password: 'secret-pass',
        code: '123456',
      }).then(resolved, rejected);

      await jest.advanceTimersByTimeAsync(28000);
      expect(rejected).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(10000);
      expect(resolved).toHaveBeenCalledWith(expect.objectContaining({ status: 'wifi_credentials_sent' }));
      expect(manager.connectToDevice).toHaveBeenCalledTimes(2);
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  test('maps a stuck BluFi frame write to BLE_PROVISIONING_WRITE_TIMEOUT and still releases the GATT link', async () => {
    jest.useFakeTimers();
    // The write hangs forever; the per-op timeout must fire and tear the link down.
    const writeCharacteristicWithResponseForService = jest.fn(() => new Promise<never>(() => undefined));
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const monitorCharacteristicForService = createSecurityMonitor();
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
    const observed = jest.fn();

    void provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connectDevice: connect,
    }).catch(observed);

    // Let connect + discover settle, then drive the write timeout.
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(10000);

    expect(observed).toHaveBeenCalledWith(expect.objectContaining({ code: 'BLE_PROVISIONING_WRITE_TIMEOUT' }));
    expect(cancelConnection).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('maps a native coded BLE connect failure (identity loss) to BLE_PROVISIONING_DISCONNECTED, not the raw native code', async () => {
    // A robot that resets its BLE identity mid-pair throws a NATIVE coded error.
    // The service must normalize this to its documented typed code rather than
    // re-throwing the uncontrolled native error object, so the UI never keys off
    // a native code and no native message/field leaks past the static boundary.
    const secretPassword = 'sup3r-secret-wifi-pw';
    const secretCode = '987654';
    const nativeError = Object.assign(new Error(`Device disconnected while writing ${secretPassword}`), {
      code: 'DeviceDisconnected',
      reason: secretCode,
    });
    const connect = jest.fn().mockRejectedValue(nativeError);

    let captured: unknown;
    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: secretPassword,
      code: secretCode,
      connectDevice: connect,
    }).catch((error) => { captured = error; });

    // Documented typed sub-code — NOT the native 'DeviceDisconnected'.
    expect((captured as { code?: string }).code).toBe('BLE_PROVISIONING_DISCONNECTED');
    expect((captured as { code?: string }).code).not.toBe('DeviceDisconnected');
    // The original native error object is not propagated, and no credential leaks.
    expect(captured).not.toBe(nativeError);
    const serialized = JSON.stringify(captured) + String((captured as Error).message) + String((captured as { code?: string }).code);
    for (const secret of [secretPassword, secretCode]) {
      expect(serialized).not.toContain(secret);
    }
  });

  test('prefers requestMTU on the discovered device', async () => {
    const connectedRequestMTU = jest.fn().mockResolvedValue({});
    const discoveredRequestMTU = jest.fn().mockResolvedValue({});
    const { connect } = createSecureProvisioningMocks({ connectedRequestMTU, discoveredRequestMTU });

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connectDevice: connect,
    })).resolves.toMatchObject({ status: 'wifi_credentials_sent' });

    expect(discoveredRequestMTU).toHaveBeenCalledWith(512);
    expect(connectedRequestMTU).not.toHaveBeenCalled();
  });

  test('uses requestMTU on the connected device when discovery lacks it', async () => {
    const connectedRequestMTU = jest.fn().mockResolvedValue({});
    const { connect } = createSecureProvisioningMocks({ connectedRequestMTU });

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connectDevice: connect,
    })).resolves.toMatchObject({ status: 'wifi_credentials_sent' });

    expect(connectedRequestMTU).toHaveBeenCalledWith(512);
  });

  test('skips MTU negotiation when neither device exposes requestMTU', async () => {
    const { connect } = createSecureProvisioningMocks();

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connectDevice: connect,
    })).resolves.toMatchObject({ status: 'wifi_credentials_sent' });
  });

  test('continues provisioning when requestMTU rejects', async () => {
    const requestMTU = jest.fn().mockRejectedValue(new Error('native MTU negotiation failed'));
    const { connect, writeCharacteristicWithResponseForService, cancelConnection } = createSecureProvisioningMocks({
      discoveredRequestMTU: requestMTU,
    });

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connectDevice: connect,
    })).resolves.toMatchObject({ status: 'wifi_credentials_sent' });

    expect(requestMTU).toHaveBeenCalledWith(512);
    expect(writeCharacteristicWithResponseForService).toHaveBeenCalled();
    expect(cancelConnection).toHaveBeenCalled();
  });

  test('rejects with BLE_PROVISIONING_UNSUPPORTED when the connected device exposes no write characteristic', async () => {
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    // discover yields an object WITHOUT writeCharacteristicWithResponseForService.
    const discoverAllServicesAndCharacteristics = jest.fn().mockResolvedValue({ cancelConnection });
    const connect = jest.fn().mockResolvedValue({ discoverAllServicesAndCharacteristics, cancelConnection });

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connectDevice: connect,
    })).rejects.toMatchObject({ code: 'BLE_PROVISIONING_UNSUPPORTED' });

    expect(cancelConnection).toHaveBeenCalled();
  });

  test('a generic BLE connect failure surfaces BLE_PROVISIONING_GATT_ERROR without leaking any credential into the error', async () => {
    const secretPassword = 'sup3r-secret-wifi-pw';
    const secretToken = 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';
    const secretCode = '987654';
    const secretSsid = 'PrivateHomeNet';
    // A native error that echoes the password back (drivers sometimes do this).
    const connect = jest.fn().mockRejectedValue(new Error(`connect failed near ${secretPassword}`));

    let captured: unknown;
    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: secretSsid,
      password: secretPassword,
      code: secretCode,
      token: secretToken,
      connectDevice: connect,
    }).catch((error) => { captured = error; });

    expect((captured as { code?: string }).code).toBe('BLE_PROVISIONING_GATT_ERROR');
    const serialized = JSON.stringify(captured) + String((captured as Error).message) + String((captured as { code?: string }).code);
    for (const secret of [secretPassword, secretToken, secretCode, secretSsid]) {
      expect(serialized).not.toContain(secret);
    }
  });

  // ===========================================================================
  // US-005 gap-fill: the BluFi custom-data sequence numbers thread continuously
  // into the station credential frames (a single monotonic stream the firmware
  // reassembler depends on), and the credential push uses BLE writes ONLY — no
  // HTTP/HTTPS bridge while BLE is the active transport.
  // ===========================================================================

  test('sequence numbers are a single monotonic stream from the custom-data TLV through the station frames', async () => {
    const { writeCharacteristicWithResponseForService, connect } = createSecureProvisioningMocks();

    // A token long enough to force custom-data fragmentation (>12 content bytes).
    const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa-Wifi-Network',
      password: 'correct-horse-battery-staple',
      token,
      code: '123456',
      connectDevice: connect,
    });

    const sequences = writeCharacteristicWithResponseForService.mock.calls
      .map((call) => decodeBase64(call[2] as string))
      .map((frame) => frame[2]);
    expect(sequences.length).toBeGreaterThan(4);
    // Every frame's sequence == previous + 1 (mod 256), with NO reset back to 0
    // when the station frames begin — the station group continues the stream.
    for (let idx = 1; idx < sequences.length; idx += 1) {
      expect(sequences[idx]).toBe((sequences[idx - 1]! + 1) & 0xff);
    }
  });

  test('provisions over a local BLE write transport ONLY — never opens an HTTP/HTTPS bridge', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch' as never).mockImplementation((() => {
      throw new Error('network access is forbidden while BLE is the active transport');
    }) as never);

    try {
      const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
      const { connect } = createSecureProvisioningMocks({ writeCharacteristicWithResponseForService });

      const result = await provisionWifiViaLocalBle({
        device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
        ssid: 'Casa',
        password: 'secret-pass',
        code: '123456',
        connectDevice: connect,
      });

      expect(result.transport).toBe('ble-blufi');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(writeCharacteristicWithResponseForService).toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  // ===========================================================================
  // US-005 gap-fill: STA_CONN_FAIL credential-leak guard (conn-report path).
  // The existing conn-fail test passes a code; this proves a token+code claim
  // flow that fails Wi-Fi connect ALSO leaks no token/code/password/ssid.
  // ===========================================================================

  test('a STA_CONN_FAIL during a claim flow rejects WIFI_CONNECT_FAILED without leaking token/code/password/ssid', async () => {
    const secretPassword = 'sup3r-secret-wifi-pw';
    const secretToken = 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';
    const secretCode = '987654';
    const secretSsid = 'PrivateHomeNet';

    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_s: string, _c: string, listener: (e: Error | null, ch: { value: string | null } | null) => void) => {
      listener(null, { value: securityResponseFrame() });
      listener(null, { value: connReportFrame(1) });
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

    let captured: unknown;
    await provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: secretSsid,
      password: secretPassword,
      code: secretCode,
      token: secretToken,
      connReportTimeoutMs: 1000,
      connectDevice: connect,
    }).catch((error) => { captured = error; });

    expect((captured as { code?: string }).code).toBe('WIFI_CONNECT_FAILED');
    const serialized = JSON.stringify(captured) + String((captured as Error).message) + String((captured as { code?: string }).code);
    for (const secret of [secretPassword, secretToken, secretCode, secretSsid]) {
      expect(serialized).not.toContain(secret);
    }
    expect(remove).toHaveBeenCalled();
    expect(cancelConnection).toHaveBeenCalled();
  });

  test('a pre-terminal monitor error (no conn-report yet) falls back to wifi_credentials_sent rather than failing', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    // The notify subscription errors before any conn-report frame arrives. This
    // is NOT a STA_CONN_FAIL, so the local handoff must still succeed and defer
    // to the authoritative backend poll.
    const monitorCharacteristicForService = jest.fn((_s: string, _c: string, listener: (e: Error | null, ch: { value: string | null } | null) => void) => {
      listener(null, { value: securityResponseFrame() });
      listener(new Error('Device disconnected'), null);
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

    await expect(provisionWifiViaLocalBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      ssid: 'Casa',
      password: 'secret-pass',
      code: '123456',
      connReportTimeoutMs: 1000,
      connectDevice: connect,
    })).resolves.toMatchObject({ status: 'wifi_credentials_sent' });

    expect(cancelConnection).toHaveBeenCalled();
  });

  // ===========================================================================
  // US-005 gap-fill: sendClaimBootstrapTokenViaBle terminal vs retryable errors.
  // ===========================================================================

  test('rejects sendClaimBootstrapTokenViaBle with CLAIM_BOOTSTRAP_TOKEN_INVALID and never connects for a malformed token', async () => {
    const connect = jest.fn();

    await expect(sendClaimBootstrapTokenViaBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      token: 'short',
      connectDevice: connect,
    })).rejects.toMatchObject({ code: 'CLAIM_BOOTSTRAP_TOKEN_INVALID' });

    expect(connect).not.toHaveBeenCalled();
  });

  test('does NOT retry sendClaimBootstrapTokenViaBle on a terminal BLE_PROVISIONING_UNSUPPORTED error', async () => {
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    // No write characteristic → unsupported → terminal, so connect runs ONCE.
    const discoverAllServicesAndCharacteristics = jest.fn().mockResolvedValue({ cancelConnection });
    const connect = jest.fn().mockResolvedValue({ discoverAllServicesAndCharacteristics, cancelConnection });

    await expect(sendClaimBootstrapTokenViaBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      connectDevice: connect,
    })).rejects.toMatchObject({ code: 'BLE_PROVISIONING_UNSUPPORTED' });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(cancelConnection).toHaveBeenCalled();
  });

  test('exhausts both attempts then rejects BLE_CLAIM_TOKEN_SEND_FAILED without leaking the token', async () => {
    const secretToken = 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';
    const writeCharacteristicWithResponseForService = jest.fn().mockRejectedValue(new Error(`GATT write failed for ${secretToken}`));
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const monitorCharacteristicForService = createSecurityMonitor();
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

    let captured: unknown;
    await sendClaimBootstrapTokenViaBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      token: secretToken,
      connectDevice: connect,
    }).catch((error) => { captured = error; });

    expect((captured as { code?: string }).code).toBe('BLE_CLAIM_TOKEN_SEND_FAILED');
    // Both attempts ran (retry-safe), and the link was released after each.
    expect(connect).toHaveBeenCalledTimes(2);
    expect(cancelConnection).toHaveBeenCalledTimes(2);
    const serialized = JSON.stringify(captured) + String((captured as Error).message) + String((captured as { code?: string }).code);
    expect(serialized).not.toContain(secretToken);
  });

  // ===========================================================================
  // US-005 gap-fill: scanRobotWifiNetworks unsupported + monitor-error paths.
  // ===========================================================================

  test('rejects BLE_WIFI_SCAN_UNSUPPORTED and releases the link when the robot exposes no notify characteristic', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    // No monitorCharacteristicForService → scan unsupported.
    const discoverAllServicesAndCharacteristics = jest.fn().mockResolvedValue({
      writeCharacteristicWithResponseForService,
      cancelConnection,
    });
    const connect = jest.fn().mockResolvedValue({
      discoverAllServicesAndCharacteristics,
      writeCharacteristicWithResponseForService,
      cancelConnection,
    });

    await expect(scanRobotWifiNetworks({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: connect,
    })).rejects.toMatchObject({ code: 'BLE_WIFI_SCAN_UNSUPPORTED' });

    expect(cancelConnection).toHaveBeenCalled();
  });

  test('rejects BLE_WIFI_SCAN_FAILED when the robot Wi-Fi scan notify subscription errors', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_s: string, _c: string, listener: (e: Error | null, ch: { value: string | null } | null) => void) => {
      listener(new Error('notification subscribe failed'), null);
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
    })).rejects.toMatchObject({ code: 'BLE_WIFI_SCAN_FAILED' });

    expect(remove).toHaveBeenCalledTimes(2);
    expect(cancelConnection).toHaveBeenCalledTimes(2);
  });

  test('component cancellation removes the notify subscription and GATT link exactly once', async () => {
    const controller = new AbortController();
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn(() => ({ remove }));
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

    const scan = scanRobotWifiNetworks({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: connect,
      signal: controller.signal,
    });
    await flushPromises();

    controller.abort();

    await expect(scan).rejects.toMatchObject({ code: 'BLE_WIFI_SCAN_CANCELLED' });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(cancelConnection).toHaveBeenCalledTimes(1);
  });

  // ===========================================================================
  // BluFi fragment-size invariant: ESP-IDF carries `blufi_env.frag_size` over
  // from the previous BLE session, so a session that skips MTU negotiation gets
  // its robot->phone frames truncated by GATT. Every session must negotiate.
  // ===========================================================================

  test('negotiates MTU before writing the Wi-Fi scan request', async () => {
    const order: string[] = [];
    const requestMTU = jest.fn(() => {
      order.push('mtu');
      return Promise.resolve({});
    });
    const writeCharacteristicWithResponseForService = jest.fn(() => {
      order.push('write');
      return Promise.resolve({});
    });
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_s: string, _c: string, listener: BleNotifyListener) => {
      listener(null, { value: encodeBase64([0x45, 0x04, 0x00, 0x06, 0x05, 0xc9, ...asciiBytes('Casa')]) });
      return { remove };
    });
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const discoverAllServicesAndCharacteristics = jest.fn().mockResolvedValue({
      writeCharacteristicWithResponseForService,
      monitorCharacteristicForService,
      cancelConnection,
      requestMTU,
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

    expect(requestMTU).toHaveBeenCalledWith(512);
    expect(order).toEqual(['mtu', 'write']);
  });

  test('still scans when the Wi-Fi scan session MTU request rejects', async () => {
    const requestMTU = jest.fn().mockRejectedValue(new Error('native MTU negotiation failed'));
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_s: string, _c: string, listener: BleNotifyListener) => {
      listener(null, { value: encodeBase64([0x45, 0x04, 0x00, 0x06, 0x05, 0xc9, ...asciiBytes('Casa')]) });
      return { remove };
    });
    const cancelConnection = jest.fn().mockResolvedValue(undefined);
    const discoverAllServicesAndCharacteristics = jest.fn().mockResolvedValue({
      writeCharacteristicWithResponseForService,
      monitorCharacteristicForService,
      cancelConnection,
      requestMTU,
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

    expect(requestMTU).toHaveBeenCalledWith(512);
    expect(writeCharacteristicWithResponseForService).toHaveBeenCalled();
  });

  test('negotiates MTU before writing claim bootstrap token frames', async () => {
    const order: string[] = [];
    const discoveredRequestMTU = jest.fn<Promise<unknown>, [number]>(() => {
      order.push('mtu');
      return Promise.resolve({});
    });
    const writeCharacteristicWithResponseForService = jest.fn<Promise<unknown>, [string, string, string]>(() => {
      order.push('write');
      return Promise.resolve({});
    });
    const { connect } = createSecureProvisioningMocks({
      discoveredRequestMTU,
      writeCharacteristicWithResponseForService,
    });

    await sendClaimBootstrapTokenViaBle({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      token: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      connectDevice: connect,
    });

    expect(discoveredRequestMTU).toHaveBeenCalledWith(512);
    expect(order[0]).toBe('mtu');
    expect(order).toContain('write');
  });

  // ===========================================================================
  // BluFi error-info frames must end the wait instead of burning the timeout.
  // ===========================================================================

  test('rejects BLE_WIFI_SCAN_ROBOT_ERROR immediately on a non-scan-fail BluFi error-info frame', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    // 0x00 = ESP_BLUFI_SEQUENCE_ERROR — the robot rejected the request outright.
    const monitorCharacteristicForService = jest.fn((_s: string, _c: string, listener: BleNotifyListener) => {
      listener(null, { value: encodeBase64([0x49, 0x00, 0x00, 0x01, 0x00]) });
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
    })).rejects.toMatchObject({ code: 'BLE_WIFI_SCAN_ROBOT_ERROR', blufiErrorCode: 0x00 });

    // Bounded at BLE_WIFI_SCAN_ATTEMPTS, and each link is released. Running under
    // real timers is the immediacy proof: waiting out the 15s response timeout
    // twice would blow Jest's 5s default test timeout.
    expect(connect).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(cancelConnection).toHaveBeenCalledTimes(2);
  });

  test('discards a broken fragment run so a later frame in the same session still parses', async () => {
    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    const monitorCharacteristicForService = jest.fn((_s: string, _c: string, listener: BleNotifyListener) => {
      // Fragment claims 0x20 more bytes but the run is closed by a short final
      // frame — a dropped fragment. Without a reset the stale chunks would be
      // measured against 0x20 forever and the good frame below never parses.
      listener(null, { value: encodeBase64([0x45, 0x10, 0x00, 0x06, 0x20, 0x00, 0xaa, 0xbb, 0xcc, 0xdd]) });
      listener(null, { value: encodeBase64([0x45, 0x00, 0x01, 0x02, 0xee, 0xff]) });
      listener(null, { value: encodeBase64([0x45, 0x00, 0x02, 0x06, 0x05, 0xc9, ...asciiBytes('Casa')]) });
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
  });

  test('logs and does not resolve a Wi-Fi list frame truncated below its declared data length', async () => {
    jest.useFakeTimers();
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    const writeCharacteristicWithResponseForService = jest.fn().mockResolvedValue({});
    const remove = jest.fn();
    // Header declares 0x40 payload bytes but GATT delivered only 2 — exactly what
    // an oversized robot frag_size looks like on a 23-byte MTU link.
    const monitorCharacteristicForService = jest.fn((_s: string, _c: string, listener: BleNotifyListener) => {
      listener(null, { value: encodeBase64([0x45, 0x00, 0x00, 0x40, 0x05, 0xc9]) });
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

    const scan = scanRobotWifiNetworks({
      device: { id: 'ble-device-1', name: 'TBot-Blufi', localName: 'TBot-Blufi', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] },
      connectDevice: connect,
    });

    const scanExpectation = expect(scan).rejects.toMatchObject({ code: 'BLE_WIFI_SCAN_FAILED' });
    await jest.advanceTimersByTimeAsync(15000);
    await jest.advanceTimersByTimeAsync(300);
    await jest.advanceTimersByTimeAsync(15000);
    await scanExpectation;

    // The truncation is named in diagnostics — otherwise it is indistinguishable
    // from a robot that never answered, which is what hid this bug in the field.
    expect(info).toHaveBeenCalledWith(
      '[TBOT BLE WiFiScan]',
      expect.objectContaining({ stage: 'frame_truncated', frameLength: 6, declaredDataLength: 0x40 }),
    );

    info.mockRestore();
    jest.useRealTimers();
  });

  // ===========================================================================
  // Discovery must not treat the generic Espressif BluFi UUID as robot identity.
  // ===========================================================================

  test('scanForTJBotDevices blocks UUID-only peripherals and unrelated devices', async () => {
    mockStartDeviceScan.mockImplementation((_uuids, _options, listener) => {
      listener(null, { id: 'AA:BB:CC:DD:EE:FF', name: 'ES3C35P-001', localName: 'ES3C35P-001', serviceUUIDs: [BLE_CONFIG.BLUFI_SERVICE_UUID] });
      listener(null, { id: 'ZZ:00:11:22:33:44', name: 'Speaker', localName: 'Speaker', serviceUUIDs: [BLE_CONFIG.SERVICE_UUID] });
    });

    const result = await scanForTJBotDevices(1);

    expect(result.allowed).toEqual([]);
    expect(result.blocked.map((d) => d.name)).toEqual(['ES3C35P-001', 'Speaker']);
    expect(mockStopDeviceScan).toHaveBeenCalled();
  });
});

function asciiBytes(value: string): number[] {
  return Array.from(value).map((char) => char.charCodeAt(0));
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

type BleNotifyCharacteristic = { value: string | null };
type BleNotifyListener = (error: Error | null, characteristic: BleNotifyCharacteristic | null) => void;
type BleWriteMock = jest.Mock<Promise<unknown>, [string, string, string]>;
type BleMtuMock = jest.Mock<Promise<unknown>, [number]>;
type BleCancelMock = jest.Mock;
type BleMonitorMock = jest.Mock<{ remove: jest.Mock<void, []> }, [string, string, BleNotifyListener]>;

function createSecureProvisioningMocks(options: {
  writeCharacteristicWithResponseForService?: BleWriteMock;
  connectedRequestMTU?: BleMtuMock;
  discoveredRequestMTU?: BleMtuMock;
  connState?: number;
  notifyError?: Error;
} = {}): {
  writeCharacteristicWithResponseForService: BleWriteMock;
  cancelConnection: BleCancelMock;
  monitorCharacteristicForService: BleMonitorMock;
  discoverAllServicesAndCharacteristics: jest.Mock<Promise<{
    writeCharacteristicWithResponseForService: BleWriteMock;
    monitorCharacteristicForService: BleMonitorMock;
    cancelConnection: BleCancelMock;
    requestMTU?: BleMtuMock;
  }>, []>;
  connect: jest.Mock;
} {
  const writeCharacteristicWithResponseForService = options.writeCharacteristicWithResponseForService ?? jest.fn<Promise<unknown>, [string, string, string]>().mockResolvedValue({});
  const cancelConnection = jest.fn().mockResolvedValue(undefined);
  const monitorCharacteristicForService = createSecurityMonitor({
    connState: options.connState ?? 0,
    notifyError: options.notifyError,
  });
  const discoverAllServicesAndCharacteristics = jest.fn<Promise<{
    writeCharacteristicWithResponseForService: BleWriteMock;
    monitorCharacteristicForService: BleMonitorMock;
    cancelConnection: BleCancelMock;
    requestMTU?: BleMtuMock;
  }>, []>().mockResolvedValue({
    writeCharacteristicWithResponseForService,
    monitorCharacteristicForService,
    cancelConnection,
    ...(options.discoveredRequestMTU ? { requestMTU: options.discoveredRequestMTU } : {}),
  });
  const connect = jest.fn().mockResolvedValue({
    discoverAllServicesAndCharacteristics,
    writeCharacteristicWithResponseForService,
    monitorCharacteristicForService,
    cancelConnection,
    ...(options.connectedRequestMTU ? { requestMTU: options.connectedRequestMTU } : {}),
  });

  return {
    writeCharacteristicWithResponseForService,
    cancelConnection,
    monitorCharacteristicForService,
    discoverAllServicesAndCharacteristics,
    connect,
  };
}

function createSecurityMonitor(options: { connState?: number; notifyError?: Error } = {}): BleMonitorMock {
  const remove = jest.fn<void, []>();
  return jest.fn<{ remove: jest.Mock<void, []> }, [string, string, BleNotifyListener]>(
    (_serviceUuid: string, _characteristicUuid: string, listener: BleNotifyListener) => {
      listener(null, { value: mockSecurityResponseFrame() });
      if (options.connState !== undefined) {
        listener(null, { value: encodeBase64([0x3d, 0x00, 0x00, 0x02, 0x01, options.connState]) });
      }
      if (options.notifyError) {
        listener(options.notifyError, null);
      }
      return { remove };
    },
  );
}

function mockSecurityResponseFrame(): string {
  return encodeBase64([0x01, 0x00, 0x00, 128, ...mockPeerPublicKey()]);
}

function mockPeerPublicKey(): number[] {
  return new Array<number>(128).fill(0x02);
}

function hasByteSequence(bytes: number[], sequence: number[]): boolean {
  if (sequence.length === 0 || bytes.length < sequence.length) return false;
  return bytes.some((_, index) => sequence.every((byte, sequenceIndex) => bytes[index + sequenceIndex] === byte));
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
