import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from '../components/RM';
import { ROUTES } from '@/navigation/routes';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useLeaderboardPreferenceMutation, useLeaderboardQuery } from '@/features/rewards/hooks/useRewards';
import type { OwnedLeaderboardRow } from '@/services/api/leaderboard.api';
import { translateTemplate, useAppLanguage, type AppLocale } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'MyRobotScreen'>;

export default function MyRobotScreen({ navigation }: Props): React.JSX.Element {
  const { activeHousehold } = useHousehold();
  const { t } = useAppLanguage();
  const householdScope = activeHousehold?.id ?? '';
  const leaderboard = useLeaderboardQuery(householdScope, 'weekly', 1, 25);
  const ownedRows = leaderboard.data?.ownedRows ?? [];

  return (
    <DeviceShell title={t('My Robots')} onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
      <Box padding={16} gap={14}>
        <Text style={styles.intro}>Only server-reported robot and reward details appear here. Unavailable device status is never estimated.</Text>
        {leaderboard.isLoading ? <Text accessibilityLiveRegion="polite">Loading owned robots</Text> : null}
        {leaderboard.isError ? <Box gap={8} accessibilityLiveRegion="polite"><Text fontWeight="700">Owned robots unavailable</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Retry owned robots')} accessibilityHint={t('Fetches owned robots and privacy settings again')} onPress={() => { void leaderboard.refetch(); }} style={styles.retry}><Text fontWeight="700">Try again</Text></TouchableOpacity></Box> : null}
        {!leaderboard.isLoading && !leaderboard.isError && ownedRows.length === 0 ? <Text>No owned robots available</Text> : null}
        {ownedRows.map(row => <OwnedRobotCard key={row.robotId} row={row} householdScope={householdScope} />)}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Open leaderboard')} accessibilityHint={t('Shows weekly and all-time robot ranks')} onPress={() => navigation.navigate(ROUTES.LeaderboardScreen)} style={styles.leaderboardLink}><Text fontWeight="700">View leaderboard</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Open detailed robot status')} accessibilityHint={t('Opens the server-backed device status screen')} onPress={() => navigation.navigate(ROUTES.RobotStatusScreen)} style={styles.leaderboardLink}><Text fontWeight="700">Detailed robot status</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Open factory reset')} accessibilityHint={t('Opens the parent-confirmed reset flow without claiming device status')} onPress={() => navigation.navigate(ROUTES.FactoryResetScreen)} style={styles.dangerLink}><Text fontWeight="700" style={styles.dangerText}>Factory reset</Text></TouchableOpacity>
      </Box>
    </DeviceShell>
  );
}

function OwnedRobotCard({ row, householdScope }: { row: OwnedLeaderboardRow; householdScope: string }): React.JSX.Element {
  const { language, t } = useAppLanguage();
  const mutation = useLeaderboardPreferenceMutation(householdScope, row.robotId);
  const status = row.optedIn ? t('Visible on leaderboard') : t('Private robot');
  return (
    <Box style={styles.card} gap={12} accessible accessibilityLabel={ownedRobotLabel(row, language)}>
      <Box flexDirection="row" gap={12} alignItems="center">
        <RobotDevice emotion="happy" size={72} accent="#FF6F61" />
        <Box flex={1}>
          <Text fontWeight="800" style={styles.robotName} i18n={false}>{row.robotName}</Text>
          <Text style={styles.meta} i18n={false}>{row.childName}</Text>
          <Text fontWeight="700" style={styles.status}>{status}</Text>
        </Box>
        <Text fontWeight="800" i18n={false}>{row.xp} XP</Text>
      </Box>
      <Text style={styles.body}>{row.optedIn ? 'Child name, robot name and masked parent email are visible.' : 'Rewards and history stay private even when your robot is hidden.'}</Text>
      <Text style={styles.meta} i18n={false}>{row.completedLessonCount} lessons · {row.currentStreakDays === null ? t('Streak refreshing') : `${row.currentStreakDays} day streak`}</Text>
      <Text style={styles.meta} i18n={false}>{row.parentEmailMasked}</Text>
      <TouchableOpacity accessibilityRole="switch" accessibilityLabel={translateTemplate(row.optedIn ? 'Leave leaderboard for {{robot}}' : 'Join leaderboard for {{robot}}', { robot: row.robotName }, { locale: language })} accessibilityHint={t(row.optedIn ? 'Hides this robot from public rankings while private rewards remain available' : 'Shows this robot with masked parent email in public rankings')} accessibilityState={{ checked: row.optedIn, disabled: mutation.isPending, busy: mutation.isPending }} disabled={mutation.isPending} onPress={() => mutation.mutate(!row.optedIn)} style={[styles.preference, row.optedIn && styles.preferenceOn]}><Text fontWeight="700">{row.optedIn ? 'Leave leaderboard' : 'Join leaderboard'}</Text></TouchableOpacity>
      {mutation.isError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite">Leaderboard preference could not be saved.</Text> : null}
    </Box>
  );
}

function ownedRobotLabel(row: OwnedLeaderboardRow, locale: AppLocale): string {
  const streak = row.currentStreakDays === null ? 'Streak refreshing' : row.currentStreakDays;
  return translateTemplate('{{robot}} for {{child}}. {{visibility}}. {{xp}} XP. {{lessons}} lessons. {{streak}} day streak.', { robot: row.robotName, child: row.childName, visibility: row.optedIn ? 'Visible on leaderboard' : 'Private robot', xp: row.xp, lessons: row.completedLessonCount, streak }, { locale });
}

const styles = StyleSheet.create({ intro: { color: RM.ink2, lineHeight: 20 }, card: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 16, padding: 16 }, robotName: { fontSize: 18, color: RM.ink }, meta: { color: RM.ink2, marginTop: 3 }, status: { color: '#8A3D22', marginTop: 6 }, body: { color: RM.ink2, lineHeight: 19 }, preference: { minHeight: 48, borderRadius: 12, backgroundColor: '#E7E9ED', alignItems: 'center', justifyContent: 'center' }, preferenceOn: { backgroundColor: '#FFE1DC' }, retry: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: RM.hair }, leaderboardLink: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: RM.hair, alignItems: 'center', justifyContent: 'center' }, dangerLink: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#B42318', alignItems: 'center', justifyContent: 'center' }, dangerText: { color: '#B42318' } });
