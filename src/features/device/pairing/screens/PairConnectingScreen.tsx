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
import { confirmLocalBlePaired, getProvisioningAttemptStatus, mintBootstrapToken, pairDevice } from '@/services/api/device.api';
import { provisionWifiViaLocalBle } from '@/services/ble/service';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import { ROUTES } from '@/navigation/routes';
import { consumePairingWifiPassword } from '../pairingSecretHandoff';

type Props = NativeStackScreenProps<RootStackParamList, 'PairConnectingScreen'>;
type RuntimeProvisioningStatus = 'started' | 'ble_paired' | 'device_authenticated' | 'completed' | 'failed' | 'expired';
type RuntimeProvisioningStatusResult = {
  provisioningAttemptId: string;
  deviceId: string;
  status: RuntimeProvisioningStatus;
  failureCode?: string;
};

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
    if (!code || !ssid || !deviceId || !serialNumber || !provisioningAttemptId) {
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
    const bleDeviceId = getParamString(params, 'bleDeviceId');
    const transport = params?.provisioningTransport;
    const run = transport === 'ble' && bleDeviceId
      ? runLocalBleProvisioning({ deviceId, serialNumber, provisioningAttemptId, code, ssid, password, bleDeviceId })
      : runBackendProvisioning({ deviceId, serialNumber, provisioningAttemptId, code, ssid, password });

    void run.then(async (result) => {
      if (cancelled) return;
      setI(PAIRING_STEP_COUNT - 1);
      const authenticated = await waitForDeviceAuthenticated(result.provisioningAttemptId);
      if (cancelled) return;
      setI(PAIRING_STEP_COUNT);
      setStatus('authenticated');
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
        provisioningAttemptId,
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
}): Promise<{ deviceId: string; provisioningAttemptId: string }> {
  return pairDevice({
    deviceId: params.deviceId,
    provisioningAttemptId: params.provisioningAttemptId,
    serialNumber: params.serialNumber,
    code: params.code,
    wifiSsid: params.ssid,
    wifiPassword: params.password,
  });
}

async function runLocalBleProvisioning(params: {
  deviceId: string;
  serialNumber: string;
  provisioningAttemptId: string;
  code: string;
  ssid: string;
  password: string;
  bleDeviceId: string;
}): Promise<{ deviceId: string; provisioningAttemptId: string }> {
  const confirmResult = await confirmLocalBlePaired({
    deviceId: params.deviceId,
    provisioningAttemptId: params.provisioningAttemptId,
    serialNumber: params.serialNumber,
    code: params.code,
  });

  let mintResult: { token: string } | undefined;
  try {
    mintResult = await mintBootstrapToken({ provisioningAttemptId: params.provisioningAttemptId });
  } catch {
    throw Object.assign(new Error('Bootstrap token mint failed'), { code: 'BOOTSTRAP_TOKEN_MINT_FAILED' });
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
    token: mintResult.token,
  });

  return confirmResult;
}

async function waitForDeviceAuthenticated(provisioningAttemptId: string): Promise<{
  deviceId: string;
  provisioningAttemptId: string;
}> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const status = parseProvisioningStatus(await getProvisioningAttemptStatus(provisioningAttemptId));
    if (status.status === 'device_authenticated' || status.status === 'completed') {
      return { deviceId: status.deviceId, provisioningAttemptId: status.provisioningAttemptId };
    }
    if (status.status === 'failed' || status.status === 'expired') {
      throw Object.assign(new Error('Provisioning failed'), { code: status.failureCode ?? 'PROVISIONING_FAILED' });
    }
    await sleep(3000);
  }
  throw Object.assign(new Error('Provisioning timed out'), { code: 'PROVISIONING_TIMEOUT' });
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
