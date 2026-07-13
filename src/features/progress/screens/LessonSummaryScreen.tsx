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
import { useRewardInboxQuery } from '@/features/rewards/hooks/useRewards';
import { useHousehold } from '@/contexts/HouseholdContext';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonSummaryScreen'>;

export default function LessonSummaryScreen({ navigation, route }: Props): React.JSX.Element {
  const { activeHousehold } = useHousehold();
  const inbox = useRewardInboxQuery(activeHousehold?.id ?? '');
  const assignmentId = route.params?.assignmentId;
  const sessionId = route.params?.sessionId;
  const reward = assignmentId
    ? inbox.data?.rewards.find(item => item.assignmentId === assignmentId && (!sessionId || item.sessionId === sessionId))
    : undefined;
  return (
    <PageScroll bg="#C5F1DD">
      <Box paddingHorizontal={24} paddingTop={80} paddingBottom={14} alignItems="center" gap={8}><Text fontWeight="600" style={styles.tag}>LESSON DONE</Text><Text fontWeight="800" style={styles.headline}>Great effort!</Text><Robot emotion="success" size={200} accent="#FFC857" /></Box>
      <Box paddingHorizontal={24} paddingBottom={14}><Box style={styles.summaryCard} accessibilityLiveRegion="polite">
        {reward ? <><Text fontWeight="800" style={styles.rewardTitle} i18n={false}>{reward.child.displayName ?? '—'} · {reward.robot.displayName ?? '—'}</Text><Text fontWeight="800" style={styles.rewardValue} i18n={false}>{reward.xp} XP · {reward.coins} coins</Text></> : inbox.isError ? <><Text fontWeight="700" style={styles.rewardTitle}>Reward unavailable</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry reward" accessibilityHint="Fetches the persisted reward inbox again" onPress={() => { void inbox.refetch(); }}><Text style={styles.retry}>Try again</Text></TouchableOpacity></> : <><Text fontWeight="700" style={styles.rewardTitle}>Reward is waiting to sync</Text><Text style={styles.meta}>Your lesson is saved. We will show the award when the robot reconnects.</Text></>}
      </Box></Box>
      <Box paddingHorizontal={24} paddingTop={8} paddingBottom={28} gap={10}>{reward ? <PrimaryCTA onPress={() => navigation.navigate(ROUTES.CelebrationScreen, { rewardId: reward.rewardId, childId: reward.child.id, deviceId: reward.robot.id, assignmentId: reward.assignmentId, sessionId: reward.sessionId })} color="#C34C3F">Celebrate reward</PrimaryCTA> : null}<PrimaryCTA onPress={() => navigation.replace(ROUTES.SendToRobotScreen)} color="#C34C3F">Keep going</PrimaryCTA><TouchableOpacity accessibilityRole="button" accessibilityLabel="Stop for today" accessibilityHint="Returns to the robot home" onPress={() => navigation.replace(ROUTES.HomeHubScreen)} style={styles.stopBtn}><Text fontWeight="700" style={styles.stopText}>Stop for today</Text></TouchableOpacity></Box>
    </PageScroll>
  );
}

const styles = StyleSheet.create({ tag: { fontSize: 14, color: '#5C4F77', textTransform: 'uppercase', letterSpacing: 1.5 }, headline: { fontSize: 32, color: '#2B2140', textAlign: 'center', lineHeight: 36 }, summaryCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, minHeight: 120 }, rewardTitle: { fontSize: 20, color: '#2B2140' }, rewardValue: { fontSize: 18, color: '#8A321F', marginTop: 12 }, meta: { fontSize: 14, color: '#5C4F77', marginTop: 10, lineHeight: 20 }, retry: { color: '#8A321F', fontSize: 16, marginTop: 12 }, stopBtn: { width: '100%', minHeight: 56, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' }, stopText: { fontSize: 18, color: '#5C4F77' } });
