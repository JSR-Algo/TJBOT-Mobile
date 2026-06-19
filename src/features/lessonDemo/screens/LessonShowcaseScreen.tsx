import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../../../components';
import { ROUTES, type RootStackParamList } from '../../../navigation/routes';
import theme from '../../../theme';
import { staticLessonContentProvider } from '../providers/StaticLessonContentProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonShowcaseScreen'>;

function showcaseLabel(week: number, day: number, theme: string): string {
  if (week === 1 && day === 1) return 'Week 1 Day 1';
  if (week === 4) return 'Week 4 review';
  if (week === 13) return 'Week 13 showcase';
  if (week === 21) return 'Week 21 pronunciation';
  if (week === 24) return 'Week 24 final showcase';
  return `Week ${week} ${theme}`;
}

export function LessonShowcaseScreen({ navigation, route }: Props): React.JSX.Element {
  const ageBand = route?.params?.ageBand ?? '7-9';
  const lessons = useMemo(() => staticLessonContentProvider.getShowcaseLessons(ageBand), [ageBand]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Investor mode</Text>
      <Text style={styles.title}>Lesson showcase</Text>
      <Text style={styles.subtitle}>Jump to polished moments across the six-month demo.</Text>

      {lessons.map((lesson) => (
        <Card
          key={`${lesson.week}-${lesson.day}`}
          style={styles.showcaseCard}
          onPress={() => navigation.navigate(ROUTES.LessonSessionScreen, {
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

export default LessonShowcaseScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  eyebrow: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '700', marginBottom: theme.spacing.xs },
  title: { ...theme.typography.h1, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  subtitle: { ...theme.typography.body1, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg },
  showcaseCard: { marginBottom: theme.spacing.md },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md, marginBottom: theme.spacing.sm },
  cardText: { flex: 1 },
  cardTitle: { ...theme.typography.h3, color: theme.colors.textPrimary },
  themeText: { ...theme.typography.body2, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  launchText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '700' },
  bodyText: { ...theme.typography.body2, color: theme.colors.textPrimary },
});
