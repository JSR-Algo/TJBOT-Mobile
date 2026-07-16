import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'PairOfflineScreen'>;

const TIPS = [
  { ic: '🔌', t: 'Check Robot is plugged in', b: 'Or has at least 20% battery' },
  { ic: '📶', t: 'Update Wi-Fi', b: 'Double-click the BOOT button to change Wi-Fi without unpairing Robot.' },
] as const;

export default function PairOfflineScreen({ navigation }: Props) {
  const goToReconnectSearch = React.useCallback(() => {
    navigation.navigate(ROUTES.PairSearchScreen, { reconnectMode: true });
  }, [navigation]);

  return (
    <DeviceShell title="Robot is offline" onBack={() => navigation.navigate(ROUTES.PairAddScreen)}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="reconnect" size={170} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>Robot needs a reconnect</Text>
        <Text style={styles.sub}>
          Pairing is safe. Double-click the BOOT button to change Wi-Fi without unpairing Robot.
        </Text>
      </Box>
      <Box paddingHorizontal={16} paddingTop={22}>
        <Text fontWeight="700" style={styles.sectionLabel}>Try this</Text>
        <Box style={styles.tipCard}>
          {TIPS.map((r, i) => {
            const content = (
              <>
                <Box style={styles.tipIcon} alignItems="center" justifyContent="center">
                  <Text style={{ fontSize: 16 }}>{r.ic}</Text>
                </Box>
                <Box flex={1}>
                  <Text fontWeight="600" style={styles.tipTitle}>{r.t}</Text>
                  <Text style={styles.tipBody}>{r.b}</Text>
                </Box>
              </>
            );
            const rowStyle = [styles.tipRow, i < TIPS.length - 1 && styles.tipBorder];
            if (r.t === 'Update Wi-Fi') {
              return (
                <TouchableOpacity
                  key={r.t}
                  style={rowStyle}
                  activeOpacity={0.78}
                  onPress={goToReconnectSearch}
                  accessibilityRole="button"
                  accessibilityLabel="Update Wi-Fi for offline Robot"
                >
                  {content}
                </TouchableOpacity>
              );
            }
            return (
              <Box key={r.t} style={rowStyle}>
                {content}
              </Box>
            );
          })}
        </Box>
      </Box>
      <Box paddingHorizontal={16} paddingTop={22}>
        <Text fontWeight="700" style={styles.sectionLabel}>Pair again (last resort)</Text>
        <Box style={styles.lastResortCard}>
          <Text style={styles.tipBody}>
            Hold BOOT for 5 seconds only if you want to reset pairing and saved Wi-Fi.
          </Text>
        </Box>
      </Box>
      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={goToReconnectSearch}>Reconnect now</DeviceBigBtn>
        <DeviceBigBtn
          secondary
          onClick={() => navigation.navigate(ROUTES.SupportScreen, {
            context: { topic: 'wifi', errorFamily: 'robot_offline' },
          })}
        >
          Contact support
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, color: DV.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 24 },
  sub: { fontSize: 13, color: DV.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 6 },
  sectionLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  tipCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 14, padding: 4 },
  lastResortCard: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#F3D2AA', borderRadius: 14, padding: 16 },
  tipRow: { padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' },
  tipBorder: { borderBottomWidth: 1, borderBottomColor: DV.hair },
  tipIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EEF1F5', flexShrink: 0 },
  tipTitle: { fontSize: 14, color: DV.ink },
  tipBody: { fontSize: 12, color: DV.ink2, lineHeight: 20, marginTop: 2 },
});
