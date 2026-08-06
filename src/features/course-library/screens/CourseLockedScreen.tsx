import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import { Icon } from '@/design-system/icons';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import COURSES from '../components/courses';
import CLChip from '../components/CLChip';
import CourseCard from '../components/CourseCard';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseLockedScreen'>;

const COURSE = COURSES[4]!;

export default function CourseLockedScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId ?? COURSE.id;
  const c = COURSES.find(course => course.id === courseId) ?? COURSE;
  return (
    <DeviceShell title="Locked for now" onBack={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.heroCard}>
          <Box style={styles.heroMascot} alignItems="center" justifyContent="center">
            <Robot emotion="gentle" size={150} accessibilityLabel="TeeBot waiting with the locked course" />
            <Box style={styles.lockBadge}>
              <Icon name="LockKeyhole" size={13} color="#8A6A12" strokeWidth={2.4} />
              <Text fontWeight="700" style={styles.lockBadgeText}>Locked</Text>
            </Box>
          </Box>
          <Box padding={14} paddingBottom={16}>
            <Box flexDirection="row" gap={8} alignItems="center" style={styles.chipRow}>
              <CLChip state="locked" />
              <Text style={styles.agesText}>Ages {c.ages}</Text>
            </Box>
            <Text fontWeight="600" style={styles.title}>{c.title}</Text>
            <Text style={styles.blurb}>{c.blurb}</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Box style={styles.whyCard}>
          <Text fontWeight="600" style={styles.whyTitle}>Why is this locked?</Text>
          <Text style={styles.whyBody}>
            Story Time uses past-tense and longer sentences. Your child is doing great with greetings — Robot will suggest this when they're ready, usually after Hello Friends.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="700" style={styles.sectionLabel}>Try first</Text>
        <CourseCard course={COURSES[0]!} accent="#FF6F61" onClick={() => navigation.navigate(ROUTES.CourseDetailScreen)} />
      </Box>

      <Box paddingHorizontal={20} paddingTop={20} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.UnlockConfirmScreen, { courseId })}>Add free course</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>Back to library</DeviceBigBtn>
        <DeviceBigBtn
          secondary
          onClick={() => navigation.navigate(ROUTES.SupportScreen, {
            context: { topic: 'app_error', errorFamily: 'app_error' },
          })}
        >
          Contact support
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, overflow: 'hidden' },
  heroMascot: { minHeight: 190, backgroundColor: '#FFF9F0', paddingVertical: 12, paddingHorizontal: 16 },
  lockBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#FCEFC9', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingHorizontal: 9, borderRadius: 999,
  },
  lockBadgeText: { fontSize: 10, color: '#8A6A12', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { marginBottom: 6, flexWrap: 'wrap' },
  agesText: { fontSize: 11, color: CL.ink3 },
  title: { fontSize: 20, color: CL.ink, letterSpacing: -0.2 },
  blurb: { fontSize: 13, color: CL.ink2, marginTop: 6, lineHeight: 20 },
  whyCard: { backgroundColor: '#F8F6F1', borderRadius: 12, padding: 14 },
  whyTitle: { fontSize: 13, color: CL.ink, marginBottom: 6 },
  whyBody: { fontSize: 13, color: CL.ink2, lineHeight: 20 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
});
