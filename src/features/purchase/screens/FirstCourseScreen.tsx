import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';
import PRStepTab from '../components/PRStepTab';
import PRChip from '../components/PRChip';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'FirstCourseScreen'>;

const TEACHES = ['Greetings', 'Names', 'Family', 'Feelings'];

export default function FirstCourseScreen({ navigation }: Props) {
  return (
    <DeviceShell title="One more step">
      <Box paddingHorizontal={24} paddingTop={18}>
        <PRStepTab step={2} total={3} />
      </Box>
      <Box paddingTop={24} paddingHorizontal={24} alignItems="center">
        <Box style={styles.lcdWrap}>
          <LCDFace emotion="happy" size={150} accent="#FF6F61" />
        </Box>
        <Box style={styles.chipWrap}><PRChip color={PR.good} bg="#E6F4EE">Robot · activated</PRChip></Box>
        <Text fontWeight="600" style={styles.heading}>Add your first course</Text>
        <Text style={styles.sub}>
          Hello Friends comes free with your Robot. We'll send it to the device now.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={22}>
        <Box style={styles.courseCard}>
          <Box style={styles.lcdSmall}>
            <LCDFace emotion="happy" size={64} accent="#FF6F61" />
          </Box>
          <Box flex={1}>
            <Box style={[styles.chipRow, { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }]}>
              <PRChip color={PR.good} bg="#E6F4EE">Free with Robot</PRChip>
              <Text style={styles.ages}>Ages 4–6</Text>
            </Box>
            <Text fontWeight="600" style={styles.courseName}>Hello Friends</Text>
            <Text style={styles.courseBlurb}>Greetings, names, family, and feelings. 24 lessons of warm play.</Text>
            <Box style={[styles.tags, { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }]}>
              {TEACHES.map(t => (
                <Box key={t} style={styles.tag}><Text fontWeight="600" style={styles.tagText}>{t}</Text></Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.libraryNote}>
          <Text style={styles.libraryNoteText}>
            Browse more courses anytime in <Text fontWeight="600" style={{ color: PR.ink }}>Course Library</Text>.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.CourseAddedScreen)}>Send Hello Friends to Robot</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>Explore the library first</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  lcdWrap: { backgroundColor: '#0E1116', borderRadius: 14, padding: 8 },
  chipWrap: { marginTop: 14 },
  heading: { fontSize: 24, color: PR.ink, letterSpacing: -0.4, textAlign: 'center', lineHeight: 29, marginTop: 14 },
  sub: { fontSize: 13, color: PR.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 20, marginTop: 8 },
  courseCard: {
    backgroundColor: PR.card, borderWidth: 2, borderColor: PR.accent, borderRadius: 14,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  lcdSmall: { backgroundColor: '#0E1116', borderRadius: 10, padding: 6, flexShrink: 0 },
  chipRow: { marginBottom: 4 },
  ages: { fontSize: 11, color: PR.ink3 },
  courseName: { fontSize: 15, color: PR.ink },
  courseBlurb: { fontSize: 12, color: PR.ink2, marginTop: 3, lineHeight: 18 },
  tags: { marginTop: 8 },
  tag: { backgroundColor: '#EEF1F5', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 },
  tagText: { fontSize: 10, color: PR.ink2 },
  libraryNote: { backgroundColor: PR.warm, borderRadius: 12, padding: 14 },
  libraryNoteText: { fontSize: 12, color: PR.ink2, lineHeight: 20, textAlign: 'center' },
});
