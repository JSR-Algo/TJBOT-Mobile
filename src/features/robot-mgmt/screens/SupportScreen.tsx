import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { RM } from '../components/RM';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportScreen'>;

export default function SupportScreen({ navigation }: Props): React.JSX.Element {
  return (
    <DeviceShell title="Contact support" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      <Box testID="support-honest-outlet" paddingHorizontal={20} paddingTop={20}>
        <Box style={styles.notice}>
          <Text fontWeight="700" style={styles.noticeTitle}>Support options</Text>
          <Text style={styles.noticeBody}>
            In-app support messages are not available yet. Use the help articles while we finish this connection.
          </Text>
        </Box>
      </Box>

      <Box paddingHorizontal={20} paddingTop={18} gap={10}>
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => navigation.navigate(ROUTES.HelpFaqScreen)}
          accessibilityRole="button"
          accessibilityLabel="Open help articles"
        >
          <Text fontWeight="700" style={styles.linkTitle}>Help articles</Text>
          <Text style={styles.linkBody}>Setup, lessons, accounts, and privacy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => navigation.navigate(ROUTES.OfflineHelpScreen)}
          accessibilityRole="button"
          accessibilityLabel="Open robot offline help"
        >
          <Text fontWeight="700" style={styles.linkTitle}>Robot offline help</Text>
          <Text style={styles.linkBody}>Steps to reconnect Robot</Text>
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
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  noticeTitle: { color: RM.ink, fontSize: 16 },
  noticeBody: { color: RM.ink2, fontSize: 13, lineHeight: 20, marginTop: 6 },
  linkCard: {
    backgroundColor: RM.card,
    borderColor: RM.hair,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  linkTitle: { color: RM.ink, fontSize: 15 },
  linkBody: { color: RM.ink2, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
