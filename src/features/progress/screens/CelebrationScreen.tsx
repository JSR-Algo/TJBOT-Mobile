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

type Props = NativeStackScreenProps<RootStackParamList, 'CelebrationScreen'>;
const CONFETTI_COLORS = ['#FF6F61', '#0D8F68', '#1778B5', '#fff', '#6B4A9B'];

function reasonLabel(reason: JsonValue): string {
  if (reason === 'lesson_completion') return 'Lesson completed';
  if (reason && typeof reason === 'object' && !Array.isArray(reason) && reason.label === 'lesson_completion') return 'Lesson completed';
  return typeof reason === 'string' ? reason : 'Lesson completed';
}

export default function CelebrationScreen({ navigation, route }: Props): React.JSX.Element {
  const reduceMotion = useReduceMotion();
  const { activeHousehold } = useHousehold();
  const inbox = useRewardInboxQuery(activeHousehold?.id ?? '');
  const candidate = inbox.data?.rewards.find(item => item.rewardId === route.params?.rewardId);
  const [queuedSeen, setQueuedSeen] = React.useState<boolean | null>(null);
  const reward = queuedSeen === false ? candidate : undefined;
  const acknowledge = useAcknowledgeRewardMutation(activeHousehold?.id ?? '');
  const acknowledgedRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    let mounted = true;
    const rewardId = route.params?.rewardId;
    if (!rewardId) {
      setQueuedSeen(false);
      return () => { mounted = false; };
    }
    isRewardSeenQueued(rewardId)
      .then(queued => { if (mounted) setQueuedSeen(queued); })
      .catch(error => { captureError(error); if (mounted) setQueuedSeen(false); });
    return () => { mounted = false; };
  }, [route.params?.rewardId]);

  React.useEffect(() => {
    if (!reward || acknowledgedRef.current === reward.rewardId) return;
    acknowledgedRef.current = reward.rewardId;
    acknowledge.mutate(reward.rewardId);
  }, [acknowledge, reward]);

  if (!reward) {
    return <PageScroll bg="#FFC857"><Box padding={24} paddingTop={100} gap={12} accessibilityLiveRegion="polite"><Text fontWeight="800" style={styles.hero}>Reward is waiting to sync</Text><Text style={styles.msg}>Your lesson is safe. Check again when the robot is online.</Text><PrimaryCTA onPress={() => navigation.replace(ROUTES.HomeHubScreen)} color="#C34C3F">Back to Robot Home</PrimaryCTA></Box></PageScroll>;
  }

  const childName = reward.child.displayName ?? 'Child';
  const robotName = reward.robot.displayName ?? 'Robot';
  const streak = reward.streak?.currentDays ?? 0;
  return (
    <PageScroll bg="#FFC857">
      {reduceMotion ? <Box testID="celebration-static-stars" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.staticStars}><Text accessible={false} style={styles.staticStarText}>★  ★  ★</Text></Box> : <Box testID="celebration-confetti" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject, styles.confettiLayer]} overflow="hidden">{Array.from({ length: 24 }).map((_, i) => <Box key={i} style={[styles.confetti, { left: `${(i * 37) % 100}%`, top: `${(i * 17) % 80}%`, backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length], transform: [{ rotate: `${i * 23}deg` }] } satisfies ViewStyle]} />)}</Box>}
      <Box position="relative" paddingTop={80} paddingHorizontal={24} paddingBottom={16} alignItems="center" gap={14} accessibilityLiveRegion="polite">
        <Text fontWeight="800" style={styles.hero}>You did it!</Text>
        <Robot emotion="success" size={220} accent="#C34C3F" />
        <Box style={styles.stickerCard} accessible accessibilityLabel={`${childName} and ${robotName}. ${reward.xp} XP, ${reward.coins} coins, ${streak} day streak. ${reasonLabel(reward.reason)}`}>
          <Text fontWeight="800" style={styles.name} i18n={false}>{childName} · {robotName}</Text>
          <Text fontWeight="800" style={styles.reward} i18n={false}>{reward.xp} XP · {reward.coins} coins</Text>
          <Text style={styles.msg} i18n={false}>{streak} day streak</Text>
          <Text style={styles.msg}>{reasonLabel(reward.reason)}</Text>
          {reward.badges.map(badge => <Text key={badge} fontWeight="700" style={styles.badge} i18n={false}>{badge}</Text>)}
        </Box>
      </Box>
      <Box paddingHorizontal={24} paddingBottom={30}><PrimaryCTA onPress={() => navigation.replace(ROUTES.HomeHubScreen)} color="#C34C3F">Back to Robot Home</PrimaryCTA></Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({ confettiLayer: { pointerEvents: 'none' }, confetti: { position: 'absolute', width: 12, height: 18, borderRadius: 4, opacity: 0.85 }, staticStars: { position: 'absolute', top: 36, left: 0, right: 0, alignItems: 'center' }, staticStarText: { fontSize: 24, color: '#fff' }, hero: { fontSize: 42, color: '#2B2140', lineHeight: 48, textAlign: 'center' }, stickerCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, minWidth: 280, alignItems: 'center', borderWidth: 2, borderColor: '#2B2140' }, name: { fontSize: 22, color: '#2B2140' }, reward: { fontSize: 20, color: '#8A321F', marginTop: 10 }, msg: { fontSize: 16, color: '#5C4F77', textAlign: 'center', marginTop: 7 }, badge: { color: '#65428A', marginTop: 8 } });
