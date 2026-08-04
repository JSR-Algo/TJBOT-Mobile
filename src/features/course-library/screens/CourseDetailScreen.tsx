import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { QueryClientContext } from '@tanstack/react-query';
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
  enrollCourse,
  listChildEnrollments,
  cancelCourseEnrollment,
  getCurrentAssignment,
  type CurrentAssignment,
  type Enrollment,
  type PublishedCourse,
  type PublishedLesson,
} from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';
import { formatLessonCopy, getErrorMessage, normalizeError } from '@/utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseDetailScreen'>;

type LessonsState =
  | { kind: 'loading' }
  | { kind: 'ready'; lessons: PublishedLesson[] }
  | { kind: 'error' };

type EnrollmentState =
  | { kind: 'idle'; enrollment: null }
  | { kind: 'loading'; enrollment: null }
  | { kind: 'ready'; enrollment: Enrollment | null }
  | { kind: 'error'; enrollment: null; message: string };

const ICONS = ['🗣️', '🎯', '💛', '🔢'];
const COURSE = COURSES[2]!;

export default function CourseDetailScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId ?? COURSE.id;
  const household = useOptionalHousehold();
  const queryClient = React.useContext(QueryClientContext);
  const childId = household?.activeChild?.id;
  const mountedRef = React.useRef(true);
  const courseIdRef = React.useRef(courseId);
  const childIdRef = React.useRef(childId);
  const actionSeqRef = React.useRef(0);
  const enrollmentLoadSeqRef = React.useRef(0);
  const cancellingRef = React.useRef(false);
  const [checkingRobot, setCheckingRobot] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [lifecycleError, setLifecycleError] = React.useState<string | null>(null);
  const [robotConnectionModalVisible, setRobotConnectionModalVisible] = React.useState(false);
  const [enrollmentState, setEnrollmentState] = React.useState<EnrollmentState>({ kind: 'idle', enrollment: null });

  const showRobotConnectionModal = React.useCallback(() => {
    setRobotConnectionModalVisible(true);
  }, []);

  courseIdRef.current = courseId;
  childIdRef.current = childId;

  React.useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const canWriteEnrollmentLoad = React.useCallback((loadSeq: number, courseIdForLoad: string, childIdForLoad: string | undefined, expectedActionSeq?: number): boolean => (
    mountedRef.current &&
    enrollmentLoadSeqRef.current === loadSeq &&
    courseIdRef.current === courseIdForLoad &&
    childIdRef.current === childIdForLoad &&
    (expectedActionSeq === undefined || actionSeqRef.current === expectedActionSeq)
  ), []);

  const isSameAction = React.useCallback((actionSeq: number): boolean => (
    mountedRef.current && actionSeqRef.current === actionSeq
  ), []);

  const isCurrentAction = React.useCallback((actionSeq: number, courseIdForAction: string, childIdForAction: string): boolean => (
    mountedRef.current &&
    actionSeqRef.current === actionSeq &&
    courseIdRef.current === courseIdForAction &&
    childIdRef.current === childIdForAction
  ), []);

  const loadEnrollment = React.useCallback(async (courseIdForLoad = courseId, expectedActionSeq?: number, childIdForLoad = childId): Promise<Enrollment | null | undefined> => {
    if (courseIdRef.current !== courseIdForLoad || childIdRef.current !== childIdForLoad) return;
    const loadSeq = ++enrollmentLoadSeqRef.current;
    if (!childIdForLoad) {
      if (canWriteEnrollmentLoad(loadSeq, courseIdForLoad, childIdForLoad, expectedActionSeq)) {
        setEnrollmentState({ kind: 'idle', enrollment: null });
      }
      return null;
    }
    setEnrollmentState({ kind: 'loading', enrollment: null });
    try {
      const result = await listChildEnrollments(childIdForLoad);
      if (!canWriteEnrollmentLoad(loadSeq, courseIdForLoad, childIdForLoad, expectedActionSeq)) return;
      const enrollmentForCourse = result.enrollments.find((enrollment) => enrollment.courseId === courseIdForLoad) ?? null;
      setEnrollmentState({
        kind: 'ready',
        enrollment: enrollmentForCourse,
      });
      return enrollmentForCourse;
    } catch {
      if (!canWriteEnrollmentLoad(loadSeq, courseIdForLoad, childIdForLoad, expectedActionSeq)) return;
      setEnrollmentState({ kind: 'error', enrollment: null, message: 'Course status unavailable right now' });
      return undefined;
    }
  }, [canWriteEnrollmentLoad, childId, courseId]);

  React.useEffect(() => {
    void loadEnrollment(courseId, undefined, childId);
  }, [childId, courseId, loadEnrollment]);

  const navigateToRobotReady = React.useCallback((params: {
    childId: string;
    courseId: string;
    deviceId: string;
    assignmentId: string;
    assignmentVersion: number;
    lessonTitle?: string;
    manifestChecksum: string | null;
  }) => {
    navigation.navigate(ROUTES.RobotReadyScreen, params);
  }, [navigation]);

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

  const handleResumeCourse = React.useCallback(async () => {
    if (checkingRobot) return;
    setLifecycleError(null);
    if (!childId) {
      showRobotConnectionModal();
      return;
    }
    const actionSeq = ++actionSeqRef.current;
    setCheckingRobot(true);
    try {
      const robot = await getDeviceStatus('primary', childId);
      if (!isCurrentAction(actionSeq, courseId, childId)) return;
      const deviceId = robot.id;
      if (!deviceId || robot.online !== true) {
        if (isCurrentAction(actionSeq, courseId, childId)) showRobotConnectionModal();
        return;
      }
      try {
        const { assignment } = await enrollCourse(courseId, { childId, deviceId });
        if (!isCurrentAction(actionSeq, courseId, childId)) return;
        void queryClient?.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
        navigateToRobotReady({
          childId,
          courseId,
          deviceId,
          assignmentId: assignment.id,
          assignmentVersion: assignment.assignmentVersion,
          lessonTitle: assignment.lessonTitle || undefined,
          manifestChecksum: assignment.manifestChecksum,
        });
      } catch (err) {
        const normalized = normalizeError(err);
        if (!isCurrentAction(actionSeq, courseId, childId)) return;
        if (normalized.code === 'ASSIGNMENT_CONFLICT') {
          const [current, authoritativeLessons] = await Promise.all([
            getCurrentAssignment(deviceId),
            getCourseLessons(courseId),
          ]);
          if (!isCurrentAction(actionSeq, courseId, childId)) return;
          if (current && currentMatchesCourse(current, childId, authoritativeLessons)) {
            void queryClient?.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
            navigateToRobotReady({
              childId,
              courseId,
              deviceId,
              assignmentId: current.assignmentId,
              assignmentVersion: current.assignmentVersion,
              lessonTitle: current.lessonTitle || undefined,
              manifestChecksum: current.manifestChecksum,
            });
            return;
          }
        }
        if (isCurrentAction(actionSeq, courseId, childId)) {
          setLifecycleError(formatLessonCopy(getErrorMessage(normalized.code), { robot: robot.name }));
        }
      }
    } catch (err) {
      if (isCurrentAction(actionSeq, courseId, childId)) {
        setLifecycleError(formatLessonCopy(getErrorMessage(normalizeError(err).code)));
      }
    } finally {
      if (isSameAction(actionSeq)) setCheckingRobot(false);
    }
  }, [checkingRobot, childId, courseId, isCurrentAction, isSameAction, navigateToRobotReady, queryClient, showRobotConnectionModal]);

  const handleAddToRobot = React.useCallback(async () => {
    if (checkingRobot) return;
    if (enrollmentState.kind === 'ready' && enrollmentState.enrollment && enrollmentState.enrollment.status !== 'COMPLETED') {
      await handleResumeCourse();
      return;
    }
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
  }, [checkingRobot, childId, courseId, enrollmentState, handleResumeCourse, navigation, showRobotConnectionModal]);

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

  const enrollment = enrollmentState.enrollment;
  const lifecycleLabel = enrollment ? `Course ${enrollment.status.toLowerCase()}` : null;
  const canResume = enrollment?.status === 'ACTIVE' || enrollment?.status === 'PAUSED' || enrollment?.status === 'CANCELLED';
  const canCancel = enrollment?.status === 'ACTIVE' || enrollment?.status === 'PAUSED';
  const primaryLabel = canResume
    ? enrollment.status === 'ACTIVE'
      ? 'Continue course'
      : 'Resume course'
    : 'Add to Robot';

  const handleConfirmCancel = React.useCallback(() => {
    if (!childId || !canCancel || cancellingRef.current) return;
    Alert.alert(
      'Cancel course?',
      'This removes the course from Robot for now; progress stays saved if you resume later.',
      [
        { text: 'Keep course', style: 'cancel' },
        {
          text: 'Cancel course',
          style: 'destructive',
          onPress: () => {
            if (cancellingRef.current) return;
            cancellingRef.current = true;
            const actionSeq = ++actionSeqRef.current;
            setLifecycleError(null);
            setCancelling(true);
            void cancelCourseEnrollment(courseId, childId)
              .then(async (result) => {
                const authoritativeEnrollment = await loadEnrollment(courseId, actionSeq, childId);
                if (!result.cancelled && authoritativeEnrollment && (authoritativeEnrollment.status === 'ACTIVE' || authoritativeEnrollment.status === 'PAUSED')) {
                  throw new Error('Course enrollment was not cancelled');
                }
              })
              .catch((err) => {
                if (!mountedRef.current || actionSeq !== actionSeqRef.current || courseIdRef.current !== courseId || childIdRef.current !== childId) return;
                setLifecycleError(getErrorMessage(normalizeError(err).code));
              })
              .finally(() => {
                cancellingRef.current = false;
                if (mountedRef.current) setCancelling(false);
              });
          },
        },
      ],
    );
  }, [canCancel, childId, courseId, loadEnrollment]);

  const primaryAction = canResume ? handleResumeCourse : handleAddToRobot;

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
        {enrollmentState.kind === 'loading' ? <Text style={styles.lifecycleText}>Loading course status</Text> : null}
        {enrollmentState.kind === 'error' ? <Text style={styles.errorText}>{enrollmentState.message}</Text> : null}
        {lifecycleLabel ? <Text style={styles.lifecycleText}>{lifecycleLabel}</Text> : null}
        {lifecycleError ? <Text style={styles.errorText}>{lifecycleError}</Text> : null}
        <DeviceBigBtn onClick={primaryAction} disabled={checkingRobot || cancelling || enrollment?.status === 'COMPLETED'}>{checkingRobot ? 'Preparing course' : primaryLabel}</DeviceBigBtn>
        {canCancel ? (
          <DeviceBigBtn danger onClick={handleConfirmCancel} disabled={checkingRobot || cancelling}>
            {cancelling ? 'Cancelling course' : 'Cancel course'}
          </DeviceBigBtn>
        ) : null}
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.CourseLibraryScreen)}>Back to library</DeviceBigBtn>
      </Box>
      </DeviceShell>
      <RobotConnectionPrompt
        visible={robotConnectionModalVisible}
        onDismiss={() => setRobotConnectionModalVisible(false)}
        onConnect={() => {
          setRobotConnectionModalVisible(false);
          navigation.navigate(ROUTES.DeviceOverviewScreen);
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
  lifecycleText: { fontSize: 13, color: CL.ink2, textAlign: 'center' },
  errorText: { fontSize: 13, color: '#9F2D20', textAlign: 'center' },
});

function currentMatchesCourse(current: CurrentAssignment, childId: string, courseLessons: PublishedLesson[]): boolean {
  return current.childId === childId &&
    courseLessons.some((lesson) => current.lessonId === lesson.lessonId && current.lessonVersion === lesson.lessonVersion);
}
