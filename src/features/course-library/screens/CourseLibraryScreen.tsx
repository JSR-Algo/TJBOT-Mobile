import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from '../components/CL';
import COURSES from '../components/courses';
import CourseCard from '../components/CourseCard';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseLibraryScreen'>;

const SECTIONS = [
  { title: 'On your Robot now', filter: (c: typeof COURSES[0]) => c.state === 'installed' },
  { title: 'Available to add',  filter: (c: typeof COURSES[0]) => c.state === 'not_installed' },
  { title: 'For when ready',    filter: (c: typeof COURSES[0]) => c.state === 'locked',
    help: "These are shaped for older kids. Robot will suggest them when your child is ready." },
];

export default function CourseLibraryScreen({ navigation }: Props) {
  return (
    <DeviceShell title="Course Library" onBack={() => navigation.navigate('DeviceHomeScreen')}>
      <Text style={styles.intro}>
        Pick what your Robot teaches. Lessons play <Text fontWeight="600" style={{ color: CL.ink }}>on the Robot</Text>, not the phone.
      </Text>
      {SECTIONS.map((sec, si) => {
        const items = COURSES.filter(sec.filter);
        if (!items.length) return null;
        return (
          <Box key={si} paddingHorizontal={16} paddingTop={18}>
            <Text fontWeight="700" style={styles.sectionLabel}>{sec.title}</Text>
            <Box gap={8}>
              {items.map(c => (
                <CourseCard key={c.id} course={c} accent="#FF6F61" onClick={() => navigation.navigate('CourseDetailScreen')} />
              ))}
            </Box>
            {sec.help ? <Text style={styles.helpText}>{sec.help}</Text> : null}
          </Box>
        );
      })}
      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: CL.ink2, lineHeight: 20, paddingHorizontal: 20, paddingTop: 14 },
  sectionLabel: { fontSize: 11, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  helpText: { fontSize: 11, color: CL.ink3, lineHeight: 17, paddingTop: 8, paddingHorizontal: 6 },
});
