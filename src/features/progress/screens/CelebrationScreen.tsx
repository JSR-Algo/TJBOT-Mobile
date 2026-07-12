import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
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
import { useAcknowledgeRewardMutation, useRewardForCompletionQuery } from '@/features/rewards/hooks/useRewards';

type Props = NativeStackScreenProps<RootStackParamList, 'CelebrationScreen'>;
const CONFETTI_COLORS = ['#FF6F61', '#6CE2B6', '#6FC1FF', '#fff', '#6B4A9B'];

export default function CelebrationScreen({ navigation, route }: Props): React.JSX.Element {
  const reduceMotion = useReduceMotion();
  const rewardQuery = useRewardForCompletionQuery({ childId: route.params?.childId, deviceId: route.params?.deviceId, assignmentId: route.params?.assignmentId });
  const candidate = rewardQuery.data;
  const reward = candidate
    && candidate.id === route.params?.rewardId
    && candidate.childId === route.params?.childId
    && candidate.deviceId === route.params?.deviceId
    && candidate.assignmentId === route.params?.assignmentId
    && candidate.status !== 'held'
    ? candidate
    : null;
  const acknowledge = useAcknowledgeRewardMutation();
  const acknowledgedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!reward || reward.seenAt || acknowledgedRef.current === reward.id) return;
    acknowledgedRef.current = reward.id;
    acknowledge.mutate(reward.id);
  }, [acknowledge, reward]);

  if (!reward) {
    return (
      <PageScroll bg="#FFC857">
        <Box padding={24} paddingTop={100} gap={12} accessibilityLiveRegion="polite">
          <Text fontWeight="800" style={styles.hero}>Reward is waiting to sync</Text>
          <Text style={styles.msg}>Your lesson is safe. Check again when the robot is online.</Text>
          <PrimaryCTA onPress={() => navigation.replace(ROUTES.HomeHubScreen)} color="#FF6F61">Back to Robot Home</PrimaryCTA>
        </Box>
      </PageScroll>
    );
  }

  return (
    <PageScroll bg="#FFC857">
      {reward.seenAt ? null : reduceMotion ? (
        <Box testID="celebration-static-stars" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.staticStars}><Text accessible={false} style={styles.staticStarText}>★  ★  ★</Text></Box>
      ) : (
        <Box testID="celebration-confetti" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject, styles.confettiLayer]} overflow="hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <Box key={i} style={[styles.confetti, { left: `${(i * 37) % 100}%`, top: `${(i * 17) % 80}%`, backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length], transform: [{ rotate: `${i * 23}deg` }] } satisfies ViewStyle]} />
          ))}
        </Box>
      )}
      <Box position="relative" paddingTop={80} paddingHorizontal={24} paddingBottom={16} alignItems="center" gap={14}>
        <Text fontWeight="800" style={styles.hero}>You did it!</Text>
        <Robot emotion="success" size={240} accent="#FF6F61" />
        <Box style={styles.stickerCard} accessible accessibilityLabel={`${reward.seenAt ? 'Reward earned' : 'New reward'}. ${reward.badgeName ?? 'Lesson reward'}. ${reward.xp} XP and ${reward.coins} coins`}>
          <Text fontWeight="700" style={styles.label}>{reward.seenAt ? 'Reward earned' : 'New reward'}</Text>
          <Text fontWeight="800" style={styles.name}>{reward.badgeName ?? 'Lesson reward'}</Text>
          <Text fontWeight="700" style={styles.msg} i18n={false}>{reward.xp} XP · {reward.coins} coins</Text>
        </Box>
      </Box>
      <Box position="relative" paddingHorizontal={24} paddingTop={24} paddingBottom={30} gap={10}>
        <PrimaryCTA onPress={() => navigation.replace(ROUTES.HomeHubScreen)} color="#FF6F61">Back to Robot Home</PrimaryCTA>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Practice review words" onPress={() => navigation.replace(ROUTES.ReviewNeededScreen)} style={styles.reviewBtn} activeOpacity={0.8}>
          <Text fontWeight="700" style={{ fontSize: 18, color: '#2B2140' }}>Practice review words</Text>
        </TouchableOpacity>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  confettiLayer: { pointerEvents: 'none' },
  confetti: { position: 'absolute', width: 12, height: 18, borderRadius: 4, opacity: 0.85 },
  staticStars: { position: 'absolute', top: 36, left: 0, right: 0, alignItems: 'center' },
  staticStarText: { fontSize: 24, color: '#fff' },
  hero: { fontSize: 42, color: '#2B2140', lineHeight: 48, textAlign: 'center' },
  stickerCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, minWidth: 240, alignItems: 'center' },
  label: { fontSize: 12, color: '#5C4F77', textTransform: 'uppercase', letterSpacing: 1 },
  name: { fontSize: 22, color: '#2B2140', marginTop: 4 },
  msg: { fontSize: 17, color: '#5C4F77', textAlign: 'center', marginTop: 8 },
  reviewBtn: { width: '100%', minHeight: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
});
