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
import { getCourses, type PublishedCourse } from '@/services/api/course-library.api';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseAddedScreen'>;

export default function CourseAddedScreen({ navigation, route }: Props) {
  const { t } = useAppLanguage();
  const courseId = route.params?.courseId ?? 'c_food';
  // assignmentId is set by the enroll-course flow (UnlockConfirmModal →
  // enrollCourse → { enrollment, assignment }). It's only used as a presence
  // signal here — RobotReadyScreen polls the live assignment by deviceId via
  // getCurrentAssignment (no extra wiring needed). When present, swap the
  // "Send today's lesson now" copy so the parent knows the lesson is already
  // queued on the robot.
  const assignmentId = route.params?.assignmentId;
  const hasAssignment = Boolean(assignmentId);
  // Static catalog supplies the LCD emotion; the published catalog overlays the
  // REAL course title for authored courses. `?? COURSES[2]` guards against a
  // courseId that is neither published nor static so the screen never crashes.
  const [published, setPublished] = React.useState<PublishedCourse | null>(null);
  React.useEffect(() => {
    let active = true;
    void getCourses()
      .then((list) => {
        if (active) setPublished(list.find((course) => course.courseId === courseId) ?? null);
      })
      .catch(() => {
        if (active) setPublished(null);
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  const staticCourse = COURSES.find(x => x.id === courseId) ?? COURSES[2]!;
  const c = {
    ...staticCourse,
    title: published?.title?.trim() ? published.title : staticCourse.title,
  };
  return (
    <DeviceShell title={t('Queued for your robot')}>
      <Box paddingTop={40} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="celebrate" size={180} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>{c.title}</Text>
        <Text style={styles.sub}>{t("Robot will pick this up when it's back online.")}</Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.card}>
          <LCDPreview emotion={c.lcd} accent="#FF6F61" size={72} />
          <Box flex={1}>
            <Text fontWeight="700" style={styles.onRobotLabel}>{t('Queued for your robot')}</Text>
            <Text fontWeight="600" style={styles.lessonTitle}>{c.title}</Text>
            <Text style={styles.lessonMeta}>{t('Waiting to send')}</Text>
          </Box>
        </Box>
      </Box>


      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.SendToRobotScreen, { courseId })}>
          {hasAssignment ? t('Reconnect Robot now') : t("Send today's lesson now")}
        </DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>{t('Back to Robot home')}</DeviceBigBtn>
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
});
