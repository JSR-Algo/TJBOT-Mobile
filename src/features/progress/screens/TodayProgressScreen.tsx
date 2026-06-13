import React from 'react';
import { StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { getChildLessonProgress, type AssignmentProgress } from '@/services/api/progress.api';
import { useHousehold } from '@/contexts/HouseholdContext';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'TodayProgressScreen'>;

// A CANCELLED/FAILED lesson is not an accomplishment and must never render under
// the "You practiced speaking!" celebration. COMPLETED is a real win and stays
// celebratable; active states are work-in-progress the child is still doing.
// Mirrors ParentTodayScreen's TERMINAL_STATES/isActive predicate, but keeps
// COMPLETED (ParentTodayScreen drops it because that screen is in-flight only).
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

export default function TodayProgressScreen({ navigation }: Props) {
  const { activeChild } = useHousehold();
  const childId = activeChild?.id;

  const query = useQuery({
    queryKey: ['lesson-progress', 'child', childId],
    queryFn: () => getChildLessonProgress(childId as string),
    enabled: typeof childId === 'string' && childId.length > 0,
  });

  // Newest first from the server (updated_at DESC). Skip CANCELLED/FAILED so a
  // wrong-state lesson never lands under the celebration header; the newest
  // celebratable assignment (COMPLETED or still active) is the one to show.
  const latest = (query.data ?? []).find(isCelebratable);

  // Only celebrate a finished/active lesson; never frame a completed-but-empty
  // run as a win the same way, and never reach here for a failed/cancelled one.
  const headerTitle = latest ? 'You practiced speaking!' : 'No practice yet';

  return (
    <PageScroll>
      <PageHeader subtitle="Today" title={headerTitle} />

      <Box paddingHorizontal={18} paddingBottom={14} gap={12}>
        {query.isLoading ? <Text style={styles.message}>Loading progress</Text> : null}
        {query.isError ? <ProgressError onRetry={() => { void query.refetch(); }} /> : null}
        {!query.isLoading && !query.isError && !latest ? (
          <Text style={styles.message}>No lessons yet</Text>
        ) : null}
        {!query.isLoading && !query.isError && latest ? <ProgressBody latest={latest} /> : null}
      </Box>

      <Box paddingHorizontal={24} paddingTop={8} paddingBottom={28} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} color="#FF6F61">Back home</PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

function ProgressBody({ latest }: { latest: AssignmentProgress }) {
  const { language } = useAppLanguage();
  return (
    <>
      {latest.lessonTitle ? (
        <Text fontWeight="800" style={styles.lessonTitle} i18n={false}>{latest.lessonTitle}</Text>
      ) : null}
      <Box flexDirection="row" gap={10}>
        <StatChip value={String(latest.stepsSucceeded)} label="steps right" />
        <StatChip value={String(latest.stepsCompleted)} label="steps done" />
      </Box>
      <Box style={styles.stateCard}>
        <Text fontWeight="700" style={styles.stateLabel}>{stateLabel(latest.state)}</Text>
        <Text style={styles.stateDetail} i18n={false}>
          {translateTemplate('{{succeeded}} of {{completed}} {{stepLabel}}', {
            succeeded: latest.stepsSucceeded,
            completed: latest.stepsCompleted,
            stepLabel: translateTemplate('steps', {}, { locale: language }),
          }, { locale: language })}
        </Text>
      </Box>
    </>
  );
}

function ProgressError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <Box gap={6}>
      <Text fontWeight="700" style={styles.message}>Progress unavailable</Text>
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
  message: { fontSize: 18, color: '#2B2140' },
  lessonTitle: { fontSize: 20, color: '#2B2140', lineHeight: 26 },
  statChip: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
  },
  statValue: { fontSize: 30, color: '#2B2140', lineHeight: 32 },
  statLabel: { fontSize: 12, color: '#5C4F77', textAlign: 'center' },
  stateCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
  },
  stateLabel: { fontSize: 16, color: '#2B2140', marginBottom: 6 },
  stateDetail: { fontSize: 13, color: '#5C4F77' },
  errorDetail: { fontSize: 14, color: '#5C4F77' },
});
