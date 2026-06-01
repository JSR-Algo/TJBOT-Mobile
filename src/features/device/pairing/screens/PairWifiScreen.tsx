import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { scanRobotWifiNetworks } from '@/services/ble/service';
import type { RobotWifiNetwork } from '@/services/ble/types';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import { buildPairWifiPasswordParams } from '../routeParams';

type Props = NativeStackScreenProps<RootStackParamList, 'PairWifiScreen'>;

export default function PairWifiScreen({ navigation, route }: Props) {
  const { language, t } = useAppLanguage();
  const [networks, setNetworks] = React.useState<RobotWifiNetwork[]>([]);
  const [scanState, setScanState] = React.useState<'idle' | 'scanning' | 'ready' | 'failed'>('idle');
  const [scanAttempt, setScanAttempt] = React.useState(0);
  const bleDeviceId = route.params?.bleDeviceId;

  const retryScan = React.useCallback(() => {
    setScanAttempt((prev) => prev + 1);
  }, []);

  React.useEffect(() => {
    if (!bleDeviceId) {
      setScanState('ready');
      return;
    }

    let cancelled = false;
    setScanState('scanning');
    setNetworks([]);

    const runScan = async (attemptsLeft: number): Promise<void> => {
      try {
        const result = await scanRobotWifiNetworks({
          device: { id: bleDeviceId, name: route.params?.serialNumber ?? null, localName: route.params?.serialNumber ?? null, serviceUUIDs: [] },
        });
        if (cancelled) return;
        if (result.length === 0 && attemptsLeft > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          if (cancelled) return;
          return runScan(attemptsLeft - 1);
        }
        setNetworks(result);
        setScanState('ready');
      } catch {
        if (cancelled) return;
        if (attemptsLeft > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          if (cancelled) return;
          return runScan(attemptsLeft - 1);
        }
        setNetworks([]);
        setScanState('failed');
      }
    };

    void runScan(2);

    return () => {
      cancelled = true;
    };
  }, [bleDeviceId, route.params?.serialNumber, scanAttempt]);

  const openPasswordScreen = (ssid: string): void => {
    navigation.navigate(ROUTES.PairWifiPasswordScreen, {
      ...(route.params ?? {}),
      ...buildPairWifiPasswordParams(ssid),
    });
  };

  return (
    <DeviceShell title="Connect to Wi-Fi" onBack={() => navigation.navigate(ROUTES.PairFoundScreen, route.params)}>
      <Box paddingHorizontal={20} paddingTop={18}>
        <Box style={styles.whyBox}>
          <Text style={styles.whyText}>
            <Text fontWeight="600" style={{ color: DV.ink }}>Why Wi-Fi? </Text>
            Robot uses your home Wi-Fi to fetch lessons and run voice. Without it, lessons can't play.
          </Text>
        </Box>
      </Box>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.netLabel}>Networks nearby</Text>
        <Box style={styles.netCard}>
          {scanState === 'scanning' ? (
            <Box style={styles.netRow}>
              <Text style={styles.netName}>Scanning from Robot…</Text>
            </Box>
          ) : networks.length > 0 ? networks.map((network, index) => (
            <TouchableOpacity
              key={`${network.ssid}-${index}`}
              style={[styles.netRow, index < networks.length - 1 && styles.netBorder]}
              onPress={() => openPasswordScreen(network.ssid)}
              accessibilityRole="button"
              accessibilityLabel={translateTemplate('Use Wi-Fi network {{ssid}}', { ssid: network.ssid }, { locale: language })}
            >
              <Text style={styles.netName}>{network.ssid}</Text>
              {typeof network.rssi === 'number' ? <Text style={styles.netMeta}>{signalLabel(network.rssi)}</Text> : null}
            </TouchableOpacity>
          )) : (
            <Box style={styles.netRow}>
              <Text style={styles.netName}>{scanState === 'failed' ? 'Robot scan unavailable. Enter the network name manually.' : 'No Robot-scanned networks found. Enter the network name manually.'}</Text>
            </Box>
          )}
        </Box>
        {bleDeviceId && scanState !== 'scanning' ? (
          <TouchableOpacity
            onPress={retryScan}
            accessibilityRole="button"
            accessibilityLabel={t('Rescan networks from Robot')}
            style={styles.retryRow}
          >
            <Text fontWeight="500" style={styles.otherLink}>{t('Rescan networks from Robot')}</Text>
          </TouchableOpacity>
        ) : null}
      </Box>
      <Box paddingHorizontal={20} paddingTop={12}>
        <TouchableOpacity
          onPress={() => openPasswordScreen('Other network')}
          accessibilityRole="button"
          accessibilityLabel={t('Enter another Wi-Fi network')}
        >
          <Text fontWeight="500" style={styles.otherLink}>Other network…</Text>
        </TouchableOpacity>
      </Box>
      <Box style={{ height: 30 }} />
    </DeviceShell>
  );
}

function signalLabel(rssi: number): string {
  if (rssi >= -60) return 'Strong';
  if (rssi >= -72) return 'OK';
  return 'Weak';
}

const styles = StyleSheet.create({
  whyBox: { backgroundColor: '#EEF1F5', borderRadius: 12, padding: 14 },
  whyText: { fontSize: 13, color: DV.ink2, lineHeight: 22 },
  netLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  netCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, overflow: 'hidden' },
  netRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  netRowSel: { backgroundColor: '#E8F0FE' },
  netBorder: { borderBottomWidth: 1, borderBottomColor: DV.hair },
  netName: { fontSize: 15, color: DV.ink, flex: 1 },
  netMeta: { fontSize: 12, color: DV.ink3 },
  otherLink: { fontSize: 14, color: DV.accent, padding: 6 },
  retryRow: { paddingTop: 8, alignItems: 'center' },
});
