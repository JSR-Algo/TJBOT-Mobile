import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Headphones } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useOptionalHousehold } from '@/contexts/HouseholdContext';
import {
  bootstrapNestPhoneLesson,
  nestLessonTitle,
  type NestPhoneLessonContext,
} from '../nestPhoneLesson';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonReadyScreen'>;

export default function LessonReadyScreen({ navigation }: Props) {
  const household = useOptionalHousehold();
  const childId = household?.activeChild?.id ?? null;
  const [lesson, setLesson] = React.useState<NestPhoneLessonContext | null>(null);
  const [loading, setLoading] = React.useState(Boolean(childId));
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!childId) {
      setLoading(false);
      setError('Add a child profile before starting a Nest lesson.');
      return undefined;
    }

    setLoading(true);
    setError(null);
    bootstrapNestPhoneLesson(childId)
      .then((context) => {
        if (!cancelled) setLesson(context);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load today\'s Nest lesson. Check the backend and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [childId]);

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
      setError('Could not load today\'s Nest lesson. Check the backend and try again.');
    } finally {
      setStarting(false);
    }
  };

  const title = nestLessonTitle(lesson?.session);
  const words = lesson?.session.session_payload?.core_learning?.map((item) => item.word) ?? [];

  return (
    <ScreenShell>
      <Box style={[StyleSheet.absoluteFillObject, styles.center]} alignItems="center">
        <Text fontWeight="600" style={styles.lessonLabel}>Today's Nest lesson</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#FF6F61" style={{ marginVertical: 24 }} />
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
              <Headphones size={18} color="#67676F" strokeWidth={2.4} />
              <Text fontWeight="700" style={styles.headphonesText}>Phone lesson · no robot required</Text>
            </Box>
          </>
        )}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        ) : null}
      </Box>
      <Box style={styles.footer}>
        <PrimaryCTA
          testID="lessonReadyCta"
          onPress={handleReady}
          disabled={loading || starting || !childId}
          color="#FF6F61"
        >
          {starting ? 'Starting…' : "I'm ready!"}
        </PrimaryCTA>
      </Box>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { paddingTop: 120, paddingHorizontal: 28, paddingBottom: 220 },
  lessonLabel: { fontSize: 18, color: 'rgba(0,0,0,0.5)', marginBottom: 6 },
  lessonTitle: { fontSize: 30, color: '#1A1A1F', marginBottom: 24, textAlign: 'center' },
  wordRow: { marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  wordPill: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  wordPillText: { fontSize: 14, color: '#1A1A1F' },
  headphonesPill: {
    marginTop: 12,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headphonesText: { fontSize: 14, color: 'rgba(0,0,0,0.5)' },
  error: { marginTop: 16, fontSize: 14, color: '#B42318', textAlign: 'center', maxWidth: 320 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48 },
});
