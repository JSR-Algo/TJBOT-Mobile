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
import { pairDevice } from '@/services/api/device.api';
import {
  connectProvisionableDevice,
  provisionWifi,
  stopProvisionSearch,
  type ProvisioningError,
} from '@/services/provisioning/espProvisioning';
import { ROUTES } from '@/navigation/routes';
import { clearPairingSession, getConnectedEspDevice, setConnectedEspDevice } from '../pairingSession';

type Props = NativeStackScreenProps<RootStackParamList, 'PairConnectingScreen'>;

const STEPS = [
  'Sending Wi-Fi to Robot',
  'Connecting to your network',
  'Logging in to your account',
  'Loading starter lesson',
] as const;

export default function PairConnectingScreen({ navigation, route }: Props) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [status, setStatus] = React.useState<'pairing' | 'complete' | 'failed'>('pairing');
  const params = route.params;

  React.useEffect(() => {
    return () => {
      const device = getConnectedEspDevice();
      if (device) {
        try {
          device.disconnect();
        } catch {
          /* ignore */
        }
      }
      stopProvisionSearch();
    };
  }, []);

  React.useEffect(() => {
    const code = getParamString(params, 'code');
    const ssid = getParamString(params, 'ssid');
    const password = getParamString(params, 'password');
    const espDeviceName = params?.espDeviceName;
    const serial = params?.serial ?? params?.deviceId;

    if (!code || !ssid || !password) {
      setStatus('failed');
      return;
    }

    let cancelled = false;
    const advance = (index: number): void => {
      if (!cancelled) setStepIndex(index);
    };

    const run = async (): Promise<void> => {
      try {
        advance(0);
        let device = getConnectedEspDevice();
        if (!device && espDeviceName) {
          const connected = await connectProvisionableDevice({
            deviceName: espDeviceName,
            pairingCode: code,
            username: serial ?? espDeviceName,
          });
          device = connected.device;
          setConnectedEspDevice(device);
        }

        if (device) {
          advance(1);
          const result = await provisionWifi(device, ssid, password);
          if (result.status?.toLowerCase() !== 'success') {
            throw new Error(result.status ?? 'Wi-Fi provisioning failed');
          }
        }

        advance(2);
        const claim = await pairDevice({
          serialNumber: serial,
          code,
          wifiSsid: ssid,
          wifiPassword: password,
        });

        if (cancelled) return;
        advance(3);
        setStatus('complete');
        clearPairingSession();
        navigation.navigate(ROUTES.PairSuccessScreen, { deviceId: claim.deviceId });
      } catch (err) {
        if (cancelled) return;
        setStatus('failed');
        const isProvError = err instanceof Error && err.name === 'ProvisioningError';
        const message =
          err instanceof Error
            ? err.message
            : (err as ProvisioningError)?.message ?? 'Pairing failed';
        const errorCode = isProvError
          ? (err as ProvisioningError).code
          : 'E-PROV-001';
        navigation.navigate(ROUTES.PairFailedScreen, {
          deviceId: params?.deviceId,
          serial: params?.serial,
          espDeviceName: params?.espDeviceName,
          code,
          ssid,
          error: message,
          errorCode,
        });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigation, params]);

  return (
    <DeviceShell title="Connecting Robot…">
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="reconnect" size={180} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>
          {status === 'complete' ? 'Pairing complete' : status === 'failed' ? 'Pairing failed' : 'Hang tight — about 30 seconds'}
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={24} gap={8}>
        {STEPS.map((s, idx) => {
          const done = idx < stepIndex;
          const active = idx === stepIndex;
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
              <Text style={[styles.stepText, idx <= stepIndex && styles.stepTextActive]}>{s}</Text>
            </Box>
          );
        })}
      </Box>
    </DeviceShell>
  );
}

function getParamString(params: Props['route']['params'], key: 'code' | 'ssid' | 'password'): string | undefined {
  if (!params || !(key in params)) return undefined;
  const value = params[key];
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