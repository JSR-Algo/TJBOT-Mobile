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
import { useRewardHistoryQuery } from '@/features/rewards/hooks/useRewards';
import type { JsonValue, RewardReceipt } from '@/services/api/rewards.api';
import { localeDateTag, translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ParentRewardsScreen'>;

function reasonLabel(reason: JsonValue): string {
  if (typeof reason === 'string') return reason === 'lesson_completion' ? 'Lesson completed' : reason;
  if (reason && typeof reason === 'object' && !Array.isArray(reason) && typeof reason.label === 'string') return reason.label === 'lesson_completion' ? 'Lesson completed' : reason.label;
  return 'Lesson completed';
}

export default function ParentRewardsScreen({ navigation }: Props): React.JSX.Element {
  useParentGateGuard(navigation, ROUTES.ParentRewardsScreen);
  const { language, t } = useAppLanguage();
  const { activeHousehold, activeChild, children } = useHousehold();
  const [childId, setChildId] = React.useState(activeChild?.id);
  const [robotId, setRobotId] = React.useState<string>();
  const historyQuery = useRewardHistoryQuery(activeHousehold?.id ?? '', childId, robotId);
  const rewards = historyQuery.data?.history ?? [];
  const robots = Array.from(new Map(rewards.map(reward => [reward.robot.id, reward.robot])).values());
  const stale = Boolean(historyQuery.data) && (historyQuery.isError || historyQuery.fetchStatus === 'paused');

  return (
    <ParentScroll title={t('Rewards')} onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
      <Box padding={16} gap={14}>
        <Text fontWeight="800" style={styles.title}>Rewards & leaderboard</Text>
        <Box flexDirection="row" style={styles.filters}>
          {children.map(child => <TouchableOpacity key={child.id} accessibilityRole="button" accessibilityLabel={translateTemplate('Filter rewards for {{name}}', { name: child.name }, { locale: language })} accessibilityState={{ selected: child.id === childId }} onPress={() => { setChildId(child.id); setRobotId(undefined); }} style={[styles.filter, child.id === childId && styles.filterSelected]}><Text i18n={false}>{child.name}</Text></TouchableOpacity>)}
        </Box>
        {robots.length > 0 ? <Box flexDirection="row" style={styles.filters}>{robots.map(robot => <TouchableOpacity key={robot.id} accessibilityRole="button" accessibilityLabel={translateTemplate('Filter rewards for robot {{name}}', { name: robot.displayName ?? t('Robot') }, { locale: language })} accessibilityState={{ selected: robot.id === robotId }} onPress={() => setRobotId(current => current === robot.id ? undefined : robot.id)} style={[styles.filter, robot.id === robotId && styles.filterSelected]}><Text i18n={false}>{robot.displayName ?? t('Robot')}</Text></TouchableOpacity>)}</Box> : null}

        {stale ? <Text accessibilityLiveRegion="polite" style={styles.stale}>Offline · showing saved rewards</Text> : null}
        {historyQuery.isLoading ? <Text accessibilityLiveRegion="polite">Loading reward history</Text> : null}
        {historyQuery.isError ? <Retry onPress={() => { void historyQuery.refetch(); }} /> : null}
        {historyQuery.data ? <Totals totals={historyQuery.data.totals} /> : null}

        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Open leaderboard')} accessibilityHint={t('Shows weekly and all-time robot ranks')} onPress={() => navigation.navigate(ROUTES.LeaderboardScreen)} style={styles.action}><Text fontWeight="700">View leaderboard</Text></TouchableOpacity>
        <Text fontWeight="700" style={styles.section}>Reward history</Text>
        {!historyQuery.isLoading && !historyQuery.isError && rewards.length === 0 ? <Text>No rewards yet.</Text> : null}
        {groupRewards(rewards).map(group => <Box key={group.key} gap={8}><Text fontWeight="800" i18n={false}>{group.label}</Text>{group.rewards.map(reward => <RewardRow key={reward.rewardId} reward={reward} language={language} />)}</Box>)}
      </Box>
    </ParentScroll>
  );
}

function groupRewards(rewards: RewardReceipt[]): { key: string; label: string; rewards: RewardReceipt[] }[] {
  const groups = new Map<string, { key: string; label: string; rewards: RewardReceipt[] }>();
  for (const reward of rewards) {
    const key = `${reward.child.id}:${reward.robot.id}`;
    const group = groups.get(key) ?? { key, label: `${reward.child.displayName ?? '—'} · ${reward.robot.displayName ?? '—'}`, rewards: [] };
    group.rewards.push(reward);
    groups.set(key, group);
  }
  return Array.from(groups.values());
}

function Totals({ totals }: { totals: { xp: number; coins: number; rewardCount: number; refreshing: boolean } }): React.JSX.Element {
  return <Box style={styles.totalCard} flexDirection="row" justifyContent="space-between" accessible accessibilityLabel={`${totals.xp} XP, ${totals.coins} coins, ${totals.rewardCount} rewards`}><Stat value={`${totals.xp} XP`} label="Total XP" /><Stat value={`${totals.coins}`} label="Coins" /><Stat value={`${totals.rewardCount}`} label="Rewards" />{totals.refreshing ? <Text accessibilityLiveRegion="polite">Totals refreshing</Text> : null}</Box>;
}
function RewardRow({ reward, language }: { reward: RewardReceipt; language: 'vi' | 'en' }): React.JSX.Element {
  const reason = reasonLabel(reward.reason);
  return <Box style={styles.rewardRow} accessible accessibilityLabel={`${reason}, ${reward.xp} XP, ${reward.coins} coins`}><Text fontWeight="700">{reason}</Text><Text style={styles.meta} i18n={false}>{reward.xp} XP · {reward.coins} coins</Text>{reward.badges.map(badge => <Text key={badge} style={styles.badge} i18n={false}>{badge}</Text>)}<Text style={styles.date} i18n={false}>{new Date(reward.awardedAt).toLocaleDateString(localeDateTag(language))}</Text></Box>;
}
function Stat({ value, label }: { value: string; label: string }): React.JSX.Element { return <Box alignItems="center"><Text fontWeight="800" style={styles.statValue} i18n={false}>{value}</Text><Text style={styles.statLabel}>{label}</Text></Box>; }
function Retry({ onPress }: { onPress: () => void }): React.JSX.Element { return <Box gap={6}><Text fontWeight="700">Reward history unavailable</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry reward history" accessibilityHint="Fetches reward history again" onPress={onPress}><Text style={styles.link}>Try again</Text></TouchableOpacity></Box>; }

const styles = StyleSheet.create({ title: { fontSize: 24, color: PA.ink }, section: { fontSize: 17, color: PA.ink, marginTop: 8 }, filters: { flexWrap: 'wrap', gap: 8 }, filter: { minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: PA.hair }, filterSelected: { borderWidth: 2, borderColor: PA.accent, backgroundColor: '#FFF2DB' }, stale: { color: '#7A3E00', backgroundColor: '#FFF2DB', padding: 10, borderRadius: 10 }, totalCard: { padding: 16, borderRadius: 16, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' }, statValue: { color: PA.ink, fontSize: 18 }, statLabel: { color: PA.ink2, fontSize: 11, marginTop: 2 }, rewardRow: { padding: 14, borderRadius: 14, backgroundColor: PA.card, borderWidth: 1, borderColor: PA.hair }, meta: { color: PA.ink2, marginTop: 4 }, badge: { color: '#8A3D22', marginTop: 4 }, date: { color: PA.ink3, fontSize: 12, marginTop: 4 }, action: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: PA.hair, alignItems: 'center', justifyContent: 'center' }, link: { color: PA.accent } });
