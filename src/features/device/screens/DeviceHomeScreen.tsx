import React from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import FlowBreadcrumb from '@/components/FlowBreadcrumb';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/icons';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { referenceImages, referenceRadii, referenceShadow } from '@/design-system/referenceTheme';
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
  const { language, t } = useAppLanguage();
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
      <DeviceShell title="Robot" screenTestID="robotHubPage">
        <Box paddingHorizontal={20} paddingTop={28} gap={14}>
          <FlowBreadcrumb currentIndex={0} steps={['Robot hub', 'Robot detail', 'Pairing setup']} testID="robotHubBreadcrumb" />
          <Box style={styles.loadingCard} alignItems="center" gap={12}>
            <ActivityIndicator color={DV.accent} />
            <Text fontWeight="700" style={styles.emptyTitle}>Loading Robot...</Text>
            <Text style={styles.emptyBody}>Checking this account for a connected TeeBot.</Text>
            <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.PairAddScreen)}>Connect Robot</DeviceBigBtn>
          </Box>
        </Box>
      </DeviceShell>
    );
  }

  if (deviceQuery.isError) {
    return (
      <DeviceShell title="Robot" screenTestID="robotHubPage">
        <Box paddingHorizontal={20} paddingTop={28}>
          <FlowBreadcrumb currentIndex={0} steps={['Robot hub', 'Robot detail', 'Pairing setup']} testID="robotHubBreadcrumb" />
          <Box style={styles.emptyCard} alignItems="center">
            <Image source={referenceImages.robotHead} style={styles.emptyRobot} resizeMode="contain" accessibilityLabel="Robot" />
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
      <DeviceShell title="Robot" screenTestID="robotHubPage">
        <Box paddingHorizontal={20} paddingTop={28}>
          <FlowBreadcrumb currentIndex={0} steps={['Robot hub', 'Robot detail', 'Pairing setup']} testID="robotHubBreadcrumb" />
          <Box style={styles.emptyCard} alignItems="center">
            <Image source={referenceImages.robotHead} style={styles.emptyRobot} resizeMode="contain" accessibilityLabel="Robot" />
            <Text fontWeight="700" style={styles.emptyTitle}>No Robot connected</Text>
            <Text style={styles.emptyBody}>Connect Robot to this account before starting lessons.</Text>
            <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.PairAddScreen)}>Connect Robot</DeviceBigBtn>
          </Box>
        </Box>
      </DeviceShell>
    );
  }

  const connectionLabel = translateCopy(device.online ? 'Online' : 'Offline', { locale: language });
  const connectionColor = device.online ? DV.good : DV.ink2;
  const batteryLabel = `${device.batteryPercent}%`;
  const wifiSsid = device.wifiSsid?.trim();
  const wifiLabel = wifiSsid && wifiSsid.length > 0
    ? wifiSsid
    : typeof device.wifiRssi === 'number'
      ? `Wi-Fi ${device.wifiRssi} dBm`
      : translateCopy('Wi-Fi not reported', { locale: language });

  return (
    <DeviceShell title="Robot" screenTestID="robotHubPage">
      <Box paddingHorizontal={20} paddingTop={2}>
        <FlowBreadcrumb currentIndex={0} steps={['Robot hub', 'Robot detail', 'Pairing setup']} testID="robotHubBreadcrumb" />
      </Box>
      <Box paddingHorizontal={16} paddingTop={18}>
        <TouchableOpacity
          accessibilityLabel={t('Open Robot detail')}
          accessibilityRole="button"
          activeOpacity={0.76}
          onPress={() => navigation.navigate(ROUTES.DeviceOverviewScreen, { deviceId: device.id })}
          style={styles.heroCard}
          testID="openRobotDetail"
        >
          <Box flexDirection="row" gap={16} alignItems="center">
            <Box style={styles.robotWell} alignItems="center" justifyContent="center">
              <Image source={referenceImages.robotHead} style={styles.heroRobot} resizeMode="contain" accessibilityLabel={t('Connected Robot')} />
            </Box>
            <Box flex={1}>
              <Text fontWeight="600" style={[styles.statusText, { color: connectionColor }]} i18n={false}>{connectionLabel}</Text>
              <Text fontWeight="600" style={styles.readyText} i18n={false}>{device.name}</Text>
              <Box flexDirection="row" gap={8} style={{ marginTop: 4 }}>
                <Box flexDirection="row" gap={3} alignItems="center">
                  <Icon name="BatteryCharging" size={14} color={DV.ink2} strokeWidth={2.3} testID="robotHubBatteryIcon" />
                  <Text style={styles.metaText} i18n={false}>{batteryLabel}</Text>
                </Box>
                <Text style={styles.metaText}>•</Text>
                <Text style={styles.metaText} i18n={false}>{wifiLabel}</Text>
              </Box>
            </Box>
          </Box>
        </TouchableOpacity>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Next step</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon={<Icon name="Bot" size={20} color={DV.ink2} strokeWidth={2.3} testID="robotHubOpenDetailIcon" />} title="Open Robot detail" body="Battery, Wi-Fi, readiness, and safe controls" onClick={() => navigation.navigate(ROUTES.DeviceOverviewScreen, { deviceId: device.id })} />
          <DeviceRow icon={<Icon name="BookOpen" size={20} color={DV.ink2} strokeWidth={2.3} testID="robotHubChooseLessonIcon" />} title="Choose a lesson" body="Review a published lesson before sending" onClick={() => navigation.navigate(ROUTES.CourseLibraryScreen)} />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Setup</Text>
        <Box style={styles.rowCard}>
          <DeviceRow icon={<Icon name="Plus" size={20} color={DV.ink2} strokeWidth={2.3} testID="robotHubPairIcon" />} title="Pair another Robot" body="Open the guided five-step setup" onClick={() => navigation.navigate(ROUTES.PairAddScreen)} />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>This Robot</Text>
        <Box style={styles.rowCard}>
          <DeviceRow
            danger
            title="Unpair this Robot"
            body={unpairMutation.isPending ? 'Unpairing...' : 'Return this Robot to setup mode'}
            icon={<Icon name="TriangleAlert" size={20} color="#C0392B" strokeWidth={2.3} testID="robotHubUnpairIcon" />}
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
  emptyCard: { backgroundColor: DV.card, borderRadius: 32, padding: 26, borderWidth: 1, borderColor: DV.hair, gap: 14, ...referenceShadow.card },
  loadingCard: { backgroundColor: DV.card, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: DV.hair, ...referenceShadow.card },
  emptyRobot: { width: 150, height: 150 },
  emptyTitle: { fontSize: 24, color: DV.ink, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: DV.ink2, lineHeight: 21, textAlign: 'center' },
  errorText: { fontSize: 13, color: '#C0392B', paddingHorizontal: 14, paddingVertical: 10 },
  heroCard: { backgroundColor: DV.card, borderRadius: 32, padding: 20, borderWidth: 1, borderColor: DV.hair, ...referenceShadow.card },
  robotWell: { width: 116, height: 116, borderRadius: 30, backgroundColor: '#FFF7F2', overflow: 'hidden' },
  heroRobot: { width: 108, height: 108 },
  statusText: { fontSize: 13, backgroundColor: '#DFF7EA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start', overflow: 'hidden' },
  readyText: { fontSize: 20, color: DV.ink, marginTop: 8 },
  metaText: { fontSize: 12, color: DV.ink2 },
  sectionLabel: { fontSize: 12, color: DV.ink2, letterSpacing: 0, marginBottom: 10 },
  rowCard: { backgroundColor: DV.card, borderRadius: referenceRadii.cardLarge, borderWidth: 1, borderColor: DV.hair, paddingVertical: 6, paddingHorizontal: 6, ...referenceShadow.card },
});
