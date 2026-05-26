import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'RunningScreen'>;

export default function RunningScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Lesson is on Robot">
      <Box paddingTop={36} paddingHorizontal={24} alignItems="center">
        <Box style={styles.robotWrap} alignItems="center" justifyContent="center">
          <RobotDevice emotion="speak" size={170} accent="#FF6F61" />
        </Box>
        <Box style={styles.statusBadge}>
          <Box style={styles.statusDot} />
          <Text fontWeight="700" style={styles.statusText}>Lesson playing</Text>
        </Box>
        <Text fontWeight="600" style={styles.heading}>Animals at home</Text>
        <Text style={styles.sub}>
          Your child is talking with Robot. Your phone can stay in your pocket.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={30}>
        <Box style={styles.noteCard}>
          <Text style={styles.noteText}>
            You'll get a calm summary here when the lesson ends.{' '}
            <Text fontWeight="600" style={{ color: CL.ink }}>Audio is never saved.</Text>
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.CompanionScreen)}>See what's happening</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>Done for now</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  robotWrap: { width: 200, height: 200 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF4D9', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, marginTop: 14,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E8A33C' },
  statusText: { fontSize: 11, color: '#8A6A12' },
  heading: { fontSize: 22, color: CL.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 14 },
  sub: { fontSize: 13, color: CL.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 6 },
  noteCard: { backgroundColor: '#F8F6F1', borderRadius: 12, padding: 14 },
  noteText: { fontSize: 12, color: CL.ink2, lineHeight: 20 },
});
