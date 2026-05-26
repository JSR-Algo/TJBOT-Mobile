import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonDetailScreen'>;

const ACTIVITIES = [
  { icon: '👂', title: 'Listen to Robot', n: 5 },
  { icon: '🎤', title: 'Say it back',     n: 5 },
  { icon: '🎮', title: 'Play a word game', n: 1 },
];

export default function LessonDetailScreen({ navigation }: Props) {
  return (
    <PageScroll>
      <PageHeader
        onBack={() => navigation.navigate(ROUTES.UnitScreen)}
        subtitle="Lesson 3"
        title="How are you?"
      />

      <Box paddingHorizontal={24} paddingBottom={20} alignItems="center" gap={10}>
        <Robot emotion="greet" size={170} />
        <SpeechBubble>We'll learn to ask and answer "How are you?"</SpeechBubble>
      </Box>

      <Box paddingHorizontal={24} paddingBottom={16}>
        <Text fontWeight="700" style={styles.sectionLabel}>Today you'll practice</Text>
        <Box gap={10}>
          {ACTIVITIES.map((a, i) => (
            <Box key={i} style={styles.activityRow}>
              <Box style={styles.activityIcon}>
                <Text style={{ fontSize: 22 }}>{a.icon}</Text>
              </Box>
              <Text fontWeight="700" style={[styles.activityTitle, { flex: 1 }]}>{a.title}</Text>
              <Text fontWeight="700" style={styles.activityCount}>×{a.n}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingBottom={12} flexDirection="row" alignItems="center" justifyContent="center" gap={14}>
        <Text fontWeight="700" style={styles.meta}>⏱️ ~5 min</Text>
        <Box style={styles.metaDot} />
        <Text fontWeight="700" style={styles.meta}>⭐ +20 stars</Text>
      </Box>

      <Box paddingHorizontal={24} paddingBottom={30}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.LessonReadyScreen)} color="#FF6F61">Start Lesson</PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 13, color: '#8B8B96', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  activityRow: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  activityIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activityTitle: { fontSize: 17, color: '#2B2140' },
  activityCount: { fontSize: 13, color: '#8B8B96' },
  meta: { fontSize: 13, color: '#8B8B96' },
  metaDot: { width: 4, height: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2 },
});
