import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { localeDateTag, translateTemplate, useAppLanguage, type AppLocale } from '@/services/i18n/i18n';
import ParentScroll, { PA } from '../components/ParentScroll';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import { useParentLearningStatusQuery } from '../hooks/useParentLearningStatusQuery';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentTodayScreen'>;

const STATE_COPY: Record<string, string> = {
  ASSIGNED: 'Preparing', PRELOADING: 'Preparing', PREPARING: 'Preparing', READY: 'Preparing',
  ENTRANCE: 'Robot entrance', TEACH: 'Teaching', TEACHING: 'Teaching', LISTEN: 'Listening', LISTENING: 'Listening',
  THINK: 'Thinking', THINKING: 'Thinking', FEEDBACK: 'Feedback', RUNNING: 'In progress', PAUSED: 'Paused',
  COMPLETED: 'Completed', FAILED: "Didn't finish", ABANDONED: "Didn't finish", CANCELLED: 'Cancelled',
};

function liveStateLabel(state: string, phase?: string): string {
  const normalizedState = state.toUpperCase();
  const normalizedPhase = phase?.toUpperCase();
  if (normalizedState === 'RUNNING' && normalizedPhase && STATE_COPY[normalizedPhase]) return STATE_COPY[normalizedPhase];
  return STATE_COPY[normalizedState] ?? state;
}

function durationLabel(seconds: number, locale: AppLocale): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes === 0) return translateTemplate('{{seconds}} sec active', { seconds: remaining }, { locale });
  return translateTemplate('{{minutes}} min {{seconds}} sec active', { minutes, seconds: remaining }, { locale });
}

function updatedLabel(timestamp: number, locale: AppLocale): string {
  if (!timestamp) return 'Update time unavailable';
  const value = new Date(timestamp).toLocaleTimeString(localeDateTag(locale), { hour: 'numeric', minute: '2-digit' });
  return translateTemplate('Updated {{time}}', { time: value }, { locale });
}

export default function ParentTodayScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentTodayScreen);
  const { activeChild } = useHousehold();
  const { language, t } = useAppLanguage();
  const query = useParentLearningStatusQuery(activeChild?.id);
  const back = () => navigation.navigate(ROUTES.ParentSummaryScreen);

  if (!activeChild) return <ParentScroll title="Today" onBack={back}><Message text="Add a child to see live progress" /></ParentScroll>;
  if (query.isLoading) return <ParentScroll title="Today" onBack={back}><Message text="Loading live progress" /></ParentScroll>;
  if (query.isError && !query.data) {
    return <ParentScroll title="Today" onBack={back}><ErrorState title="Live progress is offline" retry={() => { void query.refetch(); }} /></ParentScroll>;
  }

  const active = query.data?.activeLearning;
  return (
    <ParentScroll title="Today" onBack={back}>
      <Box padding={18} gap={14}>
        <Box style={styles.childCard} flexDirection="row" alignItems="center" gap={12}>
          <Box style={styles.avatar} alignItems="center" justifyContent="center" accessible accessibilityLabel={translateTemplate('{{name}} avatar', { name: activeChild.name }, { locale: language })}>
            <Text fontWeight="800" style={styles.avatarText} i18n={false}>{activeChild.name.trim().charAt(0).toUpperCase() || '?'}</Text>
          </Box>
          <Box flex={1}>
            <Text fontWeight="800" style={styles.childName} i18n={false}>{activeChild.name}</Text>
            <Text style={styles.muted}>{query.isError ? 'Live progress is offline' : query.isFetching ? 'Reconnecting…' : 'Live lesson status'}</Text>
          </Box>
        </Box>

        {!active ? (
          <Box style={styles.card}><Text style={styles.muted}>No lesson is active right now</Text></Box>
        ) : (
          <>
            <Box style={styles.hero} gap={6} accessible accessibilityLabel={t(liveStateLabel(active.state, active.currentStep?.phase))}>
              <Text fontWeight="800" style={styles.state}>{liveStateLabel(active.state, active.currentStep?.phase)}</Text>
              <Text style={styles.course} i18n={false}>{active.courseTitle}</Text>
              <Text fontWeight="800" style={styles.lesson} i18n={false}>{active.lessonTitle}</Text>
            </Box>

            {active.currentStep ? (
              <Box style={styles.card} gap={6}>
                <Text style={styles.eyebrow}>Current activity</Text>
                <Text fontWeight="700" style={styles.activity} i18n={false}>{active.currentStep.activityTitle}</Text>
                {active.currentStep.subject ? <Text style={styles.subject} i18n={false}>{active.currentStep.subject}</Text> : null}
                <Box flexDirection="row" justifyContent="space-between">
                  <Text style={styles.muted} i18n={false}>{translateTemplate('Step {{step}} of {{total}}', { step: active.currentStep.stepNumber, total: active.currentStep.total }, { locale: language })}</Text>
                  <Text fontWeight="800" style={styles.percent} i18n={false}>{Math.round(active.positionPercent)}%</Text>
                </Box>
                <Box style={styles.track}><Box style={[styles.fill, { width: `${Math.min(100, active.positionPercent)}%` }]} /></Box>
              </Box>
            ) : null}

            <Box style={styles.card} flexDirection="row" justifyContent="space-between">
              <Text style={styles.muted} i18n={false}>{durationLabel(active.activeDurationSec, language)}</Text>
              <Text style={styles.muted} i18n={false}>{updatedLabel(query.dataUpdatedAt, language)}</Text>
            </Box>
          </>
        )}
      </Box>
    </ParentScroll>
  );
}

function Message({ text }: { text: string }) { return <Box padding={24}><Text style={styles.muted}>{text}</Text></Box>; }
function ErrorState({ title, retry }: { title: string; retry: () => void }) {
  return <Box padding={24} gap={12}><Text fontWeight="800" style={styles.error}>{title}</Text><Text style={styles.muted}>Check your connection and try again.</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry live progress" onPress={retry}><Text fontWeight="700" style={styles.link}>Retry</Text></TouchableOpacity></Box>;
}

const styles = StyleSheet.create({
  childCard: { backgroundColor: PA.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: PA.hair },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DDEBFF' }, avatarText: { color: PA.accent, fontSize: 21 },
  childName: { color: PA.ink, fontSize: 19 }, muted: { color: PA.ink2, fontSize: 13 },
  hero: { backgroundColor: '#E7F5EE', padding: 18, borderRadius: 16 }, state: { color: PA.good, fontSize: 14 }, course: { color: PA.ink2, fontSize: 13 }, lesson: { color: PA.ink, fontSize: 24 },
  card: { backgroundColor: PA.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: PA.hair }, eyebrow: { color: PA.ink3, fontSize: 12, textTransform: 'uppercase' }, activity: { color: PA.ink, fontSize: 18 }, subject: { color: PA.ink2, fontSize: 14 }, percent: { color: PA.accent },
  track: { height: 8, borderRadius: 4, backgroundColor: '#E4E8EE', overflow: 'hidden' }, fill: { height: '100%', backgroundColor: PA.accent },
  error: { color: PA.ink, fontSize: 20 }, link: { color: PA.accent, fontSize: 15 },
});
