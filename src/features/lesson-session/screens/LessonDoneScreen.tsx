import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, Home, Medal, Play, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useHousehold } from '@/contexts/HouseholdContext';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import {
  clearActiveNestLesson,
  getActiveNestLesson,
} from '../nestPhoneLesson';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonDoneScreen'>;

export default function LessonDoneScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { activeChild } = useHousehold();
  const { language, t } = useAppLanguage();
  const nestLesson = getActiveNestLesson();
  const words = nestLesson?.session.session_payload?.core_learning
    ?.map((item) => item.word)
    .filter(Boolean) ?? [];
  const wordCount = words.length || route.params?.wordsLearned || 0;
  const childName = activeChild?.name;

  React.useEffect(() => {
    return () => {
      clearActiveNestLesson();
    };
  }, []);

  return (
    <ScreenShell bg="#E0F7FA" gradient={false}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 24, 44), paddingBottom: Math.max(insets.bottom + 34, 50) }]}
        showsVerticalScrollIndicator={false}
      >
        <Box style={styles.confettiOne} />
        <Box style={styles.confettiTwo} />
        <Box style={styles.robotHalo} alignItems="center" justifyContent="center">
          <Robot emotion="success" size={210} accent="#FF6F61" />
        </Box>

        <Text i18n={false} fontWeight="800" style={styles.title}>
          {childName
            ? translateTemplate('Great job, {{name}}!', { name: childName }, { locale: language })
            : t('Great job!')}
        </Text>
        <Text i18n={false} fontWeight="700" style={styles.subtitle}>
          {wordCount > 0
            ? translateTemplate('You learned {{count}} new words today', { count: wordCount }, { locale: language })
            : t('Lesson complete')}
        </Text>

        {words.length > 0 ? (
          <Box style={styles.wordList} flexDirection="row">
            {words.map((word) => (
              <Box key={word} style={styles.wordChip} flexDirection="row" alignItems="center" gap={7}>
                <CheckCircle2 size={17} color="#4CB7A5" />
                <Text i18n={false} fontWeight="800" style={styles.wordChipText}>{word}</Text>
              </Box>
            ))}
          </Box>
        ) : null}

        <Box style={styles.statsRow} flexDirection="row" gap={12}>
          <Box style={styles.statCard} alignItems="center">
            <Box style={[styles.statIcon, styles.statIconWord]} alignItems="center" justifyContent="center">
              <Star size={22} color="#4CB7A5" fill="#A9E4D8" />
            </Box>
            <Text i18n={false} fontWeight="800" style={styles.statValue}>{wordCount}</Text>
            <Text i18n={false} fontWeight="800" style={styles.statLabel}>{t('new words')}</Text>
          </Box>
          <Box style={styles.statCard} alignItems="center">
            <Box style={[styles.statIcon, styles.statIconLesson]} alignItems="center" justifyContent="center">
              <Medal size={22} color="#C59627" />
            </Box>
            <Text i18n={false} fontWeight="800" style={styles.statValue}>1</Text>
            <Text i18n={false} fontWeight="800" style={styles.statLabel}>{t('lesson')}</Text>
          </Box>
        </Box>

        <Box style={styles.milestoneCard}>
          <Box flexDirection="row" alignItems="center" gap={12}>
            <Box style={styles.medalCircle} alignItems="center" justifyContent="center">
              <Medal size={22} color="#9B7220" />
            </Box>
            <Box flex={1}>
              <Text i18n={false} fontWeight="800" style={styles.milestoneTitle}>{t('Today is complete!')}</Text>
              <Text i18n={false} fontWeight="700" style={styles.milestoneBody}>{t('Come back tomorrow for the next short lesson.')}</Text>
            </Box>
          </Box>
        </Box>

        <Box gap={12} width="100%">
          <TouchableOpacity
            testID="lessonDoneSummaryButton"
            style={styles.primaryAction}
            accessibilityRole="button"
            onPress={() => navigation.navigate(ROUTES.LessonSummaryScreen)}
          >
            <Play size={23} color="#FFFFFF" fill="#FFFFFF" />
            <Text i18n={false} fontWeight="800" style={styles.primaryActionText}>{t('See what you did')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="lessonDoneHomeButton"
            style={styles.secondaryAction}
            accessibilityRole="button"
            onPress={() => navigation.navigate(ROUTES.HomeHubScreen)}
          >
            <Home size={23} color="#FF6F61" />
            <Text i18n={false} fontWeight="800" style={styles.secondaryActionText}>{t('Back home')}</Text>
          </TouchableOpacity>
        </Box>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 26,
    position: 'relative',
  },
  confettiOne: {
    backgroundColor: '#FFCC4D',
    borderRadius: 4,
    height: 16,
    left: 42,
    position: 'absolute',
    top: 88,
    transform: [{ rotate: '18deg' }],
    width: 16,
  },
  confettiTwo: {
    backgroundColor: '#FF8A7D',
    borderRadius: 999,
    height: 12,
    position: 'absolute',
    right: 48,
    top: 138,
    width: 12,
  },
  robotHalo: {
    backgroundColor: 'rgba(255,111,97,0.08)',
    borderRadius: 999,
    height: 228,
    width: 228,
  },
  title: {
    color: '#2D3436',
    fontSize: 35,
    lineHeight: 43,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7A82',
    fontSize: 16,
    lineHeight: 24,
    marginTop: -14,
    textAlign: 'center',
  },
  wordList: {
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  wordChip: {
    backgroundColor: 'rgba(76,183,165,0.12)',
    borderColor: 'rgba(76,183,165,0.24)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  wordChipText: {
    color: '#318C7D',
    fontSize: 14,
  },
  statsRow: { width: '100%' },
  statCard: {
    backgroundColor: '#FFFDF9',
    borderColor: 'rgba(45,52,54,0.06)',
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    padding: 18,
    shadowColor: '#2D3436',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  statIcon: {
    borderRadius: 13,
    height: 42,
    marginBottom: 9,
    width: 42,
  },
  statIconWord: { backgroundColor: 'rgba(76,183,165,0.12)' },
  statIconLesson: { backgroundColor: 'rgba(255,204,77,0.22)' },
  statValue: {
    color: '#2D3436',
    fontSize: 30,
    lineHeight: 34,
  },
  statLabel: {
    color: '#6B7A82',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  milestoneCard: {
    backgroundColor: '#FFF9E5',
    borderColor: 'rgba(255,204,77,0.45)',
    borderRadius: 30,
    borderWidth: 1,
    padding: 20,
    width: '100%',
  },
  medalCircle: {
    backgroundColor: 'rgba(255,204,77,0.34)',
    borderRadius: 999,
    height: 44,
    width: 44,
  },
  milestoneTitle: {
    color: '#2D3436',
    fontSize: 17,
    lineHeight: 22,
  },
  milestoneBody: {
    color: '#7A6B4D',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#FF6F61',
    borderRadius: 30,
    flexDirection: 'row',
    gap: 11,
    justifyContent: 'center',
    minHeight: 70,
    shadowColor: '#FF6F61',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 19,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    borderColor: 'rgba(255,111,97,0.22)',
    borderRadius: 30,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 11,
    justifyContent: 'center',
    minHeight: 66,
  },
  secondaryActionText: {
    color: '#FF6F61',
    fontSize: 18,
  },
});
