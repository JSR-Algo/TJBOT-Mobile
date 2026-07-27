import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { tokens } from '@/design-system/tokens';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import { parentSessionStateLabel } from '@/features/parent/parentLearningCopy';
import { useChildProgressDashboardQuery, type ChildProgressDashboard } from '../hooks/useChildProgressDashboardQuery';

type Props = NativeStackScreenProps<RootStackParamList, 'TodayProgressScreen'>;

export default function TodayProgressScreen({ navigation }: Props) {
  const { activeChild } = useHousehold();
  const query = useChildProgressDashboardQuery(activeChild?.id);
  const hasActivity = Boolean(query.data && (query.data.activeLearning || query.data.sessions.length || query.data.courses.length));
  return (
    <PageScroll>
      <PageHeader subtitle="Today" title={hasActivity ? 'Learning progress' : 'No practice yet'} />
      <Box paddingHorizontal={18} paddingBottom={14} gap={12} accessible={Boolean(query.data)} accessibilityLabel={query.data ? 'Child progress dashboard' : undefined}>
        {!activeChild ? <Text style={styles.message}>Add a child to see progress</Text>
          : query.isLoading ? <Text style={styles.message}>Loading progress</Text>
            : query.isError ? <ProgressError onRetry={() => { void query.refetch(); }} busy={query.isFetching} />
              : query.data ? <Dashboard data={query.data} /> : null}
      </Box>
      <Box paddingHorizontal={24} paddingTop={8} paddingBottom={28}>
        <PrimaryCTA onPress={() => navigation.navigate(ROUTES.HomeHubScreen)} color={tokens.colors.coral}>Back home</PrimaryCTA>
      </Box>
    </PageScroll>
  );
}

function Dashboard({ data }: { data: ChildProgressDashboard }) {
  const { language } = useAppLanguage();
  return <>
    <Box style={styles.hero} flexDirection="row">
      <Stat value={String(data.completedLessons)} label="Lessons completed" />
      <Box style={styles.divider} />
      <Stat value={String(data.totalLessons)} label="Lessons in courses" />
      <Box style={styles.divider} />
      <Stat value={`${Math.floor(data.recentDurationSec / 60)} min`} label="Recent active time" />
    </Box>
    <Box style={styles.card} gap={10}>
      <Text fontWeight="800" style={styles.title}>Learning path</Text>
      {data.courses.length ? data.courses.map(course => <Box key={course.courseId} gap={5}>
        <Box flexDirection="row" justifyContent="space-between"><Text fontWeight="700" style={styles.body} i18n={false}>{course.title}</Text><Text style={styles.meta} i18n={false}>{translateTemplate('{{completed}} of {{total}} lessons', { completed: course.completedLessonCount, total: course.totalLessonCount }, { locale: language })}</Text></Box>
        <Box style={styles.track}><Box style={[styles.fill, { width: `${Math.min(100, course.positionPercent)}%` }]} /></Box>
      </Box>) : <Text style={styles.meta}>No course path yet</Text>}
    </Box>
    {data.activeLearning ? <Box style={styles.card} gap={5}><Text fontWeight="800" style={styles.title}>Active lesson</Text><Text style={styles.meta} i18n={false}>{data.activeLearning.courseTitle}</Text><Text fontWeight="800" style={styles.lesson} i18n={false}>{data.activeLearning.lessonTitle}</Text><Text fontWeight="700" style={styles.state} i18n={false}>{parentSessionStateLabel(data.activeLearning.state, language)}</Text></Box> : null}
    {!data.activeLearning && data.sessions.length === 0 && data.courses.length === 0 ? <Text style={styles.meta}>Finish a lesson on Robot to fill in your progress.</Text> : null}
  </>;
}

function Stat({ value, label }: { value: string; label: string }) { return <Box flex={1} alignItems="center" gap={3}><Text fontWeight="800" style={styles.value} i18n={false}>{value}</Text><Text fontWeight="700" style={styles.label}>{label}</Text></Box>; }
function ProgressError({ onRetry, busy }: { onRetry: () => void; busy?: boolean }) { return <Box gap={6}><Text fontWeight="700" style={styles.message}>Progress unavailable</Text><Pressable onPress={onRetry} disabled={busy} accessibilityRole="button" accessibilityLabel="Tap to try again.">{busy ? <ActivityIndicator size="small" /> : null}<Text style={styles.meta}>Tap to try again.</Text></Pressable></Box>; }

const styles = StyleSheet.create({
  message: { fontSize: 18, color: tokens.colors.ink }, hero: { backgroundColor: tokens.colors.paper, borderRadius: 20, padding: 16, ...tokens.shadows.card }, divider: { width: 1, backgroundColor: 'rgba(43,33,64,0.08)' }, value: { fontSize: 25, color: tokens.colors.ink }, label: { fontSize: 11, color: tokens.colors.inkSoft, textAlign: 'center' },
  card: { backgroundColor: tokens.colors.paper, borderRadius: 18, padding: 16, ...tokens.shadows.card }, title: { fontSize: 15, color: tokens.colors.ink }, body: { color: tokens.colors.ink }, meta: { color: tokens.colors.inkSoft, fontSize: 13 }, lesson: { color: tokens.colors.ink, fontSize: 20 }, state: { color: tokens.colors.mint }, track: { height: 8, borderRadius: 4, backgroundColor: '#E8E5EE', overflow: 'hidden' }, fill: { height: '100%', backgroundColor: tokens.colors.mint },
});
