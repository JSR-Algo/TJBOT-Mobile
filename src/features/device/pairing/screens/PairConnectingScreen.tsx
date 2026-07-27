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
import {
  confirmLocalBlePaired,
  getDeviceStatus,
  getProvisioningAttemptStatus,
  mintBootstrapToken,
  reportProvisioningDeviceAuthenticated,
} from '@/services/api/device.api';
import { provisionWifiViaLocalBle } from '@/services/ble/service';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import { ROUTES } from '@/navigation/routes';
import { clearPairingBootstrapToken, consumePairingWifiPassword, getPairingBootstrapToken } from '../pairingSecretHandoff';
import { savePendingPairingContext } from '../pendingPairingContext';
import {
  CLAIM_CONFIRM_TIMEOUT_MS,
  CLAIM_POLL_INTERVAL_MS,
  isRetryablePairingStatusPollError,
} from '../claimStatus';

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

const DEVICE_STATUS_POLL_INTERVAL_MS = CLAIM_POLL_INTERVAL_MS;
const DEVICE_ONLINE_MAX_POLL_ATTEMPTS = 20;
const PROVISIONING_CONFIRM_MAX_POLL_ATTEMPTS = Math.ceil(CLAIM_CONFIRM_TIMEOUT_MS / DEVICE_STATUS_POLL_INTERVAL_MS) + 1;

const PROVISIONING_STATUSES = [
  'started',
  'ble_paired',
  'device_authenticated',
  'completed',
  'failed',
  'expired',
] as const satisfies readonly RuntimeProvisioningStatus[];

export default function PairConnectingScreen({ navigation, route }: Props) {
  const { language, t } = useAppLanguage();
  const [i, setI] = React.useState(0);
  const [status, setStatus] = React.useState<'pairing' | 'authenticated' | 'failed'>('pairing');
  const submittedParams = React.useRef<Props['route']['params'] | null>(null);
  const params = route.params;
  const ssid = getParamString(params, 'ssid');
  const transport = params?.provisioningTransport;
  // Credential-only reconnect never mints a backend claim, so
  // the last steps talk about Wi-Fi join — not "backend connection" / cloud auth.
  const credentialOnlySteps = transport === 'ble_reconnect';
  const steps = React.useMemo(() => [
    translateTemplate('Submitting setup details', {}, { locale: language }),
    translateTemplate('Preparing {{ssid}}', { ssid: ssid ?? 'Wi-Fi' }, { locale: language }),
    translateTemplate(
      credentialOnlySteps ? 'Sending Wi-Fi to Robot' : 'Starting backend connection',
      {},
      { locale: language },
    ),
    translateTemplate(
      credentialOnlySteps ? 'Waiting for Robot to join Wi-Fi' : 'Waiting for robot authentication',
      {},
      { locale: language },
    ),
  ], [credentialOnlySteps, language, ssid]);

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
    const canRunBleClaimProvisioning = (transport === 'ble' || transport === 'ble_claim') && !!bleDeviceId;
    const canRunBleReconnectProvisioning = transport === 'ble_reconnect' && !!bleDeviceId;
    logDevPairConnectingEvent('start', {
      deviceId,
      serialNumber,
      provisioningAttemptId,
      transport,
      hasBleDeviceId: !!bleDeviceId,
      hasCode: !!code,
      hasBootstrapToken: !!bootstrapToken,
      ssidPresent: !!ssid,
    });
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
      navigation.navigate(ROUTES.PairWifiPasswordScreen, {
        ...failureContext(params),
        errorCode: 'WIFI_PASSWORD_EXPIRED',
      });
      return;
    }
    let cancelled = false;
    // Polling loops below back off with sleep() between attempts. On unmount we
    // must both stop the loop AND clear any pending sleep timer, or that timer
    // leaks (keeping the Jest worker / RN event loop alive after the screen is
    // gone — the "worker failed to exit gracefully" symptom).
    const poll: PollController = { cancelled: false, timer: undefined };
    const supportedBleTransport = transport === 'ble' || transport === 'ble_claim' || transport === 'ble_reconnect';
    if (!supportedBleTransport || !bleDeviceId) {
      setStatus('failed');
      navigation.navigate(ROUTES.PairFailedScreen, {
        ...failureContext(params),
        errorCode: 'BLE_PROVISIONING_CONTEXT_MISSING',
      });
      return;
    }
    const run = runLocalBleProvisioning({
      deviceId,
      serialNumber,
      provisioningAttemptId,
      code,
      ssid,
      password,
      bleDeviceId,
      bootstrapToken,
      credentialOnly: transport === 'ble_reconnect',
      claimBased: transport === 'ble_claim',
    });

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

      // Zero-code claims still require the parent's physical confirmation on
      // the robot, so keep that explicit wait on this screen. The simplified
      // handoff applies to the code-based flow where firmware authentication is
      // automatic after Wi-Fi comes up.
      if (result.completionMode === 'claim_confirmed') {
        const authenticated = await waitForClaimConfirmed(
          result.provisioningAttemptId,
          poll,
          result.claimExpiresAt,
        );
        if (cancelled) return;
        clearPairingBootstrapToken(authenticated.provisioningAttemptId);
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
        return;
      }

      // A successful BLE handoff is enough to leave this blocking screen. The
      // robot intentionally drops BLE while joining Wi-Fi, so waiting here for
      // backend authentication makes a normal restart look like a frozen app.
      // Finalization remains backend-authoritative and retries the short auth
      // race when the parent saves from PairRenameScreen.
      clearPairingBootstrapToken(result.provisioningAttemptId);
      setI(PAIRING_STEP_COUNT);
      await savePendingPairingContext({
        deviceId: result.deviceId,
        serialNumber,
        provisioningAttemptId: result.provisioningAttemptId,
      });
      navigation.navigate(ROUTES.PairRenameScreen, {
        deviceId: result.deviceId,
        serialNumber,
        provisioningAttemptId: result.provisioningAttemptId,
      });
    }).catch(async (error: unknown) => {
      if (cancelled) return;
      recoveryAttemptId = readString(asRecord(error), 'provisioningAttemptId') ?? recoveryAttemptId;
      let resolvedError = error;
      const deliveryUnknown = isDeliveryUnknown(error);
      if (deliveryUnknown && (transport === 'ble' || transport === 'ble_claim')) {
        try {
          const authenticated = code
            ? await waitForDeviceAuthenticated(recoveryAttemptId, poll)
            : await waitForClaimConfirmed(recoveryAttemptId, poll);
          if (cancelled) return;
          clearPairingBootstrapToken(authenticated.provisioningAttemptId);
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
          return;
        } catch (reconciliationError: unknown) {
          resolvedError = reconciliationError;
        }
      }
      const errorCode = errorCodeFrom(resolvedError, 'PAIRING_CONNECT_FAILED');
      logDevPairConnectingEvent('failed', {
        errorCode,
        deviceId,
        serialNumber,
        provisioningAttemptId: recoveryAttemptId,
        transport: params?.provisioningTransport,
        hasBleDeviceId: !!bleDeviceId,
      });
      setStatus('failed');
      navigation.navigate(ROUTES.PairFailedScreen, {
        deviceId,
        serialNumber,
        provisioningAttemptId: recoveryAttemptId,
        code,
        ssid,
        bleDeviceId,
        provisioningTransport: params?.provisioningTransport,
        ...(deliveryUnknown ? { deliveryUnknown: true } : {}),
        errorCode,
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
      poll.resolveSleep?.();
      poll.resolveSleep = undefined;
    };
  }, [navigation, params, ssid]);

  const heading = status === 'authenticated'
    ? t('Robot authenticated')
    : status === 'failed'
      ? t('Pairing failed')
      : t('Hang tight — about 30 seconds');

  return (
    <DeviceShell title={t('Connecting Robot…')}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="reconnect" size={180} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading} i18n={false}>
          {heading}
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
  claimBased?: boolean;
}): Promise<ProvisioningRunResult> {
  logDevPairConnectingEvent('local_ble_start', {
    deviceId: params.deviceId,
    serialNumber: params.serialNumber,
    provisioningAttemptId: params.provisioningAttemptId,
    bleDeviceId: params.bleDeviceId,
    credentialOnly: params.credentialOnly === true,
    hasCode: !!params.code,
    hasBootstrapToken: !!params.bootstrapToken,
  });
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

  let token: string | undefined;
  let claimId = params.provisioningAttemptId;
  let claimExpiresAt: string | null = null;
  let completionMode: ProvisioningRunResult['completionMode'] = params.claimBased
    ? 'claim_confirmed'
    : 'device_authenticated';
  const handoffCode = params.code ?? (params.claimBased ? undefined : createLocalBleCode());

  if (handoffCode) {
    await confirmLocalBlePaired({
      deviceId: params.deviceId,
      provisioningAttemptId: params.provisioningAttemptId,
      serialNumber: params.serialNumber,
      code: handoffCode,
    });
    completionMode = 'device_authenticated';
  }

  if (params.claimBased && !params.code && !token && !isLikelyClaimId(claimId)) {
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

  try {
    // Bootstrap tokens are single-use and expire quickly. A token cached before
    // Wi-Fi selection may already be expired or consumed by a previous delivery-
    // unknown attempt, so mint exactly at the BLE handoff boundary every time.
    const bootstrap = await mintBootstrapToken({ provisioningAttemptId: claimId });
    token = bootstrap.token;
    await provisionWifiViaLocalBle({
      device: {
        id: params.bleDeviceId,
        name: params.serialNumber,
        localName: params.serialNumber,
        serviceUUIDs: [],
      },
      ssid: params.ssid,
      password: params.password,
      code: handoffCode,
      token,
      // Push the backend device_id (the id the claim attempt was created under) so
      // the robot claims/confirms under it instead of its random Board UUID.
      deviceId: params.deviceId,
    });
    if (handoffCode && token) {
      try {
        await reportProvisioningDeviceAuthenticated({
          deviceId: params.deviceId,
          code: handoffCode,
          bootstrapToken: token,
        });
      } catch (error: unknown) {
        // The robot and phone can race to consume the one-shot token. If either
        // side already advanced the attempt, the handoff is complete.
        const current = await getProvisioningAttemptStatus(claimId).catch(() => null);
        if (current?.status !== 'device_authenticated' && current?.status !== 'completed') {
          throw error;
        }
      }
    }
  } catch (error: unknown) {
    throw withProvisioningAttemptContext(error, claimId);
  }

  logDevPairConnectingEvent('local_ble_handoff_complete', {
    deviceId: params.deviceId,
    provisioningAttemptId: claimId,
    completionMode,
  });

  return { deviceId: params.deviceId, provisioningAttemptId: claimId, completionMode, claimExpiresAt };
}

function createLocalBleCode(): string {
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
}

function logDevPairConnectingEvent(stage: string, detail: Record<string, unknown>): void {
  if (__DEV__) {
    console.info('[TBOT PairConnecting]', { stage, ...detail });
  }
}

// Cancellation handle shared with the poll loops: the effect cleanup flips
// `cancelled` and clears the in-flight backoff `timer` so no setTimeout outlives
// the screen.
type PollController = {
  cancelled: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  resolveSleep?: () => void;
};

async function waitForDeviceOnline(
  deviceId: string,
  poll: PollController,
  timeoutCode = 'RECONNECT_DEVICE_OFFLINE_TIMEOUT',
  maxAttempts = DEVICE_ONLINE_MAX_POLL_ATTEMPTS,
): Promise<Awaited<ReturnType<typeof getDeviceStatus>>> {
  let lastStatus: Awaited<ReturnType<typeof getDeviceStatus>> | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const status = await getDeviceStatus(deviceId);
      lastStatus = status;
      if (status.online) return status;
    } catch (error: unknown) {
      // 404 / DEVICE_NOT_FOUND / transient network while the robot is still
      // joining Wi-Fi must not abort the wait — only the timeout is terminal.
      if (!isRetryableDeviceOnlinePollError(error)) throw error;
    }
    if (poll.cancelled) {
      return lastStatus ?? { id: deviceId, name: deviceId, online: false, batteryPercent: 0 };
    }
    if (attempt === maxAttempts - 1) break;
    await sleep(DEVICE_STATUS_POLL_INTERVAL_MS, poll);
    if (poll.cancelled) {
      return lastStatus ?? { id: deviceId, name: deviceId, online: false, batteryPercent: 0 };
    }
  }
  throw Object.assign(new Error('Device did not come online'), {
    code: timeoutCode,
  });
}

function isRetryableDeviceOnlinePollError(error: unknown): boolean {
  const record = asRecord(error);
  const status = readNumber(record, 'status') ?? readNumber(asRecord(record?.response), 'status');
  if (status === 404 || status === 408 || status === 429 || (typeof status === 'number' && status >= 500)) {
    return true;
  }
  if (record?.retryable === true) return true;
  const code = readString(record, 'code');
  return (
    code === 'DEVICE_NOT_FOUND'
    || code === 'NO_DEVICE_AVAILABLE'
    || code === 'NETWORK_ERROR'
    || code === 'RATE_LIMIT_EXCEEDED'
    || code === 'SERVICE_UNAVAILABLE'
    || code === 'GATEWAY_TIMEOUT'
    || code === 'INTERNAL_ERROR'
    || code === 'SERVER_ERROR'
  );
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
      await sleep(CLAIM_POLL_INTERVAL_MS, poll);
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
    await sleep(CLAIM_POLL_INTERVAL_MS, poll);
    if (poll.cancelled) return { deviceId: '', provisioningAttemptId: claimId };
  }
  throw Object.assign(new Error('Claim confirmation timed out'), { code: 'CLAIM_CONFIRM_TIMEOUT' });
}

function isRetryableClaimStatusPollError(error: unknown): boolean {
  return isRetryablePairingStatusPollError(error);
}

async function waitForDeviceAuthenticated(provisioningAttemptId: string, poll: PollController): Promise<{
  deviceId: string;
  provisioningAttemptId: string;
}> {
  for (let attempt = 0; attempt < PROVISIONING_CONFIRM_MAX_POLL_ATTEMPTS; attempt += 1) {
    try {
      const status = parseProvisioningStatus(await getProvisioningAttemptStatus(provisioningAttemptId));
      if (status.status === 'device_authenticated' || status.status === 'completed') {
        return { deviceId: status.deviceId, provisioningAttemptId: status.provisioningAttemptId };
      }
      if (status.status === 'failed' || status.status === 'expired') {
        throw Object.assign(new Error('Provisioning failed'), { code: status.failureCode ?? 'PROVISIONING_FAILED' });
      }
    } catch (error: unknown) {
      if (!isRetryablePairingStatusPollError(error)) throw error;
    }
    if (poll.cancelled) return { deviceId: '', provisioningAttemptId };
    if (attempt === PROVISIONING_CONFIRM_MAX_POLL_ATTEMPTS - 1) break;
    await sleep(DEVICE_STATUS_POLL_INTERVAL_MS, poll);
    if (poll.cancelled) return { deviceId: '', provisioningAttemptId };
  }
  throw Object.assign(new Error('Provisioning timed out'), { code: 'PROVISIONING_TIMEOUT' });
}

function resolveConfirmDeadlineMs(expiresAt?: string | null): number {
  return readFutureDeadlineMs(expiresAt) ?? Date.now() + CLAIM_CONFIRM_TIMEOUT_MS;
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
      poll.resolveSleep = undefined;
      resolve();
    }, ms);
    poll.resolveSleep = resolve;
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

function isDeliveryUnknown(error: unknown): boolean {
  return asRecord(error)?.deliveryUnknown === true;
}

function withProvisioningAttemptContext(error: unknown, provisioningAttemptId: string): Error & {
  code: string;
  provisioningAttemptId: string;
  deliveryUnknown?: boolean;
} {
  const wrapped = new Error(error instanceof Error ? error.message : 'Pairing operation failed.') as Error & {
    code: string;
    provisioningAttemptId: string;
    deliveryUnknown?: boolean;
  };
  wrapped.code = errorCodeFrom(error, 'PAIRING_CONNECT_FAILED');
  wrapped.provisioningAttemptId = provisioningAttemptId;
  if (isDeliveryUnknown(error)) wrapped.deliveryUnknown = true;
  Object.defineProperty(wrapped, 'cause', { value: error, configurable: true });
  return wrapped;
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
