import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/icons';
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
  const { activeChild } = useHousehold();
  const childId = activeChild?.id;

  const query = useQuery({
    queryKey: ['lesson-progress', 'child', childId],
    queryFn: () => getChildLessonProgress(childId as string),
    enabled: typeof childId === 'string' && childId.length > 0,
  });

  const back = () => navigation.navigate(ROUTES.ParentSummaryScreen);

  if (!childId) {
    return (
      <ParentScroll title="Today" onBack={back} backAccessibilityLabel="Back to Parent Space">
        <ParentStateCard
          icon="UserRoundPlus"
          title="Add a child first"
          body="Choose or add a child profile to see today’s learning."
          actionLabel="Add child profile"
          onAction={() => navigation.navigate(ROUTES.HomeChildProfileScreen)}
        />
      </ParentScroll>
    );
  }

  if (query.isLoading) {
    return (
      <ParentScroll title="Today" onBack={back} backAccessibilityLabel="Back to Parent Space">
        <Box style={styles.stateCard} alignItems="center" gap={12}>
          <ActivityIndicator color={PA.accent} />
          <Text fontWeight="700" style={styles.stateTitle}>{"Loading today's progress"}</Text>
          <Text style={styles.stateBody}>Checking the latest lesson activity.</Text>
        </Box>
      </ParentScroll>
    );
  }

  if (query.isError) {
    return (
      <ParentScroll title="Today" onBack={back} backAccessibilityLabel="Back to Parent Space">
        <ParentStateCard
          icon="WifiOff"
          title="Today summary unavailable"
          body="The latest lesson activity could not load."
          actionLabel="Retry"
          accessibilityLabel={translateTemplate('Retry {{title}}', { title: t('Today summary unavailable') }, { locale: language })}
          onAction={() => { void query.refetch(); }}
        />
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
      <ParentScroll title="Today" onBack={back} backAccessibilityLabel="Back to Parent Space">
        <ParentStateCard
          icon="BookOpen"
          title="No lessons yet"
          body="Today’s active lesson will appear here when it is ready."
        />
      </ParentScroll>
    );
  }

  const startedLabel = formatTime(current.startedAt, language);

  return (
    <ParentScroll title="Today" onBack={back} backAccessibilityLabel="Back to Parent Space">
      <Box paddingHorizontal={16} paddingTop={18} paddingBottom={8}>
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

function ParentStateCard({
  icon,
  title,
  body,
  actionLabel,
  accessibilityLabel,
  onAction,
}: {
  icon: 'BookOpen' | 'UserRoundPlus' | 'WifiOff';
  title: string;
  body: string;
  actionLabel?: string;
  accessibilityLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <Box style={styles.stateCard} alignItems="center" gap={12}>
      <Box style={styles.stateIcon} alignItems="center" justifyContent="center">
        <Icon name={icon} size={28} color={PA.accent} strokeWidth={2.3} />
      </Box>
      <Text fontWeight="700" style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={onAction}
          activeOpacity={0.75}
          style={styles.stateAction}
        >
          <Text fontWeight="700" style={styles.stateActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Box>
  );
}

const styles = StyleSheet.create({
  stateCard: {
    backgroundColor: PA.card,
    borderColor: PA.hair,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  stateIcon: { backgroundColor: '#FFE5E5', borderRadius: 20, height: 58, width: 58 },
  stateTitle: { color: PA.ink, fontSize: 20, textAlign: 'center' },
  stateBody: { color: PA.ink2, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  stateAction: {
    backgroundColor: '#FFE5E5',
    borderRadius: 999,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  stateActionText: { color: PA.accent, fontSize: 14 },
});
