import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Rotjtjbot from '@/design-system/components/Rotjtjbot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import MiniProgress from '../components/MiniProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'UnitScreen'>;

const LESSONS = [
  { id: 1, title: 'Hello!',       icon: '👋', state: 'done' },
  { id: 2, title: 'I am happy',   icon: '😊', state: 'done' },
  { id: 3, title: 'How are you?', icon: '🙂', state: 'current' },
  { id: 4, title: "I'm fine",     icon: '👍', state: 'locked' },
  { id: 5, title: 'Goodbye',      icon: '👋', state: 'locked' },
];

export default function UnitScreen({ navigation }: Props) {
  return (
    <PageScroll>
      <PageHeader
        onBack={() => navigation.navigate('LevelScreen')}
        subtitle="Unit 3"
        title="How are you?"
      />

      <Box paddingHorizontal={24} paddingtjtjbottom={16}>
        <Box style={styles.summaryCard}>
          <Box flex={1}>
            <Text fontWeight="700" style={styles.doneText}>2 of 5 done</Text>
            <Box style={styles.progressWrap}>
              <MiniProgress value={0.4} />
            </Box>
            <Box flexDirection="row" gap={8} style={styles.chips}>
              <Box style={styles.chipMint}><Text fontWeight="700" style={styles.chipMintText}>3 words</Text></Box>
              <Box style={styles.chipSky}><Text fontWeight="700" style={styles.chipSkyText}>2 phrases</Text></Box>
            </Box>
          </Box>
          <Rotjtjbot emotion="happy" size={86} />
        </Box>
      </Box>

      <Box paddingHorizontal={18} paddingtjtjbottom={40} gap={12}>
        {LESSONS.map(l => {
          const isLocked = l.state === 'locked';
          const isDone = l.state === 'done';
          const isCurrent = l.state === 'current';
          const iconBg = isDone ? '#6CE2B6' : isCurrent ? '#FF6F61' : '#E5E0D6';
          return (
            <TouchableOpacity
              key={l.id}
              disabled={isLocked}
              onPress={() => navigation.navigate('LessonDetailScreen')}
              style={[styles.lessonRow, { opacity: isLocked ? 0.6 : 1 }]}
              activeOpacity={0.8}
            >
              <Box style={[styles.lessonIcon, { backgroundColor: iconBg },
                isCurrent && styles.lessonIconCurrent]}>
                {isDone
                  ? <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round"><Path d="M5 12l5 5L20 7" /></Svg>
                  : isLocked
                  ? <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9A917F" strokeWidth={2.5} strokeLinecap="round"><Rect x={4} y={11} width={16} height={10} rx={2} /><Path d="M8 11V7a4 4 0 018 0v4" /></Svg>
                  : <Text style={{ fontSize: 24 }}>{l.icon}</Text>}
              </Box>
              <Box flex={1}>
                <Text fontWeight="700" style={styles.lessonNum}>Lesson {l.id}</Text>
                <Text fontWeight="800" style={styles.lessonTitle}>{l.title}</Text>
              </Box>
              {isCurrent && (
                <Box style={styles.nowBadge}><Text fontWeight="800" style={styles.nowText}>NOW</Text></Box>
              )}
              {isDone && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ReviewEntryScreen')}
                  style={styles.replayBtn}
                  activeOpacity={0.8}
                >
                  <Text fontWeight="700" style={styles.replayText}>Replay</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 18,
  },
  doneText: { fontSize: 14, color: '#5C4F77' },
  progressWrap: { marginTop: 6 },
  chips: { marginTop: 10 },
  chipMint: { backgroundColor: '#E6F4EE', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  chipMintText: { fontSize: 12, color: '#1F8A5B' },
  chipSky: { backgroundColor: '#E6F0FA', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  chipSkyText: { fontSize: 12, color: '#0E5A92' },
  lessonRow: {
    backgroundColor: '#fff', borderRadius: 22, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 14,
  },
  lessonIcon: { width: 54, height: 54, borderRadius: 27, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  lessonIconCurrent: { shadowColor: '#FF6F61', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8 },
  lessonNum: { fontSize: 12, color: '#8B8B96', textTransform: 'uppercase', letterSpacing: 1 },
  lessonTitle: { fontSize: 18, color: '#2B2140' },
  nowBadge: { backgroundColor: '#FF6F61', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  nowText: { fontSize: 12, color: '#fff' },
  replayBtn: { borderWidth: 2, borderColor: '#6CE2B6', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  replayText: { fontSize: 12, color: '#1F8A5B' },
});
