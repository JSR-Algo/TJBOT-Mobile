import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '@/features/parent/components/ParentScroll';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useLeaderboardQuery } from '@/features/rewards/hooks/useRewards';
import type { LeaderboardPeriod, LeaderboardRow, OwnedLeaderboardRow } from '@/services/api/leaderboard.api';
import { useHousehold } from '@/contexts/HouseholdContext';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'LeaderboardScreen'>;
const PAGE_SIZE = 25;

export default function LeaderboardScreen({ navigation }: Props): React.JSX.Element {
  const { activeHousehold } = useHousehold();
  const { language, t } = useAppLanguage();
  const [period, setPeriod] = React.useState<LeaderboardPeriod>('weekly');
  const [page, setPage] = React.useState(1);
  const query = useLeaderboardQuery(activeHousehold?.id ?? '', period, page, PAGE_SIZE);
  const data = query.data;
  const publicRobotIds = new Set(data?.rows.map(row => row.robotId) ?? []);
  const outsidePage = data?.ownedRows.filter(row => !publicRobotIds.has(row.robotId)) ?? [];

  const selectPeriod = (next: LeaderboardPeriod): void => {
    setPeriod(next);
    setPage(1);
  };

  return (
    <ParentScroll title={t('Leaderboard')} onBack={() => navigation.goBack()}>
      <Box padding={16} gap={14}>
        <Box flexDirection="row" style={styles.tabs} accessibilityRole="tablist">
          <PeriodTab label={t('This week')} accessibilityLabel={t('This week leaderboard')} selected={period === 'weekly'} onPress={() => selectPeriod('weekly')} />
          <PeriodTab label={t('All time')} accessibilityLabel={t('All time leaderboard')} selected={period === 'allTime'} onPress={() => selectPeriod('allTime')} />
        </Box>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Refresh leaderboard')} accessibilityHint={t('Fetches the latest ranks from the server')} accessibilityState={{ busy: query.isFetching }} onPress={() => { void query.refetch(); }} style={styles.refresh}>
          <Text fontWeight="700">Refresh ranks</Text>
        </TouchableOpacity>

        {query.isLoading ? <Text accessibilityLiveRegion="polite">Loading leaderboard</Text> : null}
        {query.isError ? (
          <Box gap={8} accessibilityLiveRegion="polite">
            <Text fontWeight="700">Leaderboard unavailable</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Retry leaderboard')} accessibilityHint={t('Fetches the leaderboard again')} onPress={() => { void query.refetch(); }}><Text style={styles.link}>Try again</Text></TouchableOpacity>
          </Box>
        ) : null}
        {!query.isLoading && !query.isError && data?.rows.length === 0 && outsidePage.length === 0 ? <Text>No robots have joined yet.</Text> : null}

        <Box gap={8}>
          {data?.rows.map(row => <LeaderboardRowView key={row.robotId} row={row} owned={data.ownedRows.some(owned => owned.robotId === row.robotId)} language={language} />)}
          {outsidePage.length > 0 ? <Text fontWeight="700" style={styles.ownSeparator}>Your robot</Text> : null}
          {outsidePage.map(row => <LeaderboardRowView key={row.robotId} row={row} owned language={language} />)}
        </Box>

        {data && data.pagination.totalPages > 1 ? (
          <Box flexDirection="row" alignItems="center" justifyContent="space-between">
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Previous leaderboard page')} accessibilityState={{ disabled: page <= 1 }} disabled={page <= 1} onPress={() => setPage(current => Math.max(1, current - 1))} style={styles.pageButton}><Text>Previous</Text></TouchableOpacity>
            <Text i18n={false}>{translateTemplate('Page {{page}} of {{total}}', { page, total: data.pagination.totalPages }, { locale: language })}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Next leaderboard page')} accessibilityState={{ disabled: page >= data.pagination.totalPages }} disabled={page >= data.pagination.totalPages} onPress={() => setPage(current => Math.min(data.pagination.totalPages, current + 1))} style={styles.pageButton}><Text>Next</Text></TouchableOpacity>
          </Box>
        ) : null}
      </Box>
    </ParentScroll>
  );
}

function PeriodTab({ label, accessibilityLabel, selected, onPress }: { label: string; accessibilityLabel: string; selected: boolean; onPress: () => void }): React.JSX.Element {
  return <TouchableOpacity accessibilityRole="tab" accessibilityLabel={accessibilityLabel} accessibilityHint={selected ? undefined : label} accessibilityState={{ selected }} onPress={onPress} style={[styles.tab, selected && styles.tabSelected]}><Text fontWeight="700" style={selected ? styles.tabTextSelected : styles.tabText}>{label}</Text></TouchableOpacity>;
}

function LeaderboardRowView({ row, owned, language }: { row: LeaderboardRow | OwnedLeaderboardRow; owned: boolean; language: 'vi' | 'en' }): React.JSX.Element {
  const privateRow = row.rankStatus === 'private';
  const rankText = privateRow ? 'Private robot' : row.rankStatus === 'refreshing' ? `Rank ${row.rank ?? '—'} is refreshing` : `Rank ${row.rank ?? '—'}`;
  const streakText = row.currentStreakDays === null ? 'Streak refreshing' : `${row.currentStreakDays} day streak`;
  const badgesText = row.badges.length > 0 ? row.badges.join(', ') : 'No badges yet';
  const label = translateTemplate(owned ? 'Your robot. {{rank}}. {{child}} with robot {{robot}}. {{xp}} XP. {{lessons}} lessons. {{streak}}. Badges: {{badges}}. Parent {{email}}' : '{{rank}}. {{child}} with robot {{robot}}. {{xp}} XP. {{lessons}} lessons. {{streak}}. Badges: {{badges}}. Parent {{email}}', { rank: rankText, child: row.childName, robot: row.robotName, xp: row.xp, lessons: row.completedLessonCount, streak: streakText, badges: badgesText, email: row.parentEmailMasked }, { locale: language });
  return (
    <Box accessible accessibilityLabel={label} style={[styles.row, owned && styles.owned]} flexDirection="row" alignItems="center" gap={12}>
      <Text fontWeight="800" style={styles.rank} i18n={false}>{privateRow ? '—' : `#${row.rank ?? '…'}`}</Text>
      <Box flex={1}>
        {owned ? <Text fontWeight="800" style={styles.ownedLabel}>{privateRow ? 'Private robot' : 'Your robot'}</Text> : null}
        <Text fontWeight="700" i18n={false}>{row.childName} · {row.robotName}</Text>
        <Text style={styles.email} i18n={false}>{row.parentEmailMasked}</Text>
        <Text style={styles.detail} i18n={false}>{row.completedLessonCount} lessons · {row.currentStreakDays === null ? 'Streak refreshing' : `${row.currentStreakDays} day streak`}</Text>
        <Text style={styles.detail} i18n={row.badges.length === 0}>{row.badges.length > 0 ? row.badges.join(' · ') : 'No badges yet'}</Text>
        {row.rankStatus === 'refreshing' ? <Text style={styles.refreshing}>Rank refreshing</Text> : null}
      </Box>
      <Text fontWeight="800" i18n={false}>{row.xp} XP</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  tabs: { backgroundColor: '#E9ECEF', padding: 4, borderRadius: 14 }, tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, tabSelected: { backgroundColor: '#fff' }, tabText: { color: PA.ink2 }, tabTextSelected: { color: PA.ink },
  refresh: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#FFF2DB' },
  row: { padding: 14, borderRadius: 14, backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair }, owned: { borderColor: PA.accent, borderWidth: 2, backgroundColor: '#FFF7ED' }, rank: { width: 42, fontSize: 18, color: PA.ink }, email: { color: PA.ink2, fontSize: 12, marginTop: 2 }, detail: { color: PA.ink2, fontSize: 12, marginTop: 4 }, ownedLabel: { color: '#8A3D22', fontSize: 12, marginBottom: 3 }, refreshing: { color: PA.ink2, fontSize: 12, marginTop: 3 }, ownSeparator: { color: PA.ink2, textAlign: 'center', marginVertical: 6 }, link: { color: PA.accent }, pageButton: { minWidth: 88, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: PA.hair },
});
