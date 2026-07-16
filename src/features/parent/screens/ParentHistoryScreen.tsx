import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '../components/ParentScroll';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import type { AssignmentProgress } from '@/services/api/progress.api';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import { translateTemplate, useAppLanguage, localeDateTag } from '@/services/i18n/i18n';
import { useChildLessonProgressQuery } from '@/features/progress/hooks/useChildLessonProgressQuery';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentHistoryScreen'>;

// History = lessons that have finished one way or another.
const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

const OUTCOME_COPY: Record<string, string> = {
  COMPLETED: 'Completed',
  FAILED: "Didn't finish",
  CANCELLED: 'Cancelled',
};

function outcomeLabel(state: string): string {
  return OUTCOME_COPY[state] ?? state;
}

// Best-effort timestamp for ordering/display: a finished lesson should have
// completedAt, but fall back to the last event / update so a row never renders
// without a date.
function finishedAt(a: AssignmentProgress): string | null {
  return a.completedAt ?? a.lastEventAt ?? a.updatedAt ?? null;
}

function parsedTime(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export default function ParentHistoryScreen({ navigation }: Props) {
  const { language, t } = useAppLanguage();
  useParentGateGuard(navigation, ROUTES.ParentHistoryScreen);
  const { activeChild } = useHousehold();
  const childId = activeChild?.id;

  const query = useChildLessonProgressQuery(childId);

  const back = () => navigation.navigate(ROUTES.ParentSummaryScreen);

  if (query.isLoading) {
    return (
      <ParentScroll title="Lesson history" onBack={back}>
        <Box paddingHorizontal={24} paddingTop={40}>
          <Text style={styles.stat}>Loading history</Text>
        </Box>
      </ParentScroll>
    );
  }

  if (query.isError) {
    return (
      <ParentScroll title="Lesson history" onBack={back}>
        <Box paddingHorizontal={24} paddingTop={40} gap={12}>
          <Text fontWeight="700" style={styles.errorTitle}>History unavailable</Text>
          <Text style={styles.stat}>Try again.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={translateTemplate('Retry {{title}}', { title: t('History unavailable') }, { locale: language })}
            onPress={() => { void query.refetch(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </Box>
      </ParentScroll>
    );
  }

  const assignments = query.data ?? [];
  const finished = assignments
    .filter((a) => TERMINAL_STATES.has(a.state))
    .sort((a, b) => parsedTime(finishedAt(b)) - parsedTime(finishedAt(a)));
  const completedCount = finished.filter((a) => a.state === 'COMPLETED').length;

  if (finished.length === 0) {
    return (
      <ParentScroll title="Lesson history" onBack={back}>
        <Box paddingHorizontal={24} paddingTop={40}>
          <Text style={styles.stat}>No lessons yet</Text>
        </Box>
      </ParentScroll>
    );
  }

  return (
    <ParentScroll title="Lesson history" onBack={back}>
      <Box paddingHorizontal={16} paddingTop={14} paddingBottom={4}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open reward history" onPress={() => navigation.navigate(ROUTES.ParentRewardsScreen)} style={styles.rewardsLink}>
          <Text fontWeight="700" style={styles.retryText}>Rewards & leaderboard</Text>
        </TouchableOpacity>
        <Box flexDirection="row" gap={14}>
          <Text style={styles.stat} i18n={false}>
            {translateTemplate('{{count}} {{label}}', { count: completedCount, label: t('completed') }, { locale: language })}
          </Text>
          <Box style={styles.div} />
          <Text style={styles.stat} i18n={false}>
            {translateTemplate('{{count}} {{label}}', { count: finished.length, label: t('total') }, { locale: language })}
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={14} paddingBottom={28}>
        <Box style={styles.list} borderRadius={14} overflow="hidden">
          {finished.map((a, i) => {
            const when = finishedAt(a);
            const date = when ? new Date(when) : null;
            const valid = date && !Number.isNaN(date.getTime());
            const dimmed = a.state !== 'COMPLETED';
            return (
              <Box
                key={a.assignmentId}
                flexDirection="row"
                alignItems="center"
                gap={12}
                style={[
                  styles.row,
                  dimmed && { opacity: 0.6 },
                  i < finished.length - 1 && { borderBottomWidth: 1, borderBottomColor: PA.hair },
                ]}
              >
                <Box style={[styles.dayChip, { backgroundColor: '#EEF1F5' }]} alignItems="center">
                  {valid ? (
                    <>
                      <Text style={styles.monthLabel} i18n={false}>
                        {date.toLocaleDateString(localeDateTag(language), { month: 'short' })}
                      </Text>
                      <Text fontWeight="600" style={styles.dayNum} i18n={false}>{date.getDate()}</Text>
                    </>
                  ) : (
                    <Text style={styles.monthLabel}>—</Text>
                  )}
                </Box>
                <Box flex={1}>
                  <Text fontWeight="500" style={{ fontSize: 14, color: PA.ink }} numberOfLines={1} i18n={false}>
                    {a.lessonTitle ?? t('Untitled lesson')}
                  </Text>
                  <Text style={{ fontSize: 12, color: PA.ink2, marginTop: 2 }} i18n={false}>
                    {translateTemplate(
                      '{{outcome}} · {{succeeded}}/{{completed}} {{stepLabel}}',
                      {
                        outcome: t(outcomeLabel(a.state)),
                        succeeded: a.stepsSucceeded,
                        completed: a.stepsCompleted,
                        stepLabel: t('steps'),
                      },
                      { locale: language },
                    )}
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </ParentScroll>
  );
}

const styles = StyleSheet.create({
  stat: { fontSize: 13, color: PA.ink2 },
  errorTitle: { fontSize: 20, color: PA.ink },
  retryText: { color: PA.accent, fontSize: 15, fontWeight: '500' },
  div: { width: 1, backgroundColor: PA.hair },
  list: { backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair },
  row: { padding: 12 },
  dayChip: { width: 42, padding: 6, borderRadius: 8, flexShrink: 0 },
  monthLabel: { fontSize: 10, color: PA.ink3, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  dayNum: { fontSize: 16, color: PA.ink, lineHeight: 20 },
  rewardsLink: { minHeight: 44, justifyContent: 'center', marginBottom: 10 },
});
