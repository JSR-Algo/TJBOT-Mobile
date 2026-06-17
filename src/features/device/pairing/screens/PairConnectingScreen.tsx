import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { getClaimStatus, requestClaim } from '@/services/api/claim.api';
import { confirmLocalBlePaired, getDeviceStatus, getProvisioningAttemptStatus, mintBootstrapToken, pairDevice } from '@/services/api/device.api';
import { provisionWifiViaLocalBle } from '@/services/ble/service';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import { ROUTES } from '@/navigation/routes';
import { clearPairingBootstrapToken, consumePairingWifiPassword, getPairingBootstrapToken } from '../pairingSecretHandoff';
import { savePendingPairingContext } from '../pendingPairingContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PairConnectingScreen'>;
type RuntimeProvisioningStatus = 'started' | 'ble_paired' | 'device_authenticated' | 'completed' | 'failed' | 'expired';
type RuntimeProvisioningStatusResult = {
  provisioningAttemptId: string;
  deviceId: string;
  status: RuntimeProvisioningStatus;
  failureCode?: string;
};
type ProvisioningRunResult = {
  deviceId: string;
  provisioningAttemptId: string;
  completionMode: 'device_authenticated' | 'claim_confirmed' | 'device_online';
  claimExpiresAt?: string | null;
};

const PAIRING_POLL_INTERVAL_MS = 3000;
const DEVICE_ONLINE_MAX_POLL_ATTEMPTS = 20;
const CONFIRM_TIMEOUT_MS = 5 * 60 * 1000;
const CONFIRM_MAX_POLL_ATTEMPTS = Math.ceil(CONFIRM_TIMEOUT_MS / PAIRING_POLL_INTERVAL_MS) + 1;

const PROVISIONING_STATUSES = [
  'started',
  'ble_paired',
  'device_authenticated',
  'completed',
  'failed',
  'expired',
] as const satisfies readonly RuntimeProvisioningStatus[];

export default function PairConnectingScreen({ navigation, route }: Props) {
  const { language } = useAppLanguage();
  const [i, setI] = React.useState(0);
  const [status, setStatus] = React.useState<'pairing' | 'authenticated' | 'failed'>('pairing');
  const submittedParams = React.useRef<Props['route']['params'] | null>(null);
  const params = route.params;
  const ssid = getParamString(params, 'ssid');
  const steps = React.useMemo(() => [
    translateTemplate('Submitting setup details', {}, { locale: language }),
    translateTemplate('Preparing {{ssid}}', { ssid: ssid ?? 'Wi-Fi' }, { locale: language }),
    translateTemplate('Starting backend connection', {}, { locale: language }),
    translateTemplate('Waiting for robot authentication', {}, { locale: language }),
  ], [language, ssid]);

  React.useEffect(() => {
    if (submittedParams.current === params) return;
    submittedParams.current = params;
    setI(0);
    setStatus('pairing');
    const code = getParamString(params, 'code');
    const deviceId = getParamString(params, 'deviceId');
    const serialNumber = getParamString(params, 'serialNumber');
    const provisioningAttemptId = getParamString(params, 'provisioningAttemptId');
    const bleDeviceId = getParamString(params, 'bleDeviceId');
    const transport = params?.provisioningTransport;
    const bootstrapToken = provisioningAttemptId ? getPairingBootstrapToken(provisioningAttemptId) : undefined;
    const canRunBleClaimProvisioning = transport === 'ble' && !!bleDeviceId;
    const canRunBleReconnectProvisioning = transport === 'ble_reconnect' && !!bleDeviceId;
    if (!ssid || !deviceId || !serialNumber || !provisioningAttemptId || (!code && !canRunBleClaimProvisioning && !canRunBleReconnectProvisioning)) {
      setStatus('failed');
      navigation.navigate(ROUTES.PairFailedScreen, {
        ...failureContext(params),
        errorCode: 'PAIRING_CONTEXT_MISSING',
      });
      return;
    }
    let password = consumePairingWifiPassword(provisioningAttemptId);
    if (!password) {
      setStatus('failed');
      navigation.navigate(ROUTES.PairFailedScreen, {
        ...failureContext(params),
        errorCode: 'PAIRING_CONTEXT_MISSING',
      });
      return;
    }
    let cancelled = false;
    // Polling loops below back off with sleep() between attempts. On unmount we
    // must both stop the loop AND clear any pending sleep timer, or that timer
    // leaks (keeping the Jest worker / RN event loop alive after the screen is
    // gone — the "worker failed to exit gracefully" symptom).
    const poll: PollController = { cancelled: false, timer: undefined };
    const run = (transport === 'ble' || transport === 'ble_reconnect') && bleDeviceId
      ? runLocalBleProvisioning({
        deviceId,
        serialNumber,
        provisioningAttemptId,
        code,
        ssid,
        password,
        bleDeviceId,
        bootstrapToken,
        credentialOnly: transport === 'ble_reconnect',
      })
      : runBackendProvisioning({ deviceId, serialNumber, provisioningAttemptId, code: code as string, ssid, password });

    // The zero-code BLE run may MINT A NEW claim id (it re-runs requestClaim when
    // no claim/token is in hand). The success path surfaces it via
    // result.provisioningAttemptId, but a post-run claim-confirmation throw must
    // also carry it forward so PairFailedScreen's late-claim recovery queries the
    // real claim — not the stale route param captured in the closure. This only
    // applies to the claim-confirmed completion mode; the backend/auth paths keep
    // the original route attempt id on failure (their recovery contract).
    let recoveryAttemptId = provisioningAttemptId;
    void run.then(async (result) => {
      if (result.completionMode === 'claim_confirmed') {
        recoveryAttemptId = result.provisioningAttemptId;
      }
      if (cancelled) return;
      setI(PAIRING_STEP_COUNT - 1);
      if (result.completionMode === 'device_online') {
        await waitForDeviceOnline(result.deviceId, poll);
        if (cancelled) return;
        clearPairingBootstrapToken(result.provisioningAttemptId);
        setI(PAIRING_STEP_COUNT);
        setStatus('authenticated');
        // Reset (not navigate) so the finished reconnect/pairing stack is dropped
        // and DeviceHome becomes the root — otherwise Back walks the parent back
        // THROUGH the finished pairing screens (this flow is entered from
        // DeviceOverview, not DeviceHome), mirroring PairRename/PairFirstLesson.
        // device_online has no PairSuccess to preserve, so a single-route reset.
        navigation.reset({ index: 0, routes: [{ name: ROUTES.DeviceHomeScreen }] });
        return;
      }
      const authenticated = result.completionMode === 'claim_confirmed'
        ? await waitForClaimConfirmed(result.provisioningAttemptId, poll, result.claimExpiresAt)
        : await waitForDeviceAuthenticated(result.provisioningAttemptId, poll);
      if (cancelled) return;
      clearPairingBootstrapToken(result.provisioningAttemptId);
      setI(PAIRING_STEP_COUNT);
      setStatus('authenticated');
      await savePendingPairingContext({
        deviceId: authenticated.deviceId,
        serialNumber,
        provisioningAttemptId: authenticated.provisioningAttemptId,
      });
      navigation.navigate(ROUTES.PairRenameScreen, {
        deviceId: authenticated.deviceId,
        serialNumber,
        provisioningAttemptId: authenticated.provisioningAttemptId,
      });
    }).catch((error: unknown) => {
      if (cancelled) return;
      setStatus('failed');
      navigation.navigate(ROUTES.PairFailedScreen, {
        deviceId,
        serialNumber,
        provisioningAttemptId: recoveryAttemptId,
        code,
        ssid,
        bleDeviceId,
        provisioningTransport: params?.provisioningTransport,
        errorCode: errorCodeFrom(error, 'PAIRING_CONNECT_FAILED'),
      });
    }).finally(() => {
      password = '';
    });
    return () => {
      cancelled = true;
      poll.cancelled = true;
      if (poll.timer !== undefined) {
        clearTimeout(poll.timer);
        poll.timer = undefined;
      }
    };
  }, [navigation, params, ssid]);

  return (
    <DeviceShell title="Connecting Robot…">
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="reconnect" size={180} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>
          {status === 'authenticated' ? 'Robot authenticated' : status === 'failed' ? 'Pairing failed' : 'Hang tight — about 30 seconds'}
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={24} gap={8}>
        {steps.map((s, idx) => {
          const done = idx < i;
          const active = idx === i;
          return (
            <Box key={s} style={styles.stepRow} flexDirection="row" gap={12} alignItems="center">
              <Box
                style={[styles.stepDot, done && styles.stepDone, active && styles.stepActive]}
                alignItems="center"
                justifyContent="center"
              >
                {done ? (
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                    <Path d="M5 12l5 5 9-10" />
                  </Svg>
                ) : active ? (
                  <Box style={styles.blinkDot} />
                ) : (
                  <Box style={styles.pendingDot} />
                )}
              </Box>
              <Text style={[styles.stepText, idx <= i && styles.stepTextActive]} i18n={false}>{s}</Text>
            </Box>
          );
        })}
      </Box>
    </DeviceShell>
  );
}

const PAIRING_STEP_COUNT = 4;

async function runBackendProvisioning(params: {
  deviceId: string;
  serialNumber: string;
  provisioningAttemptId: string;
  code: string;
  ssid: string;
  password: string;
}): Promise<ProvisioningRunResult> {
  const result = await pairDevice({
    deviceId: params.deviceId,
    provisioningAttemptId: params.provisioningAttemptId,
    serialNumber: params.serialNumber,
    code: params.code,
    wifiSsid: params.ssid,
    wifiPassword: params.password,
  });
  return { deviceId: result.deviceId, provisioningAttemptId: result.provisioningAttemptId, completionMode: 'device_authenticated' };
}

async function runLocalBleProvisioning(params: {
  deviceId: string;
  serialNumber: string;
  provisioningAttemptId: string;
  code?: string;
  ssid: string;
  password: string;
  bleDeviceId: string;
  bootstrapToken?: string;
  credentialOnly?: boolean;
}): Promise<ProvisioningRunResult> {
  if (params.credentialOnly) {
    await provisionWifiViaLocalBle({
      device: {
        id: params.bleDeviceId,
        name: params.serialNumber,
        localName: params.serialNumber,
        serviceUUIDs: [],
      },
      ssid: params.ssid,
      password: params.password,
      allowCredentialOnly: true,
    });

    return { deviceId: params.deviceId, provisioningAttemptId: params.provisioningAttemptId, completionMode: 'device_online' };
  }

  let token = params.bootstrapToken;
  let claimId = params.provisioningAttemptId;
  let claimExpiresAt: string | null = null;
  let completionMode: ProvisioningRunResult['completionMode'] = 'claim_confirmed';

  if (params.code) {
    await confirmLocalBlePaired({
      deviceId: params.deviceId,
      provisioningAttemptId: params.provisioningAttemptId,
      serialNumber: params.serialNumber,
      code: params.code,
    });
    if (!token) {
      const bootstrap = await mintBootstrapToken({ provisioningAttemptId: params.provisioningAttemptId });
      token = bootstrap.token;
    }
    completionMode = 'device_authenticated';
  }

  if (!params.code && !token && !isLikelyClaimId(claimId)) {
    const claimed = await requestClaim({ deviceId: params.deviceId });
    if (!claimed.claimId) {
      throw Object.assign(new Error('Claim request did not return a claim id'), { code: 'CLAIM_REQUEST_MALFORMED' });
    }
    claimId = claimed.claimId;
    claimExpiresAt = claimed.expiresAt || null;
    if (claimed.status === 'CLAIM_CONFIRMED' || claimed.status === 'CLAIMED') {
      return { deviceId: claimed.deviceId || params.deviceId, provisioningAttemptId: claimId, completionMode, claimExpiresAt };
    }
  }

  if (!token) {
    const bootstrap = await mintBootstrapToken({ provisioningAttemptId: claimId });
    token = bootstrap.token;
  }

  await provisionWifiViaLocalBle({
    device: {
      id: params.bleDeviceId,
      name: params.serialNumber,
      localName: params.serialNumber,
      serviceUUIDs: [],
    },
    ssid: params.ssid,
    password: params.password,
    code: params.code,
    token,
    // Push the backend device_id (the id the claim attempt was created under) so
    // the robot claims/confirms under it instead of its random Board UUID.
    deviceId: params.deviceId,
  });

  return { deviceId: params.deviceId, provisioningAttemptId: claimId, completionMode, claimExpiresAt };
}

// Cancellation handle shared with the poll loops: the effect cleanup flips
// `cancelled` and clears the in-flight backoff `timer` so no setTimeout outlives
// the screen.
type PollController = { cancelled: boolean; timer: ReturnType<typeof setTimeout> | undefined };

async function waitForDeviceOnline(deviceId: string, poll: PollController): Promise<void> {
  for (let attempt = 0; attempt < DEVICE_ONLINE_MAX_POLL_ATTEMPTS; attempt += 1) {
    const status = await getDeviceStatus(deviceId);
    if (status.online) return;
    if (poll.cancelled) return;
    if (attempt === DEVICE_ONLINE_MAX_POLL_ATTEMPTS - 1) break;
    await sleep(PAIRING_POLL_INTERVAL_MS, poll);
    if (poll.cancelled) return;
  }
  throw Object.assign(new Error('Device did not come online'), { code: 'RECONNECT_DEVICE_OFFLINE_TIMEOUT' });
}

async function waitForClaimConfirmed(claimId: string, poll: PollController, expiresAt?: string | null): Promise<{
  deviceId: string;
  provisioningAttemptId: string;
}> {
  let deadlineMs = resolveConfirmDeadlineMs(expiresAt);
  for (;;) {
    let status: Awaited<ReturnType<typeof getClaimStatus>>;
    try {
      status = await getClaimStatus(claimId);
    } catch (error: unknown) {
      if (!isRetryableClaimStatusPollError(error) || Date.now() >= deadlineMs) {
        throw error;
      }
      if (poll.cancelled) return { deviceId: '', provisioningAttemptId: claimId };
      await sleep(PAIRING_POLL_INTERVAL_MS, poll);
      if (poll.cancelled) return { deviceId: '', provisioningAttemptId: claimId };
      continue;
    }
    if (status.expiresAt) {
      deadlineMs = readFutureDeadlineMs(status.expiresAt) ?? deadlineMs;
    }
    if (status.status === 'CLAIM_CONFIRMED' || status.status === 'CLAIMED') {
      return { deviceId: status.deviceId, provisioningAttemptId: claimId };
    }
    if (status.status === 'FAILED' || status.status === 'CLAIM_CONFIRM_TIMEOUT') {
      throw Object.assign(new Error('Claim failed'), { code: status.failureCode ?? status.status });
    }
    if (poll.cancelled) return { deviceId: '', provisioningAttemptId: claimId };
    if (Date.now() >= deadlineMs) break;
    await sleep(PAIRING_POLL_INTERVAL_MS, poll);
    if (poll.cancelled) return { deviceId: '', provisioningAttemptId: claimId };
  }
  throw Object.assign(new Error('Claim confirmation timed out'), { code: 'CLAIM_CONFIRM_TIMEOUT' });
}

function isRetryableClaimStatusPollError(error: unknown): boolean {
  const record = asRecord(error);
  const status = readNumber(record, 'status');
  if (status === 401 || status === 408 || status === 429 || (typeof status === 'number' && status >= 500)) {
    return true;
  }
  if (record?.retryable === true) return true;
  const code = readString(record, 'code');
  return code === 'NETWORK_ERROR' || code === 'RATE_LIMIT_EXCEEDED' || code === 'SERVICE_UNAVAILABLE' || code === 'GATEWAY_TIMEOUT' || code === 'INTERNAL_ERROR';
}

async function waitForDeviceAuthenticated(provisioningAttemptId: string, poll: PollController): Promise<{
  deviceId: string;
  provisioningAttemptId: string;
}> {
  for (let attempt = 0; attempt < CONFIRM_MAX_POLL_ATTEMPTS; attempt += 1) {
    const status = parseProvisioningStatus(await getProvisioningAttemptStatus(provisioningAttemptId));
    if (status.status === 'device_authenticated' || status.status === 'completed') {
      return { deviceId: status.deviceId, provisioningAttemptId: status.provisioningAttemptId };
    }
    if (status.status === 'failed' || status.status === 'expired') {
      throw Object.assign(new Error('Provisioning failed'), { code: status.failureCode ?? 'PROVISIONING_FAILED' });
    }
    if (poll.cancelled) return { deviceId: '', provisioningAttemptId };
    if (attempt === CONFIRM_MAX_POLL_ATTEMPTS - 1) break;
    await sleep(PAIRING_POLL_INTERVAL_MS, poll);
    if (poll.cancelled) return { deviceId: '', provisioningAttemptId };
  }
  throw Object.assign(new Error('Provisioning timed out'), { code: 'PROVISIONING_TIMEOUT' });
}

function resolveConfirmDeadlineMs(expiresAt?: string | null): number {
  return readFutureDeadlineMs(expiresAt) ?? Date.now() + CONFIRM_TIMEOUT_MS;
}

function readFutureDeadlineMs(expiresAt?: string | null): number | null {
  if (!expiresAt) return null;
  const deadlineMs = Date.parse(expiresAt);
  if (!Number.isFinite(deadlineMs)) return null;
  return deadlineMs > Date.now() ? deadlineMs : null;
}

function parseProvisioningStatus(value: unknown): RuntimeProvisioningStatusResult {
  const record = asRecord(value);
  const status = readString(record, 'status');
  const deviceId = readString(record, 'deviceId');
  const provisioningAttemptId = readString(record, 'provisioningAttemptId');
  if (!isProvisioningStatus(status) || !deviceId || !provisioningAttemptId) {
    throw Object.assign(new Error('Malformed provisioning status'), { code: 'PROVISIONING_STATUS_MALFORMED' });
  }
  return {
    deviceId,
    provisioningAttemptId,
    status,
    failureCode: readString(record, 'failureCode'),
  };
}

function isProvisioningStatus(value: string | undefined): value is RuntimeProvisioningStatus {
  return PROVISIONING_STATUSES.some((status) => status === value);
}

function isLikelyClaimId(value: string): boolean {
  return /^claim[-_]/i.test(value);
}

function sleep(ms: number, poll: PollController): Promise<void> {
  return new Promise((resolve) => {
    // Register the handle so the effect cleanup can clear a pending backoff on
    // unmount instead of letting the timer outlive the screen.
    poll.timer = setTimeout(() => {
      poll.timer = undefined;
      resolve();
    }, ms);
  });
}

function getParamString(
  params: Props['route']['params'],
  key: 'deviceId' | 'serialNumber' | 'provisioningAttemptId' | 'code' | 'ssid' | 'bleDeviceId',
): string | undefined {
  if (!params || !(key in params)) return undefined;
  const value = params[key];
  return typeof value === 'string' ? value : undefined;
}

function errorCodeFrom(error: unknown, fallback: string): string {
  const record = asRecord(error);
  const code = readString(record, 'code');
  if (code) return code;
  const response = asRecord(record?.response);
  const data = asRecord(response?.data);
  return readString(data, 'code') ?? fallback;
}

function failureContext(params: Props['route']['params']): RootStackParamList['PairFailedScreen'] {
  if (!params) return undefined;
  const { deviceId, serialNumber, provisioningAttemptId, code, ssid } = params;
  const bleDeviceId = 'bleDeviceId' in params ? params.bleDeviceId : undefined;
  const provisioningTransport = 'provisioningTransport' in params ? params.provisioningTransport : undefined;
  return { deviceId, serialNumber, provisioningAttemptId, code, ssid, bleDeviceId, provisioningTransport };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function readString(record: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(record: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === 'number' ? value : undefined;
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, color: DV.ink, textAlign: 'center', marginTop: 24 },
  stepRow: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, padding: 14 },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EEF1F5', flexShrink: 0 },
  stepDone: { backgroundColor: DV.good },
  stepActive: { backgroundColor: DV.accent },
  blinkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: DV.ink3 },
  stepText: { fontSize: 14, color: DV.ink3, flex: 1 },
  stepTextActive: { color: DV.ink },
});
