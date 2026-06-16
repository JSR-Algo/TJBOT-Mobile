import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { buildPairWifiPasswordParams } from '../routeParams';
import {
  connectProvisionableDevice,
  scanWifiNetworks,
  stopProvisionSearch,
  type ProvisioningError,
} from '@/services/provisioning/espProvisioning';
import { getConnectedEspDevice, getPairingCandidate, setConnectedEspDevice } from '../pairingSession';

type Props = NativeStackScreenProps<RootStackParamList, 'PairWifiScreen'>;

type WifiRow = { ssid: string; rssi?: number };

export default function PairWifiScreen({ navigation, route }: Props) {
  const [networks, setNetworks] = React.useState<WifiRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [scanKey, setScanKey] = React.useState(0);

  const espDeviceName =
    route.params?.espDeviceName ?? getPairingCandidate()?.espDeviceName ?? '';
  const pairingCode = route.params?.code;

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
      try {
        stopProvisionSearch();
      } catch {
        /* ignore — native module may not be linked in tests */
      }
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      setNetworks([]);

      if (!espDeviceName) {
        setError('Robot provisioning name missing. Search again from the start.');
        setLoading(false);
        return;
      }

      try {
        const { device } = await connectProvisionableDevice({
          deviceName: espDeviceName,
          pairingCode,
          username: route.params?.serial ?? espDeviceName,
        });
        if (cancelled) return;
        setConnectedEspDevice(device);
        const list = await scanWifiNetworks(device);
        if (cancelled) return;
        const rows = list
          .filter((n) => n.ssid?.trim())
          .map((n) => ({ ssid: n.ssid.trim(), rssi: n.rssi }))
          .sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100));
        setNetworks(rows);
        if (rows.length === 0) {
          setError('No Wi-Fi networks found. Move Robot closer to your router.');
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : (err as ProvisioningError)?.message ?? 'Could not scan Wi-Fi networks.';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [espDeviceName, pairingCode, route.params?.serial, scanKey]);

  const openPasswordScreen = (ssid: string): void => {
    navigation.navigate(ROUTES.PairWifiPasswordScreen, buildPairWifiPasswordParams(ssid, {
      deviceId: route.params?.deviceId,
      serial: route.params?.serial,
      espDeviceName: espDeviceName || undefined,
      code: route.params?.code,
    }));
  };

  return (
    <DeviceShell title="Connect to Wi-Fi" onBack={() => navigation.navigate(ROUTES.PairCodeScreen, route.params)}>
      <Box paddingHorizontal={20} paddingTop={18}>
        <Box style={styles.whyBox}>
          <Text style={styles.whyText}>
            <Text fontWeight="600" style={{ color: DV.ink }}>
              Why Wi-Fi?{' '}
            </Text>
            Robot uses your home Wi-Fi to fetch lessons and run voice. Without it, lessons can't play.
          </Text>
        </Box>
      </Box>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.netLabel}>
          Networks nearby
        </Text>
        <Box style={styles.netCard}>
          {loading ? (
            <Box style={styles.netRow} flexDirection="row" gap={12} alignItems="center">
              <ActivityIndicator color={DV.accent} />
              <Text style={styles.netName}>Scanning from Robot…</Text>
            </Box>
          ) : error ? (
            <Box style={styles.netRow}>
              <Text style={styles.netName}>{error}</Text>
            </Box>
          ) : (
            networks.map((network, index) => (
              <TouchableOpacity
                key={`${network.ssid}-${index}`}
                onPress={() => openPasswordScreen(network.ssid)}
                accessibilityRole="button"
                accessibilityLabel={`Connect to ${network.ssid}`}
              >
                <Box
                  style={[styles.netRow, index < networks.length - 1 && styles.netBorder]}
                  flexDirection="row"
                  alignItems="center"
                >
                  <Text style={styles.netName}>{network.ssid}</Text>
                  {typeof network.rssi === 'number' ? (
                    <Text style={styles.rssi}>{network.rssi} dBm</Text>
                  ) : null}
                </Box>
              </TouchableOpacity>
            ))
          )}
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={12} gap={8}>
        {!loading && networks.length > 0 ? (
          <TouchableOpacity
            onPress={() => setScanKey((k) => k + 1)}
            accessibilityRole="button"
            accessibilityLabel="Scan again"
          >
            <Text fontWeight="500" style={styles.otherLink}>
              Scan again
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          onPress={() => openPasswordScreen('Other network')}
          accessibilityRole="button"
          accessibilityLabel="Enter another Wi-Fi network"
        >
          <Text fontWeight="500" style={styles.otherLink}>
            Other network…
          </Text>
        </TouchableOpacity>
      </Box>
      <Box style={{ height: 30 }} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  whyBox: { backgroundColor: '#EEF1F5', borderRadius: 12, padding: 14 },
  whyText: { fontSize: 13, color: DV.ink2, lineHeight: 22 },
  netLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  netCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, overflow: 'hidden' },
  netRow: { paddingVertical: 12, paddingHorizontal: 14 },
  netBorder: { borderBottomWidth: 1, borderBottomColor: DV.hair },
  netName: { fontSize: 15, color: DV.ink, flex: 1 },
  rssi: { fontSize: 11, color: DV.ink3 },
  otherLink: { fontSize: 14, color: DV.accent, padding: 6 },
});
