import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { tokens } from '@/design-system/tokens';
import type { AssignmentProgress } from '@/services/api/progress.api';
import type { CourseInsightDashboard, CoursePathItem } from '@/features/parent/courseInsights';
import { useHousehold } from '@/contexts/HouseholdContext';
import { localeDateTag, translateTemplate, useAppLanguage, type AppLocale } from '@/services/i18n/i18n';
import { useChildProgressDashboardQuery } from '../hooks/useChildProgressDashboardQuery';

type Props = NativeStackScreenProps<RootStackParamList, 'TodayProgressScreen'>;

// A CANCELLED/FAILED lesson is not an accomplishment and must never render under
// the "You practiced speaking!" celebration. COMPLETED is a real win and stays
// celebratable; active states are work-in-progress the child is still doing.
const FAILURE_STATES = new Set(['CANCELLED', 'FAILED']);

function isCelebratable(a: AssignmentProgress): boolean {
  return !FAILURE_STATES.has(a.state);
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

const TREND_COPY: Record<CourseInsightDashboard['pronunciationTrend'], string | null> = {
  improving: 'improving',
  stable: 'stable',
  declining: 'declining',
  none: null,
};

// Seven activity bars, Monday-first. Counts of COMPLETED lessons per weekday for
// the current ISO week, derived client-side from the assignment feed's
// completedAt — no dedicated weekly-activity endpoint exists yet.
interface WeeklyBar {
  key: number;
  label: string;
  count: number;
  isToday: boolean;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildWeeklyBars(assignments: AssignmentProgress[], locale: AppLocale, now: Date): WeeklyBar[] {
  // Monday as the first column. getDay(): 0=Sun..6=Sat -> mondayOffset 0..6.
  const today = startOfDay(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);

  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const a of assignments) {
    if (a.state !== 'COMPLETED' || !a.completedAt) continue;
    const done = startOfDay(new Date(a.completedAt));
    if (Number.isNaN(done.getTime())) continue;
    const dayIndex = Math.floor((done.getTime() - monday.getTime()) / 86_400_000);
    if (dayIndex >= 0 && dayIndex < 7) counts[dayIndex] += 1;
  }

  const tag = localeDateTag(locale);
  return counts.map((count, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      key: i,
      label: date.toLocaleDateString(tag, { weekday: 'narrow' }),
      count,
      isToday: date.getTime() === today.getTime(),
    };
  });
}

const EMPTY_ASSIGNMENTS: readonly AssignmentProgress[] = Object.freeze([]);

function assignmentRecency(a: AssignmentProgress): number {
  const t = Date.parse(a.updatedAt || a.createdAt || '');
  return Number.isFinite(t) ? t : 0;
}

export default function TodayProgressScreen({ navigation }: Props) {
  const { activeChild } = useHousehold();
  const childId = activeChild?.id;

  const query = useChildProgressDashboardQuery(childId);
  const assignments = query.data?.assignments ?? (EMPTY_ASSIGNMENTS as AssignmentProgress[]);
  const insights = query.data?.insights;

  // Do NOT trust server ordering: sort newest-first by updatedAt (fallback
  // createdAt) before picking the celebratable lesson, so a mis-ordered feed
  // can't put a stale lesson under the celebration header.
  const latest = React.useMemo(() => {
    const sorted = [...assignments].sort((a, b) => assignmentRecency(b) - assignmentRecency(a));
    return sorted.find(isCelebratable);
  }, [assignments]);
  const headerTitle = latest ? 'You practiced speaking!' : 'No practice yet';

  return (
    <PageScroll>
      <PageHeader subtitle="Today" title={headerTitle} />

      <Box
        paddingHorizontal={18}
        paddingBottom={14}
        gap={12}
        accessible={Boolean(insights)}
        accessibilityLabel={insights ? 'Child progress dashboard' : undefined}
      >
        {!childId ? (
          <Text style={styles.message}>Add a child to see progress</Text>
        ) : query.isLoading ? (
          <Text style={styles.message}>Loading progress</Text>
        ) : query.isError ? (
          <ProgressError onRetry={() => { void query.refetch(); }} busy={query.isFetching} />
        ) : insights ? (
          <DashboardBody insights={insights} assignments={assignments} latest={latest} />
        ) : null}
      </Box>

      <Box paddingHorizontal={24} paddingTop={8} paddingBottom={28} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} color={tokens.colors.coral}>
          Back home
        </PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

function DashboardBody({
  insights,
  assignments,
  latest,
}: {
  insights: CourseInsightDashboard;
  assignments: AssignmentProgress[];
  latest: AssignmentProgress | undefined;
}) {
  const { language } = useAppLanguage();
  const hasAnyActivity =
    insights.completedLessons > 0 ||
    insights.masteredWords > 0 ||
    insights.currentStreakDays > 0 ||
    assignments.length > 0;

  // Always render the full dashboard scaffold — even a brand-new child sees the
  // metric cards reading 0 (never a bare "no data" message), which reads as a
  // real, professional dashboard waiting to fill in. An encouraging first-run
  // line replaces the pronunciation/today cards until there is activity.
  return (
    <>
      <HeroBand insights={insights} />
      <QualityRow insights={insights} assignments={assignments} language={language} />
      <WeeklyStrip assignments={assignments} language={language} />
      <LearningPath insights={insights} language={language} />
      {hasAnyActivity ? (
        <>
          <PronunciationLine insights={insights} language={language} />
          {latest ? <TodayLessonCard latest={latest} language={language} /> : null}
        </>
      ) : (
        <Text style={styles.emptyHint}>Finish a lesson on Robot to fill in your progress.</Text>
      )}
    </>
  );
}

function HeroBand({ insights }: { insights: CourseInsightDashboard }) {
  return (
    <Box style={styles.heroCard} flexDirection="row">
      <HeroStat value={`${insights.currentStreakDays}`} icon="🔥" label="Day streak" />
      <Box style={styles.heroDivider} />
      <HeroStat value={`${insights.completedLessons}`} icon="📚" label="Lessons done" />
      <Box style={styles.heroDivider} />
      <HeroStat value={`${insights.masteredWords}`} icon="⭐" label="Mastered words" />
    </Box>
  );
}

function HeroStat({ value, icon, label }: { value: string; icon: string; label: string }) {
  return (
    <Box flex={1} alignItems="center" gap={2}>
      <Text style={styles.heroIcon} i18n={false}>{icon}</Text>
      <Text fontWeight="800" style={styles.heroValue} i18n={false}>{value}</Text>
      <Text fontWeight="700" style={styles.heroLabel}>{label}</Text>
    </Box>
  );
}

function QualityRow({
  insights,
  assignments,
  language,
}: {
  insights: CourseInsightDashboard;
  assignments: AssignmentProgress[];
  language: AppLocale;
}) {
  // Raw step totals for a human-readable sublabel — the dashboard only exposes
  // the percentage, so recompute the "succeeded of completed steps" tally here.
  const { stepsSucceeded, stepsCompleted } = React.useMemo(() => {
    let succeeded = 0;
    let completed = 0;
    for (const a of assignments) {
      succeeded += Math.max(0, a.stepsSucceeded);
      completed += Math.max(0, a.stepsCompleted);
    }
    return { stepsSucceeded: succeeded, stepsCompleted: completed };
  }, [assignments]);

  return (
    <Box flexDirection="row" gap={10}>
      <Box style={styles.qualityCard} flex={1} gap={2}>
        <Text fontWeight="800" style={styles.qualityValue} i18n={false}>{insights.stepSuccessPct}%</Text>
        <Text fontWeight="700" style={styles.qualityLabel}>Step success</Text>
        <Text style={styles.qualityNote} i18n={false}>
          {translateTemplate('{{succeeded}} of {{completed}} {{stepLabel}}', {
            succeeded: stepsSucceeded,
            completed: stepsCompleted,
            stepLabel: translateTemplate('steps', {}, { locale: language }),
          }, { locale: language })}
        </Text>
      </Box>
      <Box style={styles.qualityCard} flex={1} gap={2}>
        <Text fontWeight="800" style={styles.qualityValue} i18n={false}>{insights.completionRatePct}%</Text>
        <Text fontWeight="700" style={styles.qualityLabel}>Completion</Text>
        <Text style={styles.qualityNote} i18n={false}>
          {translateTemplate('{{failed}} failed · {{active}} active', {
            failed: insights.failedLessons,
            active: insights.activeLessons,
          }, { locale: language })}
        </Text>
      </Box>
    </Box>
  );
}

function WeeklyStrip({ assignments, language }: { assignments: AssignmentProgress[]; language: AppLocale }) {
  const bars = React.useMemo(
    () => buildWeeklyBars(assignments, language, new Date()),
    [assignments, language],
  );
  const max = Math.max(1, ...bars.map(b => b.count));
  const hasActivity = bars.some(b => b.count > 0);

  return (
    <Box style={styles.sectionCard} gap={10}>
      <Text fontWeight="700" style={styles.sectionTitle}>This week</Text>
      {hasActivity ? (
        <Box flexDirection="row" gap={8} alignItems="flex-end" style={styles.weekRow}>
          {bars.map(bar => (
            <Box
              key={bar.key}
              flex={1}
              alignItems="center"
              gap={6}
              accessible
              accessibilityLabel={translateTemplate('{{day}} practice progress: {{percent}} percent', {
                day: bar.label,
                percent: Math.round((bar.count / max) * 100),
              }, { locale: language })}
            >
              <Box style={styles.barTrack}>
                <Box
                  style={[
                    styles.barFill,
                    { height: `${Math.round((bar.count / max) * 100)}%` },
                    bar.count === 0 ? styles.barEmpty : null,
                    bar.isToday ? styles.barToday : null,
                  ]}
                />
              </Box>
              <Text style={[styles.barLabel, bar.isToday ? styles.barLabelToday : null]} i18n={false}>
                {bar.label}
              </Text>
            </Box>
          ))}
        </Box>
      ) : (
        <Text style={styles.emptyNote}>No activity yet</Text>
      )}
    </Box>
  );
}

function LearningPath({ insights, language }: { insights: CourseInsightDashboard; language: AppLocale }) {
  const path = insights.coursePath.slice(0, 3);
  return (
    <Box style={styles.sectionCard} gap={10}>
      <Text fontWeight="700" style={styles.sectionTitle}>Learning path</Text>
      {path.length > 0 ? (
        path.map((course: CoursePathItem) => (
          <Box key={course.courseId} gap={6}>
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
              <Text fontWeight="700" style={styles.pathLabel} i18n={false}>{course.courseId}</Text>
              <Text style={styles.pathMeta} i18n={false}>
                {translateTemplate('{{completed}} of {{total}} lessons', {
                  completed: course.lessonsCompleted,
                  total: course.lessonsTotal,
                }, { locale: language })}
              </Text>
            </Box>
            <Box style={styles.pathTrack}>
              <Box style={[styles.pathFill, { width: `${Math.min(100, Math.max(0, course.percent))}%` }]} />
            </Box>
          </Box>
        ))
      ) : (
        <Text style={styles.emptyNote}>No course path yet</Text>
      )}
    </Box>
  );
}

function PronunciationLine({ insights, language }: { insights: CourseInsightDashboard; language: AppLocale }) {
  const trendKey = TREND_COPY[insights.pronunciationTrend];
  if (insights.pronunciationScore <= 0 && trendKey === null) return null;
  const trendText = trendKey ? translateTemplate(trendKey, {}, { locale: language }) : '—';
  return (
    <Box style={styles.pronRow} flexDirection="row" alignItems="center" justifyContent="space-between">
      <Text fontWeight="700" style={styles.pronLabel}>Pronunciation</Text>
      <Text fontWeight="700" style={styles.pronValue} i18n={false}>
        {translateTemplate('{{score}}% · {{trend}}', {
          score: insights.pronunciationScore,
          trend: trendText,
        }, { locale: language })}
      </Text>
    </Box>
  );
}

function TodayLessonCard({ latest, language }: { latest: AssignmentProgress; language: AppLocale }) {
  return (
    <Box style={styles.sectionCard} gap={8}>
      <Text fontWeight="700" style={styles.sectionTitle}>Today's lesson</Text>
      {latest.lessonTitle ? (
        <Text fontWeight="800" style={styles.lessonTitle} i18n={false}>{latest.lessonTitle}</Text>
      ) : null}
      <Box flexDirection="row" alignItems="center" gap={8}>
        <Box style={styles.statePill}>
          <Text fontWeight="700" style={styles.statePillText}>{stateLabel(latest.state)}</Text>
        </Box>
        <Text style={styles.lessonSteps} i18n={false}>
          {translateTemplate('{{succeeded}} of {{completed}} {{stepLabel}}', {
            succeeded: latest.stepsSucceeded,
            completed: latest.stepsCompleted,
            stepLabel: translateTemplate('steps', {}, { locale: language }),
          }, { locale: language })}
        </Text>
      </Box>
    </Box>
  );
}

function ProgressError({ onRetry, busy }: { onRetry: () => void; busy?: boolean }): React.JSX.Element {
  const { t } = useAppLanguage();
  return (
    <Box gap={6}>
      <Text fontWeight="700" style={styles.message}>Progress unavailable</Text>
      <Pressable
        onPress={onRetry}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('Tap to try again.')}
        accessibilityState={{ disabled: !!busy, busy: !!busy }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.retryBtn}
      >
        {busy ? <ActivityIndicator size="small" color={tokens.colors.plum} /> : null}
        <Text style={styles.errorDetail}>Tap to try again.</Text>
      </Pressable>
    </Box>
  );
}

const styles = StyleSheet.create({
  message: { fontSize: 18, color: tokens.colors.ink },
  emptyHint: { fontSize: 14, color: tokens.colors.inkSoft, lineHeight: 20, paddingTop: 2 },
  retryBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroCard: {
    backgroundColor: tokens.colors.paper,
    borderRadius: tokens.radii.card,
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    ...tokens.shadows.card,
  },
  heroDivider: { width: 1, alignSelf: 'stretch', marginVertical: 6, backgroundColor: 'rgba(43,33,64,0.08)' },
  heroIcon: { fontSize: 24 },
  heroValue: { fontSize: 30, color: tokens.colors.ink, lineHeight: 34 },
  heroLabel: { fontSize: 11, color: tokens.colors.inkSoft, textAlign: 'center' },
  qualityCard: {
    backgroundColor: tokens.colors.paper,
    borderRadius: 18,
    padding: 16,
    ...tokens.shadows.card,
  },
  qualityValue: { fontSize: 26, color: tokens.colors.ink, lineHeight: 30 },
  qualityLabel: { fontSize: 13, color: tokens.colors.ink },
  qualityNote: { fontSize: 11, color: tokens.colors.inkSoft, lineHeight: 16 },
  sectionCard: {
    backgroundColor: tokens.colors.paper,
    borderRadius: 18,
    padding: 16,
    ...tokens.shadows.card,
  },
  sectionTitle: { fontSize: 15, color: tokens.colors.ink },
  weekRow: { height: 96 },
  barTrack: {
    width: '100%',
    height: 72,
    borderRadius: 8,
    backgroundColor: 'rgba(43,33,64,0.05)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 8, backgroundColor: tokens.colors.mint, minHeight: 6 },
  barEmpty: { backgroundColor: 'rgba(43,33,64,0.08)' },
  barToday: { backgroundColor: tokens.colors.coral },
  barLabel: { fontSize: 11, color: tokens.colors.inkSoft },
  barLabelToday: { color: tokens.colors.coral, fontWeight: '800' },
  emptyNote: { fontSize: 13, color: tokens.colors.inkSoft },
  pathLabel: { fontSize: 14, color: tokens.colors.ink },
  pathMeta: { fontSize: 12, color: tokens.colors.inkSoft },
  pathTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(43,33,64,0.06)', overflow: 'hidden' },
  pathFill: { height: '100%', borderRadius: 4, backgroundColor: tokens.colors.sky },
  pronRow: {
    backgroundColor: tokens.colors.paper,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...tokens.shadows.card,
  },
  pronLabel: { fontSize: 14, color: tokens.colors.ink },
  pronValue: { fontSize: 14, color: tokens.colors.plum },
  lessonTitle: { fontSize: 18, color: tokens.colors.ink, lineHeight: 24 },
  statePill: {
    backgroundColor: tokens.colors.cream2,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  statePillText: { fontSize: 12, color: tokens.colors.ink },
  lessonSteps: { fontSize: 13, color: tokens.colors.inkSoft },
  errorDetail: { fontSize: 14, color: tokens.colors.inkSoft },
});
