import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/Button';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { colors, radius, spacing, typography } from '@/design-system/tokens/legacy-semantic';
import {
  LESSON_AGE_BANDS,
  staticLessonContentProvider,
  useLessonDemoProgressStore,
  type LessonAgeBand,
} from '../lesson-demo';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonDemoHomeScreen'>;

const ageBandCopy: Record<LessonAgeBand, string> = {
  '4-6': 'Pictures, gestures, and one tiny phrase.',
  '7-9': 'Two or three words with a simple sentence frame.',
  '10-11': 'Short role-play with a parent grammar note.',
};

export default function LessonDemoHomeScreen({ navigation }: Props): React.JSX.Element {
  const [ageBand, setAgeBand] = React.useState<LessonAgeBand>('4-6');
  const progress = useLessonDemoProgressStore((state) => state.progress);
  const todayLesson = React.useMemo(() => staticLessonContentProvider.getTodaySession(ageBand), [ageBand]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>TeeBot lesson demo</Text>
      <Text style={styles.title}>Today for Demo Learner</Text>
      <Text style={styles.subtitle}>A working six-month English lesson path that runs without cloud AI.</Text>

      <View style={styles.segment}>
        {LESSON_AGE_BANDS.map((band) => (
          <TouchableOpacity
            key={band}
            accessibilityRole="button"
            onPress={() => setAgeBand(band)}
            style={[styles.segmentButton, ageBand === band ? styles.segmentButtonActive : null]}
          >
            <Text style={[styles.segmentText, ageBand === band ? styles.segmentTextActive : null]}>
              Age {band}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.helper}>{ageBandCopy[ageBand]}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Today's lesson</Text>
        <Text style={styles.cardTitle}>{todayLesson.theme}</Text>
        <Text style={styles.body}>{todayLesson.objective}</Text>
        <Text style={styles.detail}>Focus: {todayLesson.focusItems.join(', ')}</Text>
        <Button
          label="Start today's lesson"
          onPress={() => navigation.navigate(ROUTES.LessonDemoSessionScreen, { week: todayLesson.week, day: todayLesson.day, ageBand })}
          style={styles.primaryButton}
        />
      </View>

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>24 weeks</Text>
          <Text style={styles.statLabel}>guided roadmap</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>120 sessions</Text>
          <Text style={styles.statLabel}>local content</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{progress.completedLessonIds.length}</Text>
          <Text style={styles.statLabel}>completed</Text>
        </View>
      </View>

      <Button
        label="Open six-month roadmap"
        variant="secondary"
        onPress={() => navigation.navigate(ROUTES.LessonDemoRoadmapScreen, { ageBand })}
      />
      <Button
        label="Start lesson on robot"
        variant="secondary"
        onPress={() => navigation.navigate(ROUTES.RobotLessonControlScreen, {
          lessonId: todayLesson.lessonId,
          sessionIndex: (todayLesson.week - 1) * 5 + todayLesson.day,
        })}
        style={styles.secondaryAction}
      />
      <Button
        label="Investor showcase"
        variant="ghost"
        onPress={() => navigation.navigate(ROUTES.LessonDemoShowcaseScreen, { ageBand })}
        style={styles.secondaryAction}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '700', textTransform: 'uppercase' },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body1, color: colors.textSecondary },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentButton: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  segmentButtonActive: { backgroundColor: colors.primary },
  segmentText: { ...typography.body2, color: colors.textSecondary, fontWeight: '700' },
  segmentTextActive: { color: colors.surface },
  helper: { ...typography.body2, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
  cardTitle: { ...typography.h2, color: colors.textPrimary },
  body: { ...typography.body1, color: colors.textPrimary },
  detail: { ...typography.body2, color: colors.textSecondary },
  primaryButton: { marginTop: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
  },
  statValue: { ...typography.h3, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  secondaryAction: { marginTop: spacing.xs },
});
