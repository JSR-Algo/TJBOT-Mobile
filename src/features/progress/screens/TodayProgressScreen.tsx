import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import PageScroll from '@/design-system/components/PageScroll';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { getChildLessonProgress, type AssignmentProgress } from '@/services/api/progress.api';
import { useHousehold } from '@/contexts/HouseholdContext';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'TodayProgressScreen'>;
const SLEEK_PROGRESS_ICON = 'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/nvzeJhC2UvA/components/NpznCUpnBV4.png';

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
      <Box paddingHorizontal={24} paddingTop={56} paddingBottom={18} flexDirection="row" alignItems="center" justifyContent="space-between">
        <Box flex={1}>
          <Text fontWeight="800" style={styles.eyebrow}>Today</Text>
          <Text fontWeight="800" style={styles.heading}>{headerTitle}</Text>
        </Box>
        <Box style={styles.headerIconWell} alignItems="center" justifyContent="center">
          <Image source={{ uri: SLEEK_PROGRESS_ICON }} style={styles.headerIcon} resizeMode="contain" accessibilityLabel="Progress" />
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingBottom={14} gap={12}>
        {query.isLoading ? <Text style={styles.message}>Loading progress</Text> : null}
        {query.isError ? <ProgressError onRetry={() => { void query.refetch(); }} /> : null}
        {!query.isLoading && !query.isError && !latest ? (
          <Text style={styles.message}>No lessons yet</Text>
        ) : null}
        {!query.isLoading && !query.isError && latest ? <ProgressBody latest={latest} /> : null}
      </Box>

      <Box paddingHorizontal={24} paddingTop={8} paddingBottom={28} gap={10}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} color="#FF6B6B">Back home</PrimaryCTA>
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
  eyebrow: { fontSize: 13, color: '#FF6B6B', marginBottom: 4 },
  heading: { fontSize: 29, color: '#2D3436', lineHeight: 35, paddingRight: 14 },
  headerIconWell: { width: 78, height: 78, borderRadius: 26, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBDCC7' },
  headerIcon: { width: 62, height: 62 },
  message: { fontSize: 18, color: '#2D3436', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBDCC7', borderRadius: 28, padding: 24 },
  lessonTitle: { fontSize: 21, color: '#2D3436', lineHeight: 27, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBDCC7', borderRadius: 28, padding: 20 },
  statChip: {
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EBDCC7',
    padding: 20,
  },
  statValue: { fontSize: 32, color: '#FF6B6B', lineHeight: 36 },
  statLabel: { fontSize: 12, color: '#636E72', textAlign: 'center' },
  stateCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EBDCC7',
    padding: 22,
  },
  stateLabel: { fontSize: 17, color: '#2D3436', marginBottom: 6 },
  stateDetail: { fontSize: 13, color: '#636E72' },
  errorDetail: { fontSize: 14, color: '#FF6B6B' },
});
