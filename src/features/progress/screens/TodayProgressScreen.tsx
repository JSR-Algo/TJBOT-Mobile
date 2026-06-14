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

type Props = NativeStackScreenProps<RootStackParamList, 'TodayProgressScreen'>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; summary: ProgressSummary }
  | { kind: 'error'; title: string };

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
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
        if (active) setState(progressErrorState(error));
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
        {state.kind === 'error' ? <Text fontWeight="800" style={styles.message}>{state.title}</Text> : null}
        {state.kind === 'ready' ? <ProgressBody summary={state.summary} /> : null}
      </Box>

      <Box paddingHorizontal={24} paddingTop={8} paddingBottom={28} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.LessonDemoHomeScreen)} color="#6CE2B6">Open lesson demo</PrimaryCTA>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.LessonPlannerScreen)} color="#FFD166">View today's lesson</PrimaryCTA>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} color="#FF6F61">Back home</PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

function ProgressBody({ summary }: { summary: ProgressSummary }) {
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
                  accessibilityLabel={`${DAY_NAMES[index]} practice progress: ${percent} percent${isToday ? ', today' : ''}`}
                  style={[
                    styles.bar,
                    {
                      height: value ? Math.max(8, value * 90) : 8,
                      backgroundColor: isToday ? '#FF6F61' : value ? '#6CE2B6' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                />
                <Text fontWeight="700" style={[styles.day, isToday && styles.today]}>{DAY_SHORT[index]}</Text>
              </Box>
            );
          })}
        </Box>
        <Text fontWeight="700" style={styles.review}>
          {summary.reviewDueCount > 0 ? `${summary.reviewDueCount} reviews due` : 'No review due'}
        </Text>
      </Box>
    </>
  );
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

function progressErrorState(error: unknown): LoadState {
  const record = asRecord(error);
  if (record?.code === 'NETWORK_ERROR') {
    const message = typeof record.message === 'string' ? record.message.toLowerCase() : '';
    return { kind: 'error', title: message.includes('timeout') ? 'Progress refresh timed out' : 'Progress offline' };
  }
  return { kind: 'error', title: 'Progress unavailable' };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
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
});
