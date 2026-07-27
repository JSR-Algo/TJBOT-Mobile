import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ROUTES, type RootStackParamList } from '@/navigation/routes';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import { useChildProgressDashboardQuery } from '@/features/progress/hooks/useChildProgressDashboardQuery';
import ParentScroll, { PA } from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { useParentGateGuard } from '../hooks/useParentGateGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentSummaryScreen'>;

export default function ParentSummaryScreen({ navigation, route }: Props) {
  useParentGateGuard(navigation, ROUTES.ParentSummaryScreen);
  const { activeChild } = useHousehold();
  const { language, t } = useAppLanguage();
  const query = useChildProgressDashboardQuery(activeChild?.id);
  const params = route.params ?? {};

  if (query.isLoading) return <ParentScroll title="Parent Space"><StateLink navigation={navigation} /><Box padding={24}><Text style={styles.meta}>Loading parent summary</Text></Box></ParentScroll>;
  if (query.isError || !query.data) return <ParentScroll title="Parent Space"><StateLink navigation={navigation} /><Box padding={24} gap={12}><Text fontWeight="800" style={styles.headline}>Parent summary unavailable</Text><Text style={styles.meta}>Try again.</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry parent summary" onPress={() => { void query.refetch(); }}><Text fontWeight="700" style={styles.link}>Retry</Text></TouchableOpacity></Box></ParentScroll>;

  const data = query.data;
  const hasActivity = Boolean(data.activeLearning || data.sessions.length || data.courses.length);
  const recentLessonLabel = translateTemplate('{{count}} recent {{lessonLabel}}', { count: data.sessions.length, lessonLabel: data.sessions.length === 1 ? t('lesson') : t('lessons') }, { locale: language });
  return (
    <ParentScroll title="Parent Space" right={<StateLink navigation={navigation} />}>
      <Box padding={16} gap={14}>
        {params.summaryDate ? <Text style={styles.meta} i18n={false}>{translateTemplate('Requested summary: {{date}}', { date: params.summaryDate }, { locale: language })}</Text> : null}
        {params.deviceId ? <Text style={styles.meta} i18n={false}>{translateTemplate('Robot: {{deviceId}}', { deviceId: params.deviceId }, { locale: language })}</Text> : null}
        {activeChild?.name ? <Text style={styles.child} i18n={false}>{translateTemplate("{{name}}'s course dashboard", { name: activeChild.name }, { locale: language })}</Text> : null}
        <Text fontWeight="800" style={styles.headline}>{hasActivity ? 'Learning progress from Robot' : 'No lesson activity has synced yet.'}</Text>
        <Box flexDirection="row" gap={10}>
          <Stat value={`${Math.floor(data.recentDurationSec / 60)} min`} label="recent active time" />
          <Stat value={recentLessonLabel} label="session history" />
          <Stat value={`${data.completedLessons}/${data.totalLessons}`} label="course lessons" />
        </Box>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open live lesson" onPress={() => navigation.navigate(ROUTES.ParentTodayScreen)} style={styles.card}><Text fontWeight="800" style={styles.cardTitle}>Today's live lesson</Text><Text style={styles.meta}>{data.activeLearning ? 'Live progress available' : 'No lesson is active right now'}</Text></TouchableOpacity>
        <Box style={styles.card} gap={8}><Text fontWeight="800" style={styles.cardTitle}>Learning path</Text>{data.courses.length ? data.courses.map(course => <Box key={course.courseId} flexDirection="row" justifyContent="space-between"><Text style={styles.course} i18n={false}>{course.title} · {course.positionPercent}%</Text><Text style={styles.meta} i18n={false}>{course.completedLessonCount}/{course.totalLessonCount} lessons</Text></Box>) : <Text style={styles.meta}>No course path synced yet</Text>}</Box>
      </Box>
      <PRowGroup header="History"><PRow icon="🗓" label="Lesson history" value={recentLessonLabel} chevron onPress={() => navigation.navigate(ROUTES.ParentHistoryScreen)} /><PRow icon="🏆" label="Rewards & leaderboard" chevron onPress={() => navigation.navigate(ROUTES.ParentRewardsScreen)} isLast /></PRowGroup>
      <PRowGroup header="Account"><PRow icon="🛡" label="Safety & Privacy" chevron onPress={() => navigation.navigate(ROUTES.ParentSafetyScreen)} /><PRow icon="⚙" label="Settings" chevron onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)} isLast /></PRowGroup>
    </ParentScroll>
  );
}

function StateLink({ navigation }: { navigation: Props['navigation'] }) { return <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open Parent Space settings" onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)}><Text style={styles.link}>Settings</Text></TouchableOpacity>; }
function Stat({ value, label }: { value: string; label: string }) { return <Box style={styles.stat} flex={1} gap={3}><Text fontWeight="800" style={styles.statValue} i18n={false}>{value}</Text><Text style={styles.statLabel}>{label}</Text></Box>; }
const styles = StyleSheet.create({ child: { color: PA.ink2 }, headline: { color: PA.ink, fontSize: 22 }, meta: { color: PA.ink2, fontSize: 13 }, link: { color: PA.accent, fontSize: 15 }, stat: { backgroundColor: PA.card, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: PA.hair }, statValue: { color: PA.ink, fontSize: 17 }, statLabel: { color: PA.ink3, fontSize: 11 }, card: { backgroundColor: PA.card, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: PA.hair }, cardTitle: { color: PA.ink, fontSize: 15 }, course: { color: PA.ink, fontSize: 14 } });
