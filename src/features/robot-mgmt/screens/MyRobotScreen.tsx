import React from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import RmChip from '../components/RmChip';
import { parentColors, parentRadii, parentShadows } from '@/design-system/tokens';
import { ROUTES } from '@/navigation/routes';
import ConnectorStateNotice from '@/components/ConnectorStateNotice';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { useAppLanguage } from '@/services/i18n/i18n';
import { useRobotTelemetry } from '../telemetry';

type Props = NativeStackScreenProps<RootStackParamList, 'MyRobotScreen'>;

export default function MyRobotScreen({ navigation }: Props) {
  const {
    telemetry,
    loading,
    linkState,
    simulated,
    retry,
  } = useRobotTelemetry();
  const { t } = useAppLanguage();
  const noticeState = simulated ? 'simulated' : linkState;
  const wifiSignal = telemetry.wifiRssi === null
    ? null
    : telemetry.wifiRssi >= -60
      ? t('Strong signal')
      : t('Weak signal');
  const wifiSummary = wifiSignal
    ? `${telemetry.wifiLabel} · ${wifiSignal}`
    : telemetry.wifiLabel;
  const initials = telemetry.robotName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <DeviceShell title="My Robot" onBack={() => navigation.navigate(ROUTES.ParentSummaryScreen)}>
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

      {!loading && noticeState === 'not_connected' ? (
        <Box paddingHorizontal={20} paddingTop={18}>
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.PairAddScreen)}>
            Connect Robot
          </DeviceBigBtn>
        </Box>
      ) : null}

      {!loading && telemetry.deviceId ? (
        <>
          <Box paddingHorizontal={16} paddingTop={12}>
            <Box style={styles.topHeader}>
              <Box flex={1}>
                <Text fontWeight="400" style={styles.greet}>Your robot</Text>
                <Text fontWeight="700" style={styles.greeting}>{telemetry.robotName}</Text>
              </Box>
              <Box style={styles.avatar}>
                <Text i18n={false} style={styles.avatarText}>{initials}</Text>
              </Box>
            </Box>
          </Box>

          <Box paddingHorizontal={16} paddingTop={14}>
            <Box style={styles.heroCard} flexDirection="row" gap={12} alignItems="center">
              <Text style={styles.heroEmoji}>🤖</Text>
              <Box flex={1} style={{ minWidth: 0 }}>
                <Text fontWeight="600" style={styles.robotName}>{telemetry.robotName}</Text>
                <Text i18n={false} style={styles.robotMeta}>{telemetry.serialNumber}</Text>
                <Box marginTop={8}><RmChip>● {telemetry.onlineLabel}</RmChip></Box>
              </Box>
            </Box>
          </Box>

          <Box paddingHorizontal={16} paddingTop={16}>
            <Text fontWeight="700" style={styles.sectionLabel}>Status</Text>
            <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Box style={styles.statCard}>
                <Text fontWeight="700" style={styles.statLabel}>Battery</Text>
                <Text i18n={false} fontWeight="600" style={styles.statValue}>
                  {telemetry.batteryLabel} · {t(telemetry.chargingLabel)}
                </Text>
              </Box>
              <Box style={styles.statCard}>
                <Text fontWeight="700" style={styles.statLabel}>Wi-Fi</Text>
                <Text i18n={false} fontWeight="600" style={styles.statValue}>{wifiSummary}</Text>
              </Box>
            </Box>
          </Box>

          <Box paddingHorizontal={16} paddingTop={18}>
            <Text fontWeight="700" style={styles.sectionLabel}>Care</Text>
            <Box style={styles.rowCard}>
              <DeviceRow icon="🔊" title="Sound & volume" body="Open robot sound controls" onClick={() => navigation.navigate(ROUTES.RobotSoundScreen)} />
              <DeviceRow icon="🎙️" title="Microphone test" body="Check Robot can hear" onClick={() => navigation.navigate(ROUTES.MicTestScreen)} />
              <DeviceRow icon="🔈" title="Speaker test" body="Check Robot can play sound" onClick={() => navigation.navigate(ROUTES.SpeakerTestScreen)} />
              <DeviceRow icon="⬆️" title="Robot software" body={telemetry.firmwareLabel} onClick={() => navigation.navigate(ROUTES.RobotFirmwareScreen)} />
            </Box>
          </Box>
        </>
      ) : null}

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Help</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📡" title="Robot offline help" body="Tips when Robot won't connect" onClick={() => navigation.navigate(ROUTES.OfflineHelpScreen)} />
          <DeviceRow icon="🛟" title="Contact support" body="We usually reply in under a day" onClick={() => navigation.navigate(ROUTES.SupportScreen)} />
          <DeviceRow icon="ℹ️" title="Detailed status" body="Battery, Wi-Fi, and software" onClick={() => navigation.navigate(ROUTES.RobotStatusScreen)} />
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greet: {
    fontSize: 13,
    color: parentColors.ink2,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 24,
    color: parentColors.ink,
    letterSpacing: -0.3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: parentColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroCard: {
    backgroundColor: parentColors.blush,
    borderRadius: parentRadii.hero,
    padding: 14,
    ...parentShadows.card,
  },
  heroEmoji: {
    fontSize: 48,
    flexShrink: 0,
  },
  robotName: {
    fontSize: 18,
    color: parentColors.ink,
    letterSpacing: -0.3,
  },
  robotMeta: {
    fontSize: 12,
    color: parentColors.ink2,
    marginTop: 2,
  },
  statCard: {
    width: '47%',
    backgroundColor: parentColors.card,
    borderWidth: 1,
    borderColor: parentColors.line,
    borderRadius: parentRadii.card,
    padding: 12,
    ...parentShadows.card,
  },
  statLabel: {
    fontSize: 10,
    color: parentColors.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    color: parentColors.ink,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    color: parentColors.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    fontWeight: '700',
  },
  rowCard: {
    backgroundColor: parentColors.card,
    borderWidth: 1,
    borderColor: parentColors.line,
    borderRadius: parentRadii.card,
    paddingVertical: 4,
    paddingHorizontal: 4,
    ...parentShadows.card,
  },
});
