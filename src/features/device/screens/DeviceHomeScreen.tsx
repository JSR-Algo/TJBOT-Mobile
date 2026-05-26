import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceHomeScreen'>;

export default function DeviceHomeScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Robot · ROB-2A8F">
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.heroCard} flexDirection="row" gap={16} alignItems="center">
          <RobotDevice emotion="idle" size={108} accent="#FF6F61" />
          <Box flex={1}>
            <Text fontWeight="600" style={styles.statusText}>Online · idle</Text>
            <Text fontWeight="600" style={styles.readyText}>Ready for today</Text>
            <Box flexDirection="row" gap={8} style={{ marginTop: 4 }}>
              <Text style={styles.metaText}>🔋 78%</Text>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText}>Wi-Fi</Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Today</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📚" title="Unit 2 · Animals" body="Lesson 4 of 6 · about 4 minutes" onClick={() => navigation.navigate(ROUTES.DeviceSessionScreen)} />
          <DeviceRow icon="🔁" title="3 words to revisit" body="Robot will sneak these in tomorrow" />
          <DeviceRow icon="⭐" title="Yesterday: 1 lesson · 4 min" body="Tap to see what your child practiced" />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Robot</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🎵" title="Make Robot chime" body="Find Robot if it's misplaced" onClick={() => navigation.navigate(ROUTES.DeviceLostScreen)} />
          <DeviceRow icon="🌙" title="Quiet hours" body="9:00 PM – 7:00 AM" />
          <DeviceRow icon="🔄" title="Sync content" body="Up to date · 2 minutes ago" />
          <DeviceRow icon="⬆️" title="Firmware" body="v1.4.2 · update available" onClick={() => navigation.navigate(ROUTES.DeviceFirmwareScreen)} />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>This Robot</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="👤" title="Buddy: Panda · Just starting" body="Tap to change avatar or level" />
          <DeviceRow icon="🛡️" title="Safety & privacy" />
          <DeviceRow danger title="Unpair this Robot" icon="⚠️" />
        </Box>
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: DV.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: DV.hair },
  statusText: { fontSize: 13, color: DV.good },
  readyText: { fontSize: 18, color: DV.ink, marginTop: 2 },
  metaText: { fontSize: 12, color: DV.ink2 },
  sectionLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: DV.card, borderRadius: 14, borderWidth: 1, borderColor: DV.hair, paddingVertical: 4, paddingHorizontal: 4 },
});
