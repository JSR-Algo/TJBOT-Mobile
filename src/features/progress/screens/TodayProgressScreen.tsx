import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { getProgressSummary, type ProgressSummary } from '@/services/api/progress.api';
import { captureError } from '@/services/observability/sentry';
import { translateTemplate, useAppLanguage, type AppLocale } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'TodayProgressScreen'>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; summary: ProgressSummary }
  | { kind: 'error'; error: ProgressErrorState };

type ProgressErrorState = {
  title: string;
  detail: string;
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const DAY_SHORT_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
const TODAY_INDEX = 3;

export default function TodayProgressScreen({ navigation }: Props) {
  const [state, setState] = React.useState<LoadState>({ kind: 'loading' });

  React.useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    void getProgressSummary()
      .then((summary) => {
        if (active) setState({ kind: 'ready', summary });
      })
      .catch((error: unknown) => {
        captureError(error);
        if (active) setState({ kind: 'error', error: classifyProgressError(error) });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageScroll>
      <PageHeader subtitle="Today" title="You practiced speaking!" />

      <Box paddingHorizontal={18} paddingBottom={14} gap={12}>
        {state.kind === 'loading' ? <Text style={styles.message}>Loading progress</Text> : null}
        {state.kind === 'ready' ? <ProgressBody summary={state.summary} /> : null}
        {state.kind === 'error' ? <ProgressError error={state.error} /> : null}
      </Box>

      <Box paddingHorizontal={24} paddingTop={8} paddingBottom={28} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} color="#FF6F61">Back home</PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

function ProgressBody({ summary }: { summary: ProgressSummary }) {
  const { language } = useAppLanguage();
  if (isEmptySummary(summary)) {
    return <Text style={styles.message}>No practice yet</Text>;
  }

  return (
    <>
      <Box flexDirection="row" gap={10}>
        <StatChip value={String(summary.minutesDone)} label="minutes done" />
        <StatChip value={String(summary.lessonsCompleted)} label="lessons done" />
        {summary.starsToday > 0 ? <StatChip value={String(summary.starsToday)} label="stars today" /> : null}
      </Box>
      <Box style={styles.weekCard}>
        <Text fontWeight="800" style={styles.weekTitle}>This week</Text>
        <Box flexDirection="row" justifyContent="space-between" alignItems="flex-end" gap={8} style={styles.weekBars}>
          {summary.weeklyBars.map((value, index) => {
            const percent = Math.round(value * 100);
            const isToday = index === TODAY_INDEX;
            return (
              <Box key={DAY_NAMES[index]} flex={1} alignItems="center" gap={6}>
                <Box
                  accessibilityLabel={practiceProgressLabel(DAY_NAMES[index], percent, isToday, language)}
                  style={[
                    styles.bar,
                    {
                      height: value ? Math.max(8, value * 90) : 8,
                      backgroundColor: isToday ? '#FF6F61' : value ? '#6CE2B6' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                />
                <Text fontWeight="700" style={[styles.day, isToday && styles.today]} i18n={false}>{dayShortLabel(index, language)}</Text>
              </Box>
            );
          })}
        </Box>
        <Text fontWeight="700" style={styles.review}>
          {summary.reviewDueCount > 0 ? reviewDueLabel(summary.reviewDueCount, language) : 'No review due'}
        </Text>
      </Box>
    </>
  );
}

function ProgressError({ error }: { error: ProgressErrorState }): React.JSX.Element {
  return (
    <Box gap={6}>
      <Text fontWeight="700" style={styles.message}>{error.title}</Text>
      <Text style={styles.errorDetail}>{error.detail}</Text>
    </Box>
  );
}

function classifyProgressError(error: unknown): ProgressErrorState {
  const record = asRecord(error);
  const code = readString(record, 'code');
  const message = readString(record, 'message') ?? '';
  if (code === 'NETWORK_ERROR' && message.toLowerCase().includes('timeout')) {
    return { title: 'Progress refresh timed out', detail: 'Try again.' };
  }
  if (code === 'NETWORK_ERROR') {
    return { title: 'Progress offline', detail: 'Check your connection and try again.' };
  }
  return { title: 'Progress unavailable', detail: 'Try again.' };
}

function practiceProgressLabel(day: string, percent: number, isToday: boolean, locale: AppLocale): string {
  const key = isToday
    ? '{{day}} practice progress: {{percent}} percent, today'
    : '{{day}} practice progress: {{percent}} percent';
  return translateTemplate(key, {
    day: translateTemplate(day, {}, { locale }),
    percent,
  }, { locale });
}

function reviewDueLabel(reviewDueCount: number, locale: AppLocale): string {
  return translateTemplate('{{count}} reviews due', { count: reviewDueCount }, { locale });
}

function dayShortLabel(index: number, locale: AppLocale): string {
  return locale === 'vi' ? DAY_SHORT_VI[index] ?? '' : DAY_SHORT[index] ?? '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function readString(record: Record<string, unknown> | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' ? value : undefined;
}

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <Box style={styles.statChip} flex={1} alignItems="center" gap={4}>
      <Text fontWeight="800" style={styles.statValue}>{value}</Text>
      <Text fontWeight="700" style={styles.statLabel}>{label}</Text>
    </Box>
  );
}

function isEmptySummary(summary: ProgressSummary): boolean {
  return summary.minutesDone === 0
    && summary.minutesGoal === 0
    && summary.lessonsCompleted === 0
    && summary.speakingTurns === 0
    && summary.starsToday === 0
    && summary.streakDays === 0
    && summary.reviewDueCount === 0
    && summary.words.length === 0
    && summary.weeklyBars.every((value) => value === 0);
}

const styles = StyleSheet.create({
  message: { fontSize: 18, color: '#2B2140' },
  statChip: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
  },
  statValue: { fontSize: 30, color: '#2B2140', lineHeight: 32 },
  statLabel: { fontSize: 12, color: '#5C4F77', textAlign: 'center' },
  weekCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
  },
  weekTitle: { fontSize: 16, color: '#2B2140', marginBottom: 10 },
  weekBars: { height: 90 },
  bar: { width: '70%', borderRadius: 8 },
  day: { fontSize: 12, color: '#5C4F77' },
  today: { color: '#FF6F61' },
  review: { marginTop: 10, fontSize: 13, color: '#5C4F77' },
  errorDetail: { fontSize: 14, color: '#5C4F77' },
});
