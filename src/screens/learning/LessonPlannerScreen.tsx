import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, ErrorMessage, LoadingSpinner } from '../../components';
import { useHousehold } from '../../contexts/HouseholdContext';
import type { MainStackScreenProps } from '../../navigation/types';
import * as learningApi from '../../api/learning';
import type { LearningSession } from '../../api/learning';
import theme from '../../theme';
import { normalizeError } from '../../utils/errors';

type LessonStep = {
  label: string;
  detail: string;
};

function getFocusWords(session: LearningSession | null): string[] {
  if (!session) return [];
  const coreLearning = session.session_payload?.core_learning ?? [];
  return coreLearning.map((item) => item.word).filter(Boolean);
}

function buildLessonSteps(session: LearningSession | null): LessonStep[] {
  if (!session) return [];
  const payload = session.session_payload;
  const focusWords = getFocusWords(session);
  return [
    {
      label: 'Warm up',
      detail: payload.warmup?.question || payload.warmup?.greeting || 'Start with a short hello.',
    },
    {
      label: 'Review',
      detail: focusWords.length > 0
        ? `Practice ${focusWords.slice(0, 2).join(', ')} from today.`
        : 'Review one familiar word.',
    },
    {
      label: 'Practice',
      detail: payload.interaction?.prompt || 'Listen, repeat, and answer one simple question.',
    },
    {
      label: 'Reward',
      detail: payload.reward?.message || 'Celebrate effort and show a short parent summary.',
    },
  ];
}

function LessonStepRow({ step, index }: { step: LessonStep; index: number }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.stepTextWrap}>
        <Text style={styles.stepLabel}>{step.label}</Text>
        <Text style={styles.stepDetail}>{step.detail}</Text>
      </View>
    </View>
  );
}

export function LessonPlannerScreen({
  navigation,
  route,
}: MainStackScreenProps<'LessonPlanner'>): React.JSX.Element {
  const { children } = useHousehold();
  const requestedChildId = route.params?.childId;
  const activeChild = useMemo(() => {
    if (requestedChildId) {
      return children.find((child) => child.id === requestedChildId) ?? null;
    }
    return children[0] ?? null;
  }, [children, requestedChildId]);

  const [session, setSession] = useState<LearningSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!activeChild) return;
    setLoading(true);
    setError(null);
    try {
      const todaySession = await learningApi.getTodaySession(activeChild.id);
      setSession(todaySession);
    } catch (err) {
      setSession(null);
      setError(normalizeError(err).message);
    } finally {
      setLoading(false);
    }
  }, [activeChild]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSession();
    setRefreshing(false);
  };

  const focusWords = getFocusWords(session);
  const steps = buildLessonSteps(session);
  const rewardStars = session?.session_payload?.reward?.stars ?? 1;
  const firstWord = focusWords[0] ?? 'hello';
  const objective = focusWords.length > 0
    ? `Practice ${focusWords.slice(0, 3).join(', ')} in a short English lesson.`
    : 'Practice one familiar English greeting safely.';

  if (!activeChild) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.title}>Today's Lesson</Text>
        <Text style={styles.emptyText}>Add a child profile before planning lessons.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      <Text style={styles.eyebrow}>{activeChild.name}'s plan</Text>
      <Text style={styles.title}>Today's Lesson</Text>
      <Text style={styles.subtitle}>A short parent-visible lesson before child practice.</Text>

      {loading && !session ? (
        <Card style={styles.stateCard}>
          <LoadingSpinner />
          <Text style={styles.stateText}>Loading today's lesson...</Text>
        </Card>
      ) : null}

      {error ? (
        <Card style={styles.stateCard}>
          <ErrorMessage message={error} />
          <Text style={styles.fallbackText}>Fallback ready: review "{firstWord}" with listen, repeat, and choice practice.</Text>
          <Button
            label="Start fallback practice"
            variant="secondary"
            onPress={() => navigation.navigate('ChildPractice', { childId: activeChild.id })}
            style={styles.primaryAction}
          />
        </Card>
      ) : null}

      {session ? (
        <>
          <Card style={styles.summaryCard}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.cardLabel}>Objective</Text>
                <Text style={styles.objectiveText}>{objective}</Text>
              </View>
              <Text style={styles.badge}>Safe</Text>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaBox}>
                <Text style={styles.metaValue}>{session.difficulty_level}</Text>
                <Text style={styles.metaLabel}>Difficulty</Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaValue}>{focusWords.length}</Text>
                <Text style={styles.metaLabel}>Focus words</Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaValue}>{rewardStars}</Text>
                <Text style={styles.metaLabel}>Reward</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.cardLabel}>Focus items</Text>
            <View style={styles.wordWrap}>
              {focusWords.length > 0 ? focusWords.map((word) => (
                <Text key={word} style={styles.wordPill}>{word}</Text>
              )) : (
                <Text style={styles.stepDetail}>No focus words yet. The fallback lesson will use a familiar greeting.</Text>
              )}
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.cardLabel}>Lesson steps</Text>
            {steps.map((step, index) => (
              <LessonStepRow key={step.label} step={step} index={index} />
            ))}
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.cardLabel}>Vietnamese support</Text>
            <Text style={styles.stepDetail}>
              Use Vietnamese only as a quick hint, encouragement, or parent explanation. Keep the child practice mostly in English.
            </Text>
          </Card>

          <Button
            label="Start child practice"
            onPress={() => navigation.navigate('ChildPractice', { childId: activeChild.id, sessionId: session.id })}
            style={styles.primaryAction}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  centerState: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  eyebrow: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '700', marginBottom: theme.spacing.xs },
  title: { ...theme.typography.h1, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body1, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg },
  stateCard: { marginBottom: theme.spacing.md, gap: theme.spacing.sm },
  stateText: { ...theme.typography.body2, color: theme.colors.textSecondary, textAlign: 'center' },
  fallbackText: { ...theme.typography.body2, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  emptyText: { ...theme.typography.body1, color: theme.colors.textSecondary },
  summaryCard: { marginBottom: theme.spacing.md },
  sectionCard: { marginBottom: theme.spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  cardLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '700', marginBottom: theme.spacing.xs },
  objectiveText: { ...theme.typography.h3, color: theme.colors.textPrimary, flexShrink: 1 },
  badge: {
    ...theme.typography.caption,
    color: theme.colors.success,
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
    fontWeight: '700',
  },
  metaRow: { flexDirection: 'row', gap: theme.spacing.sm },
  metaBox: { flex: 1, backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.sm, padding: theme.spacing.sm },
  metaValue: { ...theme.typography.h3, color: theme.colors.primary, textAlign: 'center' },
  metaLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center' },
  wordWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  wordPill: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    fontWeight: '700',
  },
  stepRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { ...theme.typography.caption, color: '#fff', fontWeight: '700' },
  stepTextWrap: { flex: 1 },
  stepLabel: { ...theme.typography.body2, color: theme.colors.textPrimary, fontWeight: '700' },
  stepDetail: { ...theme.typography.body2, color: theme.colors.textSecondary },
  primaryAction: { marginTop: theme.spacing.sm },
});
