import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import COURSES from '../components/courses';
import LCDPreview from '../components/LCDPreview';
import {
  getCourses,
  getCurrentAssignment,
  getPreloadStatus,
  isPreloadReady,
  type PreloadStatus,
  type CurrentAssignment,
  type PublishedCourse,
} from '@/services/api/course-library.api';

import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { useScreenActivity } from '../useScreenActivity';
import { entryAssignment } from '../assignmentReconciliation';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseAddedScreen'>;

export default function CourseAddedScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId ?? 'c_food';
  const selection = route.params ?? {};
  const { assignmentId, deviceId } = selection;
  const household = useOptionalHousehold();
  const { active: screenActive, key, isCurrent } = useScreenActivity(JSON.stringify([selection, household?.activeChild?.id]));
  const leaving = React.useRef(false);
  React.useEffect(() => { leaving.current = false; }, [key]);
  const hasAssignment = Boolean(assignmentId);
  const [retry, setRetry] = React.useState(0);
  // Static catalog supplies the LCD emotion; the published catalog overlays the
  // real course title for authored courses. Unknown courses use a neutral face.
  const [published, setPublished] = React.useState<PublishedCourse | null>(null);
  React.useEffect(() => {
    let active = true;
    setPublished(null);
    if (!screenActive) return;
    void getCourses()
      .then((list) => {
        if (active && isCurrent(key)) setPublished(list.find((course) => course.courseId === courseId) ?? null);
      })
      .catch(() => {
        if (active && isCurrent(key)) setPublished(null);
      });
    return () => {
      active = false;
    };
  }, [courseId, key, screenActive, isCurrent]);

  const [readback, setReadback] = React.useState<{
    key: string; assignment: CurrentAssignment | null; preload: PreloadStatus | null;
  } | null>(null);
  React.useEffect(() => {
    let active = true;
    setReadback(null);
    if (!screenActive || !deviceId) return;
    void Promise.all([getCurrentAssignment(deviceId), getPreloadStatus(deviceId)])
      .then(([assignment, preload]) => {
        if (active && isCurrent(key) && !leaving.current) setReadback({ key, assignment, preload });
      })
      .catch(() => {
        if (active && isCurrent(key) && !leaving.current) setReadback({ key, assignment: null, preload: null });
      });
    return () => { active = false; };
  }, [deviceId, key, screenActive, isCurrent, retry]);
  const seated = screenActive && readback?.key === key ? entryAssignment(selection, readback.assignment) : null;
  const preload = readback?.key === key ? readback.preload : null;
  const preloadMatches = Boolean(seated && preload && seated.assignmentId === preload.assignmentId && seated.profile === preload.profile);
  const ready = Boolean(seated?.state === 'READY' && preloadMatches && preload && !preload.errorCode && isPreloadReady(preload));
  const running = seated?.state === 'RUNNING' && preloadMatches && preload && !preload.errorCode &&
    (preload.state === 'READY' || preload.state === 'RUNNING');
  const status = ready ? 'Ready to play' : running ? 'Lesson in progress' : 'Check Robot to verify the selected lesson.';
  const leave = () => { leaving.current = true; navigation.navigate(ROUTES.DeviceHomeScreen); };

  // Backend course ids are course_keys ('w01-place-words'), which never match a
  // static catalog id ('c_food'), so `?? COURSES[2]` meant every authored course
  // borrowed Yummy Words' LCD face. A miss renders a neutral face instead.
  const staticCourse = COURSES.find(x => x.id === courseId) ?? null;
  const c = {
    lcd: staticCourse?.lcd ?? 'happy',
    title: published?.title?.trim() ? published.title : staticCourse?.title ?? '',
  };
  return (
    <DeviceShell title="Added to Robot" onBack={leave}>
      <Box paddingTop={40} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="celebrate" size={180} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>{seated ? c.title + ' is on Robot' : c.title || 'Check Robot'}</Text>
        <Text style={styles.sub}>
          Check the selected lesson on Robot before handing it to your child.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.card}>
          <LCDPreview emotion={c.lcd} accent="#FF6F61" size={72} />
          <Box flex={1}>
            <Text fontWeight="700" style={styles.onRobotLabel}>{seated ? 'On Robot now' : 'Selected lesson'}</Text>
            {seated?.lessonTitle?.trim() ? (
              <Text fontWeight="600" style={styles.lessonTitle} numberOfLines={2} i18n={false}>
                {seated.lessonTitle}
              </Text>
            ) : (
              <Text fontWeight="600" style={styles.lessonTitle}>Preparing the first lesson</Text>
            )}
            <Text style={styles.lessonMeta}>{status}</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => {
          if (!screenActive || !isCurrent(key) || leaving.current) return;
          if (seated) {
            leaving.current = true;
            navigation.navigate(ROUTES.RobotReadyScreen, {
              ...selection, courseId, childId: seated.childId, assignmentId: seated.assignmentId,
              assignmentVersion: seated.assignmentVersion, profile: seated.profile, manifestChecksum: seated.manifestChecksum,
            });
            return;
          }
          if (hasAssignment || deviceId) {
            setReadback(null);
            setRetry(value => value + 1);
            return;
          }
          leaving.current = true;
          navigation.navigate(ROUTES.SendToRobotScreen, { courseId });
        }}>
          {seated ? "Open today's lesson" : hasAssignment || deviceId ? "Try again" : "Send today's lesson now"}
        </DeviceBigBtn>
        {(hasAssignment || deviceId) && !seated && <DeviceBigBtn secondary onClick={() => {
          leaving.current = true;
          navigation.navigate(ROUTES.SendToRobotScreen, { courseId });
        }}>Pick a different lesson</DeviceBigBtn>}
        <DeviceBigBtn secondary onClick={leave}>Back to Robot home</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, color: CL.ink, letterSpacing: -0.3, textAlign: 'center', marginTop: 24 },
  sub: { fontSize: 14, color: CL.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 8 },
  card: {
    backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  onRobotLabel: { fontSize: 11, color: CL.good, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  lessonTitle: { fontSize: 14, color: CL.ink },
  lessonMeta: { fontSize: 12, color: CL.ink2, marginTop: 2 },
  rowCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
});
