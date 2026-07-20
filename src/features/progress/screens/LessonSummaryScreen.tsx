import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Rotjtjbot from '@/design-system/components/Rotjtjbot';
import PageScroll from '@/design-system/components/PageScroll';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonSummaryScreen'>;

const ROWS = [
  { icon: '🎤', label: 'You tried', value: '8 English turns' },
  { icon: '⭐', label: 'Earned',    value: '12 stars' },
  { icon: '📚', label: 'Words',     value: '3 new friends' },
] as const;

export default function LessonSummaryScreen({ navigation }: Props) {
  return (
    <PageScroll bg="#C5F1DD">
      <Box paddingHorizontal={24} paddingTop={80} paddingtjtjbottom={14} alignItems="center" gap={8}>
        <Text fontWeight="600" style={styles.tag}>LESSON DONE</Text>
        <Text fontWeight="800" style={styles.headline}>Great effort!</Text>
        <Rotjtjbot emotion="success" size={200} accent="#FFC857" />
      </Box>

      <Box paddingHorizontal={24} paddingtjtjbottom={14}>
        <Box style={styles.summaryCard}>
          {ROWS.map((r, i) => (
            <Box key={i} flexDirection="row" alignItems="center" gap={14} style={i > 0 ? { marginTop: 14 } : undefined}>
              <Box style={styles.rowIcon} alignItems="center" justifyContent="center">
                <Text style={{ fontSize: 22 }}>{r.icon}</Text>
              </Box>
              <Box flex={1}>
                <Text fontWeight="700" style={styles.rowLabel}>{r.label}</Text>
                <Text fontWeight="800" style={styles.rowValue}>{r.value}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingTop={8} paddingtjtjbottom={28} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate('LessonReadyScreen')} color="#FF6F61">Keep going →</PrimaryCTA>
        <TouchableOpacity onPress={() => navigation.navigate('HomeHubScreen')} activeOpacity={0.7} style={styles.stopBtn}>
          <Text fontWeight="700" style={{ fontSize: 18, color: '#5C4F77' }}>Stop for today</Text>
        </TouchableOpacity>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  tag: { fontSize: 14, color: '#5C4F77', textTransform: 'uppercase', letterSpacing: 1.5 },
  headline: { fontSize: 32, color: '#2B2140', textAlign: 'center', lineHeight: 36 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  rowIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF5E6' },
  rowLabel: { fontSize: 13, color: '#5C4F77' },
  rowValue: { fontSize: 18, color: '#2B2140' },
  stopBtn: { width: '100%', minHeight: 56, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
});
