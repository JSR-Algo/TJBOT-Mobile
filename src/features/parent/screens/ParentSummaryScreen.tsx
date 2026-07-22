import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { getParentSummary, type ParentSummary } from '@/services/api/parent.api';
import { getChildLessonProgress, getChildProgress } from '@/services/api/progress.api';
import { getKPIs, getPronunciationTrend } from '@/services/api/learning';
import { captureError } from '@/services/observability/sentry';
import { localeDateTag, translateTemplate, useAppLanguage, type AppLocale } from '@/services/i18n/i18n';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import { useHousehold } from '@/contexts/HouseholdContext';
import { buildCourseInsightDashboard, qualityLabel, type CourseInsightDashboard } from '../courseInsights';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSummaryScreen'>;
type SummaryParams = { deviceId?: string; summaryDate?: string };
type SummaryErrorState = {
  title: string;
  detail: string;
  detailValues?: Readonly<Record<string, string | number>>;
};

const EMPTY_SUMMARY: ParentSummary = {
  weekMinutes: 0,
  weekLessons: 0,
  streak: 0,
  topWords: [],
};

export default function ParentSummaryScreen({ navigation, route }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentSummaryScreen);
  const { language, t } = useAppLanguage();
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [summary, setSummary] = React.useState<ParentSummary>(() => emptySummary());
  const [dashboard, setDashboard] = React.useState<CourseInsightDashboard>(() => buildCourseInsightDashboard({}));
  const [errorState, setErrorState] = React.useState<SummaryErrorState>(() => defaultSummaryError());
  const params = (route.params ?? {}) as SummaryParams;
  const { activeChild } = useHousehold();
  const childId = activeChild?.id;

  const loadSummary = React.useCallback(() => {
    let active = true;
    setStatus('loading');
    getParentSummary()
      .then(async (nextSummary) => {
        if (active) {
          const normalized = normalizeParentSummary(nextSummary);
          if (normalized) {
            setSummary(normalized);
            if (childId) {
              try {
                const [progress, assignments, kpis, pronunciationTrend] = await Promise.allSettled([
                  getChildProgress(childId),
                  getChildLessonProgress(childId),
                  getKPIs(childId),
                  getPronunciationTrend(childId, 14),
                ]);
                if (active) {
                  setDashboard(buildCourseInsightDashboard({
                    progress: progress.status === 'fulfilled' ? progress.value : null,
                    assignments: assignments.status === 'fulfilled' ? assignments.value : null,
                    kpis: kpis.status === 'fulfilled' ? kpis.value : null,
                    pronunciationTrend: pronunciationTrend.status === 'fulfilled' ? pronunciationTrend.value : null,
                  }));
                }
              } catch (error) {
                captureError(error);
                if (active) setDashboard(buildCourseInsightDashboard({}));
              }
            } else {
              setDashboard(buildCourseInsightDashboard({}));
            }
            setStatus('success');
          } else {
            setErrorState(defaultSummaryError());
            setStatus('error');
          }
        }
      })
      .catch((error: unknown) => {
        captureError(error);
        if (active) {
          setErrorState(classifySummaryError(error));
          setStatus('error');
        }
      });
    return () => {
      active = false;
    };
  }, [childId]);

  React.useEffect(loadSummary, [loadSummary]);

  if (status === 'loading') {
    return (
      <ParentScroll title="Parent Space">
        <Box paddingHorizontal={24} paddingTop={40}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('Open Parent Space settings')}
            onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>Settings</Text>
          </TouchableOpacity>
          <Text style={styles.dateLabel}>Loading parent summary</Text>
        </Box>
      </ParentScroll>
    );
  }

  if (status === 'error') {
    const title = t(errorState.title);
    const detail = translateTemplate(errorState.detail, errorState.detailValues ?? {}, { locale: language });
    return (
      <ParentScroll title="Parent Space">
        <Box paddingHorizontal={24} paddingTop={40} gap={12}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('Open Parent Space settings')}
            onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>Settings</Text>
          </TouchableOpacity>
          {params.summaryDate ? <Text style={styles.dateLabel} i18n={false}>{summaryDateLabel(params.summaryDate, language)}</Text> : null}
          {params.deviceId ? <Text style={styles.dateLabel} i18n={false}>{summaryDeviceLabel(params.deviceId, language)}</Text> : null}
          <Text fontWeight="700" style={styles.headline} i18n={false}>{title}</Text>
          <Text style={styles.dateLabel} i18n={false}>{detail}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={translateTemplate('Retry {{title}}', { title }, { locale: language })}
            onPress={() => { loadSummary(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </Box>
      </ParentScroll>
    );
  }

  const stats = summaryStats(summary);
  const hasActivity = !isEmptyParentSummary(summary);
  const topWords = summary.topWords.slice(0, 3);

  return (
    <ParentScroll
      title="Parent Space"
      right={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('Open Parent Space settings')}
          onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)}
          activeOpacity={0.7}
        >
          <Text style={{ color: PA.accent, fontSize: 15, fontWeight: '500' }}>Settings</Text>
        </TouchableOpacity>
      }
    >
      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={8}>
        <Text style={styles.dateLabel} i18n={false}>{formatTodayLabel(language)}</Text>
        {params.summaryDate ? <Text style={styles.dateLabel} i18n={false}>{summaryDateLabel(params.summaryDate, language)}</Text> : null}
        {params.deviceId ? <Text style={styles.dateLabel} i18n={false}>{summaryDeviceLabel(params.deviceId, language)}</Text> : null}
        {activeChild?.name ? <Text style={styles.childLabel} i18n={false}>{activeChild.name}'s course dashboard</Text> : null}
        <Text fontWeight="600" style={styles.headline} i18n={!hasActivity}>
          {hasActivity ? weeklySummaryLabel(summary, language) : 'No lesson activity has synced yet.'}
        </Text>

        <Box flexDirection="row" gap={10} marginBottom={14} style={{ flexWrap: 'wrap' }}>
          {stats.map(s => (
            <Box key={s.l} style={styles.statCard} flex={1}>
              <Text fontWeight="600" style={styles.statVal}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </Box>
          ))}
        </Box>

        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.ParentTodayScreen)}
          style={styles.todayCard}
          activeOpacity={0.8}
        >
          <Box flex={1}>
            <Text fontWeight="500" style={{ fontSize: 15, color: PA.ink }}>Today's practice</Text>
            <Text style={{ fontSize: 13, color: PA.ink2, marginTop: 2 }}>
              {topWords.length ? topWords.join(' · ') : 'No words synced yet'}
            </Text>
          </Box>
          <ChevronIcon />
        </TouchableOpacity>

        <Box style={styles.dashboardBand}>
          <Text fontWeight="700" style={styles.dashboardTitle}>Course quality</Text>
          <Box flexDirection="row" gap={10} style={{ flexWrap: 'wrap' }}>
            <Box style={styles.insightCard} flex={1}>
              <Text fontWeight="700" style={styles.insightValue} i18n={false}>{dashboard.stepSuccessPct}%</Text>
              <Text style={styles.insightLabel} i18n={false}>{qualityLabel(dashboard.stepSuccessPct)} quality</Text>
              <Text style={styles.insightNote} i18n={false}>{dashboard.stepSuccessPct}% step success</Text>
            </Box>
            <Box style={styles.insightCard} flex={1}>
              <Text fontWeight="700" style={styles.insightValue} i18n={false}>{dashboard.completionRatePct}%</Text>
              <Text style={styles.insightLabel}>Completion</Text>
              <Text style={styles.insightNote} i18n={false}>{dashboard.failedLessons} failed · {dashboard.activeLessons} active</Text>
            </Box>
          </Box>
          <Text fontWeight="700" style={[styles.dashboardTitle, { marginTop: 14 }]}>Learning path</Text>
          {dashboard.coursePath.length > 0 ? (
            dashboard.coursePath.slice(0, 3).map((course) => (
              <Box key={course.courseId} style={styles.pathRow}>
                <Text style={styles.pathLabel} i18n={false}>{course.courseId} · {course.percent}%</Text>
                <Text style={styles.pathMeta} i18n={false}>{course.lessonsCompleted}/{course.lessonsTotal} lessons</Text>
              </Box>
            ))
          ) : (
            <Text style={styles.insightNote}>No course path synced yet</Text>
          )}
          <Text style={[styles.insightNote, { marginTop: 10 }]} i18n={false}>
            Pronunciation {dashboard.pronunciationTrend} · {dashboard.pronunciationScore}%
          </Text>
        </Box>
      </Box>

      <PRowGroup header="History">
        <PRow icon="🗓" label="Past 30 days" value={weeklyLessonsLabel(summary.weekLessons, language)} chevron onPress={() => navigation.navigate(ROUTES.ParentHistoryScreen)} />
        <PRow icon="📚" label="Course progress" value={hasActivity ? 'In progress' : 'No synced progress'} chevron isLast />
      </PRowGroup>

      <PRowGroup header="Account">
        <PRow icon="🛡" label="Safety & Privacy" chevron onPress={() => navigation.navigate(ROUTES.ParentSafetyScreen)} />
        <PRow icon="🩺" label="Diagnostic log" chevron onPress={() => navigation.navigate(ROUTES.ParentDiagnosticLogScreen)} />
        <PRow icon="⚙" label="Settings" chevron onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)} isLast />
      </PRowGroup>

      <Box paddingHorizontal={24} paddingTop={18} paddingBottom={36} alignItems="center">
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} activeOpacity={0.7}>
          <Text style={{ color: PA.accent, fontSize: 15, fontWeight: '500' }}>Return to child play area</Text>
        </TouchableOpacity>
      </Box>
    </ParentScroll>
  );
}

function emptySummary(): ParentSummary {
  return { ...EMPTY_SUMMARY, topWords: [] };
}

function defaultSummaryError(): SummaryErrorState {
  return { title: 'Parent summary unavailable', detail: 'Try again.' };
}

function classifySummaryError(error: unknown): SummaryErrorState {
  const record = asRecord(error);
  const code = readString(record, 'code');
  const status = readNumber(record, 'status');
  if (status === 429 || code === 'RATE_LIMIT_EXCEEDED') {
    return {
      title: 'Parent summary refresh limited',
      detail: 'Try again in {{seconds}} seconds.',
      detailValues: { seconds: readNumber(record, 'retryAfterSeconds') ?? 30 },
    };
  }
  if (status === 502 || code === 'INTERNAL_ERROR') {
    return { title: 'Parent summary service unavailable', detail: 'Retry in a moment.' };
  }
  return defaultSummaryError();
}

function normalizeParentSummary(value: unknown): ParentSummary | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const weekMinutes = readNumberAlias(raw, 'weekMinutes', 'week_minutes');
  const weekLessons = readNumberAlias(raw, 'weekLessons', 'week_lessons');
  const streak = readNumberAlias(raw, 'streak');
  const topWords = readStringArrayAlias(raw, 'topWords', 'top_words');
  if (weekMinutes === undefined || weekLessons === undefined || streak === undefined || topWords === undefined) {
    return null;
  }
  return {
    weekMinutes,
    weekLessons,
    streak,
    topWords,
  };
}

function isEmptyParentSummary(summary: ParentSummary): boolean {
  return summary.weekMinutes === 0
    && summary.weekLessons === 0
    && summary.streak === 0
    && summary.topWords.length === 0;
}

function summaryStats(summary: ParentSummary): Array<{ v: string; l: string }> {
  return [
    { v: String(summary.weekMinutes), l: 'minutes' },
    { v: String(summary.weekLessons), l: 'lessons' },
    { v: String(summary.streak), l: 'day streak' },
  ];
}

function formatTodayLabel(locale: AppLocale, date = new Date()): string {
  const formattedDate = date.toLocaleDateString(localeDateTag(locale), { weekday: 'short', month: 'short', day: 'numeric' });
  return translateTemplate('Today · {{date}}', { date: formattedDate }, { locale });
}

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

function weeklySummaryLabel(summary: ParentSummary, locale: AppLocale): string {
  return translateTemplate(
    'This week: {{lessons}} {{lessonLabel}} and {{minutes}} {{minuteLabel}}.',
    {
      lessons: summary.weekLessons,
      lessonLabel: translateTemplate(pluralize('lesson', summary.weekLessons), {}, { locale }),
      minutes: summary.weekMinutes,
      minuteLabel: translateTemplate(pluralize('minute', summary.weekMinutes), {}, { locale }),
    },
    { locale },
  );
}

function weeklyLessonsLabel(weekLessons: number, locale: AppLocale): string {
  return translateTemplate(
    '{{lessons}} {{lessonLabel}} this week',
    {
      lessons: weekLessons,
      lessonLabel: translateTemplate(pluralize('lesson', weekLessons), {}, { locale }),
    },
    { locale },
  );
}

function summaryDateLabel(date: string, locale: AppLocale): string {
  return translateTemplate('Requested summary: {{date}}', { date }, { locale });
}

function summaryDeviceLabel(deviceId: string, locale: AppLocale): string {
  return translateTemplate('Robot: {{deviceId}}', { deviceId }, { locale });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function readNumberAlias(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = record[key];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
  }
  return undefined;
}

function readStringArrayAlias(record: Record<string, unknown>, ...keys: string[]): string[] | undefined {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = record[key];
    return Array.isArray(value) && value.every((item): item is string => typeof item === 'string') ? [...value] : undefined;
  }
  return undefined;
}

function readString(record: Record<string, unknown> | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(record: Record<string, unknown> | null, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function ChevronIcon() {
  return (
    <Svg width={8} height={14} viewBox="0 0 8 14">
      <Path d="M1 1l6 6-6 6" stroke={PA.ink3} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  dateLabel: { fontSize: 13, color: PA.ink3, marginBottom: 6 },
  childLabel: { fontSize: 13, color: PA.accent, marginBottom: 8, fontWeight: '700' },
  headline: { fontSize: 26, color: PA.ink, letterSpacing: -0.3, lineHeight: 33, marginBottom: 20 },
  statCard: { backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair, borderRadius: 24, padding: 16 },
  statVal: { fontSize: 26, color: PA.accent, letterSpacing: -0.3 },
  statLabel: { fontSize: 12, color: PA.ink2, marginTop: 2 },
  todayCard: {
    width: '100%', backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair,
    borderRadius: 28, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  dashboardBand: {
    marginTop: 14,
    width: '100%',
    backgroundColor: PA.card,
    borderWidth: 1,
    borderColor: PA.hair,
    borderRadius: 28,
    padding: 18,
  },
  dashboardTitle: { fontSize: 15, color: PA.ink, marginBottom: 10 },
  insightCard: {
    minWidth: 128,
    backgroundColor: '#FFF9F0',
    borderWidth: 1,
    borderColor: PA.hair,
    borderRadius: 20,
    padding: 14,
  },
  insightValue: { fontSize: 27, color: PA.accent, lineHeight: 32 },
  insightLabel: { fontSize: 12, color: PA.ink2, marginTop: 2 },
  insightNote: { fontSize: 12, color: PA.ink3, marginTop: 4, lineHeight: 17 },
  pathRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: PA.hair,
  },
  pathLabel: { fontSize: 13, color: PA.ink, fontWeight: '600' },
  pathMeta: { fontSize: 12, color: PA.ink2, marginTop: 2 },
  retryText: { color: PA.accent, fontSize: 15, fontWeight: '500' },
});
