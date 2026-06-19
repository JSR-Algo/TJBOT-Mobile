import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ROUTES, type RootStackParamList } from '../../../navigation/routes';
import { colors, radius, spacing, typography } from '../../../theme';
import { staticLessonContentProvider, useLessonDemoProgressStore } from '../index';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonRoadmapScreen'>;

export function LessonRoadmapScreen({ navigation, route }: Props): React.JSX.Element {
  const ageBand = route?.params?.ageBand ?? '7-9';
  const completedLessonIds = useLessonDemoProgressStore((state) => state.progress.completedLessonIds);
  const roadmap = staticLessonContentProvider.getRoadmap(ageBand, completedLessonIds);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Six-month roadmap</Text>
      <Text style={styles.subtitle}>24 weeks, 120 sessions, five short lessons per week.</Text>
      <Text style={styles.badge}>120 sessions</Text>

      {roadmap.map((week) => (
        <TouchableOpacity
          key={week.week}
          accessibilityRole="button"
          style={styles.weekRow}
          onPress={() => navigation.navigate(ROUTES.LessonSessionScreen, { week: week.week, day: 1, ageBand })}
        >
          <View style={styles.weekHeader}>
            <Text style={styles.weekTitle}>Week {week.week}</Text>
            <Text style={styles.month}>Month {week.month}</Text>
          </View>
          <Text style={styles.theme}>{week.theme}</Text>
          <Text style={styles.detail}>{week.completedCount} of {week.lessons.length} complete</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default LessonRoadmapScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  badge: {
    ...typography.body2,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontWeight: '700',
  },
  weekRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  weekTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  month: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '700',
  },
  theme: {
    ...typography.body1,
    color: colors.textPrimary,
  },
  detail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
