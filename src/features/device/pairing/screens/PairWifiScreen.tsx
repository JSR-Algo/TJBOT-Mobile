import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { buildPairWifiPasswordParams } from '../routeParams';

type Props = NativeStackScreenProps<RootStackParamList, 'PairWifiScreen'>;

const NETWORK_SCAN_MESSAGE = 'Network scan needs device provisioning support.';

export default function PairWifiScreen({ navigation, route }: Props) {
  const openPasswordScreen = (ssid: string): void => {
    navigation.navigate(ROUTES.PairWifiPasswordScreen, {
      ...buildPairWifiPasswordParams(ssid),
      deviceId: route.params?.deviceId,
      code: route.params?.code,
    });
  };

  return (
    <DeviceShell title="Connect to Wi-Fi" onBack={() => navigation.navigate(ROUTES.PairCodeScreen)}>
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
          <Box style={[styles.netRow, styles.netRowSel]}>
            <Text style={styles.netName}>{NETWORK_SCAN_MESSAGE}</Text>
          </Box>
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={12}>
        <TouchableOpacity
          onPress={() => openPasswordScreen('Other network')}
          accessibilityRole="button"
          accessibilityLabel="Enter another Wi-Fi network"
        >
          <Text fontWeight="500" style={styles.otherLink}>Other network…</Text>
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
  netRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  netRowSel: { backgroundColor: '#E8F0FE' },
  netBorder: { borderBottomWidth: 1, borderBottomColor: DV.hair },
  netName: { fontSize: 15, color: DV.ink, flex: 1 },
  otherLink: { fontSize: 14, color: DV.accent, padding: 6 },
});
