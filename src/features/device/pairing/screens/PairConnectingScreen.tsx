import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { getClaimStatus, requestClaim } from '@/services/api/claim.api';
import {
  confirmLocalBlePaired,
  getDeviceStatus,
  getProvisioningAttemptStatus,
  mintBootstrapToken,
  startDeviceProvisioning,
  type ProvisioningAttemptStatus,
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
import { hasFreshProvisioningOnlineProof } from '../provisioningOnlineProof';

type Props = NativeStackScreenProps<RootStackParamList, 'PairConnectingScreen'>;
type RuntimeProvisioningStatusResult = {
  provisioningAttemptId: string;
  deviceId: string;
  status: ProvisioningAttemptStatus;
  failureCode?: string;
  deviceLastSeenAt?: string | null;
};
type ProvisioningRunResult = {
  deviceId: string;
  provisioningAttemptId: string;
  completionMode: 'device_authenticated' | 'claim_confirmed' | 'device_online';
  claimExpiresAt?: string | null;
  handoffStartedAtMs: number;
  onlineProofBaselineLastSeenAtMs?: number;
};
type ActiveProvisioningContext = {
  deviceId: string;
  provisioningAttemptId: string;
  skipBleHandoff: boolean;
};

const DEVICE_STATUS_POLL_INTERVAL_MS = CLAIM_POLL_INTERVAL_MS;
const DEVICE_ONLINE_MAX_POLL_ATTEMPTS = 20;
const RECONNECT_HANDOFF_DEADLINE_MS = 60000;
const BACKEND_BASELINE_TIMEOUT_MS = 2000;
const PROVISIONING_CONFIRM_MAX_POLL_ATTEMPTS = Math.ceil(CLAIM_CONFIRM_TIMEOUT_MS / DEVICE_STATUS_POLL_INTERVAL_MS) + 1;

const PROVISIONING_STATUSES = [
  'started',
  'ble_paired',
  'awaiting_physical_confirm',
  'device_authenticated',
  'completed',
  'failed',
  'expired',
] as const satisfies readonly ProvisioningAttemptStatus[];

export default function PairConnectingScreen({ navigation, route }: Props) {
  const { language, t } = useAppLanguage();
  const [i, setI] = React.useState(0);
  const [status, setStatus] = React.useState<'pairing' | 'authenticated' | 'failed'>('pairing');
  const submittedParams = React.useRef<Props['route']['params'] | null>(null);
  const cancelRun = React.useRef<(() => void) | undefined>(undefined);
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
    const controller = new AbortController();
    // Polling loops below back off with sleep() between attempts. On unmount we
    // must both stop the loop AND clear any pending sleep timer, or that timer
    // leaks (keeping the Jest worker / RN event loop alive after the screen is
    // gone — the "worker failed to exit gracefully" symptom).
    const poll: PollController = { cancelled: false, timer: undefined };
    const cancel = (): void => {
      cancelled = true;
      poll.cancelled = true;
      controller.abort();
      password = '';
      if (poll.timer !== undefined) clearTimeout(poll.timer);
      poll.timer = undefined;
      poll.resolveSleep?.();
      poll.resolveSleep = undefined;
    };
    cancelRun.current = cancel;
    const supportedBleTransport = transport === 'ble' || transport === 'ble_claim' || transport === 'ble_reconnect';
    if (!supportedBleTransport || !bleDeviceId) {
      setStatus('failed');
      navigation.navigate(ROUTES.PairFailedScreen, {
        ...failureContext(params),
        errorCode: 'BLE_PROVISIONING_CONTEXT_MISSING',
      });
      return;
    }
    const run = (async (): Promise<ProvisioningRunResult> => {
      const preHandoffBaselineLastSeenAtMs = transport === 'ble_reconnect'
        ? await readBackendHeartbeatBaseline(deviceId, poll)
        : undefined;
      if (poll.cancelled) {
        throw Object.assign(new Error('Pairing cancelled'), { code: 'PAIRING_CANCELLED' });
      }
      try {
        const result = await runLocalBleProvisioning({
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
          signal: controller.signal,
        });
        const onlineProofBaselineLastSeenAtMs = transport === 'ble_reconnect'
          ? await readBackendHeartbeatBaseline(deviceId, poll)
          : preHandoffBaselineLastSeenAtMs;
        return { ...result, onlineProofBaselineLastSeenAtMs };
      } catch (error: unknown) {
        const needsReconnectReconciliation = transport === 'ble_reconnect'
          && (errorCodeFrom(error, '') === 'WIFI_CONNECT_TIMEOUT' || isDeliveryUnknown(error));
        const onlineProofBaselineLastSeenAtMs = needsReconnectReconciliation
          ? await readBackendHeartbeatBaseline(deviceId, poll)
          : preHandoffBaselineLastSeenAtMs;
        throw Object.assign(asRecord(error) ?? {}, { onlineProofBaselineLastSeenAtMs });
      }
    })();

    // The zero-code BLE run may MINT A NEW claim id (it re-runs requestClaim when
    // no claim/token is in hand). The success path surfaces it via
    // result.provisioningAttemptId, but a post-run claim-confirmation throw must
    // also carry it forward so PairFailedScreen's late-claim recovery queries the
    // real claim — not the stale route param captured in the closure. This only
    // applies to the claim-confirmed completion mode; the backend/auth paths keep
    // the original route attempt id on failure (their recovery contract).
    let recoveryAttemptId = provisioningAttemptId;
    let recoveryDeviceId = deviceId;
    void run.then(async (result) => {
      if (result.completionMode === 'claim_confirmed') {
        recoveryAttemptId = result.provisioningAttemptId;
      }
      if (cancelled) return;
      const handoffStartedAtMs = result.handoffStartedAtMs;
      setI(PAIRING_STEP_COUNT - 1);
      if (result.completionMode === 'device_online') {
        await waitForDeviceOnline(
          result.deviceId,
          poll,
          'RECONNECT_DEVICE_OFFLINE_TIMEOUT',
          DEVICE_ONLINE_MAX_POLL_ATTEMPTS,
          undefined,
          handoffStartedAtMs + RECONNECT_HANDOFF_DEADLINE_MS,
          ssid,
          true,
          result.onlineProofBaselineLastSeenAtMs,
        );
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
        await waitForDeviceOnline(
          authenticated.deviceId,
          poll,
          'PAIRING_DEVICE_OFFLINE_TIMEOUT',
          DEVICE_ONLINE_MAX_POLL_ATTEMPTS,
          handoffStartedAtMs,
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
        if (cancelled) return;
        navigation.navigate(ROUTES.PairRenameScreen, {
          deviceId: authenticated.deviceId,
          serialNumber,
          provisioningAttemptId: authenticated.provisioningAttemptId,
          ssid,
          bleDeviceId,
          provisioningTransport: transport,
        });
        return;
      }

      const authenticated = await waitForDeviceAuthenticated(result.provisioningAttemptId, poll, handoffStartedAtMs);
      if (cancelled) return;
      clearPairingBootstrapToken(authenticated.provisioningAttemptId);
      setI(PAIRING_STEP_COUNT);
      await savePendingPairingContext({
        deviceId: authenticated.deviceId,
        serialNumber,
        provisioningAttemptId: authenticated.provisioningAttemptId,
      });
      if (cancelled) return;
      navigation.navigate(ROUTES.PairRenameScreen, {
        deviceId: authenticated.deviceId,
        serialNumber,
        provisioningAttemptId: authenticated.provisioningAttemptId,
        ssid,
        bleDeviceId,
        provisioningTransport: transport,
      });
    }).catch(async (error: unknown) => {
      if (cancelled) return;
      const errorRecord = asRecord(error);
      recoveryAttemptId = readString(errorRecord, 'provisioningAttemptId') ?? recoveryAttemptId;
      recoveryDeviceId = readString(errorRecord, 'deviceId') ?? recoveryDeviceId;
      const handoffStartedAtMs = readNumber(errorRecord, 'handoffStartedAtMs') ?? Date.now();
      const onlineProofBaselineLastSeenAtMs = readNumber(errorRecord, 'onlineProofBaselineLastSeenAtMs');
      let resolvedError = error;
      const deliveryUnknown = isDeliveryUnknown(error);
      if (
        transport === 'ble_reconnect'
        && (errorCodeFrom(error, '') === 'WIFI_CONNECT_TIMEOUT' || deliveryUnknown)
      ) {
        try {
          await waitForDeviceOnline(
            recoveryDeviceId,
            poll,
            'WIFI_CONNECT_TIMEOUT',
            reconnectReconciliationAttempts(handoffStartedAtMs),
            undefined,
            handoffStartedAtMs + RECONNECT_HANDOFF_DEADLINE_MS,
            ssid,
            true,
            onlineProofBaselineLastSeenAtMs,
          );
          if (cancelled) return;
          clearPairingBootstrapToken(recoveryAttemptId);
          setI(PAIRING_STEP_COUNT);
          setStatus('authenticated');
          navigation.reset({ index: 0, routes: [{ name: ROUTES.DeviceHomeScreen }] });
          return;
        } catch (reconciliationError: unknown) {
          resolvedError = reconciliationError;
        }
      }
      if (deliveryUnknown && (transport === 'ble' || transport === 'ble_claim')) {
        try {
          const authenticated = code
            ? await waitForDeviceAuthenticated(recoveryAttemptId, poll, handoffStartedAtMs)
            : await waitForClaimConfirmed(recoveryAttemptId, poll);
          if (!code) {
            await waitForDeviceOnline(
              authenticated.deviceId,
              poll,
              'PAIRING_DEVICE_OFFLINE_TIMEOUT',
              DEVICE_ONLINE_MAX_POLL_ATTEMPTS,
              handoffStartedAtMs,
            );
          }
          if (cancelled) return;
          clearPairingBootstrapToken(authenticated.provisioningAttemptId);
          setI(PAIRING_STEP_COUNT);
          setStatus('authenticated');
          await savePendingPairingContext({
            deviceId: authenticated.deviceId,
            serialNumber,
            provisioningAttemptId: authenticated.provisioningAttemptId,
          });
          if (cancelled) return;
          navigation.navigate(ROUTES.PairRenameScreen, {
            deviceId: authenticated.deviceId,
            serialNumber,
            provisioningAttemptId: authenticated.provisioningAttemptId,
            ssid,
            bleDeviceId,
            provisioningTransport: transport,
          });
          return;
        } catch (reconciliationError: unknown) {
          resolvedError = reconciliationError;
        }
      }
      if (cancelled) return;
      const errorCode = errorCodeFrom(resolvedError, 'PAIRING_CONNECT_FAILED');
      logDevPairConnectingEvent('failed', {
        errorCode,
        deviceId: recoveryDeviceId,
        serialNumber,
        provisioningAttemptId: recoveryAttemptId,
        transport: params?.provisioningTransport,
        hasBleDeviceId: !!bleDeviceId,
      });
      setStatus('failed');
      navigation.navigate(ROUTES.PairFailedScreen, {
        deviceId: recoveryDeviceId,
        serialNumber,
        provisioningAttemptId: recoveryAttemptId,
        code,
        ssid,
        bleDeviceId,
        provisioningTransport: params?.provisioningTransport,
        ...(deliveryUnknown ? { deliveryUnknown: true } : {}),
        ...(deliveryUnknown ? { handoffStartedAtMs } : {}),
        errorCode,
      });
    }).finally(() => {
      password = '';
    });
    return () => {
      cancel();
      if (cancelRun.current === cancel) cancelRun.current = undefined;
    };
  }, [navigation, params, ssid]);

  const heading = status === 'authenticated'
    ? t('Robot authenticated')
    : status === 'failed'
      ? t('Pairing failed')
      : t(credentialOnlySteps ? 'Hang tight — up to 1 minute' : 'Hang tight — about 30 seconds');

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
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={24}>
        <DeviceBigBtn secondary accessibilityLabel="Cancel" onClick={() => {
          cancelRun.current?.();
          navigation.reset({ index: 0, routes: [{ name: ROUTES.DeviceHomeScreen }] });
        }}>
          Cancel
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const PAIRING_STEP_COUNT = 4;

function reconnectReconciliationAttempts(handoffStartedAtMs: number): number {
  const remainingMs = Math.max(0, handoffStartedAtMs + RECONNECT_HANDOFF_DEADLINE_MS - Date.now());
  return Math.min(
    DEVICE_ONLINE_MAX_POLL_ATTEMPTS,
    Math.floor(remainingMs / DEVICE_STATUS_POLL_INTERVAL_MS) + 1,
  );
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
  claimBased?: boolean;
  signal: AbortSignal;
}): Promise<ProvisioningRunResult> {
  const ensureActive = (): void => {
    if (params.signal.aborted) throw Object.assign(new Error('Pairing cancelled'), { code: 'PAIRING_CANCELLED' });
  };
  ensureActive();
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
    const handoffStartedAtMs = Date.now();
    try {
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
        signal: params.signal,
      });
    } catch (error: unknown) {
      throw Object.assign(
        withProvisioningAttemptContext(error, params.provisioningAttemptId, params.deviceId),
        { handoffStartedAtMs },
      );
    }

    return {
      deviceId: params.deviceId,
      provisioningAttemptId: params.provisioningAttemptId,
      completionMode: 'device_online',
      handoffStartedAtMs,
    };
  }

  let token: string | undefined;
  let claimId = params.provisioningAttemptId;
  let activeDeviceId = params.deviceId;
  let claimExpiresAt: string | null = null;
  let completionMode: ProvisioningRunResult['completionMode'] = params.claimBased
    ? 'claim_confirmed'
    : 'device_authenticated';
  const handoffCode = params.code ?? (params.claimBased ? undefined : createLocalBleCode());

  if (handoffCode) {
    const active = await confirmLocalBlePairedWithNotReadyRecovery({
      deviceId: activeDeviceId,
      provisioningAttemptId: claimId,
      serialNumber: params.serialNumber,
      code: handoffCode,
      ensureActive,
    });
    ensureActive();
    activeDeviceId = active.deviceId;
    claimId = active.provisioningAttemptId;
    completionMode = 'device_authenticated';
    if (active.skipBleHandoff) {
      return { deviceId: activeDeviceId, provisioningAttemptId: claimId, completionMode, handoffStartedAtMs: Date.now() };
    }
  }

  if (params.claimBased && !params.code && !token && !isLikelyClaimId(claimId)) {
    const claimed = await requestClaim({ deviceId: activeDeviceId });
    ensureActive();
    if (!claimed.claimId) {
      throw Object.assign(new Error('Claim request did not return a claim id'), { code: 'CLAIM_REQUEST_MALFORMED' });
    }
    claimId = claimed.claimId;
    claimExpiresAt = claimed.expiresAt || null;
    if (claimed.status === 'CLAIM_CONFIRMED' || claimed.status === 'CLAIMED') {
      return {
        deviceId: claimed.deviceId || activeDeviceId,
        provisioningAttemptId: claimId,
        completionMode,
        claimExpiresAt,
        handoffStartedAtMs: Date.now(),
      };
    }
  }

  let handoffStartedAtMs = Date.now();
  try {
    // Bootstrap tokens are single-use and expire quickly. A token cached before
    // Wi-Fi selection may already be expired or consumed by a previous delivery-
    // unknown attempt, so mint exactly at the BLE handoff boundary every time.
    const bootstrap = await mintBootstrapToken({ provisioningAttemptId: claimId });
    ensureActive();
    token = bootstrap.token;
    handoffStartedAtMs = Date.now();
    try {
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
        deviceId: activeDeviceId,
        signal: params.signal,
      });
    } catch (error: unknown) {
      throw Object.assign(withProvisioningAttemptContext(error, claimId, activeDeviceId), { handoffStartedAtMs });
    }
    // Firmware owns the single-use device-authentication report after joining
    // Wi-Fi. A second phone-side POST races the robot and turns the successful
    // handoff into a false 401 when the robot consumes the token first.
  } catch (error: unknown) {
    throw withProvisioningAttemptContext(error, claimId, activeDeviceId);
  }

  logDevPairConnectingEvent('local_ble_handoff_complete', {
    deviceId: activeDeviceId,
    provisioningAttemptId: claimId,
    completionMode,
  });

  return { deviceId: activeDeviceId, provisioningAttemptId: claimId, completionMode, claimExpiresAt, handoffStartedAtMs };
}

async function confirmLocalBlePairedWithNotReadyRecovery(params: {
  deviceId: string;
  provisioningAttemptId: string;
  serialNumber: string;
  code: string;
  ensureActive: () => void;
}): Promise<ActiveProvisioningContext> {
  params.ensureActive();
  try {
    const confirmed = await confirmLocalBlePaired({
      deviceId: params.deviceId,
      provisioningAttemptId: params.provisioningAttemptId,
      serialNumber: params.serialNumber,
      code: params.code,
    });
    return {
      deviceId: confirmed.deviceId,
      provisioningAttemptId: confirmed.provisioningAttemptId,
      skipBleHandoff: false,
    };
  } catch (error: unknown) {
    params.ensureActive();
    if (errorCodeFrom(error, '') !== 'PROVISIONING_ATTEMPT_NOT_READY') {
      throw error;
    }

    const status = parseProvisioningStatus(await getProvisioningAttemptStatus(params.provisioningAttemptId));
    params.ensureActive();
    if (status.status === 'device_authenticated' || status.status === 'completed') {
      return {
        deviceId: status.deviceId,
        provisioningAttemptId: status.provisioningAttemptId,
        skipBleHandoff: true,
      };
    }
    if (status.status !== 'failed' && status.status !== 'expired') {
      throw error;
    }

    const replacement = await startDeviceProvisioning({ serialNumber: params.serialNumber });
    params.ensureActive();
    try {
      const confirmed = await confirmLocalBlePaired({
        deviceId: replacement.deviceId,
        provisioningAttemptId: replacement.provisioningAttemptId,
        serialNumber: params.serialNumber,
        code: params.code,
      });
      return {
        deviceId: confirmed.deviceId,
        provisioningAttemptId: confirmed.provisioningAttemptId,
        skipBleHandoff: false,
      };
    } catch (replacementError: unknown) {
      throw withProvisioningAttemptContext(replacementError, replacement.provisioningAttemptId, replacement.deviceId);
    }
  }
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
  notBeforeMs?: number,
  deadlineMs?: number,
  expectedWifiSsid?: string,
  requireLaterBackendHeartbeat = false,
  initialBaselineLastSeenAtMs?: number,
): Promise<Awaited<ReturnType<typeof getDeviceStatus>>> {
  let lastStatus: Awaited<ReturnType<typeof getDeviceStatus>> | undefined;
  let baselineLastSeenAtMs = initialBaselineLastSeenAtMs;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let establishedBaseline = false;
    try {
      const status = await waitUntilDeadline(
        getDeviceStatus(deviceId),
        deadlineMs,
        timeoutCode,
        poll,
      );
      lastStatus = status;
      if (requireLaterBackendHeartbeat) {
        const observedLastSeenAtMs = parseLastSeenAtMs(status.lastSeenAt);
        if (baselineLastSeenAtMs === undefined) {
          if (observedLastSeenAtMs !== undefined) {
            baselineLastSeenAtMs = observedLastSeenAtMs;
            establishedBaseline = true;
          }
        } else if (
          observedLastSeenAtMs !== undefined
          && observedLastSeenAtMs > baselineLastSeenAtMs
          && isAcceptableOnlineStatus(status, undefined, expectedWifiSsid)
        ) {
          return status;
        }
      } else if (isAcceptableOnlineStatus(status, notBeforeMs, expectedWifiSsid)) {
        return status;
      }
    } catch (error: unknown) {
      // 404 / DEVICE_NOT_FOUND / transient network while the robot is still
      // joining Wi-Fi must not abort the wait — only the timeout is terminal.
      if (!isRetryableDeviceOnlinePollError(error)) throw error;
    }
    if (poll.cancelled) {
      return lastStatus ?? { id: deviceId, name: deviceId, online: false, batteryPercent: 0 };
    }
    if (attempt === maxAttempts - 1) break;
    // The baseline read itself is not a retry. Check once more immediately so
    // a heartbeat that raced the baseline response is not hidden for 3 seconds.
    if (establishedBaseline) continue;
    const retryDelayMs = deadlineMs === undefined
      ? DEVICE_STATUS_POLL_INTERVAL_MS
      : Math.min(DEVICE_STATUS_POLL_INTERVAL_MS, Math.max(0, deadlineMs - Date.now()));
    await sleep(retryDelayMs, poll);
    if (poll.cancelled) {
      return lastStatus ?? { id: deviceId, name: deviceId, online: false, batteryPercent: 0 };
    }
    if (deadlineMs !== undefined && Date.now() >= deadlineMs) {
      throw Object.assign(new Error('Device online check exceeded its deadline'), { code: timeoutCode });
    }
  }
  throw Object.assign(new Error('Device did not come online'), {
    code: timeoutCode,
  });
}

async function waitUntilDeadline<T>(
  operation: Promise<T>,
  deadlineMs: number | undefined,
  timeoutCode: string,
  poll: PollController,
): Promise<T> {
  if (deadlineMs === undefined) return operation;
  const remainingMs = Math.max(0, deadlineMs - Date.now());
  const deadline = new Promise<never>((_resolve, reject) => {
    poll.timer = setTimeout(() => {
      poll.timer = undefined;
      poll.resolveSleep = undefined;
      reject(Object.assign(new Error('Device online check exceeded its deadline'), { code: timeoutCode }));
    }, remainingMs);
    poll.resolveSleep = () => reject(Object.assign(new Error('Device online check cancelled'), { code: timeoutCode }));
  });
  try {
    return await Promise.race([operation, deadline]);
  } finally {
    if (poll.timer !== undefined) {
      clearTimeout(poll.timer);
      poll.timer = undefined;
    }
    poll.resolveSleep = undefined;
  }
}

function isAcceptableOnlineStatus(
  status: Awaited<ReturnType<typeof getDeviceStatus>>,
  notBeforeMs?: number,
  expectedWifiSsid?: string,
): boolean {
  if (!status.online) return false;
  if (expectedWifiSsid !== undefined && status.wifiSsid !== expectedWifiSsid) return false;
  if (notBeforeMs === undefined) return true;
  if (!status.lastSeenAt) return false;
  const lastSeenAtMs = Date.parse(status.lastSeenAt);
  return Number.isFinite(lastSeenAtMs) && lastSeenAtMs >= notBeforeMs;
}

function parseLastSeenAtMs(lastSeenAt?: string): number | undefined {
  if (!lastSeenAt) return undefined;
  const value = Date.parse(lastSeenAt);
  return Number.isFinite(value) ? value : undefined;
}

async function readBackendHeartbeatBaseline(
  deviceId: string,
  poll: PollController,
): Promise<number | undefined> {
  try {
    const status = await waitUntilDeadline(
      getDeviceStatus(deviceId),
      Date.now() + BACKEND_BASELINE_TIMEOUT_MS,
      'BACKEND_BASELINE_TIMEOUT',
      poll,
    );
    return parseLastSeenAtMs(status.lastSeenAt);
  } catch {
    // Baseline proof is fail-safe: provisioning may continue, but the first
    // valid post-handoff observation becomes a baseline rather than success.
    return undefined;
  }
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

async function waitForDeviceAuthenticated(provisioningAttemptId: string, poll: PollController, notBeforeMs?: number): Promise<{
  deviceId: string;
  provisioningAttemptId: string;
}> {
  for (let attempt = 0; attempt < PROVISIONING_CONFIRM_MAX_POLL_ATTEMPTS; attempt += 1) {
    try {
      const status = parseProvisioningStatus(await getProvisioningAttemptStatus(provisioningAttemptId));
      if (hasFreshProvisioningOnlineProof(status, notBeforeMs ?? 0)) {
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
  const rawDeviceLastSeenAt = record?.deviceLastSeenAt;
  return {
    deviceId,
    provisioningAttemptId,
    status,
    failureCode: readString(record, 'failureCode'),
    deviceLastSeenAt: typeof rawDeviceLastSeenAt === 'string' || rawDeviceLastSeenAt === null
      ? rawDeviceLastSeenAt
      : undefined,
  };
}

function isProvisioningStatus(value: string | undefined): value is ProvisioningAttemptStatus {
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

function withProvisioningAttemptContext(error: unknown, provisioningAttemptId: string, deviceId?: string): Error & {
  code: string;
  deviceId?: string;
  provisioningAttemptId: string;
  deliveryUnknown?: boolean;
  handoffStartedAtMs?: number;
} {
  const wrapped = new Error(error instanceof Error ? error.message : 'Pairing operation failed.') as Error & {
    code: string;
    deviceId?: string;
    provisioningAttemptId: string;
    deliveryUnknown?: boolean;
  };
  wrapped.code = errorCodeFrom(error, 'PAIRING_CONNECT_FAILED');
  wrapped.deviceId = readString(asRecord(error), 'deviceId') ?? deviceId;
  wrapped.provisioningAttemptId = readString(asRecord(error), 'provisioningAttemptId') ?? provisioningAttemptId;
  const handoffStartedAtMs = readNumber(asRecord(error), 'handoffStartedAtMs');
  if (handoffStartedAtMs !== undefined) Object.assign(wrapped, { handoffStartedAtMs });
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
