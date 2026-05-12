import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from '../components/RM';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotWifiScreen'>;

const OTHERS = [['Casa-Guest', '—'], ['Linden 3B', '—'], ['Verizon-7K2', '—']] as const;

export default function RobotWifiScreen({ navigation }: Props) {
  const [showOthers, setShowOthers] = React.useState(false);
  return (
    <DeviceShell title="Wi-Fi" onBack={() => navigation.navigate('MyRobotScreen')}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.heroCard} flexDirection="row" gap={14} alignItems="center">
          <Box style={styles.wifiIcon} alignItems="center" justifyContent="center">
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={RM.good} strokeWidth={2} strokeLinecap="round">
              <Path d="M2 8.5a14 14 0 0120 0M5 12a10 10 0 0114 0M8 15.5a6 6 0 018 0M12 19h.01" />
            </Svg>
          </Box>
          <Box flex={1}>
            <Text fontWeight="600" style={styles.connectedLabel}>Connected to</Text>
            <Text fontWeight="600" style={styles.ssid}>Casa-Familia</Text>
            <Text style={styles.signalMeta}>Strong signal · 5 GHz</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📡" title="Signal strength" body="Excellent · −48 dBm" />
          <DeviceRow icon="⚡" title="Speed" body="Plenty for lessons" />
          <DeviceRow icon="🌐" title="Robot's IP" body="192.168.1.42" />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔄" title="Switch network" body="Pick a different Wi-Fi" onClick={() => setShowOthers(s => !s)} />
          <DeviceRow icon="🔑" title="Update password" body="If your Wi-Fi password changed" />
          <DeviceRow icon="📲" title="Forget this network" />
        </Box>
      </Box>

      {showOthers && (
        <Box paddingHorizontal={16} paddingTop={18}>
          <Text fontWeight="700" style={styles.sectionLabel}>Other networks nearby</Text>
          <Box style={styles.rowCard}>
            {OTHERS.map(([n]) => (
              <DeviceRow key={n} icon="📶" title={n} body="—" />
            ))}
          </Box>
        </Box>
      )}

      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={30}>
        <Text style={styles.note}>
          Robot needs Wi-Fi only during lessons. It doesn't browse, stream, or talk to anyone outside our service.
        </Text>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, padding: 18 },
  wifiIcon: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#E6F4EE' },
  connectedLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
  ssid: { fontSize: 18, color: RM.ink, marginTop: 2 },
  signalMeta: { fontSize: 12, color: RM.ink2, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  note: { fontSize: 12, color: RM.ink2, lineHeight: 20 },
});
