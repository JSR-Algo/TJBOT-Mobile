import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import CLChip from '../components/CLChip';
import LCDPreview from '../components/LCDPreview';

type Props = NativeStackScreenProps<RootStackParamList, 'NeedsSyncScreen'>;

export default function NeedsSyncScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Robot needs to catch up">
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="reconnect" size={170} accent="#FF6F61" />
        <Box style={styles.chipWrap}><CLChip state="needs_sync" /></Box>
        <Text fontWeight="600" style={styles.heading}>Robot is offline right now</Text>
        <Text style={styles.sub}>
          Your new course "Yummy Words" is waiting on the app. We'll send it the moment Robot is back on Wi-Fi.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Text fontWeight="700" style={styles.sectionLabel}>Waiting to send</Text>
        <Box style={styles.pendingCard}>
          <Box style={[styles.pendingRow, { borderBottomWidth: 1, borderBottomColor: CL.hair }]}>
            <LCDPreview emotion="speak" accent="#FF6F61" size={56} />
            <Box flex={1}>
              <Text fontWeight="600" style={styles.pendingTitle}>Yummy Words · full course</Text>
              <Text style={styles.pendingMeta}>28 lessons · added 2 minutes ago</Text>
            </Box>
          </Box>
          <Box style={styles.pendingRow}>
            <LCDPreview emotion="happy" accent="#FF6F61" size={56} />
            <Box flex={1}>
              <Text fontWeight="600" style={styles.pendingTitle}>Today's lesson · Animals at home</Text>
              <Text style={styles.pendingMeta}>Will play once Robot is back online</Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Try this</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔌" title="Check Robot is plugged in" body="Or has at least 20% battery" />
          <DeviceRow icon="📶" title="Update Wi-Fi" body="If your network changed or password rotated" onClick={() => navigation.navigate('DevicePairWifiScreen')} />
          <DeviceRow icon="🔄" title="Restart Robot" body="Hold the top button for 5 seconds" />
        </Box>
      </Box>

      <Text style={styles.note}>No rush — your child can pick up tomorrow.</Text>

      <Box paddingHorizontal={20} paddingTop={20} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate('CourseAddedScreen')}>Reconnect Robot now</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate('DeviceHomeScreen')}>I'll do it later</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  chipWrap: { marginTop: 18 },
  heading: { fontSize: 20, color: CL.ink, letterSpacing: -0.3, textAlign: 'center', maxWidth: 300, marginTop: 12 },
  sub: { fontSize: 13, color: CL.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 6 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  pendingCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  pendingTitle: { fontSize: 13, color: CL.ink },
  pendingMeta: { fontSize: 11, color: CL.ink2, marginTop: 2 },
  rowCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  note: { fontSize: 12, color: CL.ink2, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20, paddingTop: 12 },
});
