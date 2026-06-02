import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { startDeviceProvisioning } from '@/services/api/device.api';
import { initializeBle, scanForTJBotDevices } from '@/services/ble/service';
import { serialFromCandidate } from '../serialFromCandidate';

type Props = NativeStackScreenProps<RootStackParamList, 'PairSearchScreen'>;

export default function PairSearchScreen({ navigation }: Props) {
  const cancelledRef = React.useRef(false);

  React.useEffect(() => {
    cancelledRef.current = false;

    async function scanAndStartProvisioning(): Promise<void> {
      const wifiReady = await isPhoneWifiReady();
      if (cancelledRef.current) return;
      if (!wifiReady) {
        navigation.navigate(ROUTES.PairFailedScreen, { errorCode: 'WIFI_UNAVAILABLE' });
        return;
      }

      let bleBootstrapFailed = false;
      const bootstrap = await initializeBle().catch(() => {
        bleBootstrapFailed = true;
        return undefined;
      });
      if (cancelledRef.current) return;
      if (!bootstrap?.available) {
        navigation.navigate(ROUTES.PairFailedScreen, {
          errorCode: bleBootstrapErrorCode(bootstrap, bleBootstrapFailed),
        });
        return;
      }

      const scan = await scanForTJBotDevices().catch(() => undefined);
      if (cancelledRef.current) return;
      const candidate = scan?.allowed[0];
      const serialNumber = serialFromCandidate(candidate);
      if (__DEV__) {
        console.info('[TBOT PairSearch] candidate', {
          candidate: candidate ? { id: candidate.id, name: candidate.name, localName: candidate.localName } : undefined,
          serialNumber,
          allowedCount: scan?.allowed.length ?? 0,
          blockedCount: scan?.blocked.length ?? 0,
        });
      }
      if (!candidate || !serialNumber) {
        navigation.navigate(ROUTES.PairFailedScreen, { errorCode: 'BLE_SCAN_TIMEOUT' });
        return;
      }

      try {
        const attempt = await startDeviceProvisioning({ serialNumber });
        if (cancelledRef.current) return;
        navigation.navigate(ROUTES.PairFoundScreen, {
          serialNumber,
          deviceId: attempt.deviceId,
          provisioningAttemptId: attempt.provisioningAttemptId,
          bleDeviceId: candidate.id,
          provisioningTransport: 'ble',
        });
      } catch (error) {
        if (cancelledRef.current) return;
        navigation.navigate(ROUTES.PairFailedScreen, {
          errorCode: errorCodeFrom(error, 'PROVISIONING_START_FAILED'),
        });
      }
    }

    void scanAndStartProvisioning();
    return () => {
      cancelledRef.current = true;
    };
  }, [navigation]);

  const cancelSearchToIntro = React.useCallback(() => {
    cancelledRef.current = true;
    navigation.navigate(ROUTES.PairIntroScreen);
  }, [navigation]);

  const cancelSearchToFailed = React.useCallback(() => {
    cancelledRef.current = true;
    navigation.navigate(ROUTES.PairFailedScreen, { errorCode: 'BLE_SCAN_TIMEOUT' });
  }, [navigation]);

  return (
    <DeviceShell title="Looking for Robot…" onBack={cancelSearchToIntro}>
      <Box paddingTop={40} paddingHorizontal={24} paddingBottom={30} alignItems="center" gap={24}>
        <Box style={styles.pulseWrap} alignItems="center" justifyContent="center">
          {[0, 1, 2].map(i => (
            <Box key={i} style={styles.pulseRing} />
          ))}
          <Svg width={60} height={60} viewBox="0 0 24 24" fill="none" stroke={DV.accent} strokeWidth="1.6" strokeLinecap="round">
            <Path d="M5 12.55a11 11 0 0114 0" />
            <Path d="M8.5 16.5a7 7 0 017 0" />
            <Path d="M12 20l.01 0" />
            <Path d="M2 8.82a15 15 0 0120 0" />
          </Svg>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Looking nearby…</Text>
        <Text style={styles.sub}>Make sure Robot is within 3 meters and showing a face.</Text>
        <TouchableOpacity onPress={cancelSearchToFailed} style={{ marginTop: 20 }}>
          <Text fontWeight="500" style={styles.link}>I don't see my Robot</Text>
        </TouchableOpacity>
      </Box>
    </DeviceShell>
  );
}

async function isPhoneWifiReady(): Promise<boolean> {
  const state = await NetInfo.fetch().catch(() => undefined);
  return state?.type === 'wifi' && state.isConnected === true;
}

function errorCodeFrom(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const record = error as { code?: unknown; response?: { data?: { code?: unknown } } };
    if (typeof record.code === 'string') return record.code;
    if (typeof record.response?.data?.code === 'string') return record.response.data.code;
  }
  return fallback;
}

function bleBootstrapErrorCode(
  bootstrap: Awaited<ReturnType<typeof initializeBle>> | undefined,
  bootstrapFailed: boolean,
): string {
  if (bootstrapFailed) return 'BLE_SERVICE_UNAVAILABLE';
  if (bootstrap?.permission === 'denied') return 'BLE_PERMISSION_DENIED';
  if (bootstrap?.reason === 'Bluetooth is off.') return 'BLE_POWERED_OFF';
  return 'BLE_UNAVAILABLE';
}

const styles = StyleSheet.create({
  pulseWrap: { width: 200, height: 200 },
  pulseRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: DV.accent, opacity: 0.5 },
  heading: { fontSize: 18, color: DV.ink, textAlign: 'center' },
  sub: { fontSize: 13, color: DV.ink2, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  link: { fontSize: 14, color: DV.accent },
});
