import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import RobotImage from '@/components/RobotImage';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import COURSES from '../components/courses';
import { ROUTES } from '@/navigation/routes';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'BuyCourseScreen'>;

const COURSE = COURSES[2]!;

export default function BuyCourseScreen({ navigation, route }: Props) {
  const { language, t } = useAppLanguage();
  const courseId = route.params?.courseId ?? COURSE.id;
  const c = COURSES.find((course) => course.id === courseId) ?? COURSE;
  const title = translateTemplate('Add {{title}}', { title: c.title }, { locale: language });
  const courseMeta = translateTemplate(
    '{{lessons}} {{lessonLabel}} · {{weeks}} {{weekLabel}}',
    { lessons: c.lessons, lessonLabel: t('lessons'), weeks: c.weeks, weekLabel: t('weeks') },
    { locale: language },
  );

  return (
    <DeviceShell title={title} onBack={() => navigation.navigate(ROUTES.CourseDetailScreen, { courseId })}>
      <Box paddingHorizontal={16} paddingTop={24}>
        <Box style={styles.courseTile}>
          <Box style={styles.lcdWrap}>
            <RobotImage variant="head" size={66} />
          </Box>
          <Box>
            <Text fontWeight="600" style={styles.courseName}>{c.title}</Text>
            <Text style={styles.courseMeta} i18n={false}>{courseMeta}</Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={20}>
        <Box testID="buyCourseFreeMode" style={styles.freeCard}>
          <Text fontWeight="700" style={styles.freeTitle}>Included for now</Text>
          <Text style={styles.freeBody}>Courses are free in this build. Add this course after a quick parent check.</Text>
        </Box>
      </Box>

      <Text style={styles.promise}>
        Your child sees only courses you've added to Robot.
      </Text>

      <Box paddingHorizontal={20} paddingTop={20} paddingBottom={30} gap={10}>
        <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.UnlockConfirmScreen, { courseId })}>Add free course</DeviceBigBtn>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.CourseDetailScreen, { courseId })}>Not now</DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  courseTile: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' },
  lcdWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  courseName: { fontSize: 14, color: CL.ink },
  courseMeta: { fontSize: 12, color: CL.ink2, marginTop: 2 },
  freeCard: { backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14, padding: 14 },
  freeTitle: { fontSize: 15, color: CL.ink },
  freeBody: { fontSize: 12, color: CL.ink2, lineHeight: 18, marginTop: 4 },
  promise: { fontSize: 12, color: CL.ink2, lineHeight: 20, paddingHorizontal: 20, paddingTop: 18 },
});
