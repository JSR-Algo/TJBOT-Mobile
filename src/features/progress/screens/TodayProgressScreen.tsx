import React from 'react';
import { StyleSheet } from 'react-native';
import { BookOpen, CalendarDays, Flame } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import {
  ChartBar,
  CountUp,
  ProgressFill,
  Reveal,
} from '@/design-system/animations';
import PageScroll from '@/design-system/components/PageScroll';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import {
  getChildLessonProgress,
  getChildProgress,
  type AssignmentProgress,
  type ChildProgress,
} from '@/services/api/progress.api';
import { useHousehold } from '@/contexts/HouseholdContext';
import { localeDateTag, translateTemplate, useAppLanguage, type AppLocale } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'TodayProgressScreen'>;

const FAILURE_STATES = new Set(['CANCELLED', 'FAILED']);

function isCelebratable(assignment: AssignmentProgress): boolean {
  return !FAILURE_STATES.has(assignment.state);
}

const STATE_COPY: Record<string, string> = {
  ASSIGNED: 'Sent to robot',
  PRELOADING: 'Getting ready',
  READY: 'Ready to start',
  RUNNING: 'In progress',
  PAUSED: 'Paused',
  COMPLETED: 'Finished',
  FAILED: "Didn't finish",
  CANCELLED: 'Cancelled',
};

function stateLabel(state: string): string {
  return STATE_COPY[state] ?? state;
}


export default function TodayProgressScreen(_props: Props) {
  const { activeChild } = useHousehold();
  const { language, t } = useAppLanguage();
  const childId = activeChild?.id;
  const assignmentQuery = useQuery({
    queryKey: ['lesson-progress', 'child', childId],
    queryFn: () => getChildLessonProgress(childId as string),
    enabled: typeof childId === 'string' && childId.length > 0,
  });
  const summaryQuery = useQuery({
    queryKey: ['learning-progress', 'child', childId],
    queryFn: () => getChildProgress(childId as string),
    enabled: typeof childId === 'string' && childId.length > 0,
  });

  const assignments = assignmentQuery.data ?? [];
  const latest = assignments.find(isCelebratable);
  const summary = summaryQuery.data;
  const isLoading = assignmentQuery.isLoading || summaryQuery.isLoading;
  const isError = assignmentQuery.isError || summaryQuery.isError;
  const hasProgress = Boolean(latest)
    || Boolean(summary && (summary.lessonsCompleted || summary.currentStreakDays || summary.masteredWords));
  const childName = activeChild?.name?.trim() || t('Mia');

  return (
    <PageScroll bg="#E0F7FA">
      <Box style={styles.header} flexDirection="row" alignItems="flex-end" justifyContent="space-between">
        <Box flex={1}>
          <Text i18n={false} fontWeight="800" style={styles.heading}>
            {translateTemplate("{{name}}'s progress", { name: childName }, { locale: language })}
          </Text>
          <Text fontWeight="700" style={styles.subheading}>{t('See what your child has learned')}</Text>
        </Box>
        <Box style={styles.rangeChip} flexDirection="row" alignItems="center" gap={7}>
          <CalendarDays size={17} color="#FF6F61" />
          <Text fontWeight="800" style={styles.rangeText}>{t('This week')}</Text>
        </Box>
      </Box>

      <Box style={styles.body} gap={18}>
        {isLoading ? <StatusCard title="Loading progress" /> : null}
        {isError ? (
          <ProgressError
            onRetry={() => {
              void assignmentQuery.refetch();
              void summaryQuery.refetch();
            }}
          />
        ) : null}
        {!isLoading && !isError && !hasProgress ? <StatusCard title="No lessons yet" /> : null}
        {!isLoading && !isError && hasProgress ? (
          <ProgressBody assignments={assignments} latest={latest} summary={summary} />
        ) : null}
      </Box>
    </PageScroll>
  );
}

function ProgressBody({
  assignments,
  latest,
  summary,
}: {
  assignments: AssignmentProgress[];
  latest?: AssignmentProgress;
  summary?: ChildProgress;
}) {
  const { language, t } = useAppLanguage();
  const activity = weeklyCompletedActivity(assignments, language);
  const maxActivity = Math.max(...activity.map(day => day.count), 1);
  const courseTotals = summary?.byCourse.reduce(
    (totals, course) => ({
      completed: totals.completed + course.lessonsCompleted,
      total: totals.total + course.lessonsTotal,
    }),
    { completed: 0, total: 0 },
  ) ?? { completed: 0, total: 0 };
  const coursePercent = courseTotals.total > 0
    ? Math.min(100, Math.round((courseTotals.completed / courseTotals.total) * 100))
    : 0;

  return (
    <>
      <Reveal index={0} testID="progressLeadReveal">
        <Box style={styles.leadCard}>
          <Text fontWeight="800" style={styles.leadEyebrow}>{t('Lessons completed')}</Text>
          <CountUp
            testID="progressLeadValue"
            value={summary?.lessonsCompleted ?? 0}
            style={styles.leadValue}
          />
          <Text fontWeight="700" style={styles.chartTitle}>{t('Completed activity · 7 days')}</Text>
          <Box style={styles.chart} flexDirection="row" alignItems="flex-end" justifyContent="space-between">
            {activity.map((day, index) => (
              <Box alignItems="center" flex={1} gap={7} key={day.key}>
                <Box style={styles.barTrack} justifyContent="flex-end">
                  <ChartBar
                    count={day.count}
                    maxCount={maxActivity}
                    trackHeight={118}
                    index={index}
                    isToday={day.isToday}
                    testID={`progressBar-${day.key}`}
                  />
                </Box>
                <Text i18n={false} fontWeight="800" style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                  {day.label}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Reveal>

      <Reveal index={1} testID="progressMetricsReveal">
        <Box flexDirection="row" gap={12}>
          <MetricCard
            icon={<Flame size={24} color="#B68A1F" />}
            iconBackground="rgba(255,204,77,0.24)"
            value={summary?.currentStreakDays ?? 0}
            label={t('day streak')}
            background="#FFF9E5"
            testID="progressStreakValue"
          />
          <MetricCard
            icon={<BookOpen size={24} color="#318C7D" />}
            iconBackground="rgba(76,183,165,0.14)"
            value={summary?.masteredWords ?? 0}
            label={t('Words learned')}
            background="#F3FFF9"
            testID="progressWordsValue"
          />
        </Box>
      </Reveal>

      {courseTotals.total > 0 ? (
        <Reveal index={2} testID="progressCourseReveal">
          <Box style={styles.activityCard} gap={14}>
            <Text fontWeight="800" style={styles.sectionTitle}>{t('Course progress')}</Text>
            <Text
              i18n={false}
              fontWeight="800"
              style={styles.courseCount}
            >
              {translateTemplate('{{completed}}/{{total}} lessons', courseTotals, { locale: language })}
            </Text>
            <ProgressFill
              percent={coursePercent}
              testID="progressCourseFill"
            />
          </Box>
        </Reveal>
      ) : null}

      {latest ? (
        <Reveal index={courseTotals.total > 0 ? 3 : 2} testID="progressLatestReveal">
          <Box style={styles.latestCard}>
            <Text fontWeight="800" style={styles.sectionTitle}>{t('Latest lesson')}</Text>
            {latest.lessonTitle ? (
              <Text fontWeight="800" style={styles.lessonTitle} i18n={false}>{latest.lessonTitle}</Text>
            ) : null}
            <Box flexDirection="row" gap={10}>
              <StatChip value={String(latest.stepsSucceeded)} label="steps right" />
              <StatChip value={String(latest.stepsCompleted)} label="steps done" />
            </Box>
            <Box style={styles.stateCard}>
              <Text fontWeight="700" style={styles.stateLabel}>{t(stateLabel(latest.state))}</Text>
              <Text style={styles.stateDetail} i18n={false}>
                {translateTemplate('{{succeeded}} of {{completed}} {{stepLabel}}', {
                  succeeded: latest.stepsSucceeded,
                  completed: latest.stepsCompleted,
                  stepLabel: translateTemplate('steps', {}, { locale: language }),
                }, { locale: language })}
              </Text>
            </Box>
          </Box>
        </Reveal>
      ) : null}
    </>
  );
}

function weeklyCompletedActivity(assignments: AssignmentProgress[], locale: AppLocale): Array<{
  key: string;
  label: string;
  count: number;
  isToday: boolean;
}> {
  const today = startOfLocalDay(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const count = assignments.filter(assignment => {
      if (assignment.state !== 'COMPLETED') return false;
      const completedAt = assignment.completedAt ? new Date(assignment.completedAt) : null;
      return completedAt !== null
        && !Number.isNaN(completedAt.getTime())
        && completedAt >= day
        && completedAt < nextDay;
    }).length;
    return {
      key: day.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat(localeDateTag(locale), { weekday: 'narrow' }).format(day),
      count,
      isToday: index === 6,
    };
  });
}

function startOfLocalDay(value: Date): Date {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function MetricCard({
  icon,
  iconBackground,
  value,
  label,
  background,
  testID,
}: {
  icon: React.ReactNode;
  iconBackground: string;
  value: number;
  label: string;
  background: string;
  testID?: string;
}) {
  return (
    <Box style={[styles.metricCard, { backgroundColor: background }]} flex={1}>
      <Box style={[styles.metricIcon, { backgroundColor: iconBackground }]} alignItems="center" justifyContent="center">
        {icon}
      </Box>
      <CountUp testID={testID} value={value} style={styles.metricValue} />
      <Text i18n={false} fontWeight="800" style={styles.metricLabel}>{label}</Text>
    </Box>
  );
}

function StatusCard({ title }: { title: string }) {
  return <Text fontWeight="700" style={styles.message}>{title}</Text>;
}

function ProgressError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <Box style={styles.message} gap={6}>
      <Text fontWeight="700" style={styles.errorTitle}>Progress unavailable</Text>
      <Text style={styles.errorDetail} onPress={onRetry}>Tap to try again.</Text>
    </Box>
  );
}

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <Box style={styles.statChip} flex={1} alignItems="center" gap={4}>
      <Text fontWeight="800" style={styles.statValue} i18n={false}>{value}</Text>
      <Text fontWeight="700" style={styles.statLabel}>{label}</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 24,
    paddingHorizontal: 26,
    paddingTop: 58,
  },
  heading: {
    color: '#2D3436',
    fontSize: 30,
    lineHeight: 36,
    marginBottom: 4,
  },
  subheading: {
    color: '#6B7A82',
    fontSize: 14,
    lineHeight: 20,
  },
  rangeChip: {
    backgroundColor: '#FFFDF9',
    borderColor: 'rgba(45,52,54,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  rangeText: {
    color: '#2D3436',
    fontSize: 12,
  },
  body: {
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  leadCard: {
    backgroundColor: '#FFFDF9',
    borderColor: 'rgba(45,52,54,0.08)',
    borderRadius: 34,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#2D3436',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  leadEyebrow: { color: '#77736F', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  leadValue: { color: '#2D3436', fontSize: 52, fontWeight: '800', letterSpacing: -1.8, lineHeight: 60, marginTop: 5 },
  chartTitle: { color: '#77736F', fontSize: 12, marginBottom: 10, marginTop: 4 },
  chart: { borderBottomColor: '#DED6CC', borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 154, paddingTop: 8 },
  barTrack: { alignItems: 'center', height: 122, width: '100%' },
  dayLabel: { color: '#928C85', fontSize: 10 },
  dayLabelToday: { color: '#FF5F65' },
  message: {
    backgroundColor: '#FFFDF9',
    borderColor: 'rgba(45,52,54,0.08)',
    borderRadius: 28,
    borderWidth: 1,
    color: '#2D3436',
    fontSize: 18,
    padding: 24,
  },
  errorTitle: {
    color: '#2D3436',
    fontSize: 18,
  },
  errorDetail: {
    color: '#FF6F61',
    fontSize: 14,
  },
  metricCard: {
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  metricIcon: {
    borderRadius: 13,
    height: 42,
    marginBottom: 14,
    width: 42,
  },
  metricValue: {
    color: '#2D3436',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
  },
  metricLabel: {
    color: '#6B7A82',
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  activityCard: {
    backgroundColor: '#FFFDF9',
    borderColor: 'rgba(45,52,54,0.08)',
    borderRadius: 34,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#2D3436',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  courseCount: {
    color: '#FF6F61',
    fontSize: 24,
    lineHeight: 30,
  },
  sectionTitle: {
    color: '#2D3436',
    fontSize: 18,
    lineHeight: 24,
  },
  latestCard: {
    backgroundColor: '#FFFDF9',
    borderColor: 'rgba(45,52,54,0.08)',
    borderRadius: 34,
    borderWidth: 1,
    gap: 12,
    padding: 22,
  },
  lessonTitle: {
    color: '#2D3436',
    fontSize: 19,
    lineHeight: 25,
  },
  statChip: {
    backgroundColor: '#F7FAFA',
    borderRadius: 22,
    padding: 16,
  },
  statValue: {
    color: '#FF6F61',
    fontSize: 29,
    lineHeight: 34,
  },
  statLabel: {
    color: '#636E72',
    fontSize: 11,
    textAlign: 'center',
  },
  stateCard: {
    backgroundColor: '#F3FFF9',
    borderRadius: 20,
    padding: 16,
  },
  stateLabel: {
    color: '#2D3436',
    fontSize: 16,
    marginBottom: 5,
  },
  stateDetail: {
    color: '#636E72',
    fontSize: 13,
  },
});
