import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ParentScroll, { PA } from '@/features/parent/components/ParentScroll';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useParentGateGuard } from '@/features/parent/hooks/useParentGateGuard';
import { ROUTES } from '@/navigation/routes';
import { useRewardHistoryQuery, useRewardTotalsQuery } from '@/features/rewards/hooks/useRewards';
import { localeDateTag, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentRewardsScreen'>;

export default function ParentRewardsScreen({ navigation }: Props): React.JSX.Element {
  useParentGateGuard(navigation, ROUTES.ParentRewardsScreen);
  const { language } = useAppLanguage();
  const { activeChild } = useHousehold();
  const totalsQuery = useRewardTotalsQuery(activeChild?.id);
  const historyQuery = useRewardHistoryQuery(activeChild?.id);
  const rewards = historyQuery.data?.pages.flatMap(page => page.items) ?? [];

  return (
    <ParentScroll title="Rewards" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
      <Box padding={16} gap={14}>
        <Text fontWeight="800" style={styles.title} i18n={false}>{activeChild?.name ? `${activeChild.name}'s rewards` : 'Rewards'}</Text>
        {totalsQuery.isLoading ? <Text accessibilityLiveRegion="polite">Loading reward totals</Text> : null}
        {totalsQuery.isError ? <Retry label="Reward totals unavailable" onPress={() => { void totalsQuery.refetch(); }} /> : null}
        {totalsQuery.data ? (
          <Box style={styles.totalCard} flexDirection="row" justifyContent="space-between" accessible accessibilityLabel={`${totalsQuery.data.totalXp} XP, ${totalsQuery.data.totalCoins} coins, ${totalsQuery.data.currentStreakDays} day streak`}>
            <Stat value={`${totalsQuery.data.totalXp} XP`} label="Total XP" />
            <Stat value={`${totalsQuery.data.totalCoins}`} label="Coins" />
            <Stat value={`${totalsQuery.data.currentStreakDays}`} label="Day streak" />
          </Box>
        ) : null}

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open leaderboard" onPress={() => navigation.navigate(ROUTES.LeaderboardScreen)} style={styles.leaderboardButton}>
          <Text fontWeight="700">View leaderboard</Text>
        </TouchableOpacity>

        <Text fontWeight="700" style={styles.section}>Reward history</Text>
        {historyQuery.isLoading ? <Text accessibilityLiveRegion="polite">Loading reward history</Text> : null}
        {historyQuery.isError ? <Retry label="Reward history unavailable" onPress={() => { void historyQuery.refetch(); }} /> : null}
        {!historyQuery.isLoading && !historyQuery.isError && rewards.length === 0 ? <Text>No rewards yet.</Text> : null}
        {rewards.map(reward => (
          <Box key={reward.id} style={styles.rewardRow} accessible accessibilityLabel={`${reward.badgeName ?? 'Lesson reward'}, ${reward.xp} XP and ${reward.coins} coins`}>
            <Text fontWeight="700">{reward.badgeName ?? 'Lesson reward'}</Text>
            <Text style={styles.meta} i18n={false}>{reward.xp} XP · {reward.coins} coins</Text>
            <Text style={styles.date} i18n={false}>{new Date(reward.grantedAt).toLocaleDateString(localeDateTag(language))}</Text>
          </Box>
        ))}
        {historyQuery.hasNextPage ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Load more reward history" accessibilityState={{ busy: historyQuery.isFetchingNextPage }} disabled={historyQuery.isFetchingNextPage} onPress={() => { void historyQuery.fetchNextPage(); }} style={styles.leaderboardButton}>
            <Text fontWeight="700">Load more</Text>
          </TouchableOpacity>
        ) : null}
      </Box>
    </ParentScroll>
  );
}

function Stat({ value, label }: { value: string; label: string }): React.JSX.Element {
  return <Box alignItems="center"><Text fontWeight="800" style={styles.statValue} i18n={false}>{value}</Text><Text style={styles.statLabel}>{label}</Text></Box>;
}

function Retry({ label, onPress }: { label: string; onPress: () => void }): React.JSX.Element {
  return <Box gap={6}><Text fontWeight="700">{label}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Retry ${label}`} onPress={onPress}><Text style={styles.link}>Try again</Text></TouchableOpacity></Box>;
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: PA.ink },
  section: { fontSize: 17, color: PA.ink, marginTop: 8 },
  totalCard: { padding: 16, borderRadius: 16, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' },
  statValue: { color: PA.ink, fontSize: 18 },
  statLabel: { color: PA.ink2, fontSize: 11, marginTop: 2 },
  rewardRow: { padding: 14, borderRadius: 14, backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair },
  meta: { color: PA.ink2, marginTop: 4 },
  date: { color: PA.ink3, fontSize: 12, marginTop: 4 },
  leaderboardButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: PA.hair, alignItems: 'center', justifyContent: 'center' },
  link: { color: PA.accent },
});
