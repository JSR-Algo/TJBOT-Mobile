import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import COURSES from '../components/courses';
import LCDPreview from '../components/LCDPreview';
import { getCourses, type PublishedCourse } from '@/services/api/course-library.api';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseAddedScreen'>;

export default function CourseAddedScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId ?? 'c_food';
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
    <DeviceShell title="Added to Robot">
      <Box paddingTop={40} paddingHorizontal={24} alignItems="center">
        <RobotDevice emotion="celebrate" size={180} accent="#FF6F61" />
        <Text fontWeight="600" style={styles.heading}>{c.title} is on Robot</Text>
        <Text style={styles.sub}>
          Robot is downloading the lessons now. Your child will see a new course tomorrow morning.
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.card}>
          <LCDPreview emotion={c.lcd} accent="#FF6F61" size={72} />
          <Box flex={1}>
            <Text fontWeight="700" style={styles.onRobotLabel}>On Robot now</Text>
            <Text fontWeight="600" style={styles.lessonTitle}>Lesson 1 · Hello, food!</Text>
            <Text style={styles.lessonMeta}>4 minutes · ready to play</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📅" title="First lesson tomorrow" body="Robot will gently invite your child after breakfast" />
          <DeviceRow icon="🔁" title="Mix into current course" body="Robot will alternate between Hello Friends and Yummy Words" />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.SendToRobotScreen, { courseId })}>Send today's lesson now</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>Back to Robot home</DeviceBigBtn>
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
