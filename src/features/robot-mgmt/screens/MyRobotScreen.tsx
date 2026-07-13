import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import RmStat from '../components/RmStat';
import RmChip from '../components/RmChip';
import { RM } from '../components/RM';
import { ROUTES } from '@/navigation/routes';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useActiveChildRobotQuery, useLeaderboardPreferenceMutation, useLeaderboardQuery } from '@/features/rewards/hooks/useRewards';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'MyRobotScreen'>;

export default function MyRobotScreen({ navigation }: Props) {
  const { activeChild, activeHousehold } = useHousehold();
  const { language, t } = useAppLanguage();
  const robotQuery = useActiveChildRobotQuery(activeChild?.id);
  const robot = robotQuery.data;
  const leaderboardQuery = useLeaderboardQuery(activeHousehold?.id ?? '', 'weekly', 1, 25);
  const preferenceMutation = useLeaderboardPreferenceMutation(activeHousehold?.id ?? '', robot?.id);
  const ownedRow = leaderboardQuery.data?.ownedRows.find(row => row.robotId === robot?.id);
  const preferenceResolved = Boolean(ownedRow) && !leaderboardQuery.isError;
  const optedIn = ownedRow?.optedIn === true;
  const robotName = robot?.name ?? 'Robot';

  return (
    <DeviceShell title="My Robot" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.heroCard} flexDirection="row" gap={14} alignItems="center">
          <RobotDevice emotion="happy" size={96} accent="#FF6F61" />
          <Box flex={1} style={{ minWidth: 0 }}>
            <Text fontWeight="600" style={styles.pairedLabel}>Paired Robot</Text>
            <Text fontWeight="600" style={styles.robotName} i18n={false}>{robotName}</Text>
            <Text style={styles.robotMeta} i18n={false}>{activeChild?.name ?? 'No child assigned'}</Text>
            <Box marginTop={8}><RmChip>{robot?.online ? '● Online · all good' : '○ Offline'}</RmChip></Box>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={16}>
        <Text fontWeight="700" style={styles.sectionLabel}>Leaderboard</Text>
        <Box style={styles.leaderboardCard} gap={10}>
          {leaderboardQuery.isLoading ? (
            <TouchableOpacity accessibilityRole="switch" accessibilityLabel={t('Leaderboard preference loading')} accessibilityState={{ checked: false, disabled: true, busy: true }} disabled style={styles.preferenceButton}>
              <Text fontWeight="700" style={styles.preferenceText}>Loading leaderboard preference</Text>
            </TouchableOpacity>
          ) : leaderboardQuery.isError ? (
            <Box gap={8}>
              <Text fontWeight="700" style={styles.leaderboardTitle}>Leaderboard preference unavailable</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('Retry leaderboard preference')} accessibilityHint={t('Fetches privacy status from the server')} onPress={() => { void leaderboardQuery.refetch(); }} style={styles.preferenceButton}>
                <Text fontWeight="700" style={styles.preferenceText}>Try again</Text>
              </TouchableOpacity>
            </Box>
          ) : preferenceResolved ? (
            <>
              <Text fontWeight="700" style={styles.leaderboardTitle}>{optedIn ? 'Visible on leaderboard' : 'Private by default'}</Text>
              <Text style={styles.leaderboardBody}>
                {optedIn ? 'Child name, robot name and masked parent email are visible.' : 'Rewards and history stay private even when your robot is hidden.'}
              </Text>
              <TouchableOpacity
                accessibilityRole="switch"
                accessibilityLabel={translateTemplate(optedIn ? 'Leave leaderboard for {{robot}}' : 'Join leaderboard for {{robot}}', { robot: robotName }, { locale: language })}
                accessibilityHint={t(optedIn ? 'Hides this robot from public rankings while private rewards remain available' : 'Shows this robot with masked parent email in public rankings')}
                accessibilityState={{ checked: optedIn, disabled: !robot || preferenceMutation.isPending }}
                disabled={!robot || preferenceMutation.isPending}
                onPress={() => preferenceMutation.mutate(!optedIn)}
                style={[styles.preferenceButton, optedIn && styles.preferenceButtonOn]}
              >
                <Text fontWeight="700" style={styles.preferenceText}>{optedIn ? 'Leave leaderboard' : 'Join leaderboard'}</Text>
              </TouchableOpacity>
              {preferenceMutation.isError ? <Text accessibilityLiveRegion="polite">Leaderboard preference could not be saved.</Text> : null}
            </>
          ) : null}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open leaderboard" onPress={() => navigation.navigate(ROUTES.LeaderboardScreen)}>
            <Text fontWeight="700" style={styles.leaderboardLink}>View leaderboard</Text>
          </TouchableOpacity>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={16}>
        <Text fontWeight="700" style={styles.sectionLabel}>Status</Text>
        <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Box style={{ width: '47%' }}>
            <RmStat icon="🔋" label="Battery" value="78% · charging" status="ok" onClick={() => navigation.navigate(ROUTES.RobotBatteryScreen)} />
          </Box>
          <Box style={{ width: '47%' }}>
            <RmStat icon="📶" label="Wi-Fi" value="Casa-Familia" status="ok" onClick={() => navigation.navigate(ROUTES.RobotWifiScreen)} />
          </Box>
          <Box style={{ width: '47%' }}>
            <RmStat icon="📚" label="Courses" value="3 installed" status="ok" onClick={() => navigation.navigate(ROUTES.RobotStorageScreen)} />
          </Box>
          <Box style={{ width: '47%' }}>
            <RmStat icon="🎙️" label="Microphone" value="Working" status="ok" onClick={() => navigation.navigate(ROUTES.MicTestScreen)} />
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Care</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="🔊" title="Sound & volume" body="Volume 6 · Quiet hours on" onClick={() => navigation.navigate(ROUTES.RobotSoundScreen)} />
          <DeviceRow icon="🎙️" title="Microphone test" body="Check Robot can hear" onClick={() => navigation.navigate(ROUTES.MicTestScreen)} />
          <DeviceRow icon="🔈" title="Speaker test" body="Play a chime to check audio" onClick={() => navigation.navigate(ROUTES.SpeakerTestScreen)} />
          <DeviceRow icon="⬆️" title="Robot software" body="v1.4.2 · update available" onClick={() => navigation.navigate(ROUTES.RobotFirmwareScreen)} />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Help</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📡" title="Robot offline help" body="Tips when Robot won't connect" onClick={() => navigation.navigate(ROUTES.OfflineHelpScreen)} />
          <DeviceRow icon="🛟" title="Contact support" body="We usually reply in under a day" onClick={() => navigation.navigate(ROUTES.SupportScreen)} />
          <DeviceRow icon="ℹ️" title="Detailed status" body="Battery, Wi-Fi, sync, sensors" onClick={() => navigation.navigate(ROUTES.RobotStatusScreen)} />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.rowCard}>
          <DeviceRow danger icon="⚠️" title="Factory reset" body="Erase data and start fresh · parent gate" onClick={() => navigation.navigate(ROUTES.FactoryResetScreen)} />
        </Box>
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 16, padding: 18 },
  pairedLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
  robotName: { fontSize: 18, color: RM.ink, letterSpacing: -0.3, marginTop: 2 },
  robotMeta: { fontSize: 12, color: RM.ink2, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: RM.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 4 },
  leaderboardCard: { backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 14, padding: 16 },
  leaderboardTitle: { fontSize: 16, color: RM.ink },
  leaderboardBody: { fontSize: 13, color: RM.ink2, lineHeight: 19 },
  preferenceButton: { minHeight: 46, borderRadius: 12, backgroundColor: '#E7E9ED', alignItems: 'center', justifyContent: 'center' },
  preferenceButtonOn: { backgroundColor: '#FFE1DC' },
  preferenceText: { color: RM.ink },
  leaderboardLink: { color: '#A84337', textAlign: 'center', padding: 8 },
});
