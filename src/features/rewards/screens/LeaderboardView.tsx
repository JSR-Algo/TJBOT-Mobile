import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '@/features/parent/components/ParentScroll';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useLeaderboardQuery } from '@/features/rewards/hooks/useRewards';
import type { LeaderboardPeriod, LeaderboardRow } from '@/services/api/rewards.api';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useActiveChildRobotQuery } from '@/features/rewards/hooks/useRewards';

type Props = NativeStackScreenProps<RootStackParamList, 'LeaderboardScreen'>;

export default function LeaderboardScreen({ navigation }: Props): React.JSX.Element {
  const [period, setPeriod] = React.useState<LeaderboardPeriod>('weekly');
  const { activeChild } = useHousehold();
  const robotQuery = useActiveChildRobotQuery(activeChild?.id);
  const query = useLeaderboardQuery(period, robotQuery.data?.id);
  const pages = query.data?.pages ?? [];
  const rows = pages.flatMap(page => page.items);
  const ownedRow = pages.find(page => page.ownedRow)?.ownedRow ?? null;
  const ownedInPage = rows.some(row => row.owned);

  return (
    <ParentScroll title="Leaderboard" onBack={() => navigation.goBack()}>
      <Box padding={16} gap={14}>
        <Box flexDirection="row" style={styles.tabs} accessibilityRole="tablist">
          <PeriodTab label="This week" selected={period === 'weekly'} onPress={() => setPeriod('weekly')} />
          <PeriodTab label="All time" selected={period === 'allTime'} onPress={() => setPeriod('allTime')} />
        </Box>

        {query.isLoading ? <Text accessibilityLiveRegion="polite">Loading leaderboard</Text> : null}
        {query.isError ? (
          <Box gap={8}>
            <Text fontWeight="700">Leaderboard unavailable</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry leaderboard" onPress={() => { void query.refetch(); }}><Text style={styles.link}>Try again</Text></TouchableOpacity>
          </Box>
        ) : null}
        {!query.isLoading && !query.isError && rows.length === 0 && !ownedRow ? <Text>No robots have joined yet.</Text> : null}

        <Box gap={8}>
          {rows.map(row => <LeaderboardRowView key={`${row.rank}-${row.deviceId}`} row={row} />)}
          {!ownedInPage && ownedRow ? (
            <>
              <Text style={styles.ownSeparator}>Your robot</Text>
              <LeaderboardRowView row={ownedRow} />
            </>
          ) : null}
        </Box>

        {query.hasNextPage ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Load more leaderboard rows" accessibilityState={{ busy: query.isFetchingNextPage }} disabled={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }} style={styles.loadMore}>
            <Text fontWeight="700">Load more</Text>
          </TouchableOpacity>
        ) : null}
      </Box>
    </ParentScroll>
  );
}

function PeriodTab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }): React.JSX.Element {
  return (
    <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress} style={[styles.tab, selected && styles.tabSelected]}>
      <Text fontWeight="700" style={selected ? styles.tabTextSelected : styles.tabText}>{label}</Text>
    </TouchableOpacity>
  );
}

function LeaderboardRowView({ row }: { row: LeaderboardRow }): React.JSX.Element {
  return (
    <Box accessible accessibilityLabel={`${row.owned ? 'Your rank' : 'Rank'} ${row.rank}. ${row.childName} with robot ${row.robotName}. ${row.xp} XP. Parent ${row.maskedParentEmail}`} style={[styles.row, row.owned && styles.owned]} flexDirection="row" alignItems="center" gap={12}>
      <Text fontWeight="800" style={styles.rank} i18n={false}>#{row.rank}</Text>
      <Box flex={1}>
        <Text fontWeight="700" i18n={false}>{row.childName} · {row.robotName}</Text>
        <Text style={styles.email} i18n={false}>{row.maskedParentEmail}</Text>
      </Box>
      <Text fontWeight="800" i18n={false}>{row.xp} XP</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  tabs: { backgroundColor: '#E9ECEF', padding: 4, borderRadius: 14 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  tabSelected: { backgroundColor: '#fff' },
  tabText: { color: PA.ink2 },
  tabTextSelected: { color: PA.ink },
  row: { padding: 14, borderRadius: 14, backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair },
  owned: { borderColor: PA.accent, borderWidth: 2, backgroundColor: '#FFF7ED' },
  rank: { width: 40, fontSize: 18, color: PA.ink },
  email: { color: PA.ink2, fontSize: 12, marginTop: 2 },
  ownSeparator: { color: PA.ink2, textAlign: 'center', marginVertical: 6 },
  link: { color: PA.accent },
  loadMore: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: PA.hair },
});
