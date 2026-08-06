import React from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Info, Mic, Play, Star, Volume2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import LessonHeader from '@/components/LessonHeader';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useLessonHardwareBack } from '../hooks/useLessonHardwareBack';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import { getActiveNestLesson } from '../nestPhoneLesson';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotSpeakingScreen'>;

export default function RobotSpeakingScreen({ navigation, route }: Props) {
  useLessonHardwareBack(navigation, 'ASSISTANT_SPEAKING');
  const insets = useSafeAreaInsets();
  const { language, t } = useAppLanguage();
  const activityIndex = route.params?.activityIndex ?? 3;
  const activityTotal = route.params?.activityTotal ?? 5;
  const progress = Math.min(1, Math.max(0, activityIndex / Math.max(activityTotal, 1)));
  const learningItem = getActiveNestLesson()?.session.session_payload?.core_learning?.[activityIndex - 1];
  const word = learningItem?.word ?? 'word';
  const exampleSentence = learningItem?.sentence ?? '';

  return (
    <ScreenShell bg="#E0F7FA" gradient={false}>
      <Box flex={1}>
        <LessonHeader progress={progress} onExit={() => navigation.navigate(ROUTES.ExitConfirmScreen, route.params)} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 28, 42) }]}
          showsVerticalScrollIndicator={false}
        >
          <Box style={styles.wordCounter}>
            <Text i18n={false} fontWeight="800" style={styles.wordCounterText}>
              {translateTemplate('Word {{current}} of {{total}}', { current: activityIndex, total: activityTotal }, { locale: language })}
            </Text>
          </Box>

          <Box style={styles.wordCard} alignItems="center">
            <Box
              style={styles.newWordBadge}
              flexDirection="row"
              alignItems="center"
              gap={6}
              accessible
              accessibilityLabel={t('Robot is speaking')}
            >
              <Star size={14} color="#7A61B5" fill="#B9A7E8" />
              <Text i18n={false} fontWeight="800" style={styles.newWordText}>{t('New word')}</Text>
            </Box>
            <Box style={styles.wordArtwork} alignItems="center" justifyContent="center">
              <Text i18n={false} fontWeight="800" style={styles.wordArtworkText}>Aa</Text>
            </Box>
            <Text i18n={false} fontWeight="800" style={styles.word}>{word}</Text>
            {exampleSentence ? (
              <Text i18n={false} fontWeight="700" style={styles.pronunciation}>{exampleSentence}</Text>
            ) : null}
            <Box accessible accessibilityLabel={t('Robot voice waveform')} style={styles.speakerBadge}>
              <Volume2 size={28} color="#FFFFFF" strokeWidth={2.6} />
            </Box>
          </Box>

          <Box gap={12} width="100%">
            <TouchableOpacity
              disabled
              style={[styles.primaryAction, styles.primaryActionDisabled]}
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel={t('Listen to the word')}
            >
              <Volume2 size={27} color="#FFFFFF" />
              <Text i18n={false} fontWeight="800" style={styles.primaryActionText}>{t('Listen to the word')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="lessonActiveSpeakAction"
              style={styles.primaryAction}
              accessibilityRole="button"
              onPress={() => navigation.navigate(ROUTES.RobotListeningScreen, route.params)}
            >
              <Mic size={27} color="#FFFFFF" />
              <Text i18n={false} fontWeight="800" style={styles.primaryActionText}>{t('Say it with TeeBot')}</Text>
            </TouchableOpacity>
          </Box>

          <Box flexDirection="row" gap={12} width="100%">
            <TouchableOpacity
              style={styles.secondaryAction}
              accessibilityRole="button"
              onPress={() => Alert.alert(t('Slow playback'), t('TeeBot will repeat the word slowly.'))}
            >
              <Play size={19} color="#6B7A82" fill="#6B7A82" />
              <Text i18n={false} fontWeight="800" style={styles.secondaryActionText}>{t('Slow')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryAction}
              accessibilityRole="button"
              onPress={() => Alert.alert(t('Hint'), exampleSentence || word)}
            >
              <Info size={20} color="#6B7A82" />
              <Text i18n={false} fontWeight="800" style={styles.secondaryActionText}>{t('Hint')}</Text>
            </TouchableOpacity>
          </Box>
        </ScrollView>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  wordCounter: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,111,97,0.12)',
    borderColor: 'rgba(255,111,97,0.20)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  wordCounterText: {
    color: '#D85C4A',
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  wordCard: {
    backgroundColor: '#FFFDF9',
    borderColor: 'rgba(45,52,54,0.06)',
    borderRadius: 42,
    borderWidth: 1,
    paddingBottom: 34,
    paddingHorizontal: 24,
    paddingTop: 56,
    position: 'relative',
    shadowColor: '#2D3436',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    width: '100%',
    elevation: 5,
  },
  newWordBadge: {
    backgroundColor: '#F0EAFE',
    borderColor: '#DFD5F7',
    borderRadius: 999,
    borderWidth: 1,
    left: 24,
    paddingHorizontal: 13,
    paddingVertical: 7,
    position: 'absolute',
    top: 20,
  },
  newWordText: {
    color: '#7659AA',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  wordArtwork: {
    backgroundColor: '#FFF9F5',
    borderColor: '#FFFFFF',
    borderRadius: 34,
    borderWidth: 4,
    height: 220,
    marginBottom: 24,
    width: 220,
  },
  wordArtworkText: { fontSize: 44, color: '#7A61B5' },
  word: {
    color: '#2D3436',
    fontSize: 52,
    lineHeight: 60,
  },
  pronunciation: {
    color: '#6B7A82',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 6,
  },
  speakerBadge: {
    alignItems: 'center',
    backgroundColor: '#8B78BE',
    borderRadius: 17,
    bottom: 22,
    height: 54,
    justifyContent: 'center',
    position: 'absolute',
    right: 22,
    shadowColor: '#8B78BE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    width: 54,
    elevation: 4,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#FF6F61',
    borderRadius: 30,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 70,
    paddingHorizontal: 20,
    shadowColor: '#FF6F61',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryActionDisabled: { opacity: 0.72 },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 26,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,253,249,0.82)',
    borderColor: 'rgba(45,52,54,0.08)',
    borderRadius: 24,
    borderWidth: 2,
    flex: 1,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 60,
  },
  secondaryActionText: {
    color: '#4F565A',
    fontSize: 15,
  },
});
