import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyMissionScreen'>;

const MISSIONS = [
  { done: true,  icon: '📚', title: "Today's lesson",   sub: 'Lesson 3 — How are you?' },
  { done: false, icon: '🔁', title: 'Review 4 words',   sub: 'Quick 2-min refresh' },
  { done: false, icon: '🎮', title: 'Play a word game', sub: '1 mini-game' },
];

export default function DailyMissionScreen({ navigation }: Props) {
  return (
    <PageScroll>
      <PageHeader
        onBack={() => navigation.navigate('HomeHubScreen')}
        subtitle="Today's mission"
        title="Make Robot smile"
      />

      <Box paddingHorizontal={24} paddingBottom={16} alignItems="center">
        <Robot emotion="happy" size={180} />
      </Box>

      <Box paddingHorizontal={24} paddingBottom={14} gap={10}>
        {MISSIONS.map((m, i) => (
          <Box key={i} style={styles.missionRow}>
            <Box style={[styles.missionIcon, { backgroundColor: m.done ? '#6CE2B6' : '#FFE6CC' }]}>
              {m.done
                ? <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round"><Path d="M5 12l5 5L20 7" /></Svg>
                : <Text style={{ fontSize: 20 }}>{m.icon}</Text>}
            </Box>
            <Box flex={1}>
              <Text fontWeight="800" style={[styles.missionTitle, m.done && styles.missionDone]}>{m.title}</Text>
              <Text fontWeight="600" style={styles.missionSub}>{m.sub}</Text>
            </Box>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={24} paddingBottom={16}>
        <Box style={styles.rewardRow}>
          <Box style={styles.rewardIcon}>
            <Text style={{ fontSize: 28 }}>🎁</Text>
          </Box>
          <Box flex={1}>
            <Text fontWeight="800" style={styles.rewardTitle}>Finish all 3</Text>
            <Text fontWeight="700" style={styles.rewardSub}>+50 stars · new sticker</Text>
          </Box>
          <Text fontWeight="800" style={styles.rewardCount}>1/3</Text>
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingBottom={30}>
        <PrimaryCTA onPress={() => navigation.navigate('LessonReadyScreen')} color="#FF6F61">Continue Mission</PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  missionRow: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  missionIcon: { width: 44, height: 44, borderRadius: 22, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  missionTitle: { fontSize: 17, color: '#2B2140' },
  missionDone: { color: '#8B8B96', textDecorationLine: 'line-through' },
  missionSub: { fontSize: 13, color: '#8B8B96' },
  rewardRow: {
    backgroundColor: '#fff', borderRadius: 24, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  rewardIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFC857', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rewardTitle: { fontSize: 17, color: '#2B2140' },
  rewardSub: { fontSize: 13, color: '#8B8B96' },
  rewardCount: { fontSize: 14, color: '#6CE2B6' },
});
