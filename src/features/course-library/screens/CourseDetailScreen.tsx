import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import LCDFace from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import COURSES from '../components/courses';
import CLChip from '../components/CLChip';
import RobotConnectionPrompt from '../components/RobotConnectionPrompt';
import {
  getCourseLessons,
  getCourses,
  type PublishedCourse,
  type PublishedLesson,
} from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseDetailScreen'>;

type LessonsState =
  | { kind: 'loading' }
  | { kind: 'ready'; lessons: PublishedLesson[] }
  | { kind: 'error' };

const ICONS = ['🗣️', '🎯', '💛', '🔢'];
const COURSE = COURSES[2]!;

export default function CourseDetailScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId ?? COURSE.id;
  const household = useOptionalHousehold();
  const childId = household?.activeChild?.id;
  const [checkingRobot, setCheckingRobot] = React.useState(false);
  const [robotConnectionModalVisible, setRobotConnectionModalVisible] = React.useState(false);

  const showRobotConnectionModal = React.useCallback(() => {
    setRobotConnectionModalVisible(true);
  }, []);

  const handleAddToRobot = React.useCallback(async () => {
    if (checkingRobot) return;
    if (!childId) {
      showRobotConnectionModal();
      return;
    }

    setCheckingRobot(true);
    try {
      const robot = await getDeviceStatus('primary', childId);
      if (!robot.id || robot.online !== true) {
        showRobotConnectionModal();
        return;
      }
      navigation.navigate(ROUTES.UnlockConfirmScreen, { courseId });
    } catch {
      showRobotConnectionModal();
    } finally {
      setCheckingRobot(false);
    }
  }, [checkingRobot, childId, courseId, navigation, showRobotConnectionModal]);

  // Static catalog supplies the rich UI metadata (blurb / lcd / teaches) the
  // published endpoints don't return. The dynamic published catalog overlays the
  // REAL title + lessonCount for authored courses.
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

  // The lesson list is the point of this screen — the stat grid's count alone
  // told a parent "6 lessons" and then showed none of them.
  const [lessons, setLessons] = React.useState<LessonsState>({ kind: 'loading' });
  React.useEffect(() => {
    let active = true;
    setLessons({ kind: 'loading' });
    void getCourseLessons(courseId)
      .then((list) => {
        if (active) setLessons({ kind: 'ready', lessons: list });
      })
      .catch(() => {
        if (active) setLessons({ kind: 'error' });
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  // Authored courses carry backend UUIDs, which never match a static catalog id.
  // Resolving to an arbitrary hardcoded course would print ANOTHER course's
  // blurb/teaches/ages under this course's real title — so a miss renders null
  // for those fields instead of borrowed copy.
  const staticCourse = COURSES.find((course) => course.id === courseId) ?? null;
  const lessonCount = published
    ? published.lessonCount
    : lessons.kind === 'ready'
      ? lessons.lessons.length
      : staticCourse?.lessons ?? null;
  const c = {
    title: published?.title?.trim() ? published.title : staticCourse?.title ?? '',
    lcd: staticCourse?.lcd ?? 'idle',
    state: staticCourse?.state ?? 'not_installed',
    ages: staticCourse?.ages ?? null,
    level: staticCourse?.level ?? null,
    blurb: staticCourse?.blurb ?? null,
    teaches: staticCourse?.teaches ?? [],
    weeks: staticCourse?.weeks ?? null,
    lessons: lessonCount,
  };
  return (
    <>
      <DeviceShell title="Course details" onBack={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.heroCard}>
          <Box style={styles.heroLCD} alignItems="center" justifyContent="center">
            <LCDFace emotion={c.lcd} size={140} accent="#FF6F61" />
          </Box>
          <Box padding={14} paddingBottom={16}>
            <Box flexDirection="row" gap={8} alignItems="center" style={styles.chipRow}>
              <CLChip state={c.state} />
              {c.ages && c.level ? (
                <Text style={styles.metaText}>Ages {c.ages} · {c.level}</Text>
              ) : null}
            </Box>
            <Text fontWeight="600" style={styles.title} i18n={false}>{c.title}</Text>
            {c.blurb ? <Text style={styles.blurb}>{c.blurb}</Text> : null}
          </Box>
        </Box>
      </Box>

      {c.teaches.length > 0 ? (
        <Box paddingHorizontal={16} paddingTop={20}>
          <Text fontWeight="700" style={styles.sectionLabel}>What Robot will teach</Text>
          <Box style={styles.listCard}>
            {c.teaches.map((t, i) => (
              <Box key={t} style={[styles.listRow, i < c.teaches.length - 1 && styles.listBorder]}>
                <Box style={styles.listIcon}>
                  <Text style={{ fontSize: 14 }}>{ICONS[i % 4]}</Text>
                </Box>
                <Text style={styles.listText}>{t}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}

      <Box paddingHorizontal={16} paddingTop={20}>
        <Text fontWeight="700" style={styles.sectionLabel}>Lessons in this course</Text>
        <Box style={styles.listCard}>
          {lessons.kind === 'loading' ? (
            <Box style={styles.listRow}>
              <Text style={styles.listMuted}>Loading lessons</Text>
            </Box>
          ) : null}
          {lessons.kind === 'error' ? (
            <Box style={styles.listRow}>
              <Text style={styles.listMuted}>Lessons unavailable right now</Text>
            </Box>
          ) : null}
          {lessons.kind === 'ready' && lessons.lessons.length === 0 ? (
            <Box style={styles.listRow}>
              <Text style={styles.listMuted}>No lessons published yet</Text>
            </Box>
          ) : null}
          {lessons.kind === 'ready' && lessons.lessons.map((lesson, i) => (
            <Box
              key={lesson.lessonId || `lesson-${i}`}
              style={[styles.listRow, i < lessons.lessons.length - 1 && styles.listBorder]}
            >
              <Box style={styles.listIcon}>
                <Text fontWeight="700" style={styles.lessonIndex} i18n={false}>{i + 1}</Text>
              </Box>
              <Text style={styles.listText} numberOfLines={2} i18n={false}>
                {lesson.title || `Lesson ${i + 1}`}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20} flexDirection="row" gap={8}>
        {[
          ...(c.lessons === null ? [] : [{ v: String(c.lessons), l: 'Lessons' }]),
          ...(c.weeks === null ? [] : [{ v: `${c.weeks}w`, l: 'Pace' }]),
          { v: '4 min', l: 'Per day' },
        ].map(s => (
          <Box key={s.l} flex={1} style={styles.statCard} alignItems="center">
            <Text fontWeight="700" style={styles.statVal} i18n={false}>{s.v}</Text>
            <Text style={styles.statLabel}>{s.l}</Text>
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
        <DeviceBigBtn onClick={handleAddToRobot} disabled={checkingRobot}>Add to Robot</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>Back to library</DeviceBigBtn>
      </Box>
      </DeviceShell>
      <RobotConnectionPrompt
        visible={robotConnectionModalVisible}
        onDismiss={() => setRobotConnectionModalVisible(false)}
        onConnect={() => {
          setRobotConnectionModalVisible(false);
          navigation.navigate(ROUTES.PairAddScreen);
        }}
      />
    </>
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
  listText: { fontSize: 14, color: CL.ink, flex: 1 },
  listMuted: { fontSize: 14, color: CL.ink2 },
  lessonIndex: { fontSize: 13, color: CL.ink2 },
  statCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8 },
  statVal: { fontSize: 18, color: CL.ink },
  statLabel: { fontSize: 11, color: CL.ink2, marginTop: 2 },
  noteCard: { backgroundColor: '#F8F6F1', borderRadius: 12, padding: 14 },
  noteText: { fontSize: 12, color: CL.ink2, lineHeight: 20 },
});
