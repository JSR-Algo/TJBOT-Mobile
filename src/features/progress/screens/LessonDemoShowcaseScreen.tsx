import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '@/components/Card';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { colors, spacing, typography } from '@/design-system/tokens/legacy-semantic';
import { staticLessonContentProvider, type LessonAgeBand } from '../lesson-demo';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonDemoShowcaseScreen'>;

function showcaseLabel(week: number, day: number, theme: string): string {
  if (week === 1 && day === 1) return 'Week 1 Day 1';
  if (week === 4) return 'Week 4 review';
  if (week === 13) return 'Week 13 showcase';
  if (week === 21) return 'Week 21 pronunciation';
  if (week === 24) return 'Week 24 final showcase';
  return `Week ${week} ${theme}`;
}

export default function LessonDemoShowcaseScreen({ navigation, route }: Props): React.JSX.Element {
  const ageBand: LessonAgeBand = route.params?.ageBand ?? '7-9';
  const lessons = React.useMemo(() => staticLessonContentProvider.getShowcaseLessons(ageBand), [ageBand]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Investor mode</Text>
      <Text style={styles.title}>Lesson showcase</Text>
      <Text style={styles.subtitle}>Jump to polished moments across the six-month path.</Text>

      {lessons.map((lesson) => (
        <Card
          key={`${lesson.week}-${lesson.day}`}
          style={styles.showcaseCard}
          onPress={() => navigation.navigate(ROUTES.LessonDemoSessionScreen, {
            week: lesson.week,
            day: lesson.day,
            ageBand,
          })}
        >
          <View style={styles.cardRow}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{showcaseLabel(lesson.week, lesson.day, lesson.theme)}</Text>
              <Text style={styles.themeText}>{lesson.theme}</Text>
            </View>
            <Text style={styles.launchText}>Launch</Text>
          </View>
          <Text style={styles.bodyText}>{lesson.objective}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '700', marginBottom: spacing.xs },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body1, color: colors.textSecondary, marginBottom: spacing.lg },
  showcaseCard: { marginBottom: spacing.md },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  cardText: { flex: 1 },
  cardTitle: { ...typography.h3, color: colors.textPrimary },
  themeText: { ...typography.body2, color: colors.textSecondary, marginTop: spacing.xs },
  launchText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  bodyText: { ...typography.body2, color: colors.textPrimary },
});
