import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { initializeBle, scanForTJBotDevices } from '@/services/ble/service';
import { searchProvisionableDevices } from '@/services/provisioning/espProvisioning';
import {
  deriveDisplayCode,
  deriveSerialFromBle,
  setPairingCandidate,
} from '../pairingSession';

type Props = NativeStackScreenProps<RootStackParamList, 'PairSearchScreen'>;

export default function PairSearchScreen({ navigation }: Props) {
  const [status, setStatus] = React.useState<'scanning' | 'failed'>('scanning');
  const [detail, setDetail] = React.useState('Looking for Robot over Bluetooth…');

  React.useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      const ble = await initializeBle();
      if (!ble.available) {
        if (!cancelled) {
          setStatus('failed');
          setDetail(ble.reason ?? 'Bluetooth is unavailable.');
        }
        return;
      }

      const [bleScan, espDevices] = await Promise.all([
        scanForTJBotDevices(),
        searchProvisionableDevices().catch(() => []),
      ]);

      if (cancelled) return;

      const candidate = bleScan.allowed[0];
      if (!candidate) {
        setStatus('failed');
        setDetail(
          espDevices.length > 0
            ? 'Found a provisioning signal but no TJBot on the allowlist. Move closer and try again.'
            : 'No Robot found nearby. Make sure it is powered on and showing a face.',
        );
        return;
      }

      const espName =
        espDevices.find((d) => d.name === (candidate.name ?? candidate.localName))?.name ??
        espDevices[0]?.name ??
        candidate.name ??
        candidate.localName ??
        candidate.id;

      const pairingCandidate = {
        bleId: candidate.id,
        name: candidate.name ?? candidate.localName ?? 'TJBot',
        serial: deriveSerialFromBle(candidate),
        displayCode: deriveDisplayCode(candidate),
        espDeviceName: espName,
      };

      setPairingCandidate(pairingCandidate);
      navigation.replace(ROUTES.PairFoundScreen, {
        deviceId: candidate.id,
        serial: pairingCandidate.serial,
        espDeviceName: pairingCandidate.espDeviceName,
        displayCode: pairingCandidate.displayCode,
      });
    };

    void run().catch(() => {
      if (!cancelled) {
        setStatus('failed');
        setDetail('Bluetooth scan failed. Check permissions and try again.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <DeviceShell title="Looking for Robot…" onBack={() => navigation.navigate(ROUTES.PairIntroScreen)}>
      <Box paddingTop={40} paddingHorizontal={24} paddingBottom={30} alignItems="center" gap={24}>
        <Box style={styles.pulseWrap} alignItems="center" justifyContent="center">
          {[0, 1, 2].map((i) => (
            <Box key={i} style={styles.pulseRing} />
          ))}
          {status === 'scanning' ? (
            <ActivityIndicator size="large" color={DV.accent} />
          ) : (
            <Svg width={60} height={60} viewBox="0 0 24 24" fill="none" stroke={DV.accent} strokeWidth="1.6" strokeLinecap="round">
              <Path d="M5 12.55a11 11 0 0114 0" />
              <Path d="M8.5 16.5a7 7 0 017 0" />
              <Path d="M12 20l.01 0" />
              <Path d="M2 8.82a15 15 0 0120 0" />
            </Svg>
          )}
        </Box>
        <Text fontWeight="600" style={styles.heading}>
          {status === 'scanning' ? 'Looking nearby…' : 'Scan issue'}
        </Text>
        <Text style={styles.sub}>{detail}</Text>
        <TouchableOpacity
          onPress={() =>
            status === 'failed'
              ? navigation.replace(ROUTES.PairSearchScreen)
              : navigation.navigate(ROUTES.PairFailedScreen)
          }
          style={{ marginTop: 20 }}
        >
          <Text fontWeight="500" style={styles.link}>
            {status === 'failed' ? 'Try again' : "I don't see my Robot"}
          </Text>
        </TouchableOpacity>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  pulseWrap: { width: 200, height: 200 },
  pulseRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: DV.accent, opacity: 0.5 },
  heading: { fontSize: 18, color: DV.ink, textAlign: 'center' },
  sub: { fontSize: 13, color: DV.ink2, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  link: { fontSize: 14, color: DV.accent },
});