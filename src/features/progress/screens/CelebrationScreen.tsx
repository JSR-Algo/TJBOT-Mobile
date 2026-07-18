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
import { useHousehold } from '@/contexts/HouseholdContext';
import type { JsonValue } from '@/services/api/rewards.api';
import { isRewardSeenQueued } from '@/features/rewards/offline/rewardSeenQueue';
import { captureError } from '@/services/observability/sentry';
import { translateTemplate, useAppLanguage, type AppLocale } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'CelebrationScreen'>;
const CONFETTI_COLORS = ['#FF6F61', '#0D8F68', '#1778B5', '#fff', '#6B4A9B'];

function reasonLabel(reason: JsonValue, locale: AppLocale): string {
  if (reason === 'lesson_completion') return translateTemplate('Lesson completed', {}, { locale });
  if (reason && typeof reason === 'object' && !Array.isArray(reason) && reason.label === 'lesson_completion') return translateTemplate('Lesson completed', {}, { locale });
  return typeof reason === 'string' ? reason : translateTemplate('Lesson completed', {}, { locale });
}

export default function CelebrationScreen({ navigation, route }: Props): React.JSX.Element {
  const reduceMotion = useReduceMotion();
  const { language, t } = useAppLanguage();
  const { activeHousehold } = useHousehold();
  const inbox = useRewardInboxQuery(activeHousehold?.id ?? '');
  const rewardId = route.params?.rewardId;
  const rewardScopeKey = activeHousehold?.id && rewardId
    ? `${activeHousehold.id}:${rewardId}`
    : undefined;
  const candidate = inbox.data?.rewards.find(item => item.rewardId === rewardId);
  const displayedRewardRef = React.useRef<{ scopeKey: string; receipt: NonNullable<typeof candidate> } | undefined>(undefined);
  if (candidate && rewardScopeKey) displayedRewardRef.current = { scopeKey: rewardScopeKey, receipt: candidate };
  const retainedReward = displayedRewardRef.current;
  const displayedReward = retainedReward !== undefined && retainedReward.scopeKey === rewardScopeKey
    ? retainedReward.receipt
    : undefined;
  const [queueCheck, setQueueCheck] = React.useState<{ scopeKey: string | undefined; queued: boolean } | null>(null);
  const queuedSeen = queueCheck !== null && queueCheck.scopeKey === rewardScopeKey ? queueCheck.queued : null;
  const reward = queuedSeen === false ? displayedReward : undefined;
  const acknowledge = useAcknowledgeRewardMutation(activeHousehold?.id ?? '');
  const acknowledgedRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    let mounted = true;
    if (!rewardId) {
      setQueueCheck({ scopeKey: rewardScopeKey, queued: false });
      return () => { mounted = false; };
    }
    isRewardSeenQueued(rewardId)
      .then(queued => { if (mounted) setQueueCheck({ scopeKey: rewardScopeKey, queued }); })
      .catch(error => { captureError(error); if (mounted) setQueueCheck({ scopeKey: rewardScopeKey, queued: false }); });
    return () => { mounted = false; };
  }, [rewardId, rewardScopeKey]);

  React.useEffect(() => {
    if (!reward || acknowledgedRef.current === reward.rewardId) return;
    acknowledgedRef.current = reward.rewardId;
    acknowledge.mutate(reward.rewardId);
  }, [acknowledge, reward]);

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
