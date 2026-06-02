import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, ErrorMessage, LoadingSpinner } from '@/components';
import { type RootStackParamList } from '@/navigation/routes';
import * as learningApi from '@/services/api/learning';
import type { LearningSession } from '@/services/api/learning';
import { colors, spacing, typography } from '@/design-system/tokens/legacy-semantic';
import { normalizeError } from '@/utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'ChildPracticeScreen'>;
type PracticeStep = { label: string; prompt: string };

const FALLBACK_PRACTICE_STEPS: PracticeStep[] = [
  { label: 'Listen', prompt: 'Listen to the word. Then say it back clearly.' },
  { label: 'Try', prompt: 'Take your turn when TeeBot asks.' },
  { label: 'Finish', prompt: 'Good effort. Your parent will see a short summary after practice.' },
];

function buildLessonPracticeSteps(session: LearningSession | null): PracticeStep[] {
  if (!session) return FALLBACK_PRACTICE_STEPS;
  const focusWord = session.session_payload?.core_learning?.[0]?.word || 'hello';
  const interactionPrompt = session.session_payload?.interaction?.prompt || 'Take your turn when TeeBot asks.';
  const rewardMessage = session.session_payload?.reward?.message || 'Good effort. Your parent will see a short summary after practice.';

  return [
    { label: 'Listen', prompt: `Listen to "${focusWord}". Then say it back clearly.` },
    { label: 'Try', prompt: interactionPrompt },
    { label: 'Finish', prompt: rewardMessage },
  ];
}

export default function ChildPracticeScreen({ navigation, route }: Props): React.JSX.Element {
  const childId = route.params?.childId ?? 'demo-child';
  const sessionId = route.params?.sessionId;
  const [session, setSession] = React.useState<LearningSession | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stepIndex, setStepIndex] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    async function loadSession(): Promise<void> {
      if (!sessionId) {
        setSession(null);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const todaySession = await learningApi.getTodaySession(childId);
        if (!mounted) return;
        if (todaySession.id !== sessionId) {
          setSession(null);
          setError('Lesson changed. Fallback practice is ready.');
          return;
        }
        setSession(todaySession);
      } catch (err) {
        if (!mounted) return;
        setSession(null);
        setError(normalizeError(err).message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadSession();
    return () => {
      mounted = false;
    };
  }, [childId, sessionId]);

  const practiceSteps = React.useMemo(() => buildLessonPracticeSteps(session), [session]);
  React.useEffect(() => {
    setStepIndex(0);
  }, [childId, sessionId, practiceSteps.length]);

  const activeStep = practiceSteps[stepIndex] ?? practiceSteps[0];
  const isLastStep = stepIndex === practiceSteps.length - 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Practice Time</Text>
      <Text style={styles.subtitle}>One small step at a time.</Text>

      {loading ? (
        <Card style={styles.practiceCard}>
          <LoadingSpinner />
          <Text style={styles.progressText}>Loading practice...</Text>
        </Card>
      ) : null}

      {error ? (
        <Card style={styles.practiceCard}>
          <ErrorMessage message={error} />
          <Text style={styles.sessionText}>Fallback practice is ready.</Text>
        </Card>
      ) : null}

      <Card style={styles.practiceCard}>
        <Text style={styles.progressText}>Step {stepIndex + 1} of {practiceSteps.length}</Text>
        <Text style={styles.stepLabel}>{activeStep.label}</Text>
        <Text style={styles.promptText}>{activeStep.prompt}</Text>
      </Card>

      <Text style={styles.sessionText}>{session ? 'Lesson is ready.' : 'Fallback practice is ready.'}</Text>

      <Button
        label={isLastStep ? 'Finish practice' : 'Next step'}
        onPress={() => {
          if (isLastStep) {
            navigation.goBack();
            return;
          }
          setStepIndex((current) => Math.min(current + 1, practiceSteps.length - 1));
        }}
        style={styles.primaryAction}
      />
      <Button label="Back to lesson" variant="secondary" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body1, color: colors.textSecondary, marginBottom: spacing.lg },
  practiceCard: { marginBottom: spacing.md },
  progressText: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  stepLabel: { ...typography.caption, color: colors.primary, fontWeight: '700', marginBottom: spacing.xs },
  promptText: { ...typography.h3, color: colors.textPrimary },
  sessionText: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  primaryAction: { marginBottom: spacing.sm },
});
