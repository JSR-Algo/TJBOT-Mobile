import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { localeDateTag, translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import ParentScroll, { PA } from '../components/ParentScroll';
import { useParentGateGuard } from '../hooks/useParentGateGuard';
import { useParentLearningHistoryQuery } from '../hooks/useParentLearningHistoryQuery';
import { parentSessionStateLabel } from '../parentLearningCopy';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentHistoryScreen'>;

function durationLabel(durationSec: number, locale: 'en' | 'vi'): string {
  if (durationSec < 60) return translateTemplate('{{seconds}} sec', { seconds: durationSec }, { locale });
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return seconds === 0
    ? translateTemplate('{{minutes}} min', { minutes }, { locale })
    : translateTemplate('{{minutes}} min {{seconds}} sec', { minutes, seconds }, { locale });
}

export default function ParentHistoryScreen({ navigation }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentHistoryScreen);
  const { activeChild } = useHousehold();
  const { language } = useAppLanguage();
  const query = useParentLearningHistoryQuery(activeChild?.id);
  const back = () => navigation.navigate(ROUTES.ParentSummaryScreen);

  if (query.isLoading) return <ParentScroll title="Lesson history" onBack={back}><Message text="Loading lesson history" /></ParentScroll>;
  if (query.isError) return <ParentScroll title="Lesson history" onBack={back}><ErrorState retry={() => { void query.refetch(); }} /></ParentScroll>;
  const items = query.data?.items ?? [];
  if (items.length === 0) return <ParentScroll title="Lesson history" onBack={back}><Message text="No completed lessons yet" /></ParentScroll>;

  return (
    <ParentScroll title="Lesson history" onBack={back}>
      <Box padding={16} gap={10}>
        {items.map(item => {
          const date = new Date(item.completedAt);
          const dateLabel = Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(localeDateTag(language), { month: 'short', day: 'numeric', year: 'numeric' });
          const content = <>
              <Box flex={1} gap={3}>
                <Text style={styles.course} i18n={false}>{item.courseTitle}</Text>
                <Text fontWeight="800" style={styles.lesson} i18n={false}>{item.lessonTitle}</Text>
                <Text style={styles.meta} i18n={false}>{translateTemplate('{{date}} · {{duration}} · {{state}}', { date: dateLabel, duration: durationLabel(item.durationSec, language), state: parentSessionStateLabel(item.terminalState, language) }, { locale: language })}</Text>
              </Box>
              {item.reportAvailable ? <Text fontWeight="800" style={styles.chevron} i18n={false}>›</Text> : null}
            </>;
          return item.reportAvailable ? (
            <TouchableOpacity key={item.sessionId} accessibilityRole="button" accessibilityLabel={translateTemplate('Open report for {{lesson}}', { lesson: item.lessonTitle }, { locale: language })} onPress={() => navigation.navigate(ROUTES.ParentSessionReportScreen, { childId: item.childId, sessionId: item.sessionId })} style={styles.row}>{content}</TouchableOpacity>
          ) : <Box key={item.sessionId} style={styles.row}>{content}</Box>;
        })}
        {query.hasNextPage ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Load more lessons" disabled={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }} style={styles.loadMore}>
            <Text fontWeight="700" style={styles.link}>{query.isFetchingNextPage ? 'Loading more lessons' : 'Load more lessons'}</Text>
          </TouchableOpacity>
        ) : null}
      </Box>
    </ParentScroll>
  );
}

function Message({ text }: { text: string }) { return <Box padding={24}><Text style={styles.meta}>{text}</Text></Box>; }
function ErrorState({ retry }: { retry: () => void }) { return <Box padding={24} gap={12}><Text fontWeight="800" style={styles.error}>Lesson history is offline</Text><Text style={styles.meta}>Check your connection and try again.</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry lesson history" onPress={retry}><Text fontWeight="700" style={styles.link}>Retry</Text></TouchableOpacity></Box>; }

const styles = StyleSheet.create({
  row: { minHeight: 88, padding: 15, borderRadius: 15, backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair, flexDirection: 'row', alignItems: 'center' },
  course: { color: PA.ink3, fontSize: 12 }, lesson: { color: PA.ink, fontSize: 17 }, meta: { color: PA.ink2, fontSize: 13 }, chevron: { color: PA.accent, fontSize: 28 },
  loadMore: { minHeight: 48, alignItems: 'center', justifyContent: 'center' }, link: { color: PA.accent }, error: { color: PA.ink, fontSize: 20 },
});
