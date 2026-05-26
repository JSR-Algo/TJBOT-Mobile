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
import CLChip from '../components/CLChip';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseCompleteScreen'>;

const STATS = [
  { v: '10',   l: 'Words played with' },
  { v: '7',    l: 'Tried out loud' },
  { v: '4 min', l: 'Time together' },
  { v: '3',    l: 'Words to revisit' },
];

const WORDS = [
  { w: 'cat',    good: true }, { w: 'dog',    good: true }, { w: 'bird',   good: true },
  { w: 'fish',   good: true }, { w: 'rabbit', good: false }, { w: 'happy',  good: true },
  { w: 'big',    good: true }, { w: 'small',  good: false }, { w: 'jump',   good: true },
  { w: 'sleep',  good: false },
];

export default function CourseCompleteScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Today's lesson">
      <Box paddingTop={36} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="celebrate" size={170} accent="#FF6F61" />
        <Box style={styles.chipWrap}><CLChip state="completed" /></Box>
        <Text fontWeight="600" style={styles.heading}>A lovely 4 minutes</Text>
        <Text style={styles.sub}>Synced from Robot just now. Audio was never saved.</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {STATS.map(s => (
          <Box key={s.l} style={styles.statCard} width="47%">
            <Text fontWeight="700" style={styles.statVal}>{s.v}</Text>
            <Text style={styles.statLabel}>{s.l}</Text>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="700" style={styles.sectionLabel}>What Robot taught</Text>
        <Box style={styles.wordsCard}>
          <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {WORDS.map(t => (
              <Box key={t.w} style={[styles.wordChip, { backgroundColor: t.good ? '#E6F4EE' : '#FFF4D9' }]}>
                <Text fontWeight="600" style={[styles.wordText, { color: t.good ? '#1F8A5B' : '#8A6A12' }]}>{t.w}</Text>
              </Box>
            ))}
          </Box>
          <Text style={styles.legend}>
            <Text fontWeight="700" style={{ color: '#1F8A5B' }}>Green</Text> = practiced confidently · <Text fontWeight="700" style={{ color: '#8A6A12' }}>Yellow</Text> = Robot will revisit
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.SendToRobotScreen)}>Plan tomorrow's lesson</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>Done</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  chipWrap: { marginTop: 18 },
  heading: { fontSize: 22, color: CL.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 12 },
  sub: { fontSize: 13, color: CL.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 6 },
  statCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 12, padding: 12 },
  statVal: { fontSize: 22, color: CL.ink, letterSpacing: -0.4 },
  statLabel: { fontSize: 11, color: CL.ink2, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  wordsCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, padding: 14 },
  wordChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 7 },
  wordText: { fontSize: 12 },
  legend: { fontSize: 11, color: CL.ink3, lineHeight: 18, marginTop: 10 },
});
