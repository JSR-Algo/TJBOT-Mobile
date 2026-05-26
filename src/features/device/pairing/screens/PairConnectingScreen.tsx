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
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'PairConnectingScreen'>;

const STEPS = [
  'Sending Wi-Fi to Robot',
  'Connecting to Casa-Familia',
  'Logging in to your account',
  'Loading starter lesson',
] as const;

export default function PairConnectingScreen({ navigation, route }: Props) {
  const [i, setI] = React.useState(0);
  const [status, setStatus] = React.useState<'pairing' | 'complete' | 'failed'>('pairing');
  const params = route.params;

  React.useEffect(() => {
    const code = getParamString(params, 'code');
    const ssid = getParamString(params, 'ssid');
    const password = getParamString(params, 'password');
    if (!code || !ssid || !password) {
      setStatus('failed');
      return;
    }
    let cancelled = false;
    void pairDevice({
      serialNumber: params?.deviceId,
      code,
      wifiSsid: ssid,
      wifiPassword: password,
    }).then((result) => {
      if (cancelled) return;
      setI(STEPS.length - 1);
      setStatus('complete');
      navigation.navigate(ROUTES.PairSuccessScreen, { deviceId: result.deviceId });
    }).catch(() => {
      if (cancelled) return;
      setStatus('failed');
      navigation.navigate(ROUTES.PairFailedScreen, {
        deviceId: params?.deviceId,
        code,
        ssid,
      });
    });
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
              <Text style={[styles.stepText, idx <= i && styles.stepTextActive]}>{s}</Text>
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
