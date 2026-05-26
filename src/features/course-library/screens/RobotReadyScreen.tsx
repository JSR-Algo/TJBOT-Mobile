import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import CLChip from '../components/CLChip';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotReadyScreen'>;

const CHECKS = [
  { ic: '🔋', t: 'Battery',       v: '78% · plenty',           good: true },
  { ic: '📶', t: 'Wi-Fi',         v: 'Casa-Familia · strong',   good: true },
  { ic: '🔉', t: 'Volume',        v: '6 of 10 · room-friendly', good: true },
  { ic: '📚', t: 'Lesson loaded', v: 'Ready on Robot',          good: true },
];

export default function RobotReadyScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Robot is ready">
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="happy" size={200} accent="#FF6F61" />
        <Box style={styles.chipWrap}><CLChip state="ready" /></Box>
        <Text fontWeight="600" style={styles.heading}>Lesson 4 · Animals at home</Text>
        <Text style={styles.sub}>
          Place Robot on the table. When your child taps it, the lesson starts. About 4 minutes.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.checkCard}>
          {CHECKS.map((r, i) => (
            <Box key={r.t} style={[styles.checkRow, i < CHECKS.length - 1 && styles.checkBorder]}>
              <Box style={styles.checkIcon}>
                <Text style={{ fontSize: 14 }}>{r.ic}</Text>
              </Box>
              <Box flex={1}>
                <Text fontWeight="600" style={styles.checkTitle}>{r.t}</Text>
                <Text style={styles.checkVal}>{r.v}</Text>
              </Box>
              {r.good && (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={CL.good} strokeWidth={2.4} strokeLinecap="round">
                  <Path d="M5 12l5 5 9-10" />
                </Svg>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.RunningScreen)}>Hand it to your child</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.SendToRobotScreen)}>Pick a different lesson</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  chipWrap: { marginTop: 22 },
  heading: { fontSize: 22, color: CL.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 14 },
  sub: { fontSize: 13, color: CL.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 6 },
  checkCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  checkBorder: { borderBottomWidth: 1, borderBottomColor: CL.hair },
  checkIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkTitle: { fontSize: 13, color: CL.ink },
  checkVal: { fontSize: 12, color: CL.ink2, marginTop: 1 },
});
