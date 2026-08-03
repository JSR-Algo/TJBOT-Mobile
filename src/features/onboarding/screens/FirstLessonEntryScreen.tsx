import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Star, Wheat } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import OnboardingClayRobot from '../components/OnboardingClayRobot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { legacyNavigate } from '../legacyNavigation';
import { useAppLanguage } from '@/services/i18n/i18n';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'FirstLessonEntryScreen'>;

export default function FirstLessonEntryScreen({ navigation }: Props) {
  const household = useOptionalHousehold();
  const insets = useSafeAreaInsets();
  const { t } = useAppLanguage();
  const handleStart = () => {
    // Robot-first: lessons play on the TeeBot, not the phone. The phone lesson
    // player (LessonReadyScreen) is hidden from the MVP navigator.
    if (household) {
      household.completeOnboarding(ROUTES.HomeHubScreen, false);
      return;
    }
    legacyNavigate(navigation, ROUTES.HomeHubScreen);
  };

  return (
    <ScreenShell bg={referenceColors.bg} gradient={false}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: Math.max(insets.bottom + 30, 44) }]}
        showsVerticalScrollIndicator={false}
      >
        <Box style={styles.robotWrap} alignItems="center">
          <Box style={styles.robotGlow} />
          <OnboardingClayRobot size={210} showRing />
        </Box>

        <Text i18n={false} fontWeight="800" style={styles.heading}>{t('Your first lesson is ready!')}</Text>
        <Text i18n={false} fontWeight="700" style={styles.subtitle}>
          {t('Your child is ready to explore the farm with TeeBot.')}
        </Text>

        <Box style={styles.topicBadge} flexDirection="row" alignItems="center" gap={8}>
          <Star size={20} color="#8B78BE" fill="#8B78BE" />
          <Text i18n={false} fontWeight="800" style={styles.topicBadgeText}>{t('Farm vocabulary')}</Text>
        </Box>

        <Box style={styles.lessonCard} alignItems="center">
          <Box style={styles.lessonArtwork} alignItems="center" justifyContent="center">
            <Wheat size={68} color="#A26D11" strokeWidth={1.8} accessibilityLabel={t('Farm vocabulary')} />
          </Box>
          <Text i18n={false} fontWeight="800" style={styles.lessonTitle}>{t('Hello, Farm!')}</Text>
          <Box style={styles.lessonMeta}>
            <Text i18n={false} fontWeight="800" style={styles.lessonMetaText}>{t('4 words · 6 minutes')}</Text>
          </Box>
        </Box>

        <Box style={styles.tipCard} flexDirection="row" alignItems="center" gap={14}>
          <Box style={styles.tipIcon} alignItems="center" justifyContent="center">
            <Star size={24} color="#866A24" fill="#FFC857" />
          </Box>
          <Text i18n={false} fontWeight="700" style={styles.tipText}>
            {t("Your child's first lesson starts with the most useful basics.")}
          </Text>
        </Box>

        <PrimaryCTA testID="firstLessonStartCta" onPress={handleStart} color="#FF6F61">
          {t('Start lesson')}
        </PrimaryCTA>
        <Text i18n={false} fontWeight="800" style={styles.parentNote}>
          {t('Parents can check progress at any time.')}
        </Text>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  robotWrap: {
    height: 232,
    justifyContent: 'center',
    marginBottom: 22,
    position: 'relative',
    width: 232,
  },
  robotGlow: {
    backgroundColor: 'rgba(255,111,97,0.10)',
    borderRadius: 116,
    height: 220,
    position: 'absolute',
    width: 220,
  },
  heading: {
    color: '#2D3436',
    fontSize: 36,
    lineHeight: 42,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7A82',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 10,
    maxWidth: 330,
    textAlign: 'center',
  },
  topicBadge: {
    backgroundColor: 'rgba(139,120,190,0.12)',
    borderColor: 'rgba(139,120,190,0.22)',
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  topicBadgeText: {
    color: '#7662AB',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  lessonCard: {
    backgroundColor: '#FFFDF9',
    borderColor: 'rgba(45,52,54,0.06)',
    borderRadius: 42,
    borderWidth: 1,
    marginTop: 28,
    padding: 28,
    width: '100%',
    ...referenceShadow.card,
  },
  lessonArtwork: {
    backgroundColor: '#FFF9F5',
    borderColor: '#FFFFFF',
    borderRadius: 34,
    borderWidth: 4,
    height: 150,
    marginBottom: 22,
    width: 150,
  },
  lessonTitle: {
    color: '#2D3436',
    fontSize: 28,
    lineHeight: 34,
  },
  lessonMeta: {
    backgroundColor: 'rgba(107,122,130,0.10)',
    borderRadius: 999,
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  lessonMetaText: {
    color: '#6B7A82',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tipCard: {
    backgroundColor: '#FFF9F5',
    borderColor: 'rgba(255,200,87,0.18)',
    borderRadius: 30,
    borderWidth: 2,
    marginBottom: 30,
    marginTop: 20,
    padding: 18,
    width: '100%',
  },
  tipIcon: {
    backgroundColor: 'rgba(255,200,87,0.32)',
    borderRadius: 16,
    height: 48,
    width: 48,
  },
  tipText: {
    color: '#4F565A',
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  parentNote: {
    color: '#89969D',
    fontSize: 10,
    letterSpacing: 1.4,
    marginTop: 18,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
