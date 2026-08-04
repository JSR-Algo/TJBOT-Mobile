import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import { Icon, type IconName } from '@/design-system/icons';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewEntryScreen'>;

const WORDS: ReadonlyArray<{ word: string; icon: IconName }> = [
  { word: 'Hello', icon: 'Hand' },
  { word: 'Hi', icon: 'MessageCircle' },
  { word: 'Friend', icon: 'Users' },
  { word: 'Happy', icon: 'Smile' },
];

export default function ReviewEntryScreen({ navigation }: Props) {
  const { language } = useAppLanguage();
  return (
    <PageScroll>
      <PageHeader
        onBack={() => navigation.navigate(ROUTES.HomeHubScreen)}
        subtitle="Quick review"
        title="Words to revisit"
      />

      <Box paddingHorizontal={24} paddingBottom={16} alignItems="center" gap={10}>
        <Robot emotion="curious" size={170} />
        <SpeechBubble>4 words want to say hi again!</SpeechBubble>
      </Box>

      <Box paddingHorizontal={24} paddingBottom={16} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {WORDS.map(({ word, icon }) => (
          <Box
            key={word}
            style={styles.wordCard}
            width="47%"
            accessibilityLabel={translateTemplate(
              '{{word}}. Practice',
              { word },
              { locale: language },
            )}
          >
            <Box style={styles.wordIcon} alignItems="center" justifyContent="center">
              <Icon name={icon} size={28} color="#8B7BE8" strokeWidth={2.2} />
            </Box>
            <Text fontWeight="800" style={styles.wordText}>{word}</Text>
            <Box flexDirection="row" alignItems="center" gap={6}>
              <Box style={styles.wordDot} />
              <Text fontWeight="700" style={styles.wordMeta}>Practice</Text>
            </Box>
          </Box>
        ))}
      </Box>

      <Box paddingHorizontal={24} paddingBottom={30}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.LessonReadyScreen)} color="#FFC857">Start Review</PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  wordCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  wordIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: '#F1ECFF' },
  wordText: { fontSize: 22, color: '#2B2140' },
  wordDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFC857' },
  wordMeta: { fontSize: 12, color: '#8B8B96' },
});
