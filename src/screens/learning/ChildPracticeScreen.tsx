import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ErrorMessage, LoadingSpinner } from '../../components';
import type { MainStackScreenProps } from '../../navigation/types';
import * as learningApi from '../../api/learning';
import type { LearningSession } from '../../api/learning';
import theme from '../../theme';
import { normalizeError } from '../../utils/errors';

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
  const rewardMessage = session.session_payload?.reward?.message
    || 'Good effort. Your parent will see a short summary after practice.';

  return [
    { label: 'Listen', prompt: `Listen to "${focusWord}". Then say it back clearly.` },
    { label: 'Try', prompt: interactionPrompt },
    { label: 'Finish', prompt: rewardMessage },
  ];
}

export function ChildPracticeScreen({
  navigation,
  route,
}: MainStackScreenProps<'ChildPractice'>): React.JSX.Element {
  const childId = route.params.childId;
  const sessionId = route.params.sessionId;

  const [session, setSession] = useState<LearningSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!sessionId) return;
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

    loadSession();
    return () => {
      mounted = false;
    };
  }, [childId, sessionId]);

  const practiceSteps = useMemo(() => buildLessonPracticeSteps(session), [session]);
  const [stepIndex, setStepIndex] = useState(0);
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

      <Text style={styles.sessionText}>
        {session ? 'Lesson is ready.' : 'Fallback practice is ready.'}
      </Text>

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
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  title: { ...theme.typography.h1, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body1, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg },
  practiceCard: { marginBottom: theme.spacing.md },
  progressText: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  stepLabel: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '700', marginBottom: theme.spacing.xs },
  promptText: { ...theme.typography.h3, color: theme.colors.textPrimary },
  sessionText: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  primaryAction: { marginBottom: theme.spacing.sm },
});
