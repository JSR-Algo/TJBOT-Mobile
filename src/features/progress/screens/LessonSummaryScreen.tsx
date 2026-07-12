import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useActiveChildRobotQuery, useRewardForCompletionQuery } from '@/features/rewards/hooks/useRewards';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonSummaryScreen'>;

export default function LessonSummaryScreen({ navigation, route }: Props): React.JSX.Element {
  const childId = route.params?.childId;
  const robotQuery = useActiveChildRobotQuery(childId);
  const deviceId = route.params?.deviceId;
  const rewardQuery = useRewardForCompletionQuery({
    childId,
    deviceId,
    assignmentId: route.params?.assignmentId,
  });
  const candidate = rewardQuery.data;
  const reward = candidate
    && candidate.childId === childId
    && candidate.deviceId === deviceId
    && candidate.assignmentId === route.params?.assignmentId
    ? candidate
    : null;
  const held = reward?.status === 'held';

  const openCelebration = (): void => {
    if (!reward) return;
    navigation.navigate(ROUTES.CelebrationScreen, {
      rewardId: reward.id,
      childId: reward.childId,
      lessonId: reward.lessonId,
      assignmentId: reward.assignmentId,
      sessionId: reward.sessionId ?? undefined,
      deviceId: reward.deviceId,
    });
  };

  return (
    <PageScroll bg="#C5F1DD">
      <Box paddingHorizontal={24} paddingTop={80} paddingBottom={14} alignItems="center" gap={8}>
        <Text fontWeight="600" style={styles.tag}>LESSON DONE</Text>
        <Text fontWeight="800" style={styles.headline}>Great effort!</Text>
        <Robot emotion="success" size={200} accent="#FFC857" />
      </Box>

      <Box paddingHorizontal={24} paddingBottom={14}>
        <Box style={styles.summaryCard} accessibilityLiveRegion="polite">
          {held ? (
            <>
              <Text fontWeight="800" style={styles.rewardTitle}>Reward needs parent attention</Text>
              <Text style={styles.meta}>Check the child assigned to this robot, then contact support if the reward remains unavailable.</Text>
            </>
          ) : reward ? (
            <>
              <Text fontWeight="800" style={styles.rewardTitle}>{reward.badgeName ?? 'Lesson reward'}</Text>
              <Box flexDirection="row" gap={12} marginTop={12}>
                <Text fontWeight="800" style={styles.rewardValue} i18n={false}>{reward.xp} XP</Text>
                <Text fontWeight="800" style={styles.rewardValue} i18n={false}>{reward.coins} coins</Text>
              </Box>
              <Text style={styles.meta} i18n={false}>{robotQuery.data?.name ?? ''}</Text>
            </>
          ) : rewardQuery.isError || robotQuery.isError ? (
            <>
              <Text fontWeight="700" style={styles.rewardTitle}>Reward unavailable</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry reward" onPress={() => { void rewardQuery.refetch(); }}>
                <Text style={styles.retry}>Try again</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text fontWeight="700" style={styles.rewardTitle}>Reward is waiting to sync</Text>
              <Text style={styles.meta}>Your lesson is saved. We will show the award when the robot reconnects.</Text>
            </>
          )}
        </Box>
      </Box>

      <Box paddingHorizontal={24} paddingTop={8} paddingBottom={28} gap={10}>
        {reward && !reward.seenAt && !held ? <PrimaryCTA onPress={openCelebration} color="#FF6F61">Celebrate reward</PrimaryCTA> : null}
        <PrimaryCTA onPress={() => navigation.replace(ROUTES.SendToRobotScreen)} color="#FF6F61">Keep going</PrimaryCTA>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Stop for today" onPress={() => navigation.replace(ROUTES.HomeHubScreen)} activeOpacity={0.7} style={styles.stopBtn}>
          <Text fontWeight="700" style={{ fontSize: 18, color: '#5C4F77' }}>Stop for today</Text>
        </TouchableOpacity>
      </Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  tag: { fontSize: 14, color: '#5C4F77', textTransform: 'uppercase', letterSpacing: 1.5 },
  headline: { fontSize: 32, color: '#2B2140', textAlign: 'center', lineHeight: 36 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, minHeight: 120 },
  rewardTitle: { fontSize: 20, color: '#2B2140' },
  rewardValue: { fontSize: 18, color: '#A34F00' },
  meta: { fontSize: 14, color: '#5C4F77', marginTop: 10, lineHeight: 20 },
  retry: { color: '#A34F00', fontSize: 16, marginTop: 12 },
  stopBtn: { width: '100%', minHeight: 56, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
});
