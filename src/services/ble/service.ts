import { BleManager, Device, ScanMode } from 'react-native-ble-plx';
import {
  buildBluFiCustomDataFrames,
  buildBluFiSecurityNegotiationFrames,
  buildBluFiStationProvisioningFrames,
  buildBluFiWifiScanFrames,
  deriveBluFiSession,
  encodeTLV,
  ingestBluFiConnReportFrame,
  type BluFiConnReportAccumulator,
} from './blufiProtocol';
import { BLE_CONFIG, isAllowlistedCandidate } from './config';
import { requestBlePermissions } from './permissions';
import type { BleBootstrapResult, BleDeviceCandidate, BleScanResult, LocalBleClaimTokenResult, LocalBleProvisioningResult, RobotWifiNetwork } from './types';

let bleManager: BleManager | null = null;
/**
 * Bumped per device whenever a public BLE operation starts owning its GATT
 * session. A same-device takeover invalidates older cleanup without letting an
 * unrelated robot suppress cleanup of its own connection.
 */
const bleGattSessionEpochByDevice = new Map<string, number>();

function beginBleGattSession(deviceId: string): number {
  const nextEpoch = (bleGattSessionEpochByDevice.get(deviceId) ?? 0) + 1;
  bleGattSessionEpochByDevice.set(deviceId, nextEpoch);
  return nextEpoch;
}

function currentBleGattSessionEpoch(deviceId: string): number {
  return bleGattSessionEpochByDevice.get(deviceId) ?? 0;
}

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

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      manager.stopDeviceScan();
      resolve();
    }, timeoutMs);

    // Unfiltered + LowLatency: Xiaomi/Android 12+ LOW_POWER scans often omit
    // localName/serviceUUIDs for ESP BluFi ads. allowDuplicates helps merge
    // ADV + scan-response packets that arrive as separate callbacks.
    manager.startDeviceScan(
      null,
      {
        allowDuplicates: true,
        scanMode: ScanMode.LowLatency,
      },
      (error, device) => {
        if (error) {
          clearTimeout(timer);
          manager.stopDeviceScan();
          reject(normalizeScanError(error));
          return;
        }

        if (!device) {
          return;
        }

        // Prefer richer later packets (name/UUID often arrive on scan response).
        const next = toCandidate(device);
        const prev = seen.get(device.id);
        seen.set(device.id, prev ? mergeBleCandidates(prev, next) : next);
      },
    );
  });

  const result = splitDevicesByAllowlist([...seen.values()]);
  if (__DEV__) {
    console.info('[TBOT BLE] scan result', {
      seenCount: seen.size,
      allowedCount: result.allowed.length,
      blockedCount: result.blocked.length,
    });
  }
  return result;
}

function mergeBleCandidates(prev: BleDeviceCandidate, next: BleDeviceCandidate): BleDeviceCandidate {
  return {
    id: next.id || prev.id,
    name: next.name || prev.name,
    localName: next.localName || prev.localName,
    serviceUUIDs: (next.serviceUUIDs && next.serviceUUIDs.length > 0) ? next.serviceUUIDs : prev.serviceUUIDs,
    manufacturerData: next.manufacturerData || prev.manufacturerData,
    rawScanRecord: next.rawScanRecord || prev.rawScanRecord,
    serviceData: {
      ...(prev.serviceData ?? {}),
      ...(next.serviceData ?? {}),
    },
  };
}

function normalizeScanError(error: unknown): Error & { code: string } {
  const message = errorMessage(error);
  return codedError(isScanThrottleError(message) ? 'BLE_SCAN_THROTTLED' : 'BLE_SCAN_ERROR', message || 'Bluetooth scan failed.');
}

function isScanThrottleError(message: string): boolean {
  return /too frequent|too frequently|scanning.*frequent|scan.*throttl/i.test(message);
}

type LocalProvisioningDevice = Pick<Device, 'discoverAllServicesAndCharacteristics'>
  & Partial<Pick<Device, 'writeCharacteristicWithResponseForService' | 'cancelConnection' | 'monitorCharacteristicForService'>>;

type MtuRequestingDevice = LocalProvisioningDevice & Pick<Device, 'requestMTU'>;

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
/** Android often needs a fresh scan result before GATT connect after a prior disconnect. */
const BLE_CONNECT_PRESCAN_TIMEOUT_MS = 5000;
const BLE_CONNECT_TIMEOUT_MS = 20000;
const BLE_CONNECT_ATTEMPTS = 2;
const BLE_CONNECT_RETRY_DELAY_MS = 400;
const BLE_CONNECT_RELEASE_SETTLE_MS = 150;
const BLE_CONNECT_OPERATION_TIMEOUT_MS = (
  BLE_CONNECT_ATTEMPTS * (BLE_CONNECT_PRESCAN_TIMEOUT_MS + BLE_CONNECT_TIMEOUT_MS + BLE_CONNECT_RELEASE_SETTLE_MS)
  + ((BLE_CONNECT_ATTEMPTS - 1) * (BLE_CONNECT_RELEASE_SETTLE_MS + BLE_CONNECT_RETRY_DELAY_MS))
  + 2000
);
const BLE_PROVISIONING_STATIC_MESSAGE = 'Robot did not accept local Wi-Fi provisioning.';
const BLUFI_WIFI_LIST_TYPE = 0x45;
const BLUFI_ERROR_INFO_TYPE = 0x49;
const BLUFI_FRAME_CONTROL_FRAGMENT = 0x10;
const BLUFI_WIFI_SCAN_RESPONSE_TIMEOUT_MS = 15000;
const BLE_WIFI_SCAN_ATTEMPTS = 2;
const BLE_WIFI_SCAN_RETRY_DELAY_MS = 300;
const BLUFI_SECURITY_RESPONSE_TIMEOUT_MS = 5000;
const BLUFI_NEGOTIATE_TYPE = 0x01;
// Firmware conn-report conn_state values (payload[1] after reassembly).
const BLUFI_STA_CONN_SUCCESS = 0;
const BLUFI_STA_CONN_FAIL = 1;
const BLUFI_STA_CONNECTING = 2;
// How long to wait for a real-time conn-report after writing the station frames
// when the claim/backend path can still confirm later. Kept relatively short so
// a silent robot does not block that path; STA_CONNECTING is treated as
// "keep waiting" until this bound elapses.
const BLUFI_CONN_REPORT_TIMEOUT_MS = 15000;
// Credential-only (offline / reconnect) has no backend authority — Wi-Fi join
// itself is the success signal. Firmware waits up to 60s for STA connect.
const BLUFI_CREDENTIAL_ONLY_CONN_REPORT_TIMEOUT_MS = 55000;

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
  const provisionSessionEpoch = beginBleGattSession(params.device.id);

  logBleProvision('start', {
    deviceId: params.device.id,
    name: params.device.name ?? params.device.localName ?? null,
    hasToken: !!params.token,
    hasCode: !!params.code,
    credentialOnly: params.allowCredentialOnly === true,
    ssidBytes: utf8ByteLength(ssid),
    passwordBytes: utf8ByteLength(password),
  });

  const connectDevice = params.connectDevice ?? connectBleDevice;
  let connected: LocalProvisioningDevice | undefined;
  let securityResponse: SecurityResponseWait | null = null;
  let connReport: ConnReportWait | null = null;
  let notifyHub: BluFiNotifyHub | null = null;
  let deliveryStarted = false;
  try {
    // Use the connect-specific timeout (not the short GATT write timeout). On
    // Xiaomi/Android a second connect after Wi-Fi-list handoff often needs a
    // pre-scan refresh + >10s to complete; the old 10s wrap mapped that to a
    // false BLE_PROVISIONING_DISCONNECTED ("Operation was cancelled").
    connected = await withBleOperationTimeout(
      connectDevice(params.device.id),
      'BLE_PROVISIONING_GATT_ERROR',
      BLE_PROVISIONING_STATIC_MESSAGE,
      BLE_CONNECT_OPERATION_TIMEOUT_MS,
    );
    logBleProvision('connected', { deviceId: params.device.id });
    const discovered = await withBleOperationTimeout(
      connected.discoverAllServicesAndCharacteristics(),
      'BLE_PROVISIONING_GATT_ERROR',
      BLE_PROVISIONING_STATIC_MESSAGE,
    );
    logBleProvision('services_discovered', { deviceId: params.device.id });
    const { writer, target } = resolveBluFiWriter(discovered, connected);
    if (!writer) {
      logBleProvision('writer_missing', { deviceId: params.device.id });
      throw codedError('BLE_PROVISIONING_UNSUPPORTED', 'Robot BLE provisioning characteristic is unavailable.');
    }

    // Subscribe to the notify char BEFORE writing protected frames: encrypted
    // BluFi needs the robot DH public key, and conn-report can arrive early.
    // Android (esp. Xiaomi) only allows ONE active notification subscription per
    // characteristic — dual waitFor* monitors race and throw GATT_ERROR in ~ms.
    // Use a single hub that fans events to security + conn-report handlers.
    const { monitor, target: monitorTarget } = resolveBluFiMonitor(discovered, connected);
    const boundMonitor = monitor?.bind(monitorTarget);
    if (!boundMonitor) {
      throw codedError('BLE_PROVISIONING_UNSUPPORTED', 'Robot BLE provisioning notification characteristic is unavailable.');
    }
    notifyHub = createBluFiNotifyHub(boundMonitor);
    securityResponse = waitForBluFiSecurityResponseFromHub(notifyHub, BLUFI_SECURITY_RESPONSE_TIMEOUT_MS);
    logBleProvision('monitor_ready', { hasMonitor: true, sharedHub: true });

    // Best-effort MTU bump. Never fail provisioning on MTU — many stacks omit
    // requestMTU and Xiaomi can reject the exchange without breaking BluFi.
    await requestBleMtu(connected, discovered).catch((error) => {
      logBleProvision('mtu_skipped', {
        message: error instanceof Error ? error.message : String(error),
      });
    });

    const security = buildBluFiSecurityNegotiationFrames({}, 0);
    const setSecurityFrame = security.frames[security.frames.length - 1];
    const negotiateFrames = security.frames.slice(0, -1);
    logBleProvision('write_security_negotiate', { frames: negotiateFrames.length });
    await writeBluFiFrames(writer.bind(target), negotiateFrames, {
      timeoutCode: 'BLE_PROVISIONING_WRITE_TIMEOUT',
      timeoutMessage: BLE_PROVISIONING_STATIC_MESSAGE,
    });
    logBleProvision('await_security_response', { timeoutMs: BLUFI_SECURITY_RESPONSE_TIMEOUT_MS });
    const peerPublicKey = await securityResponse.result;
    const session = deriveBluFiSession({ privateKey: security.privateKey, peerPublicKey: new Uint8Array(peerPublicKey) });
    logBleProvision('security_response_received', { publicKeyBytes: peerPublicKey.length });
    await writeBluFiFrames(writer.bind(target), setSecurityFrame ? [setSecurityFrame] : [], {
      timeoutCode: 'BLE_PROVISIONING_WRITE_TIMEOUT',
      timeoutMessage: BLE_PROVISIONING_STATIC_MESSAGE,
    });

    // Attach conn-report waiter only after security is up — same shared hub,
    // no second GATT notify subscription.
    const credentialOnly = params.allowCredentialOnly === true;
    const connReportTimeoutMs = params.connReportTimeoutMs
      ?? (credentialOnly ? BLUFI_CREDENTIAL_ONLY_CONN_REPORT_TIMEOUT_MS : BLUFI_CONN_REPORT_TIMEOUT_MS);
    // Pass session so encrypted WIFI_REP bodies (post SET_SEC_MODE) decrypt
    // correctly — plaintext parse of ciphertext yields garbage connState (e.g. 87)
    // and falsely fails credential-only provisioning after a real Wi-Fi join.
    connReport = waitForBluFiConnReportFromHub(notifyHub, connReportTimeoutMs, session);

    let startSequence = security.endSequence;
    if (params.token) {
      const entries = [{ tag: 0x01, value: params.token }];
      if (params.code) entries.push({ tag: 0x02, value: params.code });
      if (params.deviceId) entries.push({ tag: 0x03, value: params.deviceId });
      const tlv = encodeTLV(entries);
      const { frames, endSequence } = buildBluFiCustomDataFrames({ tlv, session }, startSequence);
      logBleProvision('write_custom_data', { frames: frames.length, tags: entries.map((entry) => entry.tag) });
      // The robot may consume any encrypted fragment before Android receives
      // its write response, so ambiguity starts with the first custom frame.
      deliveryStarted = true;
      await writeBluFiFrames(writer.bind(target), frames, {
        timeoutCode: 'BLE_PROVISIONING_WRITE_TIMEOUT',
        timeoutMessage: BLE_PROVISIONING_STATIC_MESSAGE,
      });
      startSequence = endSequence;
    }

    logBleProvision('write_station_credentials', { startSequence, credentialOnly, connReportTimeoutMs });
    await writeBluFiFrames(writer.bind(target), buildBluFiStationProvisioningFrames({ ssid, password, startSequence, session }), {
      timeoutCode: 'BLE_PROVISIONING_WRITE_TIMEOUT',
      timeoutMessage: BLE_PROVISIONING_STATIC_MESSAGE,
    });

    if (connReport) {
      // STA_CONN_FAIL → wrong password / join failed.
      // Claim path (has backend poll): STA_CONN_SUCCESS is an early signal only;
      // timeout falls through so backend can still confirm (DD4).
      // Credential-only (offline/reconnect): there is no backend authority for
      // this handoff, so STA_CONN_SUCCESS is required before we report success.
      const result = await connReport.result;
      logBleProvision('conn_report', {
        connState: result?.connState ?? null,
        credentialOnly,
      });
      if (result?.connState === BLUFI_STA_CONN_FAIL) {
        throw codedError('WIFI_CONNECT_FAILED', 'Robot could not join the Wi-Fi network. Check the password and try again.');
      }
      if (credentialOnly) {
        // Reconnect/offline flows have no claim-state transition that can prove
        // these particular credentials were accepted. A stale backend "online"
        // value must not turn a lost report into false provisioning success.
        if (result?.connState !== BLUFI_STA_CONN_SUCCESS) {
          throw codedError('WIFI_CONNECT_TIMEOUT', 'Robot did not confirm that it joined the Wi-Fi network.');
        }
        logBleProvision('wifi_join_confirmed', { deviceId: params.device.id });
      } else if (result?.connState === BLUFI_STA_CONN_SUCCESS) {
        logBleProvision('wifi_join_early_signal', { deviceId: params.device.id });
      }
    }

    logBleProvision('handoff_complete', { deviceId: params.device.id, credentialOnly });
    return { deviceId: params.device.id, status: 'wifi_credentials_sent', transport: 'ble-blufi' };
  } catch (error) {
    const normalized = normalizeProvisioningError(error);
    if (deliveryStarted && isAmbiguousLateProvisioningError(normalized)) {
      Object.assign(normalized, { deliveryUnknown: true });
    }
    logBleProvision('failed', { code: normalized.code, nativeCode: hasCode(error) ? error.code : undefined });
    throw normalized;
  } finally {
    // Tear down a still-pending conn-report wait (e.g. a write failed before any
    // report arrived) so no subscription/timer dangles past cancelConnection.
    securityResponse?.cancel();
    connReport?.cancel();
    notifyHub?.close();
    if (currentBleGattSessionEpoch(params.device.id) === provisionSessionEpoch) {
      await connected?.cancelConnection?.().catch(() => undefined);
    }
  }
}

function isAmbiguousLateProvisioningError(error: { code: string }): boolean {
  return error.code === 'BLE_PROVISIONING_DISCONNECTED'
    || error.code === 'BLE_PROVISIONING_GATT_ERROR'
    || error.code === 'BLE_PROVISIONING_WRITE_TIMEOUT';
}

function logBleProvision(stage: string, detail: Record<string, unknown>): void {
  if (__DEV__) {
    console.info('[TBOT BLE Provision]', { stage, ...safeBleLogDetail(detail) });
  }
}

const SAFE_BLE_LOG_DETAIL_KEYS = new Set([
  'attempt',
  'count',
  'seenCount',
  'allowedCount',
  'blockedCount',
  'platform',
  'status',
  'deviceStatus',
  'connState',
  'code',
  'nativeCode',
  'errorCode',
  'backendCode',
  // BluFi transport diagnostics. Numeric only — never carries SSID, password,
  // token, or address material.
  'blufiErrorCode',
  'frameLength',
  'declaredDataLength',
]);

function safeBleLogDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (SAFE_BLE_LOG_DETAIL_KEYS.has(key)) safe[key] = value;
  }
  return safe;
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
    beginBleGattSession(params.device.id);
    let connected: LocalProvisioningDevice | undefined;
    let securityResponse: SecurityResponseWait | null = null;
    try {
      connected = await withBleOperationTimeout(
        connectDevice(params.device.id),
        'BLE_CLAIM_TOKEN_SEND_FAILED',
        'Robot did not accept the claim token.',
        BLE_CONNECT_OPERATION_TIMEOUT_MS,
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
      const { monitor, target: monitorTarget } = resolveBluFiMonitor(discovered, connected);
      const boundMonitor = monitor?.bind(monitorTarget);
      if (!boundMonitor) {
        throw codedError('BLE_PROVISIONING_UNSUPPORTED', 'Robot BLE provisioning notification characteristic is unavailable.');
      }

      const tokenEntries: Array<{ tag: number; value: string }> = [{ tag: 0x01, value: params.token }];
      if (params.deviceId) {
        // tag 0x03 = claim device_id (the backend id the attempt was created under).
        tokenEntries.push({ tag: 0x03, value: params.deviceId });
      }
      securityResponse = waitForBluFiSecurityResponse(boundMonitor, BLUFI_SECURITY_RESPONSE_TIMEOUT_MS);
      // Same fragment-size invariant as the Wi-Fi scan session: without this the
      // robot's 128-byte DH public key is cut to the default MTU and the security
      // handshake dies on its own timeout.
      await requestBleMtu(connected, discovered).catch((error) => {
        logBleProvision('mtu_skipped', { deviceId: params.device.id, message: errorMessage(error) });
      });
      const security = buildBluFiSecurityNegotiationFrames({}, 0);
      const setSecurityFrame = security.frames[security.frames.length - 1];
      const negotiateFrames = security.frames.slice(0, -1);
      await writeBluFiFrames(writer.bind(target), negotiateFrames, {
        timeoutCode: 'BLE_CLAIM_TOKEN_SEND_FAILED',
        timeoutMessage: 'Robot did not accept the claim token.',
      });
      const peerPublicKey = await securityResponse.result;
      const session = deriveBluFiSession({ privateKey: security.privateKey, peerPublicKey: new Uint8Array(peerPublicKey) });
      await writeBluFiFrames(writer.bind(target), setSecurityFrame ? [setSecurityFrame] : [], {
        timeoutCode: 'BLE_CLAIM_TOKEN_SEND_FAILED',
        timeoutMessage: 'Robot did not accept the claim token.',
      });
      const tlv = encodeTLV(tokenEntries);
      const { frames } = buildBluFiCustomDataFrames({ tlv, session }, security.endSequence);
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
      securityResponse?.cancel();
      if (connected?.cancelConnection) {
        try {
          await connected.cancelConnection();
        } catch (error) {
          if (__DEV__) {
            console.info('[TBOT BLE] claim token disconnect failed', { code: errorCode(error) });
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
  signal?: AbortSignal;
}): Promise<RobotWifiNetwork[]> {
  const connectDevice = params.connectDevice ?? connectBleDeviceForWifiScan;
  let lastError: unknown;

  throwIfBleScanAborted(params.signal);

  for (let attempt = 1; attempt <= BLE_WIFI_SCAN_ATTEMPTS; attempt += 1) {
    try {
      return await scanRobotWifiNetworksOnce(params.device, connectDevice, attempt, params.signal);
    } catch (error) {
      lastError = error;
      logBleWifiScan('failed', {
        attempt,
        code: errorCode(error),
        message: errorMessage(error),
        blufiErrorCode: blufiErrorCodeOf(error),
      });
      if (!isRetryableWifiScanError(error) || attempt >= BLE_WIFI_SCAN_ATTEMPTS) {
        throw normalizeWifiScanError(error);
      }
      await delay(BLE_WIFI_SCAN_RETRY_DELAY_MS);
    }
  }

  throw normalizeWifiScanError(lastError);
}

async function scanRobotWifiNetworksOnce(
  device: BleDeviceCandidate,
  connectDevice: ConnectDevice,
  attempt: number,
  signal?: AbortSignal,
): Promise<RobotWifiNetwork[]> {
  let connected: LocalProvisioningDevice | undefined;
  const ownedSessionEpoch = beginBleGattSession(device.id);
  try {
    throwIfBleScanAborted(signal);
    logBleWifiScan('connect_start', { attempt, deviceId: device.id, name: device.name ?? device.localName ?? null });
    connected = await withBleOperationTimeout(
      withBleAbort(connectDevice(device.id), signal, (lateConnection) => {
        if (ownedSessionEpoch === currentBleGattSessionEpoch(device.id)) {
          void lateConnection.cancelConnection?.().catch(() => undefined);
        }
      }),
      'BLE_WIFI_SCAN_FAILED',
      'Robot BLE Wi-Fi scan notification failed.',
      BLE_CONNECT_OPERATION_TIMEOUT_MS,
    );
    logBleWifiScan('connected', { attempt, deviceId: device.id });
    const discovered = await withBleOperationTimeout(
      withBleAbort(connected.discoverAllServicesAndCharacteristics(), signal),
      'BLE_WIFI_SCAN_FAILED',
      'Robot BLE Wi-Fi scan notification failed.',
    );
    logBleWifiScan('services_discovered', { attempt, deviceId: device.id });
    const { writer, target } = resolveBluFiWriter(discovered, connected);
    const { monitor, target: monitorTarget } = resolveBluFiMonitor(discovered, connected);
    if (!writer || !monitor) {
      logBleWifiScan('characteristic_missing', { attempt, hasWriter: !!writer, hasMonitor: !!monitor });
      throw codedError('BLE_WIFI_SCAN_UNSUPPORTED', 'Robot BLE Wi-Fi scan notification characteristic is unavailable.');
    }

    const scanResult = waitForBluFiWifiList(monitor.bind(monitorTarget), signal);
    // ESP-IDF keeps `blufi_env.frag_size` from the last MTU exchange and never
    // resets it on BLE disconnect. A session that skips MTU negotiation inherits
    // the previous session's larger fragment size while running at the 23-byte
    // default MTU, so every robot->phone frame is truncated by GATT and the list
    // never arrives. Every BluFi session must negotiate the same MTU.
    await requestBleMtu(connected, discovered).catch((error) => {
      logBleWifiScan('mtu_skipped', { attempt, message: errorMessage(error) });
    });
    logBleWifiScan('write_scan_request', { attempt });
    const writeResult = withBleAbort(
      writeBluFiFrames(writer.bind(target), buildBluFiWifiScanFrames(), {
        timeoutCode: 'BLE_WIFI_SCAN_FAILED',
        timeoutMessage: 'Robot BLE Wi-Fi scan notification failed.',
      }),
      signal,
    );
    const [, networks] = await Promise.all([writeResult, scanResult]);
    logBleWifiScan('scan_result', { attempt, count: networks.length });
    return networks;
  } finally {
    if (ownedSessionEpoch === currentBleGattSessionEpoch(device.id)) {
      await connected?.cancelConnection?.().catch(() => undefined);
    } else {
      logBleWifiScan('skip_cancel_stale_session', {
        attempt,
        ownedSessionEpoch,
        currentEpoch: currentBleGattSessionEpoch(device.id),
      });
    }
  }
}

function logBleWifiScan(stage: string, detail: Record<string, unknown>): void {
  if (__DEV__) {
    console.info('[TBOT BLE WiFiScan]', { stage, ...safeBleLogDetail(detail) });
  }
}

/**
 * The robot answered our GET_WIFI_LIST with a BluFi error-info frame. `blufiErrorCode`
 * is the raw `esp_blufi_error_state_t` value so the failure stays diagnosable.
 */
function blufiScanRobotError(blufiErrorCode: number): Error & { code: string; blufiErrorCode: number } {
  return Object.assign(
    codedError('BLE_WIFI_SCAN_ROBOT_ERROR', 'Robot rejected the BLE Wi-Fi scan request.'),
    { blufiErrorCode },
  );
}

function blufiErrorCodeOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const candidate = (error as { blufiErrorCode?: unknown }).blufiErrorCode;
  return typeof candidate === 'number' ? candidate : undefined;
}

function isRetryableWifiScanError(error: unknown): boolean {
  if (!hasCode(error)) return true;
  // A robot-reported error is worth one more session: WIFI_SCAN_FAIL in particular
  // is transient while the robot's Wi-Fi driver is still coming up. It is retried
  // here rather than by the screen, which used to re-run the whole scan three times
  // because an empty array carried no failure signal at all.
  return error.code === 'BLE_WIFI_SCAN_FAILED' || error.code === 'BLE_WIFI_SCAN_ROBOT_ERROR';
}

function normalizeWifiScanError(error: unknown): Error & { code: string } {
  if (error instanceof Error && hasCode(error) && error.code === 'BLE_WIFI_SCAN_ROBOT_ERROR') {
    return Object.assign(error, { code: error.code });
  }
  if (hasCode(error) && (
    error.code === 'BLE_WIFI_SCAN_FAILED' ||
    error.code === 'BLE_WIFI_SCAN_UNSUPPORTED' ||
    error.code === 'BLE_WIFI_SCAN_CANCELLED'
  )) {
    return error instanceof Error
      ? Object.assign(error, { code: error.code })
      : codedError(error.code, 'Robot BLE Wi-Fi scan notification failed.');
  }
  return codedError('BLE_WIFI_SCAN_FAILED', 'Robot BLE Wi-Fi scan notification failed.');
}

function throwIfBleScanAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw codedError('BLE_WIFI_SCAN_CANCELLED', 'Robot BLE Wi-Fi scan was cancelled.');
  }
}

function withBleAbort<T>(
  operation: Promise<T>,
  signal?: AbortSignal,
  onLateResolve?: (value: T) => void,
): Promise<T> {
  if (!signal) return operation;

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const onAbort = (): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      reject(codedError('BLE_WIFI_SCAN_CANCELLED', 'Robot BLE Wi-Fi scan was cancelled.'));
    };

    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
    }

    operation.then(
      (value) => {
        if (settled) {
          onLateResolve?.(value);
          return;
        }
        settled = true;
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

function errorCode(error: unknown): string {
  return hasCode(error) ? error.code : 'unknown';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown';
}

async function connectBleDeviceForWifiScan(deviceId: string): Promise<LocalProvisioningDevice> {
  return connectBleDevice(deviceId, { stopActiveScanBeforePrescan: false });
}

async function connectBleDevice(
  deviceId: string,
  options: { stopActiveScanBeforePrescan?: boolean } = {},
): Promise<LocalProvisioningDevice> {
  const manager = getBleManager();
  let lastError: unknown;
  for (let attempt = 1; attempt <= BLE_CONNECT_ATTEMPTS; attempt += 1) {
    try {
      // Drop any leftover GATT link from an earlier Wi-Fi-list scan (common when
      // the robot is already on STA and the list scan hangs / is abandoned). A
      // second connectToDevice while that link is half-open fails immediately
      // with "Operation was cancelled" → BLE_PROVISIONING_DISCONNECTED.
      await forceReleaseBleDevice(manager, deviceId, options.stopActiveScanBeforePrescan !== false);
      // Android 12+/Xiaomi: connecting by address without a recent scan often
      // never reaches onClientConnectionState(connected=true). Refresh first.
      await refreshBleDeviceBeforeConnect(manager, deviceId, BLE_CONNECT_PRESCAN_TIMEOUT_MS);
      logBleProvision('connect_attempt', {
        deviceId,
        attempt,
        prescanMs: BLE_CONNECT_PRESCAN_TIMEOUT_MS,
        sessionEpoch: currentBleGattSessionEpoch(deviceId),
      });
      const device = await manager.connectToDevice(deviceId, { timeout: BLE_CONNECT_TIMEOUT_MS });
      return device as LocalProvisioningDevice;
    } catch (error) {
      lastError = error;
      logBleProvision('connect_attempt_failed', {
        deviceId,
        attempt,
        message: error instanceof Error ? error.message : String(error),
        code: hasCode(error) ? error.code : undefined,
      });
      if (attempt >= BLE_CONNECT_ATTEMPTS) break;
      await forceReleaseBleDevice(manager, deviceId, options.stopActiveScanBeforePrescan !== false);
      await delay(BLE_CONNECT_RETRY_DELAY_MS);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : codedError('BLE_PROVISIONING_DISCONNECTED', BLE_PROVISIONING_STATIC_MESSAGE);
}

/** Best-effort cancel of any open GATT session / active scan for this device. */
async function forceReleaseBleDevice(
  manager: ReturnType<typeof getBleManager>,
  deviceId: string,
  stopActiveScan: boolean = true,
): Promise<void> {
  if (stopActiveScan) {
    try {
      manager.stopDeviceScan();
    } catch {
      // ignore
    }
  }
  try {
    const connected = await manager.isDeviceConnected(deviceId).catch(() => false);
    if (connected) {
      await manager.cancelDeviceConnection(deviceId).catch(() => undefined);
      logBleProvision('stale_gatt_released', { deviceId });
    }
  } catch {
    // ignore — connect path will retry
  }
  // Brief settle so Xiaomi ACL fully tears down before the next connect.
  await delay(BLE_CONNECT_RELEASE_SETTLE_MS);
}

/**
 * Best-effort LowLatency scan until `deviceId` is seen (or timeout). Stops the
 * scan before returning so connect is not blocked by an active scanner.
 */
async function refreshBleDeviceBeforeConnect(
  manager: ReturnType<typeof getBleManager>,
  deviceId: string,
  timeoutMs: number,
): Promise<void> {
  const target = deviceId.trim().toUpperCase();
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        manager.stopDeviceScan();
      } catch {
        // ignore stop errors
      }
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    try {
      manager.startDeviceScan(
        null,
        { allowDuplicates: true, scanMode: ScanMode.LowLatency },
        (error, device) => {
          if (error) {
            clearTimeout(timer);
            finish();
            return;
          }
          if (device?.id && device.id.trim().toUpperCase() === target) {
            clearTimeout(timer);
            finish();
          }
        },
      );
    } catch {
      clearTimeout(timer);
      finish();
    }
  });
}

async function requestBleMtu(
  connected: LocalProvisioningDevice,
  discovered: LocalProvisioningDevice,
): Promise<void> {
  const device = supportsMtuRequest(discovered)
    ? discovered
    : supportsMtuRequest(connected)
      ? connected
      : undefined;
  if (!device) return;
  await withBleOperationTimeout(
    device.requestMTU(512),
    'BLE_PROVISIONING_MTU_ERROR',
    BLE_PROVISIONING_STATIC_MESSAGE,
  );
  logBleProvision('mtu_requested', { mtu: 512 });
}

function supportsMtuRequest(device: LocalProvisioningDevice): device is MtuRequestingDevice {
  return 'requestMTU' in device && typeof device.requestMTU === 'function';
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
    timeoutCode: 'BLE_PROVISIONING_WRITE_TIMEOUT',
    timeoutMessage: BLE_PROVISIONING_STATIC_MESSAGE,
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

function withBleOperationTimeout<T>(
  operation: Promise<T>,
  code: string,
  message: string,
  timeoutMs: number = BLE_GATT_OPERATION_TIMEOUT_MS,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(codedError(code, message));
    }, timeoutMs);

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

type BluFiSecurityAccumulator = {
  expectedLength?: number;
  chunks: number[];
};

function waitForBluFiWifiList(
  monitor: BluFiMonitor,
  signal?: AbortSignal,
): Promise<RobotWifiNetwork[]> {
  const accumulator: BluFiListAccumulator = { chunks: [] };

  return new Promise((resolve, reject) => {
    let settled = false;
    const monitorState: { subscription?: BluFiMonitorSubscription; removeWhenReady: boolean } = { removeWhenReady: false };
    const timer = setTimeout(() => finish(() => reject(codedError('BLE_WIFI_SCAN_FAILED', 'Robot BLE Wi-Fi scan notification failed.'))), BLUFI_WIFI_SCAN_RESPONSE_TIMEOUT_MS);

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
      signal?.removeEventListener('abort', onAbort);
      removeSubscription();
      complete();
    };

    const onAbort = (): void => {
      finish(() => reject(codedError('BLE_WIFI_SCAN_CANCELLED', 'Robot BLE Wi-Fi scan was cancelled.')));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();

    monitorState.subscription = monitor(
      BLE_CONFIG.BLUFI_SERVICE_UUID,
      BLE_CONFIG.BLUFI_NOTIFY_CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (settled) return;
        if (error) {
          finish(() => reject(codedError('BLE_WIFI_SCAN_FAILED', 'Robot BLE Wi-Fi scan notification failed.')));
          return;
        }

        let parsed: RobotWifiNetwork[] | undefined;
        try {
          parsed = parseBluFiWifiListFrame(characteristic?.value, accumulator);
        } catch (parseError) {
          finish(() => reject(parseError));
          return;
        }
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

type SecurityResponseWait = {
  result: Promise<number[]>;
  cancel: () => void;
};

type BluFiNotifyListener = (error: unknown | null, characteristic: { value?: string | null } | null) => void;

type BluFiNotifyHub = {
  addListener: (listener: BluFiNotifyListener) => () => void;
  close: () => void;
};

/** One GATT notify subscription shared by security + conn-report waiters. */
function createBluFiNotifyHub(monitor: BluFiMonitor): BluFiNotifyHub {
  const listeners = new Set<BluFiNotifyListener>();
  // Ring buffer of recent notify events so late waiters (conn-report attaches
  // after security) and synchronous test mocks still observe frames.
  const recentEvents: Array<{ error: unknown | null; characteristic: { value?: string | null } | null }> = [];
  let closed = false;
  const subscription = monitor(
    BLE_CONFIG.BLUFI_SERVICE_UUID,
    BLE_CONFIG.BLUFI_NOTIFY_CHARACTERISTIC_UUID,
    (error, characteristic) => {
      if (closed) return;
      recentEvents.push({ error, characteristic });
      if (recentEvents.length > 32) recentEvents.shift();
      for (const listener of [...listeners]) {
        listener(error, characteristic);
      }
    },
  );

  return {
    addListener(listener) {
      listeners.add(listener);
      // Replay recent history so a waiter that attaches after a sync mock (or
      // after security completes) still sees earlier frames it cares about.
      for (const event of recentEvents) {
        listener(event.error, event.characteristic);
      }
      return () => {
        listeners.delete(listener);
      };
    },
    close() {
      if (closed) return;
      closed = true;
      listeners.clear();
      recentEvents.length = 0;
      subscription.remove();
    },
  };
}

function waitForBluFiSecurityResponseFromHub(hub: BluFiNotifyHub, timeoutMs: number): SecurityResponseWait {
  let settled = false;
  const accumulator: BluFiSecurityAccumulator = { chunks: [] };
  let finish: (value: number[] | Error) => void = () => undefined;
  let removeListener: (() => void) | undefined;

  const result = new Promise<number[]>((resolve, reject) => {
    const timer = setTimeout(() => finish(codedError('BLE_PROVISIONING_WRITE_TIMEOUT', BLE_PROVISIONING_STATIC_MESSAGE)), timeoutMs);

    finish = (value: number[] | Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      removeListener?.();
      if (value instanceof Error) reject(value);
      else resolve(value);
    };

    removeListener = hub.addListener((error, characteristic) => {
      if (settled) return;
      if (error) {
        finish(normalizeProvisioningError(error));
        return;
      }
      const parsed = parseBluFiSecurityResponseFrame(characteristic?.value, accumulator);
      if (parsed) finish(parsed);
    });
  });

  return { result, cancel: () => finish(codedError('BLE_PROVISIONING_WRITE_TIMEOUT', BLE_PROVISIONING_STATIC_MESSAGE)) };
}

function waitForBluFiSecurityResponse(monitor: BluFiMonitor, timeoutMs: number): SecurityResponseWait {
  // Legacy single-wait path (tests / wifi-list style). Prefer hub for provision.
  const hub = createBluFiNotifyHub(monitor);
  const wait = waitForBluFiSecurityResponseFromHub(hub, timeoutMs);
  wait.result.finally(() => hub.close()).catch(() => undefined);
  return wait;
}

function parseBluFiSecurityResponseFrame(base64Value: string | null | undefined, accumulator: BluFiSecurityAccumulator): number[] | undefined {
  if (!base64Value) return undefined;
  const frame = decodeBase64(base64Value);
  if (!frame || frame.length < 4) return undefined;
  const [type, frameControl, , dataLength] = frame;
  if (type !== BLUFI_NEGOTIATE_TYPE || frame.length < 4 + dataLength) return undefined;

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
    return [...accumulator.chunks];
  }

  return payload;
}

function waitForBluFiConnReportFromHub(
  hub: BluFiNotifyHub,
  timeoutMs: number,
  session?: { readonly key: Uint8Array },
): ConnReportWait {
  let settled = false;
  let finish: (result: { connState: number } | null) => void = () => undefined;
  let removeListener: (() => void) | undefined;
  const accumulator: BluFiConnReportAccumulator = { chunks: [] };
  // Firmware sends STA_CONN_SUCCESS (often fragmented + encrypted, with SSID in
  // extra_info) then immediately disconnects BLE. Xiaomi frequently surfaces the
  // ACL disconnect as a monitor error — aborting there caused false
  // WIFI_CONNECT_TIMEOUT while the robot was already online. Keep waiting for
  // SUCCESS/FAIL (via fragment reassembly) until the real timeout.
  const result = new Promise<{ connState: number } | null>((resolve) => {
    const timer = setTimeout(() => finish(null), timeoutMs);

    finish = (value: { connState: number } | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      removeListener?.();
      resolve(value);
    };

    removeListener = hub.addListener((error, characteristic) => {
      if (settled) return;
      if (error) {
        logBleProvision('conn_report_monitor_error_ignored', {
          message: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      const frame = decodeBase64(characteristic?.value ?? '');
      if (!frame) return;
      const parsed = ingestBluFiConnReportFrame(frame, accumulator, session);
      // Ignore non-reports, incomplete fragments, and STA_CONNECTING.
      if (parsed && parsed.connState !== BLUFI_STA_CONNECTING) {
        finish(parsed);
      }
    });
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

  if (type === BLUFI_ERROR_INFO_TYPE && frame.length >= 4 + dataLength && dataLength >= 1) {
    // Every error-info code — including WIFI_SCAN_FAIL (0x0b) — means the robot could not
    // answer with a list. Reporting that as an empty array made it indistinguishable
    // from "no networks are in range", so the user was told to type an SSID under
    // the wrong explanation. End the wait with the raw code instead.
    resetBluFiListAccumulator(accumulator);
    throw blufiScanRobotError(frame[4]);
  }

  if (type === BLUFI_WIFI_LIST_TYPE && frame.length < 4 + dataLength) {
    // GATT cut the notify short: the robot's BluFi fragment size is larger than
    // the ATT MTU actually negotiated for this session. Logged because the frame
    // is otherwise indistinguishable from "robot never answered".
    logBleWifiScan('frame_truncated', { frameLength: frame.length, declaredDataLength: dataLength });
    // A half-frame poisons any run in progress; start clean so a later retry in
    // this same session can still assemble a list.
    resetBluFiListAccumulator(accumulator);
    return undefined;
  }

  if (type !== BLUFI_WIFI_LIST_TYPE) return undefined;

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
    const expectedLength = accumulator.expectedLength;
    const chunks = accumulator.chunks;
    if (chunks.length !== expectedLength) {
      // A fragment was dropped or over-delivered. Without this reset the stale
      // chunks stay in the accumulator and every later frame in the session is
      // measured against a length it can never reach.
      logBleWifiScan('fragment_run_discarded', { frameLength: chunks.length, declaredDataLength: expectedLength });
      resetBluFiListAccumulator(accumulator);
      return undefined;
    }
    resetBluFiListAccumulator(accumulator);
    return parseBluFiWifiListPayload(chunks);
  }

  return parseBluFiWifiListPayload(payload);
}

function resetBluFiListAccumulator(accumulator: BluFiListAccumulator): void {
  accumulator.expectedLength = undefined;
  accumulator.chunks = [];
}

function parseBluFiWifiListPayload(payload: number[]): RobotWifiNetwork[] {
  const networks: RobotWifiNetwork[] = [];
  let offset = 0;
  while (offset < payload.length) {
    const entryLength = payload[offset];
    if (entryLength < 1) {
      offset += 1;
      continue;
    }
    if (offset + 1 + entryLength > payload.length) break;
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
// codes such as DeviceDisconnected) is normalized to a static-message sub-code.
const PROVISIONING_SERVICE_ERROR_CODES = new Set<string>([
  'BLE_PROVISIONING_FAILED',
  'BLE_PROVISIONING_DISCONNECTED',
  'BLE_PROVISIONING_GATT_ERROR',
  'BLE_PROVISIONING_WRITE_TIMEOUT',
  'BLE_PROVISIONING_MTU_ERROR',
  'BLE_PROVISIONING_UNSUPPORTED',
  'WIFI_CONNECT_FAILED',
  'WIFI_CONNECT_TIMEOUT',
  'WIFI_SSID_INVALID',
  'WIFI_PASSWORD_INVALID',
  'INVALID_BLE_CODE',
  'CLAIM_BOOTSTRAP_TOKEN_INVALID',
]);

function isProvisioningServiceError(error: unknown): error is { code: string } {
  return hasCode(error) && PROVISIONING_SERVICE_ERROR_CODES.has(error.code);
}

function normalizeProvisioningError(error: unknown): Error & { code: string } {
  if (isProvisioningServiceError(error)) {
    const normalized = codedError(
      error.code,
      error instanceof Error ? error.message : BLE_PROVISIONING_STATIC_MESSAGE,
    );
    Object.defineProperty(normalized, 'cause', { value: error, configurable: true });
    return normalized;
  }
  const normalized = codedError(classifyNativeProvisioningError(error), BLE_PROVISIONING_STATIC_MESSAGE);
  Object.defineProperty(normalized, 'cause', { value: error, configurable: true });
  return normalized;
}

function classifyNativeProvisioningError(error: unknown): string {
  const code = hasCode(error) ? error.code : '';
  const message = errorMessage(error);
  const joined = `${code} ${message}`.toLowerCase();

  if (/disconnect|disconnected|connection lost|not connected|cancelled|canceled/.test(joined)) {
    return 'BLE_PROVISIONING_DISCONNECTED';
  }
  if (/\bmtu\b|maximum transmission unit/.test(joined)) {
    return 'BLE_PROVISIONING_MTU_ERROR';
  }
  if (/timeout|timed out/.test(joined)) {
    return 'BLE_PROVISIONING_WRITE_TIMEOUT';
  }
  return 'BLE_PROVISIONING_GATT_ERROR';
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
