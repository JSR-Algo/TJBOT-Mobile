import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import COURSES from '../components/courses';
import CLChip from '../components/CLChip';
import { getCourses, type PublishedCourse } from '@/services/api/course-library.api';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseDetailScreen'>;

const ICONS = ['🗣️', '🎯', '💛', '🔢'];
const DEFAULT_COURSE = COURSES[2]!;

export default function CourseDetailScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId ?? DEFAULT_COURSE.id;
  // Static entries carry richer presentation metadata. Published courses do
  // not share those IDs, so never borrow details from an unrelated static
  // course when the backend returns a published-only course.
  const [published, setPublished] = React.useState<PublishedCourse | null>(null);
  React.useEffect(() => {
    let active = true;
    void getCourses()
      .then((list) => {
        if (active) setPublished(list.find((course) => course.courseId === courseId) ?? null);
      })
      .catch(() => {
        // Published catalog unavailable → fall back to static metadata only.
        if (active) setPublished(null);
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  const staticCourse = COURSES.find((course) => course.id === courseId);
  const title = published?.title?.trim() || staticCourse?.title || courseId;
  const lessonCount = published?.lessonCount ?? staticCourse?.lessons ?? 0;
  const stats = staticCourse
    ? [{ v: lessonCount, l: 'Lessons' }, { v: `${staticCourse.weeks}w`, l: 'Pace' }, { v: '4 min', l: 'Per day' }]
    : [{ v: lessonCount, l: 'Lessons' }];
  return (
    <DeviceShell title="Course details" onBack={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.heroCard}>
          <Box style={styles.heroLCD} alignItems="center" justifyContent="center">
            <LCDFace emotion={staticCourse?.lcd ?? 'idle'} size={140} accent="#FF6F61" />
          </Box>
          <Box padding={14} paddingBottom={16}>
            {staticCourse ? (
              <Box flexDirection="row" gap={8} alignItems="center" style={styles.chipRow}>
                <CLChip state={staticCourse.state} />
                <Text style={styles.metaText}>Ages {staticCourse.ages} · {staticCourse.level}</Text>
              </Box>
            ) : null}
            <Text fontWeight="600" style={styles.title}>{title}</Text>
            {staticCourse ? <Text style={styles.blurb}>{staticCourse.blurb}</Text> : null}
          </Box>
        </Box>
      </Box>

      {staticCourse ? (
        <Box paddingHorizontal={16} paddingTop={20}>
          <Text fontWeight="700" style={styles.sectionLabel}>What Robot will teach</Text>
          <Box style={styles.listCard}>
            {staticCourse.teaches.map((topic, index) => (
              <Box key={topic} style={[styles.listRow, index < staticCourse.teaches.length - 1 && styles.listBorder]}>
                <Box style={styles.listIcon}>
                  <Text style={{ fontSize: 14 }}>{ICONS[index % 4]}</Text>
                </Box>
                <Text style={styles.listText}>{topic}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}

      <Box paddingHorizontal={16} paddingTop={20} flexDirection="row" gap={8}>
        {stats.map((stat) => (
          <Box key={stat.l} flex={1} style={styles.statCard} alignItems="center">
            <Text fontWeight="700" style={styles.statVal}>{stat.v}</Text>
            <Text style={styles.statLabel}>{stat.l}</Text>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.noteCard}>
          <Text style={styles.noteText}>
            <Text fontWeight="600" style={{ color: CL.ink }}>A note for parents.</Text>{' '}
            This course is gentle daily play, not a test. We don't promise quick results — we focus on warm, repeated practice.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.UnlockConfirmScreen, { courseId })}>Add to Robot</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>Back to library</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, overflow: 'hidden' },
  heroLCD: { backgroundColor: '#0E1116', paddingVertical: 18, paddingHorizontal: 16 },
  chipRow: { marginBottom: 6, flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: CL.ink3 },
  title: { fontSize: 20, color: CL.ink, letterSpacing: -0.2 },
  blurb: { fontSize: 13, color: CL.ink2, marginTop: 6, lineHeight: 20 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  listCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  listRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: CL.hair },
  listIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#EEF1F5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listText: { fontSize: 14, color: CL.ink },
  statCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8 },
  statVal: { fontSize: 18, color: CL.ink },
  statLabel: { fontSize: 11, color: CL.ink2, marginTop: 2 },
  noteCard: { backgroundColor: '#F8F6F1', borderRadius: 12, padding: 14 },
  noteText: { fontSize: 12, color: CL.ink2, lineHeight: 20 },
});
