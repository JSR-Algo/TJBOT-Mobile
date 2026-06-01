import { BleManager, Device } from 'react-native-ble-plx';
import { buildBluFiCustomDataFrames, buildBluFiStationProvisioningFrames, buildBluFiWifiScanFrames, encodeTLV } from './blufiProtocol';
import { BLE_CONFIG, isAllowlistedDevice } from './config';
import { requestBlePermissions } from './permissions';
import type { BleBootstrapResult, BleDeviceCandidate, BleScanResult, LocalBleProvisioningResult, RobotWifiNetwork } from './types';

let bleManager: BleManager | null = null;

type BleInitializeOptions = {
  stateAttempts?: number;
  stateRetryDelayMs?: number;
};

const RETRYABLE_BLE_STATES = new Set(['Unknown', 'Resetting', 'PoweredOff']);

export function getBleManager(): BleManager {
  if (!bleManager) {
    bleManager = new BleManager();
  }

  return bleManager;
}

export async function initializeBle(options: BleInitializeOptions = {}): Promise<BleBootstrapResult> {
  const permission = await requestBlePermissions();
  if (permission !== 'granted') {
    return {
      permission,
      available: false,
      reason: permission === 'denied' ? 'Bluetooth permission was denied.' : 'Bluetooth is unavailable on this platform.',
    };
  }

  const state = await waitForBlePoweredState(options);
  if (state !== 'PoweredOn') {
    return {
      permission,
      available: false,
      reason: state === 'PoweredOff'
        ? 'Bluetooth is off.'
        : 'Bluetooth is not ready for pairing.',
    };
  }

  return {
    permission,
    available: true,
  };
}

async function waitForBlePoweredState(options: BleInitializeOptions): Promise<string> {
  const attempts = Math.max(1, options.stateAttempts ?? 12);
  const retryDelayMs = Math.max(0, options.stateRetryDelayMs ?? 250);
  let state = 'Unknown';

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    state = await getBleManager().state().catch(() => 'Unknown');
    if (state === 'PoweredOn') return state;
    if (!RETRYABLE_BLE_STATES.has(state)) return state;
    if (attempt < attempts - 1) await delay(retryDelayMs);
  }

  return state;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toCandidate(device: Device): BleDeviceCandidate {
  return {
    id: device.id,
    name: device.name,
    localName: device.localName,
    serviceUUIDs: device.serviceUUIDs ?? [],
    manufacturerData: device.manufacturerData,
    rawScanRecord: device.rawScanRecord,
    serviceData: device.serviceData,
  };
}

export function splitDevicesByAllowlist(devices: BleDeviceCandidate[]): BleScanResult {
  return devices.reduce<BleScanResult>(
    (acc, device) => {
      if (isAllowlistedDevice(device.id, device.name ?? device.localName)) {
        acc.allowed.push(device);
      } else {
        acc.blocked.push(device);
      }
      return acc;
    },
    { allowed: [], blocked: [] },
  );
}

export async function scanForTJBotDevices(timeoutMs: number = BLE_CONFIG.SCAN_TIMEOUT_MS): Promise<BleScanResult> {
  const manager = getBleManager();
  const seen = new Map<string, BleDeviceCandidate>();

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      manager.stopDeviceScan();
      resolve();
    }, timeoutMs);

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        clearTimeout(timer);
        manager.stopDeviceScan();
        resolve();
        return;
      }

      if (!device) {
        return;
      }

      seen.set(device.id, toCandidate(device));
    });
  });

  const result = splitDevicesByAllowlist([...seen.values()]);
  if (__DEV__) {
    console.info('[TBOT BLE] scan result', {
      seen: seen.size,
      allowed: result.allowed.map(device => ({ id: device.id, name: device.name, localName: device.localName, serviceUUIDs: device.serviceUUIDs })),
      blockedCount: result.blocked.length,
    });
  }
  return result;
}

type LocalProvisioningDevice = Pick<Device, 'discoverAllServicesAndCharacteristics'>
  & Partial<Pick<Device, 'writeCharacteristicWithResponseForService' | 'cancelConnection' | 'monitorCharacteristicForService'>>;

type BluFiWriter = (serviceUUID: string, characteristicUUID: string, base64Value: string) => Promise<unknown>;
type BluFiMonitor = NonNullable<LocalProvisioningDevice['monitorCharacteristicForService']>;
type BluFiMonitorSubscription = ReturnType<BluFiMonitor>;

type ConnectDevice = (deviceId: string) => Promise<LocalProvisioningDevice>;

const WIFI_SSID_MAX_BYTES = 32;
const WIFI_PASSWORD_MAX_BYTES = 63;
const BLUFI_WIFI_LIST_TYPE = 0x45;
const BLUFI_FRAME_CONTROL_FRAGMENT = 0x10;
const BLUFI_WIFI_SCAN_RESPONSE_TIMEOUT_MS = 5000;

export async function provisionWifiViaLocalBle(params: {
  device: BleDeviceCandidate;
  ssid: string;
  password: string;
  code: string;
  token?: string;
  connectDevice?: ConnectDevice;
}): Promise<LocalBleProvisioningResult> {
  const ssid = sanitizeWifiText(params.ssid, WIFI_SSID_MAX_BYTES, 'WIFI_SSID_INVALID');
  const password = sanitizeWifiText(params.password, WIFI_PASSWORD_MAX_BYTES, 'WIFI_PASSWORD_INVALID', { trim: false });
  if (!/^\d{6}$/.test(params.code)) {
    throw codedError('INVALID_BLE_CODE', 'Pairing code must be 6 digits.');
  }

  const connectDevice = params.connectDevice ?? connectBleDevice;
  let connected: LocalProvisioningDevice | undefined;
  try {
    connected = await connectDevice(params.device.id);
    const discovered = await connected.discoverAllServicesAndCharacteristics();
    const { writer, target } = resolveBluFiWriter(discovered, connected);
    if (!writer) {
      throw codedError('BLE_PROVISIONING_UNSUPPORTED', 'Robot BLE provisioning characteristic is unavailable.');
    }

    let startSequence = 0;
    if (params.token) {
      const tlv = encodeTLV([
        { tag: 0x01, value: params.token },
        { tag: 0x02, value: params.code },
      ]);
      const { frames, endSequence } = buildBluFiCustomDataFrames({ tlv }, 0);
      await writeBluFiFrames(writer.bind(target), frames);
      startSequence = endSequence;
    }

    await writeBluFiFrames(writer.bind(target), buildBluFiStationProvisioningFrames({ ssid, password, startSequence }));

    return { deviceId: params.device.id, status: 'wifi_credentials_sent', transport: 'ble-blufi' };
  } catch (error) {
    if (hasCode(error)) throw error;
    throw codedError('BLE_PROVISIONING_FAILED', 'Robot did not accept local Wi-Fi provisioning.');
  } finally {
    await connected?.cancelConnection?.().catch(() => undefined);
  }
}

export async function scanRobotWifiNetworks(params: {
  device: BleDeviceCandidate;
  connectDevice?: ConnectDevice;
}): Promise<RobotWifiNetwork[]> {
  const connectDevice = params.connectDevice ?? connectBleDevice;
  let connected: LocalProvisioningDevice | undefined;
  try {
    connected = await connectDevice(params.device.id);
    const discovered = await connected.discoverAllServicesAndCharacteristics();
    const { writer, target } = resolveBluFiWriter(discovered, connected);
    const { monitor, target: monitorTarget } = resolveBluFiMonitor(discovered, connected);
    if (!writer || !monitor) {
      throw codedError('BLE_WIFI_SCAN_UNSUPPORTED', 'Robot BLE Wi-Fi scan notification characteristic is unavailable.');
    }

    const scanResult = waitForBluFiWifiList(monitor.bind(monitorTarget));
    await writeBluFiFrames(writer.bind(target), buildBluFiWifiScanFrames());
    return await scanResult;
  } finally {
    await connected?.cancelConnection?.().catch(() => undefined);
  }
}

async function connectBleDevice(deviceId: string): Promise<LocalProvisioningDevice> {
  const manager = getBleManager();
  return manager.connectToDevice(deviceId, { timeout: BLE_CONFIG.SCAN_TIMEOUT_MS });
}

function sanitizeWifiText(value: string, maxLength: number, code: string, options: { trim?: boolean } = {}): string {
  const normalized = options.trim === false ? value : value.trim();
  if (!normalized || utf8ByteLength(normalized) > maxLength || hasControlCharacter(normalized)) {
    throw codedError(code, 'Wi-Fi input is invalid.');
  }
  return normalized;
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const codePoint = char.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
}

function resolveBluFiWriter(discovered: LocalProvisioningDevice, connected: LocalProvisioningDevice): {
  writer?: BluFiWriter;
  target: LocalProvisioningDevice;
} {
  if (discovered.writeCharacteristicWithResponseForService) {
    return { writer: discovered.writeCharacteristicWithResponseForService, target: discovered };
  }
  return { writer: connected.writeCharacteristicWithResponseForService, target: connected };
}

function resolveBluFiMonitor(discovered: LocalProvisioningDevice, connected: LocalProvisioningDevice): {
  monitor?: BluFiMonitor;
  target: LocalProvisioningDevice;
} {
  if (discovered.monitorCharacteristicForService) {
    return { monitor: discovered.monitorCharacteristicForService, target: discovered };
  }
  return { monitor: connected.monitorCharacteristicForService, target: connected };
}

async function writeBluFiFrames(writer: BluFiWriter, frames: string[]): Promise<void> {
  for (const frame of frames) {
    await writer(BLE_CONFIG.BLUFI_SERVICE_UUID, BLE_CONFIG.BLUFI_WRITE_CHARACTERISTIC_UUID, frame);
  }
}

type BluFiListAccumulator = {
  expectedLength?: number;
  chunks: number[];
};

function waitForBluFiWifiList(monitor: BluFiMonitor): Promise<RobotWifiNetwork[]> {
  const accumulator: BluFiListAccumulator = { chunks: [] };

  return new Promise((resolve, reject) => {
    let settled = false;
    const monitorState: { subscription?: BluFiMonitorSubscription; removeWhenReady: boolean } = { removeWhenReady: false };
    const timer = setTimeout(() => finish(() => resolve([])), BLUFI_WIFI_SCAN_RESPONSE_TIMEOUT_MS);

    const removeSubscription = (): void => {
      if (monitorState.subscription) {
        monitorState.subscription.remove();
      } else {
        monitorState.removeWhenReady = true;
      }
    };

    const finish = (complete: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      removeSubscription();
      complete();
    };

    monitorState.subscription = monitor(
      BLE_CONFIG.BLUFI_SERVICE_UUID,
      BLE_CONFIG.BLUFI_NOTIFY_CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (settled) return;
        if (error) {
          finish(() => reject(codedError('BLE_WIFI_SCAN_FAILED', 'Robot BLE Wi-Fi scan notification failed.')));
          return;
        }

        const parsed = parseBluFiWifiListFrame(characteristic?.value, accumulator);
        if (parsed) {
          finish(() => resolve(parsed));
        }
      },
    );

    if (monitorState.removeWhenReady) monitorState.subscription.remove();
  });
}

function parseBluFiWifiListFrame(base64Value: string | null | undefined, accumulator: BluFiListAccumulator): RobotWifiNetwork[] | undefined {
  if (!base64Value) return undefined;
  const frame = decodeBase64(base64Value);
  if (!frame || frame.length < 4) return undefined;
  const [type, frameControl, , dataLength] = frame;
  if (type !== BLUFI_WIFI_LIST_TYPE || frame.length < 4 + dataLength) return undefined;

  const payload = frame.slice(4, 4 + dataLength);
  const isFragment = (frameControl & BLUFI_FRAME_CONTROL_FRAGMENT) !== 0;
  if (isFragment) {
    if (payload.length < 2) return undefined;
    if (accumulator.expectedLength === undefined) {
      accumulator.expectedLength = payload[0] | (payload[1] << 8);
    }
    accumulator.chunks.push(...payload.slice(2));
    return undefined;
  }

  if (accumulator.expectedLength !== undefined) {
    accumulator.chunks.push(...payload);
    if (accumulator.chunks.length !== accumulator.expectedLength) return undefined;
    return parseBluFiWifiListPayload(accumulator.chunks);
  }

  return parseBluFiWifiListPayload(payload);
}

function parseBluFiWifiListPayload(payload: number[]): RobotWifiNetwork[] {
  const networks: RobotWifiNetwork[] = [];
  let offset = 0;
  while (offset < payload.length) {
    const entryLength = payload[offset];
    if (entryLength < 2 || offset + 1 + entryLength > payload.length) break;
    const rssi = signedByte(payload[offset + 1]);
    const ssid = decodeUtf8(payload.slice(offset + 2, offset + 1 + entryLength)).trim();
    if (ssid) networks.push({ ssid, rssi });
    offset += 1 + entryLength;
  }
  return networks;
}

function signedByte(value: number): number {
  return value > 127 ? value - 256 : value;
}

function utf8ByteLength(value: string): number {
  let length = 0;
  for (const char of Array.from(value)) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) length += 1;
    else if (codePoint <= 0x7ff) length += 2;
    else if (codePoint <= 0xffff) length += 3;
    else length += 4;
  }
  return length;
}

function decodeBase64(value: string): number[] | undefined {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/\s/g, '');
  if (clean.length === 0 || clean.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(clean)) return undefined;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const a = alphabet.indexOf(clean[i]);
    const b = alphabet.indexOf(clean[i + 1]);
    const c = clean[i + 2] === '=' ? 0 : alphabet.indexOf(clean[i + 2]);
    const d = clean[i + 3] === '=' ? 0 : alphabet.indexOf(clean[i + 3]);
    if (a < 0 || b < 0 || c < 0 || d < 0) return undefined;
    const triplet = (a << 18) | (b << 12) | (c << 6) | d;
    bytes.push((triplet >> 16) & 0xff);
    if (clean[i + 2] !== '=') bytes.push((triplet >> 8) & 0xff);
    if (clean[i + 3] !== '=') bytes.push(triplet & 0xff);
  }
  return bytes;
}

function decodeUtf8(bytes: number[]): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const first = bytes[i];
    if (first <= 0x7f) {
      output += String.fromCharCode(first);
    } else if (first >= 0xc0 && first <= 0xdf && i + 1 < bytes.length) {
      const second = bytes[++i];
      output += String.fromCharCode(((first & 0x1f) << 6) | (second & 0x3f));
    } else if (first >= 0xe0 && first <= 0xef && i + 2 < bytes.length) {
      const second = bytes[++i];
      const third = bytes[++i];
      output += String.fromCharCode(((first & 0x0f) << 12) | ((second & 0x3f) << 6) | (third & 0x3f));
    } else if (first >= 0xf0 && first <= 0xf7 && i + 3 < bytes.length) {
      const second = bytes[++i];
      const third = bytes[++i];
      const fourth = bytes[++i];
      const codePoint = ((first & 0x07) << 18) | ((second & 0x3f) << 12) | ((third & 0x3f) << 6) | (fourth & 0x3f);
      output += String.fromCodePoint(codePoint);
    }
  }
  return output;
}

function codedError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function hasCode(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string';
}

export async function disposeBle(): Promise<void> {
  if (!bleManager) {
    return;
  }

  bleManager.stopDeviceScan();
  bleManager.destroy();
  bleManager = null;
}
