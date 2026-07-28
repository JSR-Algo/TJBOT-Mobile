import React from 'react';
import { StyleSheet } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { getDeviceStatus, type DeviceStatus, unpairDevice } from '@/services/api/device.api';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';
import { clearLocalPairedDevice, getLocalPairedDeviceId } from '../pairing/localPairedDevice';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceHomeScreen'>;

const DEVICE_STATUS_SCREEN_TIMEOUT_MS = 8_000;

function getDeviceStatusForScreen(deviceId: string): Promise<DeviceStatus> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<DeviceStatus>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('device status timeout')), DEVICE_STATUS_SCREEN_TIMEOUT_MS);
  });

  return Promise.race([getDeviceStatus(deviceId), timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export default function DeviceHomeScreen({ navigation }: Props) {
  const { language } = useAppLanguage();
  const queryClient = useQueryClient();
  const localDeviceQuery = useQuery({
    queryKey: ['devices', 'local-paired-id'],
    queryFn: getLocalPairedDeviceId,
  });
  const localDeviceId = localDeviceQuery.data;
  const hasLocalDevice = typeof localDeviceId === 'string' && localDeviceId.length > 0;
  const deviceIdForStatus = hasLocalDevice ? localDeviceId : 'primary';
  const deviceQuery = useQuery({
    queryKey: ['devices', 'paired', deviceIdForStatus],
    queryFn: () => getDeviceStatusForScreen(deviceIdForStatus),
    enabled: !localDeviceQuery.isLoading,
    retry: false,
  });
  const unpairMutation = useMutation({
    mutationFn: (deviceId: string) => unpairDevice(deviceId),
    onSuccess: async () => {
      await clearLocalPairedDevice();
      queryClient.setQueryData(['devices', 'local-paired-id'], null);
      queryClient.removeQueries({ queryKey: ['devices', 'paired'] });
    },
  });
  const device = deviceQuery.data;

  if (localDeviceQuery.isLoading || deviceQuery.isLoading) {
    return (
      <DeviceShell title="Devices">
        <Box paddingHorizontal={20} paddingTop={28} gap={14}>
          <Text style={styles.emptyBody}>Loading Robot...</Text>
          <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.PairAddScreen)}>Connect Robot</DeviceBigBtn>
        </Box>
      </DeviceShell>
    );
  }

  if (deviceQuery.isError) {
    return (
      <DeviceShell title="Devices">
        <Box paddingHorizontal={20} paddingTop={28}>
          <Box style={styles.emptyCard} alignItems="center">
            <RobotDevice emotion="sad" size={112} accent="#FF6F61" />
            <Text fontWeight="700" style={styles.emptyTitle}>Robot status unavailable</Text>
            <Text style={styles.emptyBody}>Check your connection and try again.</Text>
            <DeviceBigBtn onClick={() => { void deviceQuery.refetch(); }}>Try again</DeviceBigBtn>
            <DeviceBigBtn secondary onClick={() => navigation.navigate(ROUTES.PairAddScreen)}>Connect Robot</DeviceBigBtn>
          </Box>
        </Box>
      </DeviceShell>
    );
  }

  if (!device?.id) {
    return (
      <DeviceShell title="Devices">
        <Box paddingHorizontal={20} paddingTop={28}>
          <Box style={styles.emptyCard} alignItems="center">
            <RobotDevice emotion="happy" size={124} accent="#FF6F61" />
            <Text fontWeight="700" style={styles.emptyTitle}>No Robot connected</Text>
            <Text style={styles.emptyBody}>Connect Robot to this account before starting lessons.</Text>
            <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.PairAddScreen)}>Connect Robot</DeviceBigBtn>
          </Box>
        </Box>
      </DeviceShell>
    );
  }

  const connectionLabelKey = device.online === null
    ? 'Status unavailable'
    : device.online
      ? 'Online'
      : 'Offline';
  const connectionLabel = translateCopy(connectionLabelKey, { locale: language });
  const connectionColor = device.online === true ? DV.good : DV.ink2;
  const batteryLabel = `${device.batteryPercent}%`;
  const wifiSsid = device.wifiSsid?.trim();
  const wifiLabel = wifiSsid && wifiSsid.length > 0
    ? wifiSsid
    : typeof device.wifiRssi === 'number'
      ? `Wi-Fi ${device.wifiRssi} dBm`
      : translateCopy('Wi-Fi not reported', { locale: language });

  return (
    <DeviceShell title="Devices">
      <Box paddingHorizontal={16} paddingTop={18}>
        <Box style={styles.heroCard} flexDirection="row" gap={16} alignItems="center">
          <RobotDevice emotion="idle" size={108} accent="#FF6F61" />
          <Box flex={1}>
            <Text fontWeight="600" style={[styles.statusText, { color: connectionColor }]} i18n={false}>{connectionLabel}</Text>
            <Text fontWeight="600" style={styles.readyText} i18n={false}>{device.name}</Text>
            <Box flexDirection="row" gap={8} style={{ marginTop: 4 }}>
              <Text style={styles.metaText} i18n={false}>🔋 {batteryLabel}</Text>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText} i18n={false}>{wifiLabel}</Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Today</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="📚" title="Unit 2 · Animals" body="Lesson 4 of 6 · about 4 minutes" onClick={() => navigation.navigate(ROUTES.CourseLibraryScreen)} />
          <DeviceRow icon="🔁" title="3 words to revisit" body="Robot will sneak these in tomorrow" />
          <DeviceRow icon="⭐" title="Yesterday: 1 lesson · 4 min" body="Tap to see what your child practiced" />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Robot</Text>
        <Box style={styles.rowCard}>
          <DeviceRow
            icon="📶"
            title="Change Wi‑Fi"
            body="Double-click the BOOT button to change Wi-Fi without unpairing Robot."
            onClick={() => navigation.navigate(ROUTES.PairSearchScreen, {
              reconnectMode: true,
              reconnectDeviceId: device.id,
              reconnectSerialNumber: device.serialNumber,
            })}
          />
          <DeviceRow icon="🎵" title="Make Robot chime" body="Find Robot if it's misplaced" onClick={() => navigation.navigate(ROUTES.DeviceLostScreen)} />
          <DeviceRow icon="🌙" title="Quiet hours" body="9:00 PM – 7:00 AM" />
          <DeviceRow icon="🔄" title="Sync content" body="Up to date · 2 minutes ago" />
          <DeviceRow icon="⬆️" title="Firmware" body="v1.4.2 · update available" onClick={() => navigation.navigate(ROUTES.DeviceFirmwareScreen)} />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>This Robot</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon="👤" title="Buddy: Panda · Just starting" body="Tap to change avatar or level" />
          <DeviceRow icon="🛡️" title="Safety & privacy" />
          <DeviceRow
            danger
            title="Unpair this Robot"
            body={unpairMutation.isPending ? 'Unpairing...' : 'Return this Robot to setup mode'}
            icon="⚠️"
            onClick={() => {
              if (!unpairMutation.isPending) {
                unpairMutation.mutate(device.id);
              }
            }}
          />
          {unpairMutation.isError ? (
            <Text style={styles.errorText}>Could not unpair Robot. Try again.</Text>
          ) : null}
        </Box>
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  emptyCard: { backgroundColor: DV.card, borderRadius: 18, padding: 22, borderWidth: 1, borderColor: DV.hair, gap: 14 },
  emptyTitle: { fontSize: 22, color: DV.ink, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: DV.ink2, lineHeight: 21, textAlign: 'center' },
  errorText: { fontSize: 13, color: '#C0392B', paddingHorizontal: 14, paddingVertical: 10 },
  heroCard: { backgroundColor: DV.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: DV.hair },
  statusText: { fontSize: 13 },
  readyText: { fontSize: 18, color: DV.ink, marginTop: 2 },
  metaText: { fontSize: 12, color: DV.ink2 },
  sectionLabel: { fontSize: 11, color: DV.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowCard: { backgroundColor: DV.card, borderRadius: 14, borderWidth: 1, borderColor: DV.hair, paddingVertical: 4, paddingHorizontal: 4 },
});
