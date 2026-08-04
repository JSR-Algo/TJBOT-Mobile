import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Card, ErrorMessage, LoadingSpinner } from '../../components';
import { Text } from '../../design-system/primitives';
import type { LearningScreenProps } from '../../navigation/types';
import * as learningApi from '../../services/api/learning';
import type { LearningSession } from '../../services/api/learning';
import {
  translateCopy,
  translateTemplate,
  useAppLanguage,
  type AppLocale,
} from '../../services/i18n/i18n';
import theme from '../../theme';
import { normalizeError } from '../../utils/errors';

type PracticeStep = { label: string; prompt: string };

function buildLessonPracticeSteps(session: LearningSession | null, language: AppLocale): PracticeStep[] {
  const localize = (copy: string) => translateCopy(copy, { locale: language, persona: 'child' });
  const fallbackSteps: PracticeStep[] = [
    { label: localize('Listen'), prompt: localize('Listen to the word. Then say it back clearly.') },
    { label: localize('Try'), prompt: localize('Take your turn when TeeBot asks.') },
    {
      label: localize('Finish'),
      prompt: localize('Good effort. Your parent will see a short summary after practice.'),
    },
  ];
  if (!session) return fallbackSteps;
  const focusWord = session.session_payload?.core_learning?.[0]?.word || 'hello';
  const interactionPrompt = localize(
    session.session_payload?.interaction?.prompt || 'Take your turn when TeeBot asks.',
  );
  const rewardMessage = localize(
    session.session_payload?.reward?.message
      || 'Good effort. Your parent will see a short summary after practice.',
  );

  return [
    {
      label: localize('Listen'),
      prompt: translateTemplate(
        'Listen to "{{word}}". Then say it back clearly.',
        { word: focusWord },
        { locale: language, persona: 'child' },
      ),
    },
    { label: localize('Try'), prompt: interactionPrompt },
    { label: localize('Finish'), prompt: rewardMessage },
  ];
}

export function ChildPracticeScreen({
  navigation,
  route,
}: LearningScreenProps<'ChildPractice'>): React.JSX.Element {
  const childId = route.params.childId;
  const sessionId = route.params.sessionId;
  const { language } = useAppLanguage();

  const [session, setSession] = useState<LearningSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
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

    loadSession();
    return () => {
      mounted = false;
    };
  }, [childId, sessionId]);

  const practiceSteps = useMemo(
    () => buildLessonPracticeSteps(session, language),
    [language, session],
  );
  useEffect(() => {
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
        <Text style={styles.progressText} i18n={false}>
          {translateTemplate(
            'Step {{current}} of {{total}}',
            { current: stepIndex + 1, total: practiceSteps.length },
            { locale: language, persona: 'child' },
          )}
        </Text>
        <Text style={styles.stepLabel} i18n={false}>{activeStep.label}</Text>
        <Text style={styles.promptText} i18n={false}>{activeStep.prompt}</Text>
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
