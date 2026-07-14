import React from 'react';
import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useReduceMotion } from '@/design-system/animations/useReduceMotion';
import { useAcknowledgeRewardMutation, useRewardInboxQuery } from '@/features/rewards/hooks/useRewards';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { JsonValue, RewardReceipt } from '@/services/api/rewards.api';
import { isRewardSeenQueued } from '@/features/rewards/offline/rewardSeenQueue';
import { captureError } from '@/services/observability/sentry';
import { translateTemplate, useAppLanguage, type AppLocale } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'CelebrationScreen'>;
type RewardScope = { accountId: string | undefined; householdId: string | undefined; rewardId: string | undefined };
type RewardLatch = RewardScope & { reward: RewardReceipt | undefined };
type QueuedSeenState = RewardScope & { value: boolean | null };
const CONFETTI_COLORS = ['#FF6F61', '#0D8F68', '#1778B5', '#fff', '#6B4A9B'];

function reasonLabel(reason: JsonValue, locale: AppLocale): string {
  if (reason === 'lesson_completion') return translateTemplate('Lesson completed', {}, { locale });
  if (reason && typeof reason === 'object' && !Array.isArray(reason) && reason.label === 'lesson_completion') return translateTemplate('Lesson completed', {}, { locale });
  return typeof reason === 'string' ? reason : translateTemplate('Lesson completed', {}, { locale });
}

export default function CelebrationScreen({ navigation, route }: Props): React.JSX.Element {
  const reduceMotion = useReduceMotion();
  const { language, t } = useAppLanguage();
  const auth = useOptionalAuth();
  const { activeHousehold } = useHousehold();
  const accountId = auth?.user?.id;
  const householdId = activeHousehold?.id;
  const inbox = useRewardInboxQuery(householdId ?? '', accountId ?? null);
  const requestedRewardId = route.params?.rewardId;
  const candidate = accountId && householdId ? inbox.data?.rewards.find(item => item.rewardId === requestedRewardId) : undefined;
  const [latchedReward, setLatchedReward] = React.useState<RewardLatch>(() => ({ accountId, householdId, rewardId: requestedRewardId, reward: candidate }));
  const [queuedSeen, setQueuedSeen] = React.useState<QueuedSeenState>(() => ({ accountId, householdId, rewardId: requestedRewardId, value: null }));
  const reward = queuedSeen.accountId === accountId && queuedSeen.householdId === householdId && queuedSeen.rewardId === requestedRewardId && queuedSeen.value === false && latchedReward.accountId === accountId && latchedReward.householdId === householdId && latchedReward.rewardId === requestedRewardId ? latchedReward.reward : undefined;
  const acknowledge = useAcknowledgeRewardMutation(householdId ?? '', accountId ?? null);
  const acknowledgedRewardIdsRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    setLatchedReward(current => {
      const sameScope = current.accountId === accountId && current.householdId === householdId && current.rewardId === requestedRewardId;
      if (candidate) return sameScope && current.reward === candidate ? current : { accountId, householdId, rewardId: requestedRewardId, reward: candidate };
      return sameScope ? current : { accountId, householdId, rewardId: requestedRewardId, reward: undefined };
    });
  }, [accountId, candidate, householdId, requestedRewardId]);

  React.useEffect(() => {
    let mounted = true;
    const rewardId = requestedRewardId;
    if (!accountId || !householdId || !rewardId) {
      setQueuedSeen({ accountId, householdId, rewardId, value: false });
      return () => { mounted = false; };
    }
    isRewardSeenQueued(rewardId, { accountId, householdScope: householdId })
      .then(queued => { if (mounted) setQueuedSeen({ accountId, householdId, rewardId, value: queued }); })
      .catch(error => { captureError(error); if (mounted) setQueuedSeen({ accountId, householdId, rewardId, value: false }); });
    return () => { mounted = false; };
  }, [accountId, householdId, requestedRewardId]);

  React.useEffect(() => {
    if (!accountId || !householdId || !reward) return;
    const acknowledgementKey = JSON.stringify([accountId, householdId, reward.rewardId]);
    if (acknowledgedRewardIdsRef.current.has(acknowledgementKey)) return;
    acknowledgedRewardIdsRef.current.add(acknowledgementKey);
    acknowledge.mutate(reward.rewardId);
  }, [acknowledge, accountId, householdId, reward]);

  if (!reward) {
    return <PageScroll bg="#FFC857"><Box padding={24} paddingTop={100} gap={12} accessibilityLiveRegion="polite"><Text fontWeight="800" style={styles.hero}>Reward is waiting to sync</Text><Text style={styles.msg}>Your lesson is safe. Check again when the robot is online.</Text><PrimaryCTA onPress={() => navigation.replace(ROUTES.HomeHubScreen)} color="#C34C3F">Back to Robot Home</PrimaryCTA></Box></PageScroll>;
  }

  const childName = reward.child.displayName ?? t('Child');
  const robotName = reward.robot.displayName ?? t('Robot');
  const xpText = translateTemplate('XP: {{count}}', { count: reward.xp }, { locale: language });
  const coinsText = translateTemplate('Coins: {{count}}', { count: reward.coins }, { locale: language });
  const streakText = reward.streak === null ? t('Streak unavailable') : reward.streak.currentDays === null ? t('Streak refreshing') : translateTemplate('Streak days: {{count}}', { count: reward.streak.currentDays }, { locale: language });
  const reasonText = reasonLabel(reward.reason, language);
  const summary = translateTemplate('{{child}} and {{robot}}. {{xp}}. {{coins}}. {{streak}}. {{reason}}.', { child: childName, robot: robotName, xp: xpText, coins: coinsText, streak: streakText, reason: reasonText }, { locale: language });
  return (
    <PageScroll bg="#FFC857">
      {reduceMotion ? <Box testID="celebration-static-stars" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.staticStars}><Text accessible={false} style={styles.staticStarText}>★  ★  ★</Text></Box> : <Box testID="celebration-confetti" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject, styles.confettiLayer]} overflow="hidden">{Array.from({ length: 24 }).map((_, i) => <Box key={i} style={[styles.confetti, { left: `${(i * 37) % 100}%`, top: `${(i * 17) % 80}%`, backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length], transform: [{ rotate: `${i * 23}deg` }] } satisfies ViewStyle]} />)}</Box>}
      <Box position="relative" paddingTop={80} paddingHorizontal={24} paddingBottom={16} alignItems="center" gap={14} accessibilityLiveRegion="polite">
        <Text fontWeight="800" style={styles.hero}>You did it!</Text>
        <Robot emotion="success" size={220} accent="#C34C3F" />
        <Box style={styles.stickerCard} accessible accessibilityLabel={summary}>
          <Text fontWeight="800" style={styles.name} i18n={false}>{childName} · {robotName}</Text>
          <Text fontWeight="800" style={styles.reward}>{xpText} · {coinsText}</Text>
          <Text style={styles.msg}>{streakText}</Text>
          <Text style={styles.msg}>{reasonText}</Text>
          {reward.badges.map(badge => <Text key={badge} fontWeight="700" style={styles.badge} i18n={false}>{badge}</Text>)}
        </Box>
      </Box>
      <Box paddingHorizontal={24} paddingBottom={30}><PrimaryCTA onPress={() => navigation.replace(ROUTES.HomeHubScreen)} color="#C34C3F">Back to Robot Home</PrimaryCTA></Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({ confettiLayer: { pointerEvents: 'none' }, confetti: { position: 'absolute', width: 12, height: 18, borderRadius: 4, opacity: 0.85 }, staticStars: { position: 'absolute', top: 36, left: 0, right: 0, alignItems: 'center' }, staticStarText: { fontSize: 24, color: '#fff' }, hero: { fontSize: 42, color: '#2B2140', lineHeight: 48, textAlign: 'center' }, stickerCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, minWidth: 280, alignItems: 'center', borderWidth: 2, borderColor: '#2B2140' }, name: { fontSize: 22, color: '#2B2140' }, reward: { fontSize: 20, color: '#8A321F', marginTop: 10 }, msg: { fontSize: 16, color: '#5C4F77', textAlign: 'center', marginTop: 7 }, badge: { color: '#65428A', marginTop: 8 } });
