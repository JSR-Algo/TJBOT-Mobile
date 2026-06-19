import { BleManager, Device } from 'react-native-ble-plx';
import { buildBluFiCustomDataFrames, buildBluFiStationProvisioningFrames, buildBluFiWifiScanFrames, encodeTLV, parseBluFiConnReport } from './blufiProtocol';
import { BLE_CONFIG, isAllowlistedCandidate } from './config';
import { requestBlePermissions } from './permissions';
import type { BleBootstrapResult, BleDeviceCandidate, BleScanResult, LocalBleClaimTokenResult, LocalBleProvisioningResult, RobotWifiNetwork } from './types';

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
    const reason =
      permission === 'denied'
        ? 'Bluetooth permission was denied.'
        : permission === 'poweredOff'
          ? 'Turn on Bluetooth to find your Robot.'
          : permission === 'unauthorized'
            ? 'Bluetooth is not authorized. Check Settings > Privacy > Bluetooth.'
            : 'Bluetooth is unavailable on this platform.';
    return {
      permission,
      available: false,
      reason,
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
    rssi: device.rssi ?? null,
  };
}

export function splitDevicesByAllowlist(devices: BleDeviceCandidate[]): BleScanResult {
  return devices.reduce<BleScanResult>(
    (acc, device) => {
      if (isAllowlistedCandidate(device)) {
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
      blockedSamples: result.blocked.slice(0, 3).map(device => ({
        id: device.id,
        name: device.name,
        localName: device.localName,
        serviceUUIDs: device.serviceUUIDs,
        hasManufacturerData: !!device.manufacturerData,
        hasRawScanRecord: !!device.rawScanRecord,
        serviceDataKeys: Object.keys(device.serviceData ?? {}),
      })),
    });
  }
  const strongEnough = result.allowed.filter(
    (d) => (d.rssi ?? -100) >= BLE_CONFIG.MIN_RSSI_THRESHOLD,
  );
  const sorted = strongEnough.sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100));
  return { allowed: sorted, blocked: result.blocked };
}

type LocalProvisioningDevice = Pick<Device, 'discoverAllServicesAndCharacteristics'>
  & Partial<Pick<Device, 'writeCharacteristicWithResponseForService' | 'cancelConnection' | 'monitorCharacteristicForService'>>;

type BluFiWriter = (serviceUUID: string, characteristicUUID: string, base64Value: string) => Promise<unknown>;
type BluFiMonitor = NonNullable<LocalProvisioningDevice['monitorCharacteristicForService']>;
type BluFiMonitorSubscription = ReturnType<BluFiMonitor>;

type ConnectDevice = (deviceId: string) => Promise<LocalProvisioningDevice>;

const WIFI_SSID_MAX_BYTES = 32;
const WIFI_PASSWORD_MAX_BYTES = 63;
const CLAIM_BOOTSTRAP_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const CLAIM_BOOTSTRAP_TOKEN_DELIVERY_ATTEMPTS = 2;
const CLAIM_BOOTSTRAP_TOKEN_RETRY_DELAY_MS = 200;
const BLE_GATT_OPERATION_TIMEOUT_MS = 10000;
const BLUFI_WIFI_LIST_TYPE = 0x45;
const BLUFI_FRAME_CONTROL_FRAGMENT = 0x10;
const BLUFI_WIFI_SCAN_RESPONSE_TIMEOUT_MS = 15000;
// Firmware conn-report conn_state values (payload[1] after reassembly).
const BLUFI_STA_CONN_SUCCESS = 0;
const BLUFI_STA_CONN_FAIL = 1;
const BLUFI_STA_CONNECTING = 2;
// How long to wait for a real-time conn-report after writing the station frames
// before falling back to the authoritative backend-poll path. Kept short so a
// slow/silent robot does not block the handoff; STA_CONNECTING is treated as
// "keep waiting" until this bound elapses.
const BLUFI_CONN_REPORT_TIMEOUT_MS = 8000;

export async function provisionWifiViaLocalBle(params: {
  device: BleDeviceCandidate;
  ssid: string;
  password: string;
  code?: string;
  token?: string;
  // Backend device_id this claim attempt was created under — pushed with the
  // token (TLV tag 0x03) so the robot claims/confirms under the same id.
  deviceId?: string;
  allowCredentialOnly?: boolean;
  connReportTimeoutMs?: number;
  connectDevice?: ConnectDevice;
}): Promise<LocalBleProvisioningResult> {
  const ssid = sanitizeWifiText(params.ssid, WIFI_SSID_MAX_BYTES, 'WIFI_SSID_INVALID');
  const password = sanitizeWifiText(params.password, WIFI_PASSWORD_MAX_BYTES, 'WIFI_PASSWORD_INVALID', { trim: false });
  if (params.code !== undefined && !/^\d{6}$/.test(params.code)) {
    throw codedError('INVALID_BLE_CODE', 'Pairing code must be 6 digits.');
  }
  if (!params.allowCredentialOnly && !params.code && !params.token) {
    throw codedError('INVALID_BLE_CODE', 'Pairing code or bootstrap token is required.');
  }
  if (params.token && !CLAIM_BOOTSTRAP_TOKEN_PATTERN.test(params.token)) {
    throw codedError('CLAIM_BOOTSTRAP_TOKEN_INVALID', 'Claim token is invalid.');
  }

  const connectDevice = params.connectDevice ?? connectBleDevice;
  let connected: LocalProvisioningDevice | undefined;
  let connReport: ConnReportWait | null = null;
  try {
    connected = await withBleOperationTimeout(
      connectDevice(params.device.id),
      'BLE_PROVISIONING_FAILED',
      'Robot did not accept local Wi-Fi provisioning.',
    );
    const discovered = await withBleOperationTimeout(
      connected.discoverAllServicesAndCharacteristics(),
      'BLE_PROVISIONING_FAILED',
      'Robot did not accept local Wi-Fi provisioning.',
    );
    const { writer, target } = resolveBluFiWriter(discovered, connected);
    if (!writer) {
      throw codedError('BLE_PROVISIONING_UNSUPPORTED', 'Robot BLE provisioning characteristic is unavailable.');
    }

    // Subscribe to the notify char BEFORE writing the station frames so an early
    // conn-report is not missed. If the device cannot monitor (e.g. older mocks /
    // platforms), connReport stays null and we fall back to the backend-poll path.
    const { monitor, target: monitorTarget } = resolveBluFiMonitor(discovered, connected);
    connReport = monitor
      ? waitForBluFiConnReport(monitor.bind(monitorTarget), params.connReportTimeoutMs ?? BLUFI_CONN_REPORT_TIMEOUT_MS)
      : null;

    let startSequence = 0;
    if (params.token) {
      const entries = [{ tag: 0x01, value: params.token }];
      if (params.code) entries.push({ tag: 0x02, value: params.code });
      if (params.deviceId) entries.push({ tag: 0x03, value: params.deviceId });
      const tlv = encodeTLV(entries);
      const { frames, endSequence } = buildBluFiCustomDataFrames({ tlv }, 0);
      await writeBluFiFrames(writer.bind(target), frames, {
        timeoutCode: 'BLE_PROVISIONING_FAILED',
        timeoutMessage: 'Robot did not accept local Wi-Fi provisioning.',
      });
      startSequence = endSequence;
    }

    await writeBluFiFrames(writer.bind(target), buildBluFiStationProvisioningFrames({ ssid, password, startSequence }), {
      timeoutCode: 'BLE_PROVISIONING_FAILED',
      timeoutMessage: 'Robot did not accept local Wi-Fi provisioning.',
    });

    if (connReport) {
      // STA_CONN_FAIL → surface a wrong-password failure immediately (static
      // message + code only, no credential value). STA_CONN_SUCCESS is at most an
      // early "wifi connected" signal — it still resolves the local handoff so
      // backend polling stays the authoritative success signal (DD4). Timeout /
      // no-report also falls through to the handoff (backend-poll fallback).
      const result = await connReport.result;
      if (result?.connState === BLUFI_STA_CONN_FAIL) {
        throw codedError('WIFI_CONNECT_FAILED', 'Robot could not join the Wi-Fi network. Check the password and try again.');
      }
      if (__DEV__ && result?.connState === BLUFI_STA_CONN_SUCCESS) {
        console.info('[TBOT BLE] robot reported Wi-Fi connect success (early signal; backend poll remains authoritative)');
      }
    }

    return { deviceId: params.device.id, status: 'wifi_credentials_sent', transport: 'ble-blufi' };
  } catch (error) {
    // Pass through only this service's OWN typed provisioning codes. A native BLE
    // coded error (e.g. { code: 'DeviceDisconnected' }) must be normalized to the
    // documented BLE_PROVISIONING_FAILED so callers/UI never key off an
    // uncontrolled native code and no native error object (whose message/fields
    // we do not control) leaks past the static-message boundary.
    if (isProvisioningServiceError(error)) throw error;
    throw codedError('BLE_PROVISIONING_FAILED', 'Robot did not accept local Wi-Fi provisioning.');
  } finally {
    // Tear down a still-pending conn-report wait (e.g. a write failed before any
    // report arrived) so no subscription/timer dangles past cancelConnection.
    connReport?.cancel();
    await connected?.cancelConnection?.().catch(() => undefined);
  }
}

export async function sendClaimBootstrapTokenViaBle(params: {
  device: BleDeviceCandidate;
  token: string;
  // The backend device_id this claim attempt was created under. Pushed to the
  // robot (TLV tag 0x03) so it claims/confirms under the SAME id, instead of its
  // random firmware Board UUID which never matches the backend record -> pairing
  // would otherwise hang at "waiting for robot to authenticate".
  deviceId?: string;
  connectDevice?: ConnectDevice;
}): Promise<LocalBleClaimTokenResult> {
  if (!CLAIM_BOOTSTRAP_TOKEN_PATTERN.test(params.token)) {
    throw codedError('CLAIM_BOOTSTRAP_TOKEN_INVALID', 'Claim token is invalid.');
  }

  const connectDevice = params.connectDevice ?? connectBleDevice;
  for (let attempt = 0; attempt < CLAIM_BOOTSTRAP_TOKEN_DELIVERY_ATTEMPTS; attempt += 1) {
    let connected: LocalProvisioningDevice | undefined;
    try {
      connected = await withBleOperationTimeout(
        connectDevice(params.device.id),
        'BLE_CLAIM_TOKEN_SEND_FAILED',
        'Robot did not accept the claim token.',
      );
      const discovered = await withBleOperationTimeout(
        connected.discoverAllServicesAndCharacteristics(),
        'BLE_CLAIM_TOKEN_SEND_FAILED',
        'Robot did not accept the claim token.',
      );
      const { writer, target } = resolveBluFiWriter(discovered, connected);
      if (!writer) {
        throw codedError('BLE_PROVISIONING_UNSUPPORTED', 'Robot BLE provisioning characteristic is unavailable.');
      }

      const tokenEntries: Array<{ tag: number; value: string }> = [{ tag: 0x01, value: params.token }];
      if (params.deviceId) {
        // tag 0x03 = claim device_id (the backend id the attempt was created under).
        tokenEntries.push({ tag: 0x03, value: params.deviceId });
      }
      const tlv = encodeTLV(tokenEntries);
      const { frames } = buildBluFiCustomDataFrames({ tlv }, 0);
      await writeBluFiFrames(writer.bind(target), frames, {
        timeoutCode: 'BLE_CLAIM_TOKEN_SEND_FAILED',
        timeoutMessage: 'Robot did not accept the claim token.',
      });

      return { deviceId: params.device.id, status: 'claim_token_sent', transport: 'ble-blufi' };
    } catch (error) {
      if (isTerminalClaimTokenDeliveryError(error)) throw error;
      if (attempt >= CLAIM_BOOTSTRAP_TOKEN_DELIVERY_ATTEMPTS - 1) {
        throw codedError('BLE_CLAIM_TOKEN_SEND_FAILED', 'Robot did not accept the claim token.');
      }
      await delay(CLAIM_BOOTSTRAP_TOKEN_RETRY_DELAY_MS);
    } finally {
      if (connected?.cancelConnection) {
        try {
          await connected.cancelConnection();
        } catch (error) {
          if (__DEV__) {
            const message = error instanceof Error ? error.message : 'unknown';
            console.info('[TBOT BLE] claim token disconnect failed', { message });
          }
        }
      }
    }
  }

  throw codedError('BLE_CLAIM_TOKEN_SEND_FAILED', 'Robot did not accept the claim token.');
}

export async function scanRobotWifiNetworks(params: {
  device: BleDeviceCandidate;
  connectDevice?: ConnectDevice;
}): Promise<RobotWifiNetwork[]> {
  const connectDevice = params.connectDevice ?? connectBleDevice;
  let connected: LocalProvisioningDevice | undefined;
  try {
    connected = await withBleOperationTimeout(
      connectDevice(params.device.id),
      'BLE_WIFI_SCAN_FAILED',
      'Robot BLE Wi-Fi scan notification failed.',
    );
    const discovered = await withBleOperationTimeout(
      connected.discoverAllServicesAndCharacteristics(),
      'BLE_WIFI_SCAN_FAILED',
      'Robot BLE Wi-Fi scan notification failed.',
    );
    const { writer, target } = resolveBluFiWriter(discovered, connected);
    const { monitor, target: monitorTarget } = resolveBluFiMonitor(discovered, connected);
    if (!writer || !monitor) {
      throw codedError('BLE_WIFI_SCAN_UNSUPPORTED', 'Robot BLE Wi-Fi scan notification characteristic is unavailable.');
    }

    const scanResult = waitForBluFiWifiList(monitor.bind(monitorTarget));
    await writeBluFiFrames(writer.bind(target), buildBluFiWifiScanFrames(), {
      timeoutCode: 'BLE_WIFI_SCAN_FAILED',
      timeoutMessage: 'Robot BLE Wi-Fi scan notification failed.',
    });
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

async function writeBluFiFrames(
  writer: BluFiWriter,
  frames: string[],
  options: { timeoutCode: string; timeoutMessage: string } = {
    timeoutCode: 'BLE_PROVISIONING_FAILED',
    timeoutMessage: 'Robot did not accept local Wi-Fi provisioning.',
  },
): Promise<void> {
  for (const frame of frames) {
    await withBleOperationTimeout(
      writer(BLE_CONFIG.BLUFI_SERVICE_UUID, BLE_CONFIG.BLUFI_WRITE_CHARACTERISTIC_UUID, frame),
      options.timeoutCode,
      options.timeoutMessage,
    );
  }
}

function withBleOperationTimeout<T>(operation: Promise<T>, code: string, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(codedError(code, message));
    }, BLE_GATT_OPERATION_TIMEOUT_MS);

    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
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

type ConnReportWait = {
  result: Promise<{ connState: number } | null>;
  cancel: () => void;
};

function waitForBluFiConnReport(monitor: BluFiMonitor, timeoutMs: number): ConnReportWait {
  let settled = false;
  const monitorState: { subscription?: BluFiMonitorSubscription; removeWhenReady: boolean } = { removeWhenReady: false };
  let finish: (result: { connState: number } | null) => void = () => undefined;

  const result = new Promise<{ connState: number } | null>((resolve) => {
    const timer = setTimeout(() => finish(null), timeoutMs);

    const removeSubscription = (): void => {
      if (monitorState.subscription) {
        monitorState.subscription.remove();
      } else {
        monitorState.removeWhenReady = true;
      }
    };

    // Resolve only — a conn-report timeout, a pre-terminal monitor error, or no
    // report at all all fall back to the authoritative backend-poll path rather
    // than failing the local handoff. The caller maps STA_CONN_FAIL to a reject;
    // any monitor event AFTER we settle (firmware tears down BLE right after
    // STA_CONN_SUCCESS) is swallowed via the `settled` guard.
    finish = (value: { connState: number } | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      removeSubscription();
      resolve(value);
    };

    monitorState.subscription = monitor(
      BLE_CONFIG.BLUFI_SERVICE_UUID,
      BLE_CONFIG.BLUFI_NOTIFY_CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (settled) return;
        if (error) {
          finish(null);
          return;
        }

        const frame = decodeBase64(characteristic?.value ?? '');
        if (!frame) return;
        const parsed = parseBluFiConnReport(frame);
        if (parsed && parsed.connState !== BLUFI_STA_CONNECTING) {
          finish(parsed);
        }
      },
    );

    if (monitorState.removeWhenReady) monitorState.subscription.remove();
  });

  // cancel() lets the caller tear down the subscription + timer when the write
  // path fails before a report arrives, so nothing dangles past cancelConnection.
  return { result, cancel: () => finish(null) };
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
    if (entryLength < 1 || offset + 1 + entryLength > payload.length) break;
    if (entryLength === 1) {
      offset += 1 + entryLength;
      continue;
    }
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

// This service's OWN typed provisioning error codes. Only these are re-thrown
// from the provisioning catch block; any other coded error (notably native BLE
// codes such as DeviceDisconnected) is normalized to BLE_PROVISIONING_FAILED.
const PROVISIONING_SERVICE_ERROR_CODES = new Set<string>([
  'BLE_PROVISIONING_FAILED',
  'BLE_PROVISIONING_UNSUPPORTED',
  'WIFI_CONNECT_FAILED',
  'WIFI_SSID_INVALID',
  'WIFI_PASSWORD_INVALID',
  'INVALID_BLE_CODE',
  'CLAIM_BOOTSTRAP_TOKEN_INVALID',
]);

function isProvisioningServiceError(error: unknown): error is { code: string } {
  return hasCode(error) && PROVISIONING_SERVICE_ERROR_CODES.has(error.code);
}

function isTerminalClaimTokenDeliveryError(error: unknown): boolean {
  if (!hasCode(error)) return false;
  return error.code === 'CLAIM_BOOTSTRAP_TOKEN_INVALID' ||
    error.code === 'BLE_PROVISIONING_UNSUPPORTED';
}

export async function disposeBle(): Promise<void> {
  if (!bleManager) {
    return;
  }

  bleManager.stopDeviceScan();
  bleManager.destroy();
  bleManager = null;
}
