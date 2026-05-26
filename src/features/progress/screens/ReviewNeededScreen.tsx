import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewNeededScreen'>;

const WORDS = [
  { w: 'Friend',  icon: '👫', when: '2 days ago' },
  { w: 'Dog',     icon: '🐶', when: '3 days ago' },
  { w: 'Morning', icon: '🌅', when: '5 days ago' },
] as const;

export default function ReviewNeededScreen({ navigation }: Props) {
  return (
    <PageScroll bg="#FFE6BD">
      <PageHeader onBack={() => navigation.navigate(ROUTES.HomeHubScreen)} subtitle="A friendly nudge" title="Let's visit again" />
      <Box paddingHorizontal={24} paddingBottom={16} flexDirection="row" alignItems="center" gap={12}>
        <Robot emotion="curious" size={120} accent="#FFC857" />
        <SpeechBubble>3 words miss you!</SpeechBubble>
      </Box>
      <Box paddingHorizontal={18} paddingBottom={16} gap={10}>
        {WORDS.map(w => (
          <Box key={w.w} style={styles.wordCard} flexDirection="row" alignItems="center" gap={14}>
            <Box style={styles.wordIcon} alignItems="center" justifyContent="center">
              <Text style={{ fontSize: 28 }}>{w.icon}</Text>
            </Box>
            <Box flex={1}>
              <Text fontWeight="800" style={styles.wordText}>{w.w}</Text>
              <Box flexDirection="row" alignItems="center" gap={6} marginTop={2}>
                <Box style={styles.dot} />
                <Text fontWeight="700" style={styles.whenText}>Last seen {w.when}</Text>
              </Box>
            </Box>
            <Box style={styles.seedIcon} alignItems="center" justifyContent="center">
              <Text style={{ fontSize: 18 }}>🌱</Text>
            </Box>
          </Box>
        ))}
      </Box>
      <Box paddingHorizontal={24} paddingTop={10} paddingBottom={28} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.LessonReadyScreen)} color="#FFC857">
          Practice together
        </PrimaryCTA>
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} activeOpacity={0.7} style={styles.laterBtn}>
          <Text fontWeight="700" style={{ fontSize: 16, color: '#5C4F77' }}>Maybe later</Text>
        </TouchableOpacity>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  wordCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  wordIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFF5E6', flexShrink: 0 },
  wordText: { fontSize: 20, color: '#2B2140' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFC857' },
  whenText: { fontSize: 12, color: '#5C4F77' },
  seedIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFC857' },
  laterBtn: { alignItems: 'center', paddingVertical: 8 },
});
