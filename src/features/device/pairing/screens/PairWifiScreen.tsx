import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'PairWifiScreen'>;

const NETWORKS = [
  { name: 'Casa-Familia', strength: 3, sel: true, lock: true },
  { name: 'Casa-Familia-5G', strength: 3, sel: false, lock: true },
  { name: 'Vecino', strength: 2, sel: false, lock: true },
  { name: 'BT-Hub-7', strength: 1, sel: false, lock: true },
] as const;

export default function PairWifiScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Connect to Wi-Fi" onBack={() => navigation.navigate('PairCodeScreen')}>
      <Box paddingHorizontal={20} paddingTop={18}>
        <Box style={styles.whyBox}>
          <Text style={styles.whyText}>
            <Text fontWeight="600" style={{ color: DV.ink }}>Why Wi-Fi? </Text>
            Rotjtjbot uses your home Wi-Fi to fetch lessons and run voice. Without it, lessons can't play.
          </Text>
        </Box>
      </Box>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.netLabel}>Networks nearby</Text>
        <Box style={styles.netCard}>
          {NETWORKS.map((n, i) => (
            <TouchableOpacity
              key={n.name}
              style={[styles.netRow, n.sel && styles.netRowSel, i < NETWORKS.length - 1 && styles.netBorder]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PairWifiPasswordScreen')}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={DV.ink} strokeWidth="1.6" strokeLinecap="round">
                <Path d="M5 12.55a11 11 0 0114 0" opacity={n.strength >= 2 ? 1 : 0.25} />
                <Path d="M8.5 16.5a7 7 0 017 0" opacity={n.strength >= 1 ? 1 : 0.25} />
                <Path d="M12 20l.01 0" />
                <Path d="M2 8.82a15 15 0 0120 0" opacity={n.strength >= 3 ? 1 : 0.25} />
              </Svg>
              <Text style={styles.netName}>{n.name}</Text>
              {n.lock && (
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2">
                  <Rect x="5" y="11" width="14" height="10" rx="2" />
                  <Path d="M8 11V7a4 4 0 018 0v4" />
                </Svg>
              )}
            </TouchableOpacity>
          ))}
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={12}>
        <TouchableOpacity>
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
  netLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, margintjtjbottom: 8 },
  netCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 12, overflow: 'hidden' },
  netRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  netRowSel: { backgroundColor: '#E8F0FE' },
  netBorder: { bordertjtjbottomWidth: 1, bordertjtjbottomColor: DV.hair },
  netName: { fontSize: 15, color: DV.ink, flex: 1 },
  otherLink: { fontSize: 14, color: DV.accent, padding: 6 },
});
