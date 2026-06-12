import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { PA } from '../components/ParentScroll';
import { getChildLessonProgress, type AssignmentProgress } from '@/services/api/progress.api';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ROUTES } from '@/navigation/routes';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import { translateTemplate, useAppLanguage, localeDateTag, type AppLocale } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentTodayScreen'>;

// Terminal states belong to History, not Today. Today surfaces the in-flight
// (or freshly-ready) lesson the child is working through right now.
const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

function isActive(a: AssignmentProgress): boolean {
  return !TERMINAL_STATES.has(a.state);
}

const STATE_COPY: Record<string, string> = {
  ASSIGNED: 'Sent to robot',
  PRELOADING: 'Getting ready',
  READY: 'Ready to start',
  RUNNING: 'In progress',
  PAUSED: 'Paused',
};

function stateLabel(state: string): string {
  return STATE_COPY[state] ?? state;
}

function formatTime(iso: string | null, locale: AppLocale): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(localeDateTag(locale), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ParentTodayScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentTodayScreen);
  const { language, t } = useAppLanguage();
  const { children } = useHousehold();
  const childId = children[0]?.id;

  const query = useQuery({
    queryKey: ['lesson-progress', 'child', childId],
    queryFn: () => getChildLessonProgress(childId as string),
    enabled: typeof childId === 'string' && childId.length > 0,
  });

  const back = () => navigation.navigate(ROUTES.ParentSummaryScreen);

  const BackLink = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t('Back to Parent Space')}
      onPress={back}
      activeOpacity={0.7}
    >
      <Text style={{ color: PA.accent, fontSize: 15, fontWeight: '500', marginBottom: 12 }}>Back to Parent Space</Text>
    </TouchableOpacity>
  );

  if (query.isLoading) {
    return (
      <ParentScroll title="Today" onBack={back}>
        <Box paddingHorizontal={24} paddingTop={40}>
          {BackLink}
          <Text style={{ fontSize: 13, color: PA.ink3 }}>Loading today's progress</Text>
        </Box>
      </ParentScroll>
    );
  }

  if (query.isError) {
    return (
      <ParentScroll title="Today" onBack={back}>
        <Box paddingHorizontal={24} paddingTop={40} gap={12}>
          {BackLink}
          <Text fontWeight="700" style={{ fontSize: 20, color: PA.ink }}>Today summary unavailable</Text>
          <Text style={{ fontSize: 13, color: PA.ink3 }}>Try again.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={translateTemplate('Retry {{title}}', { title: t('Today summary unavailable') }, { locale: language })}
            onPress={() => { void query.refetch(); }}
            activeOpacity={0.7}
          >
            <Text style={{ color: PA.accent, fontSize: 15, fontWeight: '500' }}>Retry</Text>
          </TouchableOpacity>
        </Box>
      </ParentScroll>
    );
  }

  const assignments = query.data ?? [];
  // Newest first from the server (updated_at DESC); the first active row is the
  // lesson in flight right now.
  const active = assignments.filter(isActive);
  const current = active[0];

  if (!current) {
    return (
      <ParentScroll title="Today" onBack={back}>
        <Box paddingHorizontal={24} paddingTop={40} gap={8}>
          {BackLink}
          <Text style={{ fontSize: 13, color: PA.ink3 }}>No lessons yet</Text>
        </Box>
      </ParentScroll>
    );
  }

  const startedLabel = formatTime(current.startedAt, language);

  return (
    <ParentScroll title="Today" onBack={back}>
      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={8}>
        {BackLink}
        {startedLabel ? (
          <Text style={{ fontSize: 13, color: PA.ink3, marginBottom: 6 }} i18n={false}>{startedLabel}</Text>
        ) : null}
        <Text fontWeight="600" style={{ fontSize: 20, color: PA.ink, letterSpacing: -0.3, lineHeight: 28, marginBottom: 18 }} i18n={false}>
          {current.lessonTitle ?? t('Untitled lesson')}
        </Text>
      </Box>

      <PRowGroup header="Lesson">
        <PRow icon="📖" label="Status" value={stateLabel(current.state)} />
        <PRow
          icon="✅"
          label="Steps completed"
          value={translateTemplate('{{succeeded}} of {{completed}}', {
            succeeded: current.stepsSucceeded,
            completed: current.stepsCompleted,
          }, { locale: language })}
          isLast
        />
      </PRowGroup>

      {active.length > 1 ? (
        <PRowGroup header="Also in progress">
          {active.slice(1).map((a, i) => (
            <PRow
              key={a.assignmentId}
              icon="📖"
              label={a.lessonTitle ?? t('Untitled lesson')}
              value={stateLabel(a.state)}
              isLast={i === active.length - 2}
            />
          ))}
        </PRowGroup>
      ) : null}

      <Box height={24} />
    </ParentScroll>
  );
}
