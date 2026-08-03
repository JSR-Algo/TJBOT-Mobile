import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotImage } from '@/components/RobotImage';
import ConnectorStateNotice from '@/components/ConnectorStateNotice';
import DeviceShell from '@/components/DeviceShell';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import { Icon } from '@/design-system/icons';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { getLocalPairedDeviceId } from '@/features/device/pairing/localPairedDevice';
import { firmwareUpdateConnector } from '@/services/connectors/firmware-update.connector';
import type { RobotLinkState } from '@/services/connectors/types';
import type { FirmwareVersion } from '@/services/api/device.api';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceFirmwareScreen'>;



export default function DeviceFirmwareScreen({ navigation }: Props) {
  const { t } = useAppLanguage();
  const [deviceId, setDeviceId] = React.useState<string | null | undefined>(undefined);
  const [version, setVersion] = React.useState<FirmwareVersion | null>(null);
  const [linkState, setLinkState] = React.useState<RobotLinkState | null>(null);
  const [retryable, setRetryable] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  const loadVersion = React.useCallback(async () => {
    setActionMessage(null);
    const pairedDeviceId = await getLocalPairedDeviceId();
    setDeviceId(pairedDeviceId);
    if (!pairedDeviceId) {
      setVersion(null);
      setLinkState('not_connected');
      setRetryable(false);
      return;
    }

    const result = await firmwareUpdateConnector.getVersion(pairedDeviceId);
    if (result.state === 'ok') {
      setVersion(result.value);
      setLinkState(null);
      setRetryable(false);
      return;
    }
    setVersion(null);
    setLinkState(result.state);
    setRetryable(result.retryable === true);
  }, []);

  React.useEffect(() => {
    void loadVersion();
  }, [loadVersion]);

  const runAction = async (kind: 'schedule' | 'now') => {
    if (!deviceId) return;
    const result = kind === 'schedule'
      ? await firmwareUpdateConnector.scheduleUpdate(deviceId)
      : await firmwareUpdateConnector.updateNow(deviceId);
    if (result.state === 'ok') {
      setLinkState(null);
      setActionMessage(
        kind === 'schedule'
          ? t('Update scheduled for tonight.')
          : t('Update started. Robot will restart when it finishes.'),
      );
      return;
    }
    setVersion(null);
    setLinkState(result.state);
    setRetryable(result.retryable === true);
  };

  const confirmAction = (kind: 'schedule' | 'now') => {
    const scheduled = kind === 'schedule';
    Alert.alert(
      t(scheduled ? 'Update Robot tonight?' : 'Update Robot now?'),
      t(
        scheduled
          ? 'Robot will update while it is idle tonight. Lessons and settings stay as they are.'
          : 'Robot restarts during the update. Lessons and settings stay as they are. This cannot be undone once started.',
      ),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t(scheduled ? 'Schedule update' : 'Update now'),
          onPress: () => { void runAction(kind); },
        },
      ],
    );
  };

  return (
    <DeviceShell title={t('Software update')} onBack={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>
      {deviceId === undefined ? (
        <Box paddingHorizontal={20} paddingTop={28}>
          <Box style={styles.loadingCard} alignItems="center" gap={12}>
            <Box style={styles.statusIcon} alignItems="center" justifyContent="center">
              <Icon name="RefreshCw" size={28} color={DV.accent} strokeWidth={2.3} />
            </Box>
            <Text fontWeight="700" style={styles.loading}>{t('Checking Robot software')}</Text>
            <Text style={styles.loadingDetail}>{t('Reading the installed and latest safe versions.')}</Text>
          </Box>
        </Box>
      ) : null}

      {deviceId === null ? (
        <>
          <ConnectorStateNotice state="not_connected" />
          <Box paddingHorizontal={20} paddingTop={18} paddingBottom={30}>
            <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.PairAddScreen)}>
              {t('Connect Robot')}
            </DeviceBigBtn>
          </Box>
        </>
      ) : null}

      {deviceId && linkState ? (
        <>
          <ConnectorStateNotice
            state={linkState}
            onRetry={retryable ? () => { void loadVersion(); } : undefined}
          />
          <FirmwareActions onConfirm={confirmAction} t={t} />
        </>
      ) : null}

      {deviceId && version ? (
        <>
          <Box paddingHorizontal={16} paddingTop={24}>
            <Box style={styles.heroCard} flexDirection="row" gap={14} alignItems="center">
              <RobotImage variant="body" size={92} />
              <Box flex={1}>
                <Box flexDirection="row" alignItems="center" gap={6}>
                  <Icon
                    name={version.updateAvailable ? 'Download' : 'CircleCheck'}
                    size={16}
                    color={version.updateAvailable ? DV.warn : DV.good}
                    strokeWidth={2.4}
                  />
                <Text fontWeight="700" style={styles.updateBadge}>
                  {t(version.updateAvailable ? 'Update available' : 'Robot software is current')}
                </Text>
                </Box>
                <Text fontWeight="600" style={styles.versionText}>
                  {version.updateAvailable
                    ? `${version.current} → ${version.latest}`
                    : version.current}
                </Text>
              </Box>
            </Box>
          </Box>
          {version.updateAvailable ? <FirmwareActions onConfirm={confirmAction} t={t} /> : null}
        </>
      ) : null}

      {actionMessage ? (
        <Box paddingHorizontal={24} paddingTop={20}>
          <Text style={styles.success}>{actionMessage}</Text>
        </Box>
      ) : null}
    </DeviceShell>
  );
}

function FirmwareActions({
  onConfirm,
  t,
}: {
  onConfirm: (kind: 'schedule' | 'now') => void;
  t: (copy: string) => string;
}) {
  return (
    <Box paddingHorizontal={20} paddingTop={24} paddingBottom={30} gap={10}>
      <DeviceBigBtn onClick={() => onConfirm('schedule')}>{t('Update tonight (recommended)')}</DeviceBigBtn>
      <DeviceBigBtn secondary onClick={() => onConfirm('now')}>{t('Update now')}</DeviceBigBtn>
    </Box>
  );
}

const styles = StyleSheet.create({
  loadingCard: { backgroundColor: DV.card, borderColor: DV.hair, borderRadius: 24, borderWidth: 1, padding: 24 },
  statusIcon: { width: 62, height: 62, borderRadius: 22, backgroundColor: '#FFE5E5' },
  loading: { fontSize: 18, color: DV.ink, textAlign: 'center' },
  loadingDetail: { fontSize: 13, color: DV.ink2, lineHeight: 20, textAlign: 'center' },
  heroCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 24, padding: 18 },
  updateBadge: { fontSize: 11, color: DV.warn, textTransform: 'uppercase', letterSpacing: 0.6 },
  versionText: { fontSize: 16, color: DV.ink, marginTop: 2 },
  success: { fontSize: 13, color: DV.good, textAlign: 'center', lineHeight: 19 },
});
