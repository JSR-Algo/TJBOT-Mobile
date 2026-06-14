import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, ErrorMessage, LoadingSpinner } from '@/components';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import * as learningApi from '@/services/api/learning';
import type { LearningSession } from '@/services/api/learning';
import { colors, spacing, typography } from '@/design-system/tokens/legacy-semantic';
import { normalizeError } from '@/utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonPlannerScreen'>;
type LessonStep = { label: string; detail: string };

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
    { label: 'Warm up', detail: payload.warmup?.question || payload.warmup?.greeting || 'Start with a short hello.' },
    {
      label: 'Review',
      detail: focusWords.length > 0
        ? `Practice ${focusWords.slice(0, 2).join(', ')} from today.`
        : 'Review one familiar word.',
    },
    { label: 'Practice', detail: payload.interaction?.prompt || 'Listen, repeat, and answer one simple question.' },
    { label: 'Reward', detail: payload.reward?.message || 'Celebrate effort and show a short parent summary.' },
  ];
}

export default function LessonPlannerScreen({ navigation, route }: Props): React.JSX.Element {
  const { children } = useHousehold();
  const requestedChildId = route.params?.childId;
  const activeChild = React.useMemo(() => {
    if (requestedChildId) return children.find((child) => child.id === requestedChildId) ?? null;
    return children[0] ?? null;
  }, [children, requestedChildId]);

  const [session, setSession] = React.useState<LearningSession | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadSession = React.useCallback(async () => {
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

  React.useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const onRefresh = async (): Promise<void> => {
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
            onPress={() => navigation.navigate(ROUTES.ChildPracticeScreen, { childId: activeChild.id })}
            style={styles.primaryAction}
          />
        </Card>
      ) : null}

      {session ? (
        <>
          <Card style={styles.summaryCard}>
            <View style={styles.headerRow}>
              <View style={styles.flexOne}>
                <Text style={styles.cardLabel}>Objective</Text>
                <Text style={styles.objectiveText}>{objective}</Text>
              </View>
              <Text style={styles.badge}>Safe</Text>
            </View>
            <View style={styles.metaRow}>
              <MetaBox value={String(session.difficulty_level)} label="Difficulty" />
              <MetaBox value={String(focusWords.length)} label="Focus words" />
              <MetaBox value={String(rewardStars)} label="Reward" />
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
            {steps.map((step, index) => <LessonStepRow key={step.label} step={step} index={index} />)}
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.cardLabel}>Vietnamese support</Text>
            <Text style={styles.stepDetail}>Use Vietnamese only as a quick hint, encouragement, or parent explanation. Keep child practice mostly in English.</Text>
          </Card>

          <Button
            label="Start child practice"
            onPress={() => navigation.navigate(ROUTES.ChildPracticeScreen, { childId: activeChild.id, sessionId: session.id })}
            style={styles.primaryAction}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

function MetaBox({ value, label }: { value: string; label: string }): React.JSX.Element {
  return (
    <View style={styles.metaBox}>
      <Text style={styles.metaValue}>{value}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

function LessonStepRow({ step, index }: { step: LessonStep; index: number }): React.JSX.Element {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centerState: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '700', marginBottom: spacing.xs },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body1, color: colors.textSecondary, marginBottom: spacing.lg },
  stateCard: { marginBottom: spacing.md, gap: spacing.sm },
  stateText: { ...typography.body2, color: colors.textSecondary, textAlign: 'center' },
  fallbackText: { ...typography.body2, color: colors.textSecondary, marginTop: spacing.sm },
  emptyText: { ...typography.body1, color: colors.textSecondary },
  summaryCard: { marginBottom: spacing.md },
  sectionCard: { marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  flexOne: { flex: 1 },
  cardLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '700', marginBottom: spacing.xs },
  objectiveText: { ...typography.h3, color: colors.textPrimary, flexShrink: 1 },
  badge: {
    ...typography.caption,
    color: colors.success,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    fontWeight: '700',
  },
  metaRow: { flexDirection: 'row', gap: spacing.sm },
  metaBox: { flex: 1, backgroundColor: colors.primaryLight, padding: spacing.sm },
  metaValue: { ...typography.h3, color: colors.primary, textAlign: 'center' },
  metaLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  wordWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  wordPill: { ...typography.body2, color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  stepRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  stepNumber: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  stepNumberText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  stepTextWrap: { flex: 1 },
  stepLabel: { ...typography.body2, color: colors.textPrimary, fontWeight: '700' },
  stepDetail: { ...typography.body2, color: colors.textSecondary },
  primaryAction: { marginTop: spacing.sm },
});
