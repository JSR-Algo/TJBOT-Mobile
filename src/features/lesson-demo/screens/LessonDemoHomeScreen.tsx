import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../../components/Button';
import { Text } from '../../../design-system/primitives';
import { ROUTES, type RootStackParamList } from '../../../navigation/routes';
import { colors, radius, spacing, typography } from '../../../theme';
import { staticLessonContentProvider, useLessonDemoProgressStore } from '../index';
import type { LessonAgeBand } from '../types';
import { getAgeBandCopy, screenAgeBands } from './lessonDemoScreenModel';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonDemoHomeScreen'>;

export function LessonDemoHomeScreen({ navigation }: Props): React.JSX.Element {
  const { language } = useAppLanguage();
  const [ageBand, setAgeBand] = useState<LessonAgeBand>('4-6');
  const progress = useLessonDemoProgressStore((state) => state.progress);
  const todayLesson = useMemo(
    () => staticLessonContentProvider.getTodaySession(ageBand),
    [ageBand, language],
  );
  const completedCount = progress.completedLessonIds.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>TeeBot lesson demo</Text>
      <Text style={styles.title}>Today for Demo Learner</Text>
      <Text style={styles.subtitle}>A working six-month English lesson app, ready without cloud AI.</Text>

      <View style={styles.segment}>
        {screenAgeBands.map((band) => (
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
      <Text style={styles.helper}>{getAgeBandCopy(ageBand)}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Today's lesson</Text>
        <Text style={styles.cardTitle}>{todayLesson.theme}</Text>
        <Text style={styles.body}>{todayLesson.objective}</Text>
        <Text style={styles.detail}>Focus: {todayLesson.focusItems.join(', ')}</Text>
        <Button
          label="Start today's lesson"
          onPress={() => navigation.navigate(ROUTES.LessonSessionScreen, { week: todayLesson.week, day: todayLesson.day, ageBand })}
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
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>completed</Text>
        </View>
      </View>

      <Button
        label="Open six-month roadmap"
        variant="secondary"
        onPress={() => navigation.navigate(ROUTES.LessonRoadmapScreen, { ageBand })}
      />
      <Button
        label="Start lesson on robot"
        variant="secondary"
        onPress={() => navigation.navigate(ROUTES.RobotLessonControlScreen, { lessonId: `${todayLesson.week}-${todayLesson.day}`, sessionIndex: (todayLesson.week - 1) * 5 + todayLesson.day })}
        style={styles.secondaryAction}
      />
      <Button
        label="Investor showcase"
        variant="ghost"
        onPress={() => navigation.navigate(ROUTES.LessonShowcaseScreen, { ageBand })}
        style={styles.secondaryAction}
      />
    </ScrollView>
  );
}

export default LessonDemoHomeScreen;

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
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.surface,
  },
  helper: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  cardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  body: {
    ...typography.body1,
    color: colors.textPrimary,
  },
  detail: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  primaryButton: {
    marginTop: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
  },
  statValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  secondaryAction: {
    marginTop: spacing.xs,
  },
});
