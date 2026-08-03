import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../../components/Button';
import { ROUTES, type RootStackParamList } from '../../../navigation/routes';
import { colors, radius, spacing, typography } from '../../../theme';
import { staticLessonContentProvider, useLessonDemoProgressStore } from '../index';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentLessonSummaryScreen'>;

export function ParentLessonSummaryScreen({ navigation, route }: Props): React.JSX.Element {
  const ageBand = route?.params?.ageBand ?? '7-9';
  const progress = useLessonDemoProgressStore((state) => state.progress);
  const latestLessonId = route?.params?.lessonId ?? progress.attempts[progress.attempts.length - 1]?.lessonId;
  const lesson = useMemo(
    () => (latestLessonId ? staticLessonContentProvider.getLessonById(latestLessonId, ageBand) : undefined)
      ?? staticLessonContentProvider.getTodaySession(ageBand),
    [ageBand, latestLessonId],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Completed today</Text>
      <Text style={styles.title}>Parent summary</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Objective</Text>
        <Text style={styles.body}>{lesson.parentSummary.objective}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Practiced</Text>
        <Text style={styles.body}>{lesson.parentSummary.practiced.join(', ')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Vietnamese support</Text>
        <Text style={styles.body}>{lesson.parentSummary.vietnameseSupport}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Next review</Text>
        <Text style={styles.body}>{lesson.parentSummary.nextReview}</Text>
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.statValue}>{progress.completedLessonIds.length === 1 ? '1 lesson' : `${progress.completedLessonIds.length} lessons`}</Text>
        <Text style={styles.statLabel}>completed in this demo</Text>
      </View>

      <Button
        label="Open roadmap"
        variant="secondary"
        onPress={() => navigation.navigate(ROUTES.LessonRoadmapScreen, { ageBand })}
      />
    </ScrollView>
  );
}

export default ParentLessonSummaryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  body: {
    ...typography.body1,
    color: colors.textPrimary,
  },
  progressCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    padding: spacing.lg,
  },
  statValue: {
    ...typography.h2,
    color: colors.primaryDark,
  },
  statLabel: {
    ...typography.body2,
    color: colors.textSecondary,
  },
});
