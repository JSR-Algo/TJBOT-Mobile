import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import ConnectorStateNotice from '@/components/ConnectorStateNotice';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { RM } from '../components/RM';
import { useRobotTelemetry } from '../telemetry';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotBatteryScreen'>;

export default function RobotBatteryScreen({ navigation }: Props): React.JSX.Element {
  const {
    telemetry,
    loading,
    linkState,
    simulated,
    retry,
  } = useRobotTelemetry();
  const noticeState = simulated ? 'simulated' : linkState;

  return (
    <DeviceShell title="Battery" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
      {loading ? (
        <Box paddingHorizontal={24} paddingTop={24}>
          <Text>Loading robot details</Text>
        </Box>
      ) : null}
      {!loading && noticeState ? (
        <ConnectorStateNotice
          state={noticeState}
          onRetry={noticeState === 'server_unavailable' || noticeState === 'robot_offline' ? retry : undefined}
        />
      ) : null}
      {!loading && telemetry.deviceId ? (
        <Box paddingHorizontal={20} paddingTop={24} alignItems="center">
          <Box style={styles.readingCard} alignItems="center">
            <Text i18n={false} fontWeight="700" style={styles.batteryValue}>
              {telemetry.batteryLabel}
            </Text>
            <Text fontWeight="600" style={styles.batteryState}>
              {telemetry.chargingLabel}
            </Text>
            <Text i18n={false} style={styles.robotName}>{telemetry.robotName}</Text>
          </Box>
        </Box>
      ) : null}
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  readingCard: {
    width: '100%',
    backgroundColor: RM.card,
    borderColor: RM.hair,
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
  },
  batteryValue: { color: RM.ink, fontSize: 42, lineHeight: 50 },
  batteryState: { color: RM.ink2, fontSize: 14, marginTop: 4 },
  robotName: { color: RM.ink3, fontSize: 12, marginTop: 12 },
});
