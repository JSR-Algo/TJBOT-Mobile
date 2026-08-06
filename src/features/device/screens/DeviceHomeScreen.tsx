import React from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/icons';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { referenceColors, referenceImages, referenceRadii, referenceShadow } from '@/design-system/referenceTheme';
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
      <DeviceShell hideHeader screenTestID="robotHubPage">
        <Box paddingHorizontal={20} paddingTop={28} gap={14}>
          <Text fontWeight="800" style={styles.pageTitle}>Robots</Text>
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
      <DeviceShell hideHeader screenTestID="robotHubPage">
        <Box paddingHorizontal={20} paddingTop={28} gap={18}>
          <Text fontWeight="800" style={styles.pageTitle}>Robots</Text>
          <Box style={styles.emptyCard} alignItems="center">
            <Image source={referenceImages.robotBody} style={styles.emptyRobot} resizeMode="contain" accessibilityLabel="Robot" />
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
      <DeviceShell hideHeader screenTestID="robotHubPage">
        <Box paddingHorizontal={20} paddingTop={28} gap={18}>
          <Text fontWeight="800" style={styles.pageTitle}>Robots</Text>
          <Box style={styles.emptyCard} alignItems="center">
            <Image source={referenceImages.robotBody} style={styles.emptyRobot} resizeMode="contain" accessibilityLabel="Robot" />
            <Text fontWeight="700" style={styles.emptyTitle}>No Robot connected</Text>
            <Text style={styles.emptyBody}>Connect Robot to this account before starting lessons.</Text>
            <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.PairAddScreen)}>Connect Robot</DeviceBigBtn>
          </Box>
        </Box>
      </DeviceShell>
    );
  }

  const connectionLabel = translateCopy(device.online ? 'Online' : 'Offline', { locale: language });
  const connectionColor = device.online ? '#1A7F3C' : DV.ink2;
  const connectionBackground = device.online ? '#E6F9EC' : '#F2EEE8';
  const batteryLabel = `${device.batteryPercent}%`;
  const wifiSsid = device.wifiSsid?.trim();
  const wifiLabel = wifiSsid && wifiSsid.length > 0
    ? wifiSsid
    : typeof device.wifiRssi === 'number'
      ? `Wi-Fi ${device.wifiRssi} dBm`
      : translateCopy('Wi-Fi not reported', { locale: language });

  return (
    <DeviceShell hideHeader screenTestID="robotHubPage">
      <Box paddingHorizontal={20} paddingTop={28} gap={22}>
        <Box flexDirection="row" alignItems="center" justifyContent="space-between">
          <Text fontWeight="800" style={styles.pageTitle}>Robots</Text>
          <TouchableOpacity
            accessibilityLabel={t('Add Robot')}
            accessibilityRole="button"
            activeOpacity={0.72}
            onPress={() => navigation.navigate(ROUTES.PairAddScreen)}
            style={styles.addButton}
            testID="addRobotButton"
          >
            <Icon name="Plus" size={17} color={referenceColors.ctaInk} strokeWidth={2.7} />
            <Text fontWeight="700" style={styles.addButtonText}>Add Robot</Text>
          </TouchableOpacity>
        </Box>

        <Box gap={10}>
          <Text fontWeight="700" style={styles.sectionTitle}>Connected Robot</Text>
          <TouchableOpacity
            accessibilityLabel={t('Open Robot detail')}
            accessibilityRole="button"
            activeOpacity={0.76}
            onPress={() => navigation.navigate(ROUTES.DeviceOverviewScreen, { deviceId: device.id })}
            style={styles.heroCard}
            testID="openRobotDetail"
          >
          <Box style={styles.robotWell} alignItems="center" justifyContent="center">
            <Box style={[styles.statusChip, { backgroundColor: connectionBackground }]}>
              <Box style={[styles.statusDot, { backgroundColor: connectionColor }]} />
              <Text fontWeight="700" style={[styles.statusText, { color: connectionColor }]} i18n={false}>{connectionLabel}</Text>
            </Box>
            <Image source={referenceImages.robotBody} style={styles.heroRobot} resizeMode="contain" accessibilityLabel={t('Connected Robot')} />
          </Box>

          <Box style={styles.robotDetails}>
            <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap={12}>
              <Text fontWeight="700" style={styles.robotName} i18n={false} numberOfLines={1}>{device.name}</Text>
              <Box style={styles.chevronButton} alignItems="center" justifyContent="center">
                <Icon name="ChevronRight" size={17} color={DV.ink2} strokeWidth={2.5} />
              </Box>
            </Box>

            <Box flexDirection="row" style={styles.metricsRow}>
              <Box flex={1} style={styles.metric}>
                <Box flexDirection="row" gap={6} alignItems="center">
                  <Icon name="BatteryCharging" size={16} color={referenceColors.secondary} strokeWidth={2.3} testID="robotHubBatteryIcon" />
                  <Text fontWeight="600" style={styles.metricLabel}>Battery</Text>
                </Box>
                <Text fontWeight="700" style={styles.metricValue} i18n={false}>{batteryLabel}</Text>
              </Box>
              <Box style={styles.metricDivider} />
              <Box flex={1} style={styles.metric}>
                <Box flexDirection="row" gap={6} alignItems="center">
                  <Icon name="Wifi" size={16} color={referenceColors.lavender} strokeWidth={2.3} />
                  <Text fontWeight="600" style={styles.metricLabel}>Wi-Fi</Text>
                </Box>
                <Text fontWeight="700" style={styles.metricValue} i18n={false} numberOfLines={1}>{wifiLabel}</Text>
              </Box>
            </Box>
          </Box>
          </TouchableOpacity>
        </Box>

        <Box>
          <Text fontWeight="700" style={styles.sectionLabel}>Manage</Text>
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
      </Box>

      <Box height={30} />
    </DeviceShell>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 29, color: DV.ink },
  emptyCard: { backgroundColor: DV.card, borderRadius: 32, padding: 26, borderWidth: 1, borderColor: DV.hair, gap: 14, ...referenceShadow.card },
  loadingCard: { backgroundColor: DV.card, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: DV.hair, ...referenceShadow.card },
  emptyRobot: { width: 132, height: 214 },
  emptyTitle: { fontSize: 24, color: DV.ink, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: DV.ink2, lineHeight: 21, textAlign: 'center' },
  errorText: { fontSize: 13, color: '#C0392B', paddingHorizontal: 14, paddingVertical: 10 },
  sectionTitle: { fontSize: 13, color: DV.ink2 },
  addButton: { minHeight: 46, borderRadius: 999, paddingHorizontal: 16, backgroundColor: referenceColors.primary, flexDirection: 'row', alignItems: 'center', gap: 7, ...referenceShadow.button },
  addButtonText: { fontSize: 14, color: referenceColors.ctaInk },
  heroCard: { backgroundColor: DV.card, borderRadius: referenceRadii.cardLarge, borderWidth: 1, borderColor: DV.hair, overflow: 'hidden', ...referenceShadow.card },
  robotWell: { height: 230, backgroundColor: referenceColors.primarySoft, overflow: 'hidden' },
  heroRobot: { width: 138, height: 214 },
  statusChip: { position: 'absolute', left: 16, top: 16, zIndex: 1, minHeight: 34, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12 },
  robotDetails: { padding: 18 },
  robotName: { flex: 1, fontSize: 23, color: DV.ink },
  chevronButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: referenceColors.bgWarm },
  metricsRow: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: DV.hair },
  metric: { minWidth: 0, gap: 6 },
  metricDivider: { width: 1, marginHorizontal: 16, backgroundColor: DV.hair },
  metricLabel: { fontSize: 12, color: DV.ink2 },
  metricValue: { fontSize: 14, color: DV.ink },
  sectionLabel: { fontSize: 12, color: DV.ink2, letterSpacing: 0, marginBottom: 10 },
  rowCard: { backgroundColor: DV.card, borderRadius: referenceRadii.card, borderWidth: 1, borderColor: DV.hair, paddingVertical: 6, paddingHorizontal: 6, overflow: 'hidden' },
});
