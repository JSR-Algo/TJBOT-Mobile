import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import ConnectorStateNotice from '@/components/ConnectorStateNotice';
import RobotImage from '@/components/RobotImage';
import { Icon } from '@/design-system/icons';
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
        <Box paddingHorizontal={20} paddingTop={24}>
          <Box style={styles.loadingCard} alignItems="center" gap={12}>
            <Box style={styles.statusIcon} alignItems="center" justifyContent="center">
              <Icon name="Wifi" size={28} color={RM.accent} strokeWidth={2.3} />
            </Box>
            <Text fontWeight="700" style={styles.loadingText}>Loading robot details</Text>
          </Box>
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
          <Box style={styles.readingCard} flexDirection="row" alignItems="center" gap={18}>
            <Box style={styles.robotStage} alignItems="center" justifyContent="center">
              <RobotImage variant="body" size={100} />
            </Box>
            <Box flex={1}>
              <Box flexDirection="row" alignItems="center" gap={7}>
                <Icon name="Wifi" size={18} color={RM.good} strokeWidth={2.4} />
                <Text fontWeight="800" style={styles.label}>Connected to</Text>
              </Box>
              <Text i18n={false} fontWeight="800" style={styles.ssid}>{telemetry.wifiLabel}</Text>
              {signal ? <Text fontWeight="700" style={styles.signal}>{signal}</Text> : null}
            </Box>
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
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  loadingCard: {
    backgroundColor: RM.card,
    borderColor: RM.hair,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  statusIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#FFE5E5' },
  loadingText: { color: RM.ink, fontSize: 17 },
  robotStage: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#FFF9F0' },
  label: { color: RM.good, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  ssid: { color: RM.ink, fontSize: 21, marginTop: 7 },
  signal: { color: RM.ink2, fontSize: 13, marginTop: 5 },
});
