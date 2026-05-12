import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import LCDFace from '@/design-system/components/LCDFace';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from './CL';
import CLChip from './CLChip';

type Course = {
  state: string;
  lcd: string;
  ages: string;
  title: string;
  level: string;
  lessons: number;
  teaches: string[];
};

type Props = {
  course: Course;
  onClick?: () => void;
  accent?: string;
  showLCD?: boolean;
};

export default function CourseCard({ course, onClick, accent, showLCD = true }: Props) {
  return (
    <TouchableOpacity onPress={onClick} style={[styles.card, { opacity: course.state === 'locked' ? 0.85 : 1 }]} activeOpacity={0.8}>
      {showLCD && (
        <Box style={styles.lcdWrap}>
          <LCDFace emotion={course.lcd} size={72} accent={accent} />
        </Box>
      )}
      <Box flex={1}>
        <Box flexDirection="row" alignItems="center" gap={8} style={styles.chipRow}>
          <CLChip state={course.state as any} />
          <Text style={[styles.ages, { color: CL.ink3 }]}>Ages {course.ages}</Text>
        </Box>
        <Text fontWeight="600" style={styles.title}>{course.title}</Text>
        <Text style={styles.meta}>{course.level} · {course.lessons} lessons</Text>
        <Box style={[styles.tags, { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }]}>
          {course.teaches.slice(0, 3).map(t => (
            <Box key={t} style={styles.tag}>
              <Text fontWeight="600" style={styles.tagText}>{t}</Text>
            </Box>
          ))}
          {course.teaches.length > 3 && (
            <Text style={styles.tagMore}>+{course.teaches.length - 3}</Text>
          )}
        </Box>
      </Box>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CL.card, borderWidth: 1, borderColor: CL.hair, borderRadius: 14,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  lcdWrap: { backgroundColor: '#0E1116', borderRadius: 10, padding: 6 },
  chipRow: { marginBottom: 4, flexWrap: 'wrap' },
  ages: { fontSize: 11 },
  title: { fontSize: 15, color: '#1A1A1F', lineHeight: 19 },
  meta: { fontSize: 12, color: CL.ink2, marginTop: 2 },
  tags: { marginTop: 8 },
  tag: { backgroundColor: '#EEF1F5', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 },
  tagText: { fontSize: 10, color: CL.ink2 },
  tagMore: { fontSize: 10, color: CL.ink3, paddingVertical: 3, paddingHorizontal: 4 },
});
