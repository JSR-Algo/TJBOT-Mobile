import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import ConnectorStateNotice from '@/components/ConnectorStateNotice';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useAppLanguage } from '@/services/i18n/i18n';
import { RM } from '../components/RM';
import { useRobotTelemetry } from '../telemetry';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotWifiScreen'>;

export default function RobotWifiScreen({ navigation }: Props): React.JSX.Element {
  const {
    telemetry,
    loading,
    linkState,
    simulated,
    retry,
  } = useRobotTelemetry();
  const { t } = useAppLanguage();
  const noticeState = simulated ? 'simulated' : linkState;
  const signal = telemetry.wifiRssi === null
    ? null
    : telemetry.wifiRssi >= -60
      ? t('Strong signal')
      : t('Weak signal');

  return (
    <DeviceShell title="Wi-Fi" onBack={() => navigation.navigate(ROUTES.MyRobotScreen)}>
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
        <Box paddingHorizontal={20} paddingTop={24}>
          <Box style={styles.readingCard}>
            <Text fontWeight="600" style={styles.label}>Connected to</Text>
            <Text i18n={false} fontWeight="700" style={styles.ssid}>{telemetry.wifiLabel}</Text>
            {signal ? <Text fontWeight="600" style={styles.signal}>{signal}</Text> : null}
          </Box>
        </Box>
      ) : null}
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  readingCard: {
    backgroundColor: RM.card,
    borderColor: RM.hair,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  label: { color: RM.ink3, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  ssid: { color: RM.ink, fontSize: 22, marginTop: 6 },
  signal: { color: RM.good, fontSize: 13, marginTop: 6 },
});
