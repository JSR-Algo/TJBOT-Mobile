import React from 'react';
import { StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
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
import { getDeviceStatus } from '@/services/api/device.api';
import { runSpeakerTest } from '@/services/connectors/robot-control.connector';
import { mapErrorToLinkState, type RobotLinkState } from '@/services/connectors/types';
import { getLocalPairedDeviceId } from '../pairing/localPairedDevice';
type Props = NativeStackScreenProps<RootStackParamList, 'DeviceLostScreen'>;

export default function DeviceLostScreen({ navigation }: Props) {
  const [actionState, setActionState] = React.useState<RobotLinkState | null>(null);
  const [chiming, setChiming] = React.useState(false);
  const localDeviceQuery = useQuery({
    queryKey: ['devices', 'local-paired-id'],
    queryFn: getLocalPairedDeviceId,
  });
  const deviceId = localDeviceQuery.data || 'primary';
  const statusQuery = useQuery({
    queryKey: ['devices', 'paired', deviceId],
    queryFn: () => getDeviceStatus(deviceId),
    enabled: !localDeviceQuery.isLoading,
    retry: false,
  });

  const handleChime = async () => {
    setActionState(null);
    const result = await runSpeakerTest();
    if (result.state === 'ok') {
      setChiming(true);
      return;
    }
    setChiming(false);
    setActionState(result.state);
  };

  if (localDeviceQuery.isLoading || statusQuery.isLoading) {
    return (
      <DeviceShell title="Find Robot" onBack={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>
        <Box paddingHorizontal={20} paddingTop={30}>
          <Box style={styles.loadingCard} alignItems="center" gap={12}>
            <Icon name="Radar" size={32} color={DV.accent} strokeWidth={2.2} />
            <Text fontWeight="700" style={styles.loadingTitle}>Loading Robot...</Text>
            <Text style={styles.sub}>Checking the last known connection.</Text>
          </Box>
        </Box>
      </DeviceShell>
    );
  }

  if (statusQuery.isError) {
    const linkState = mapErrorToLinkState(statusQuery.error);
    return (
      <DeviceShell title="Find Robot" onBack={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>
        {linkState ? (
          <ConnectorStateNotice
            state={linkState}
            onRetry={linkState === 'server_unavailable' || linkState === 'robot_offline'
              ? () => { void statusQuery.refetch(); }
              : undefined}
          />
        ) : (
          <Box paddingHorizontal={24} paddingTop={30} alignItems="center">
            <Text fontWeight="600" style={styles.heading}>Robot status unavailable</Text>
            <Text i18n={false} style={styles.sub}>
              {statusQuery.error instanceof Error ? statusQuery.error.message : String(statusQuery.error)}
            </Text>
          </Box>
        )}
      </DeviceShell>
    );
  }

  const device = statusQuery.data;
  if (!device?.id) {
    return (
      <DeviceShell title="Find Robot" onBack={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>
        <ConnectorStateNotice state="not_connected" />
      </DeviceShell>
    );
  }

  const connection = device.online ? 'Online' : 'Offline';
  const wifi = device.wifiSsid?.trim() || 'Wi-Fi not reported';
  const statusSummary = `${connection} · ${wifi} · ${device.batteryPercent}%`;

  return (
    <DeviceShell title="Find Robot" onBack={() => navigation.navigate(ROUTES.DeviceHomeScreen)}>
      <Box paddingTop={30} paddingHorizontal={24} alignItems="center">
        <RobotImage variant="body" size={180} />
        <Text fontWeight="600" style={styles.heading}>
          {chiming ? 'Robot is chiming!' : "Can't find Robot?"}
        </Text>
        <Text style={styles.sub}>
          {chiming
            ? 'Listen for a soft melody. Robot will keep playing for 30 seconds.'
            : 'Robot will play a gentle melody so you can find it.'}
        </Text>
      </Box>

      <Box paddingHorizontal={16} paddingTop={30}>
        <Box style={styles.infoCard} flexDirection="row" alignItems="center" gap={10}>
          <Box style={[styles.statusIcon, !device.online && styles.statusIconOffline]} alignItems="center" justifyContent="center">
            <Icon
              name={device.online ? 'Wifi' : 'WifiOff'}
              size={18}
              color={device.online ? DV.good : DV.ink3}
              strokeWidth={2.4}
            />
          </Box>
          <Text i18n={false} style={styles.infoText}>{statusSummary}</Text>
        </Box>
      </Box>

      {actionState ? <ConnectorStateNotice state={actionState} /> : null}

      <Box paddingHorizontal={20} paddingTop={30} paddingBottom={30}>
        <DeviceBigBtn onClick={() => { void handleChime(); }}>
          {chiming ? 'Stop chime' : 'Make Robot chime'}
        </DeviceBigBtn>
      </Box>
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, color: DV.ink, textAlign: 'center', marginTop: 24, maxWidth: 280 },
  loadingCard: { backgroundColor: DV.card, borderColor: DV.hair, borderRadius: 24, borderWidth: 1, padding: 24 },
  loadingTitle: { color: DV.ink, fontSize: 18 },
  sub: { fontSize: 14, color: DV.ink2, textAlign: 'center', maxWidth: 300, lineHeight: 22, marginTop: 8 },
  infoCard: { backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair, borderRadius: 18, padding: 14 },
  statusIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#E6F8EF' },
  statusIconOffline: { backgroundColor: '#EEF1F5' },
  infoText: { fontSize: 14, color: DV.ink2 },
});
