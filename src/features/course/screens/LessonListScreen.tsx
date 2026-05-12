import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonListScreen'>;

const LESSONS = [
  { id: 1, title: 'Hello!',       state: 'done',    stars: 3 },
  { id: 2, title: 'I am happy',   state: 'done',    stars: 2 },
  { id: 3, title: 'Good morning', state: 'review',  stars: 1 },
  { id: 4, title: 'How are you?', state: 'current', stars: 0 },
  { id: 5, title: "I'm fine",     state: 'locked',  stars: 0 },
  { id: 6, title: 'Goodbye',      state: 'locked',  stars: 0 },
];

export default function LessonListScreen({ navigation }: Props) {
  return (
    <PageScroll>
      <PageHeader
        onBack={() => navigation.navigate('UnitScreen')}
        subtitle="All lessons"
        title="Hello Friends"
      />
      <Box paddingHorizontal={18} paddingBottom={30} gap={10}>
        {LESSONS.map(l => {
          const isLocked = l.state === 'locked';
          const isCurrent = l.state === 'current';
          const isDone = l.state === 'done';
          const isReview = l.state === 'review';
          const iconBg = isDone ? '#6CE2B6' : isReview ? '#FFC857' : isCurrent ? '#FF6F61' : '#E5E0D6';
          return (
            <TouchableOpacity
              key={l.id}
              disabled={isLocked}
              onPress={() => navigation.navigate('LessonDetailScreen')}
              style={[styles.row, { opacity: isLocked ? 0.6 : 1 }, isCurrent && styles.rowCurrent]}
              activeOpacity={0.8}
            >
              <Box style={[styles.icon, { backgroundColor: iconBg }]}>
                {isLocked
                  ? <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#9A917F" strokeWidth={2.5} strokeLinecap="round"><Rect x={4} y={11} width={16} height={10} rx={2} /><Path d="M8 11V7a4 4 0 018 0v4" /></Svg>
                  : <Text fontWeight="800" style={styles.iconNum}>{l.id}</Text>}
              </Box>
              <Box flex={1}>
                <Text fontWeight="800" style={styles.title}>{l.title}</Text>
                <Box flexDirection="row" alignItems="center" gap={6} style={styles.meta}>
                  {isDone && [0, 1, 2].map(s => <Text key={s} style={{ fontSize: 14, opacity: s < l.stars ? 1 : 0.25 }}>⭐</Text>)}
                  {isReview && <Text fontWeight="700" style={styles.reviewText}>Let's review!</Text>}
                  {isCurrent && <Text fontWeight="700" style={styles.currentText}>Up next</Text>}
                  {isLocked && <Text fontWeight="600" style={styles.lockedText}>Coming soon</Text>}
                </Box>
              </Box>
              {!isLocked && (
                <Svg width={12} height={20} viewBox="0 0 14 22" fill="none" stroke="#8B8B96" strokeWidth={2.5} strokeLinecap="round">
                  <Path d="M3 3l8 8-8 8" />
                </Svg>
              )}
            </TouchableOpacity>
          );
        })}
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#fff', borderRadius: 22, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  rowCurrent: { borderWidth: 3, borderColor: '#FF6F61' },
  icon: { width: 50, height: 50, borderRadius: 25, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  iconNum: { fontSize: 20, color: '#fff' },
  title: { fontSize: 17, color: '#2B2140' },
  meta: { marginTop: 4 },
  reviewText: { fontSize: 13, color: '#A06900' },
  currentText: { fontSize: 13, color: '#FF6F61' },
  lockedText: { fontSize: 13, color: '#8B8B96' },
});
