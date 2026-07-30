import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Icon } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { ROUTES } from '@/navigation/routes';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import { useAppLanguage } from '@/services/i18n/i18n';
import {
  bootstrapNestPhoneLesson,
  nestLessonTitle,
  type NestPhoneLessonContext,
} from '../nestPhoneLesson';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonReadyScreen'>;

export default function LessonReadyScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  const household = useOptionalHousehold();
  const childId = household?.activeChild?.id ?? null;
  const [lesson, setLesson] = React.useState<NestPhoneLessonContext | null>(null);
  const [loading, setLoading] = React.useState(Boolean(childId));
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadLesson = React.useCallback(async (): Promise<void> => {
    if (!childId) {
      setLoading(false);
      setError('Add a child profile before starting a Nest lesson.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const context = await bootstrapNestPhoneLesson(childId);
      setLesson(context);
    } catch {
      setError('Could not load today\'s Nest lesson. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  React.useEffect(() => {
    void loadLesson();
  }, [loadLesson]);

  const handleReady = async (): Promise<void> => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const context = lesson ?? (childId ? await bootstrapNestPhoneLesson(childId) : null);
      if (!context) {
        setError('Add a child profile before starting a Nest lesson.');
        return;
      }
      setLesson(context);
      const lessonWords = context.session.session_payload?.core_learning
        ?.map((item) => item.word)
        .filter(Boolean) ?? [];
      navigation.navigate(ROUTES.GreetingScreen, {
        activityIndex: 1,
        activityTotal: Math.max(lessonWords.length, 1),
        lessonTitle: nestLessonTitle(context.session),
      });
    } catch {
      setError('Could not load today\'s Nest lesson. Check the connection and try again.');
    } finally {
      setStarting(false);
    }
  };

  const title = nestLessonTitle(lesson?.session);
  const words = lesson?.session.session_payload?.core_learning?.map((item) => item.word) ?? [];

  return (
    <ScreenShell bg={referenceColors.bg} gradient={false}>
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center">
        <Text fontWeight="600" style={styles.lessonLabel}>Today's Nest lesson</Text>
        {loading ? (
          <Box style={styles.stateCard} alignItems="center" gap={12}>
            <ActivityIndicator size="large" color={referenceColors.primary} />
            <Text fontWeight="700" style={styles.stateTitle}>{"Loading today's lesson"}</Text>
            <Text style={styles.stateDetail}>{"We're finding the next calm practice for your child."}</Text>
          </Box>
        ) : error ? (
          <Box accessibilityRole="alert" style={styles.stateCard} alignItems="center" gap={12}>
            <Box style={styles.stateIcon} alignItems="center" justifyContent="center">
              <Icon
                name={childId ? 'WifiOff' : 'UserRoundPlus'}
                size={30}
                color={childId ? referenceColors.gold : referenceColors.lavender}
                strokeWidth={2.3}
              />
            </Box>
            <Text fontWeight="800" style={styles.stateTitle}>
              {childId ? 'Lesson needs a connection' : 'Add a child first'}
            </Text>
            <Text style={styles.stateDetail}>{error}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t(childId ? 'Retry lesson loading' : 'Add a child profile')}
              onPress={childId ? loadLesson : () => navigation.navigate(ROUTES.HomeChildProfileScreen)}
              style={styles.stateAction}
            >
              <Icon
                name={childId ? 'RefreshCw' : 'UserRoundPlus'}
                size={17}
                color={referenceColors.primaryDeep}
                strokeWidth={2.5}
              />
              <Text fontWeight="800" style={styles.stateActionText}>
                {childId ? 'Try again' : 'Add child profile'}
              </Text>
            </TouchableOpacity>
          </Box>
        ) : (
          <>
            <Text fontWeight="800" style={styles.lessonTitle}>{title}</Text>
            <Robot emotion="happy" size={200} />
            {words.length > 0 ? (
              <Box style={styles.wordRow} flexDirection="row" gap={8}>
                {words.slice(0, 4).map((word) => (
                  <Box key={word} style={styles.wordPill}>
                    <Text fontWeight="700" style={styles.wordPillText}>{word}</Text>
                  </Box>
                ))}
              </Box>
            ) : null}
            <Box style={styles.headphonesPill} flexDirection="row" alignItems="center" gap={8}>
              <Icon name="Headphones" size={18} color={referenceColors.inkSoft} strokeWidth={2.4} />
              <Text fontWeight="700" style={styles.headphonesText}>Phone lesson · no robot required</Text>
            </Box>
          </>
        )}
      </Box>
      {!error ? <Box style={styles.footer}>
        <PrimaryCTA
          testID="lessonReadyCta"
          onPress={handleReady}
          disabled={loading || starting || !childId}
          color={referenceColors.primary}
        >
          {starting ? 'Starting…' : "I'm ready!"}
        </PrimaryCTA>
      </Box> : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 118, paddingHorizontal: 28, paddingBottom: 190 },
  lessonLabel: { fontSize: 18, color: referenceColors.inkSoft, marginBottom: 6 },
  lessonTitle: { fontSize: 30, color: referenceColors.ink, marginBottom: 24, textAlign: 'center' },
  stateCard: {
    backgroundColor: referenceColors.card,
    borderColor: referenceColors.line,
    borderWidth: 1,
    borderRadius: 28,
    marginTop: 24,
    maxWidth: 340,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
    ...referenceShadow.card,
  },
  stateIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: referenceColors.bgWarm },
  stateTitle: { color: referenceColors.ink, fontSize: 20, textAlign: 'center' },
  stateDetail: { color: referenceColors.inkSoft, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  stateAction: {
    alignItems: 'center',
    backgroundColor: referenceColors.primarySoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 18,
  },
  stateActionText: { color: referenceColors.primaryDeep, fontSize: 14 },
  wordRow: { marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  wordPill: {
    backgroundColor: referenceColors.card,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    ...referenceShadow.card,
  },
  wordPillText: { fontSize: 14, color: referenceColors.ink },
  headphonesPill: {
    marginTop: 12,
    backgroundColor: referenceColors.card,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    ...referenceShadow.card,
  },
  headphonesText: { fontSize: 14, color: referenceColors.inkSoft },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
