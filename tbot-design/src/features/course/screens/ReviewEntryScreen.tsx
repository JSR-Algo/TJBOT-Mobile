import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/routes';
import Robot from '@/design-system/components/Robot';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewEntryScreen'>;

const WORDS = ['Hello', 'Hi', 'Friend', 'Happy'];
const EMOJIS = ['👋', '🙋', '👫', '😊'];

export default function ReviewEntryScreen({ navigation }: Props) {
  return (
    <PageScroll>
      <PageHeader
        onBack={() => navigation.navigate('HomeHubScreen')}
        subtitle="Quick review"
        title="Words to revisit"
      />

      <Box paddingHorizontal={24} paddingBottom={16} alignItems="center" gap={10}>
        <Robot emotion="curious" size={170} />
        <SpeechBubble>4 words want to say hi again!</SpeechBubble>
      </Box>

      <Box paddingHorizontal={24} paddingBottom={16} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {WORDS.map((w, i) => (
          <Box key={w} style={styles.wordCard} width="47%">
            <Text style={{ fontSize: 34 }}>{EMOJIS[i]}</Text>
            <Text fontWeight="800" style={styles.wordText}>{w}</Text>
            <Box flexDirection="row" alignItems="center" gap={6}>
              <Box style={styles.wordDot} />
              <Text fontWeight="700" style={styles.wordMeta}>Practice</Text>
            </Box>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={24} paddingBottom={30}>
        <PrimaryCTA onPress={() => navigation.navigate('LessonReadyScreen')} color="#FFC857">Start Review</PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  wordCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  wordText: { fontSize: 22, color: '#2B2140' },
  wordDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFC857' },
  wordMeta: { fontSize: 12, color: '#8B8B96' },
});
