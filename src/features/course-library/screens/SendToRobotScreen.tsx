import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { QueryClientContext } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import LCDPreview from '../components/LCDPreview';
import {
  createAssignment,
  enrollCourse,
  getCourseLessons,
  getCourses,
  getCurrentAssignment,
  isAssignablePublishedLesson,
  isLessonProfile,
  type CurrentAssignment,
  type PublishedCourse,
  type PublishedLesson,
} from '@/services/api/course-library.api';
import { getDeviceStatus } from '@/services/api/device.api';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { formatLessonCopy, getErrorMessage, normalizeError } from '@/utils/errors';
import { lessonFitCopy } from '@/features/parent/courseInsights';

type Props = NativeStackScreenProps<RootStackParamList, 'SendToRobotScreen'>;

// P4 — the SEED_LESSON literal is RETIRED. The lesson the parent picks here drives
// the real createAssignment {lessonId, lessonVersion (NUMBER), profile} and the
// (deviceId, lessonId, childId) idempotency key. The catalog is the authored
// published catalog (GET /courses, GET /courses/:id/lessons), never a hardcoded
// course/lesson array.
type CatalogState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; courses: PublishedCourse[]; lessonsByCourse: Record<string, PublishedLesson[]> }
  | { kind: 'error'; message: string };

type AssignmentMode = 'lesson' | 'course';

function currentMatchesLesson(current: CurrentAssignment, childId: string, lesson: PublishedLesson): boolean {
  return current.childId === childId &&
    current.lessonId === lesson.lessonId &&
    current.lessonVersion === lesson.lessonVersion;
}

function currentMatchesCourse(current: CurrentAssignment, childId: string, courseLessons: PublishedLesson[]): boolean {
  return current.childId === childId &&
    courseLessons.some((lesson) => current.lessonId === lesson.lessonId && current.lessonVersion === lesson.lessonVersion);
}

export default function SendToRobotScreen({ navigation, route }: Props) {
  // childId = the parent-selected ACTIVE child (D-CHILD-RESOLUTION, ADR 0013 §N),
  // sent EXPLICITLY. For multi-child families the parent picks who they're
  // sending to via the selector below; single-child resolves to the one child
  // (activeChild === children[0]). Household isolation is enforced server-side
  // (D-HOUSEHOLD-AUTHZ), not by this choice. useOptionalHousehold so the screen
  // degrades gracefully outside a provider.
  const household = useOptionalHousehold();
  const queryClient = React.useContext(QueryClientContext);
  const childrenList = household?.children ?? [];
  const childId = household?.activeChild?.id;
  const hasChild = Boolean(childId);
  const setActiveChild = household?.setActiveChild;

  const [catalog, setCatalog] = React.useState<CatalogState>({ kind: 'loading' });
  const [assignmentMode, setAssignmentMode] = React.useState<AssignmentMode>('lesson');
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const preferredCourseId = route.params?.courseId;

  // Fetch the published catalog + each course's lessons once on mount. Lessons
  // are fetched eagerly per course so switching the course selection never shows
  // a sub-spinner — the slice catalog is small.
  React.useEffect(() => {
    let active = true;
    setCatalog({ kind: 'loading' });
    (async () => {
      try {
        const courses = await getCourses();
        if (!active) return;
        if (courses.length === 0) {
          setCatalog({ kind: 'empty' });
          return;
        }
        const lessonLists = await Promise.all(
          courses.map((course) => getCourseLessons(course.courseId, childId ? { childId } : undefined)),
        );
        if (!active) return;
        const lessonsByCourse: Record<string, PublishedLesson[]> = {};
        courses.forEach((course, i) => {
          lessonsByCourse[course.courseId] = lessonLists[i] ?? [];
        });
        setCatalog({ kind: 'ready', courses, lessonsByCourse });
      } catch (err) {
        if (active) setCatalog({ kind: 'error', message: getErrorMessage(normalizeError(err).code) });
      }
    })();
    return () => {
      active = false;
    };
  }, [childId]);

  // Resolve the active course: an explicit user pick wins, then the course passed
  // in via route params (deep-link from the library), then the first published
  // course. Reset the lesson selection whenever the course changes.
  const courses = React.useMemo(
    () => (catalog.kind === 'ready' ? catalog.courses : []),
    [catalog],
  );
  const activeCourseId = React.useMemo(() => {
    if (catalog.kind !== 'ready') return null;
    const pick = selectedCourseId ?? preferredCourseId ?? courses[0]?.courseId ?? null;
    return courses.some((course) => course.courseId === pick) ? pick : courses[0]?.courseId ?? null;
  }, [catalog.kind, selectedCourseId, preferredCourseId, courses]);

  const lessons = React.useMemo(() => {
    if (catalog.kind !== 'ready' || !activeCourseId) return [];
    return catalog.lessonsByCourse[activeCourseId] ?? [];
  }, [catalog, activeCourseId]);

  // Default the lesson selection to the first lesson of the active course; an
  // explicit user pick (in this course) wins.
  const activeLessonId = React.useMemo(() => {
    if (lessons.length === 0) return null;
    const pick = selectedLessonId;
    return pick && lessons.some((lesson) => lesson.lessonId === pick) ? pick : lessons[0]!.lessonId;
  }, [lessons, selectedLessonId]);

  const selectedLesson = React.useMemo(
    () => lessons.find((lesson) => lesson.lessonId === activeLessonId) ?? null,
    [lessons, activeLessonId],
  );

  const selectedLessonReady = Boolean(selectedLesson && isAssignablePublishedLesson(selectedLesson));

  const courseReady = React.useMemo(
    () => lessons.length > 0 && lessons.every((lesson) => isAssignablePublishedLesson(lesson)),
    [lessons],
  );

  // Gate send on the catalog's readiness hint: a lesson with no renderable
  // espTft bundle (manifestReady=false / profile!=espTft) is not sendable. The
  // server READY gate remains authoritative for the actual preload.
  const canSend = assignmentMode === 'course'
    ? hasChild && !!activeCourseId && courseReady && !sending
    : hasChild &&
      !!selectedLesson &&
      selectedLessonReady &&
      !sending;

  const handleSelectMode = (mode: AssignmentMode) => {
    setError(null);
    setAssignmentMode(mode);
  };

  const handleSelectCourse = (courseId: string) => {
    setError(null);
    setSelectedCourseId(courseId);
    setSelectedLessonId(null); // reset lesson when course changes
  };

  const handleSelectLesson = (lessonId: string) => {
    setError(null);
    setSelectedLessonId(lessonId);
  };

  const handleSend = async () => {
    setError(null);
    // Empty children → explicit "add a child first" state; never send childId: undefined.
    if (!childId) {
      setError('Add a child to this household before sending a lesson.');
      return;
    }
    if (assignmentMode === 'course' && !activeCourseId) {
      setError('Pick a course to assign to Robot.');
      return;
    }
    if (assignmentMode === 'course' && !courseReady) {
      setError('This course is still preparing on the server. Try again in a moment.');
      return;
    }
    if (assignmentMode === 'lesson' && !selectedLesson) {
      setError('Pick a lesson to send to Robot.');
      return;
    }
    if (assignmentMode === 'lesson' && selectedLesson && !isAssignablePublishedLesson(selectedLesson)) {
      setError('This lesson is still preparing on the server. Try again in a moment.');
      return;
    }
    setSending(true);
    try {
      // Resolve the household device for the ACTIVE child, not blindly the
      // first-listed robot. In a multi-robot household this routes the lesson to
      // the child's own robot (device whose assignedChildProfileId === childId),
      // falling back to the first device when no per-child binding is available.
      const device = await getDeviceStatus('primary', childId);
      const deviceId = device.id;
      if (!deviceId) {
        setError(formatLessonCopy(getErrorMessage('ROBOT_OFFLINE'), { robot: device.name }));
        return;
      }
      if (assignmentMode === 'course') {
        if (!activeCourseId) return;
        try {
          const { assignment } = await enrollCourse(activeCourseId, { childId, deviceId });
          void queryClient?.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
          navigation.navigate(ROUTES.RobotReadyScreen, {
            deviceId,
            assignmentId: assignment.id,
            assignmentVersion: assignment.assignmentVersion,
            manifestChecksum: assignment.manifestChecksum,
          });
        } catch (err) {
          const normalized = normalizeError(err);
          if (normalized.code === 'ASSIGNMENT_CONFLICT') {
            const current = await getCurrentAssignment(deviceId);
            if (current && currentMatchesCourse(current, childId, lessons)) {
              void queryClient?.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
              navigation.navigate(ROUTES.RobotReadyScreen, {
                deviceId,
                assignmentId: current.assignmentId,
                assignmentVersion: current.assignmentVersion,
                manifestChecksum: current.manifestChecksum,
              });
              return;
            }
          }
          setError(formatLessonCopy(getErrorMessage(normalized.code), { robot: device.name }));
        }
        return;
      }
      if (!selectedLesson) return;
      try {
        // The REAL lesson the parent picked drives the assignment + idempotency key.
        const assignment = await createAssignment({
          deviceId,
          childId,
          lessonId: selectedLesson.lessonId,
          lessonVersion: selectedLesson.lessonVersion, // NUMBER (D-LV)
          // Forward the lesson's REAL profile (gated non-null + recognized by
          // canSend / the guard above), so a piTft/mobile lesson is no longer
          // mis-sent as espTft (MOB-3).
          profile: isLessonProfile(selectedLesson.profile) ? selectedLesson.profile : undefined,
        });
        // The new assignment is now the child's in-flight lesson. Invalidate the
        // shared progress cache (SAME key ParentToday/History/TodayProgress read)
        // so those screens refetch instead of showing stale pre-send data.
        void queryClient?.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
        navigation.navigate(ROUTES.RobotReadyScreen, {
          deviceId,
          assignmentId: assignment.assignmentId,
          assignmentVersion: assignment.assignmentVersion,
          manifestChecksum: assignment.manifestChecksum,
        });
      } catch (err) {
        const normalized = normalizeError(err);
        // ASSIGNMENT_CONFLICT → refetch the current assignment and proceed from
        // the fresh assignment_version; never blind-retry a stale create.
        if (normalized.code === 'ASSIGNMENT_CONFLICT') {
          const current = await getCurrentAssignment(deviceId);
          if (current && currentMatchesLesson(current, childId, selectedLesson)) {
            void queryClient?.invalidateQueries({ queryKey: ['lesson-progress', 'child', childId] });
            navigation.navigate(ROUTES.RobotReadyScreen, {
              deviceId,
              assignmentId: current.assignmentId,
              assignmentVersion: current.assignmentVersion,
              manifestChecksum: current.manifestChecksum,
            });
            return;
          }
        }
        setError(formatLessonCopy(getErrorMessage(normalized.code), { robot: device.name }));
      }
    } catch (err) {
      setError(formatLessonCopy(getErrorMessage(normalizeError(err).code)));
    } finally {
      setSending(false);
    }
  };

  return (
    <DeviceShell title="Today's lesson" onBack={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>
      <Text style={styles.intro}>
        Pick one lesson or assign the whole course to Robot.
      </Text>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.modeSwitch}>
          <TouchableOpacity
            onPress={() => handleSelectMode('lesson')}
            style={[styles.modeOption, assignmentMode === 'lesson' && styles.modeOptionSel]}
            accessibilityRole="button"
            accessibilityState={{ selected: assignmentMode === 'lesson' }}
            accessibilityLabel="Send one lesson"
          >
            <Text fontWeight="700" style={[styles.modeText, assignmentMode === 'lesson' && styles.modeTextSel]}>One lesson</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSelectMode('course')}
            style={[styles.modeOption, assignmentMode === 'course' && styles.modeOptionSel]}
            accessibilityRole="button"
            accessibilityState={{ selected: assignmentMode === 'course' }}
            accessibilityLabel="Send whole course"
          >
            <Text fontWeight="700" style={[styles.modeText, assignmentMode === 'course' && styles.modeTextSel]}>Whole course</Text>
          </TouchableOpacity>
        </Box>
      </Box>

      {childrenList.length > 1 && (
        <Box paddingHorizontal={16} paddingTop={18}>
          <Text fontWeight="700" style={styles.sectionLabel}>Child</Text>
          <Box style={styles.rowCard}>
            {childrenList.map((child, i) => {
              const sel = child.id === childId;
              return (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setActiveChild?.(child.id)}
                  style={[styles.pickRow, i < childrenList.length - 1 && styles.pickBorder, sel && styles.pickRowSel]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={`Send to ${child.name}`}
                >
                  <Box flex={1}>
                    <Text fontWeight="600" style={styles.pickTitle} i18n={false}>{child.name}</Text>
                  </Box>
                  {sel ? <Text fontWeight="800" style={styles.pickCheck}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </Box>
        </Box>
      )}

      {catalog.kind === 'loading' && (
        <Box paddingHorizontal={20} paddingTop={18}>
          <Text style={styles.hintText}>Loading lessons…</Text>
        </Box>
      )}

      {catalog.kind === 'empty' && (
        <Box paddingHorizontal={20} paddingTop={18}>
          <Text style={styles.hintText}>No published courses yet. Add a course to Robot first.</Text>
        </Box>
      )}

      {catalog.kind === 'error' && (
        <Box paddingHorizontal={20} paddingTop={18}>
          <Text style={styles.errorText}>{catalog.message}</Text>
        </Box>
      )}

      {catalog.kind === 'ready' && (
        <>
          {courses.length > 1 && (
            <Box paddingHorizontal={16} paddingTop={18}>
              <Text fontWeight="700" style={styles.sectionLabel}>Course</Text>
              <Box style={styles.rowCard}>
                {courses.map((course, i) => {
                  const sel = course.courseId === activeCourseId;
                  return (
                    <TouchableOpacity
                      key={course.courseId}
                      onPress={() => handleSelectCourse(course.courseId)}
                      style={[styles.pickRow, i < courses.length - 1 && styles.pickBorder, sel && styles.pickRowSel]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel }}
                      accessibilityLabel={`Pick course ${course.title}`}
                    >
                      <Box flex={1}>
                        <Text fontWeight="600" style={styles.pickTitle}>{course.title}</Text>
                        <Text style={styles.pickMeta}>{course.lessonCount} lessons</Text>
                      </Box>
                      {sel ? <Text fontWeight="800" style={styles.pickCheck}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </Box>
            </Box>
          )}

          {assignmentMode === 'lesson' && (
          <Box paddingHorizontal={16} paddingTop={18}>
            <Text fontWeight="700" style={styles.sectionLabel}>Lesson</Text>
            {lessons.length === 0 ? (
              <Box paddingHorizontal={4} paddingTop={4}>
                <Text style={styles.hintText}>This course has no lessons ready yet.</Text>
              </Box>
            ) : (
              <Box style={styles.rowCard}>
                {lessons.map((lesson, i) => {
                  const sel = lesson.lessonId === activeLessonId;
                  const fitCopy = lessonFitCopy(lesson);
                  return (
                    <TouchableOpacity
                      key={lesson.lessonId}
                      onPress={() => handleSelectLesson(lesson.lessonId)}
                      style={[styles.pickRow, i < lessons.length - 1 && styles.pickBorder, sel && styles.pickRowSel]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel }}
                      accessibilityLabel={`Pick lesson ${lesson.title}`}
                    >
                      <LCDPreview emotion="happy" accent="#FF6F61" size={48} />
                      <Box flex={1}>
                        <Text fontWeight="600" style={styles.pickTitle}>{lesson.title}</Text>
                        <Text style={styles.pickMeta}>
                          {isAssignablePublishedLesson(lesson) ? 'Ready to send' : 'Preparing on server'}
                        </Text>
                        {fitCopy ? <Text style={styles.fitMeta} i18n={false}>{fitCopy}</Text> : null}
                      </Box>
                      {sel ? <Text fontWeight="800" style={styles.pickCheck}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </Box>
            )}
          </Box>
          )}
          {assignmentMode === 'lesson' && selectedLesson && !selectedLessonReady && (
            <Box paddingHorizontal={20} paddingTop={18}>
              <Text style={styles.hintText}>This lesson is still preparing on the server. Try again in a moment.</Text>
            </Box>
          )}
          {assignmentMode === 'course' && !courseReady && (
            <Box paddingHorizontal={20} paddingTop={18}>
              <Text style={styles.hintText}>This course is still preparing on the server. Try again in a moment.</Text>
            </Box>
          )}
        </>
      )}

      {!hasChild && (
        <Box paddingHorizontal={20} paddingTop={12}>
          <Text style={styles.hintText}>Add a child to this household to send a lesson.</Text>
        </Box>
      )}

      {error && (
        <Box paddingHorizontal={20} paddingTop={12}>
          <Text style={styles.errorText}>{error}</Text>
        </Box>
      )}

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        <DeviceBigBtn disabled={!canSend} onClick={handleSend} accessibilityLabel={assignmentMode === 'course' ? 'Assign course' : 'Send to Robot'}>
          {sending ? 'Sending…' : assignmentMode === 'course' ? 'Assign course' : 'Send to Robot'}
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: CL.ink2, lineHeight: 20, paddingHorizontal: 20, paddingTop: 14 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  modeSwitch: { flexDirection: 'row', gap: 6, backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 8, padding: 4 },
  modeOption: { flex: 1, minHeight: 40, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  modeOptionSel: { backgroundColor: CL.accent },
  modeText: { fontSize: 13, color: CL.ink2, lineHeight: 18 },
  modeTextSel: { color: '#fff' },
  rowCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  pickRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12 },
  pickRowSel: { backgroundColor: '#E8F0FE' },
  pickBorder: { borderBottomWidth: 1, borderBottomColor: CL.hair },
  pickTitle: { fontSize: 14, color: CL.ink, lineHeight: 19 },
  pickMeta: { fontSize: 12, color: CL.ink2, marginTop: 2, lineHeight: 17 },
  fitMeta: { fontSize: 12, color: CL.ink3, marginTop: 2, lineHeight: 17 },
  pickCheck: { fontSize: 16, color: CL.accent },
  hintText: { fontSize: 13, color: CL.ink2, lineHeight: 19 },
  errorText: { fontSize: 13, color: '#C0392B', lineHeight: 19 },
});
