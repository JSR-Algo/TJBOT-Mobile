import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import RobotImage from '@/components/RobotImage';
import { Icon } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { RM } from '../components/RM';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportScreen'>;

export default function SupportScreen({ navigation }: Props): React.JSX.Element {
  return (
    <DeviceShell title="Contact support" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      <Box testID="support-honest-outlet" paddingHorizontal={20} paddingTop={20}>
        <Box style={styles.notice} flexDirection="row" alignItems="center" gap={16}>
          <Box style={styles.robotStage} alignItems="center" justifyContent="center">
            <RobotImage variant="body" size={92} />
          </Box>
          <Box flex={1}>
            <Text fontWeight="800" style={styles.noticeTitle}>Support options</Text>
            <Text style={styles.noticeBody}>
              In-app support messages are not available yet. Use the help articles while we finish this connection.
            </Text>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={18} gap={10}>
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => navigation.navigate(ROUTES.HelpFaqScreen)}
          accessibilityRole="button"
          accessibilityLabel="Open help articles"
        >
          <Box style={styles.linkIcon} alignItems="center" justifyContent="center">
            <Icon name="BookOpenText" size={21} color={RM.accent} strokeWidth={2.3} />
          </Box>
          <Box flex={1}>
            <Text fontWeight="800" style={styles.linkTitle}>Help articles</Text>
            <Text style={styles.linkBody}>Setup, lessons, accounts, and privacy</Text>
          </Box>
          <Icon name="ChevronRight" size={19} color={RM.ink3} strokeWidth={2.3} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => navigation.navigate(ROUTES.OfflineHelpScreen)}
          accessibilityRole="button"
          accessibilityLabel="Open robot offline help"
        >
          <Box style={styles.linkIcon} alignItems="center" justifyContent="center">
            <Icon name="WifiOff" size={21} color={RM.accent} strokeWidth={2.3} />
          </Box>
          <Box flex={1}>
            <Text fontWeight="800" style={styles.linkTitle}>Robot offline help</Text>
            <Text style={styles.linkBody}>Steps to reconnect Robot</Text>
          </Box>
          <Icon name="ChevronRight" size={19} color={RM.ink3} strokeWidth={2.3} />
        </TouchableOpacity>
      </Box>

      <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30}>
        <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.MyRobotScreen)}>
          Back to My Robot
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: RM.card,
    borderColor: RM.hair,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  robotStage: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#FFF9F0' },
  noticeTitle: { color: RM.ink, fontSize: 17 },
  noticeBody: { color: RM.ink2, fontSize: 13, lineHeight: 20, marginTop: 6 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: RM.card,
    borderColor: RM.hair,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  linkIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#FFE5E5' },
  linkTitle: { color: RM.ink, fontSize: 15 },
  linkBody: { color: RM.ink2, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
