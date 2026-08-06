import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Icon } from '@/design-system/icons';
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
  const visibleNetworks = React.useMemo(() => normalizeRobotWifiNetworks(networks), [networks]);

  const retryScan = React.useCallback(() => {
    setScanAttempt((prev) => prev + 1);
  }, []);

  React.useEffect(() => {
    if (!bleDeviceId) {
      setScanState('ready');
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    setScanState('scanning');
    setNetworks([]);

    // Wait for the retry backoff while keeping the handle so the effect's cleanup
    // can clear it on unmount — otherwise the pending timer leaks and keeps the
    // (Jest worker) event loop alive after the screen is gone.
    const waitBackoff = (): Promise<void> =>
      new Promise((resolve) => {
        retryTimer = setTimeout(resolve, 1500);
      });

    const runScan = async (attemptsLeft: number): Promise<void> => {
      try {
        const result = await scanRobotWifiNetworks({
          device: { id: bleDeviceId, name: route.params?.serialNumber ?? null, localName: route.params?.serialNumber ?? null, serviceUUIDs: [] },
        });
        if (cancelled) return;
        if (result.length === 0 && attemptsLeft > 0) {
          await waitBackoff();
          if (cancelled) return;
          return runScan(attemptsLeft - 1);
        }
        setNetworks(result);
        setScanState('ready');
      } catch {
        // A scan rejection means the robot can't enumerate networks at all
        // (unsupported / BLE error), so surface manual entry immediately
        // instead of retrying — retries only help the transient empty-result case.
        if (cancelled) return;
        setNetworks([]);
        setScanState('failed');
      }
    };

    void runScan(2);

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
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
          <Box style={styles.whyIcon} alignItems="center" justifyContent="center">
            <Icon name="Wifi" size={20} color={DV.accent} strokeWidth={2.4} />
          </Box>
          <Box flex={1}>
            <Text fontWeight="600" style={styles.whyTitle}>Why Wi-Fi?</Text>
            <Text style={styles.whyText}>{"Robot uses your home Wi-Fi to fetch lessons and run voice. Without it, lessons can't play."}</Text>
          </Box>
        </Box>
      </Box>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.netLabel}>Networks nearby</Text>
        <Box style={styles.netCard}>
          {scanState === 'scanning' ? (
            <Box style={styles.netRow}>
              <ActivityIndicator color={DV.accent} />
              <Text style={styles.netName}>Scanning from Robot…</Text>
            </Box>
          ) : visibleNetworks.length > 0 ? visibleNetworks.map((network, index) => (
            <TouchableOpacity
              key={`${network.ssid}-${index}`}
              style={[styles.netRow, index < visibleNetworks.length - 1 && styles.netBorder]}
              onPress={() => openPasswordScreen(network.ssid)}
              accessibilityRole="button"
              accessibilityLabel={translateTemplate('Use Wi-Fi network {{ssid}}', { ssid: network.ssid }, { locale: language })}
            >
              <Box style={styles.networkIcon} alignItems="center" justifyContent="center">
                <Icon name="Wifi" size={17} color={DV.accent} strokeWidth={2.3} />
              </Box>
              <Text style={styles.netName}>{network.ssid}</Text>
              {typeof network.rssi === 'number' ? <Text style={styles.netMeta}>{signalLabel(network.rssi)}</Text> : null}
            </TouchableOpacity>
          )) : (
            <Box style={styles.netRow}>
              <Box style={styles.networkIcon} alignItems="center" justifyContent="center">
                <Icon name={scanState === 'failed' ? 'WifiOff' : 'SearchX'} size={17} color={DV.ink3} strokeWidth={2.3} />
              </Box>
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

function normalizeRobotWifiNetworks(networks: RobotWifiNetwork[]): RobotWifiNetwork[] {
  return networks
    .map((network) => ({ ...network, ssid: network.ssid.trim() }))
    .filter((network) => network.ssid.length > 0)
    .sort((a, b) => {
      const signalDelta = signalScore(b.rssi) - signalScore(a.rssi);
      if (signalDelta !== 0) return signalDelta;
      return a.ssid.localeCompare(b.ssid);
    });
}

function signalScore(rssi: RobotWifiNetwork['rssi']): number {
  return typeof rssi === 'number' ? rssi : Number.NEGATIVE_INFINITY;
}

const styles = StyleSheet.create({
  whyBox: { backgroundColor: DV.card, borderColor: DV.hair, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', gap: 12 },
  whyIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#FFE5E5' },
  whyTitle: { fontSize: 14, color: DV.ink, marginBottom: 3 },
  whyText: { fontSize: 13, color: DV.ink2, lineHeight: 22 },
  netLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  netCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, overflow: 'hidden' },
  netRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  networkIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FFF5F3' },
  netRowSel: { backgroundColor: '#E8F0FE' },
  netBorder: { borderBottomWidth: 1, borderBottomColor: DV.hair },
  netName: { fontSize: 15, color: DV.ink, flex: 1 },
  netMeta: { fontSize: 12, color: DV.ink3 },
  otherLink: { fontSize: 14, color: DV.accent, padding: 6 },
  retryRow: { paddingTop: 8, alignItems: 'center' },
});
