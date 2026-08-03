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
import { referenceImages, referenceRadii, referenceShadow } from '@/design-system/referenceTheme';
import { getDeviceStatus, type DeviceStatus, unpairDevice } from '@/services/api/device.api';
import { translateCopy, translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
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

function RobotPageTitle({ deviceName, label }: { deviceName?: string; label?: string }) {
  return (
    <Box paddingHorizontal={20} paddingTop={16} paddingBottom={12} testID="robotHubBreadcrumb">
      {deviceName ? (
        <Box flexDirection="row" alignItems="center" gap={4}>
          <Text fontWeight="700" i18n={false} style={styles.eyebrow}>{label} ·</Text>
          <Text fontWeight="700" i18n={false} style={styles.eyebrow}>{deviceName}</Text>
        </Box>
      ) : null}
      <Text fontWeight="800" style={styles.pageTitle}>Robot</Text>
    </Box>
  );
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
        <RobotPageTitle />
        <Box paddingHorizontal={20} paddingTop={12} gap={14}>
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
        <RobotPageTitle />
        <Box paddingHorizontal={20} paddingTop={12}>
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
      <DeviceShell hideHeader screenTestID="robotHubPage">
        <RobotPageTitle />
        <Box paddingHorizontal={20} paddingTop={12}>
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

  const connectionLabel = translateCopy(device.online ? 'Online · idle' : 'Offline', { locale: language });
  const connectionColor = device.online ? DV.good : DV.ink2;
  const batteryLabel = `${device.batteryPercent}%`;
  const wifiSsid = device.wifiSsid?.trim();
  const wifiLabel = wifiSsid && wifiSsid.length > 0
    ? wifiSsid
    : typeof device.wifiRssi === 'number'
      ? `Wi-Fi ${device.wifiRssi} dBm`
      : translateCopy('Wi-Fi not reported', { locale: language });

  return (
    <DeviceShell hideHeader screenTestID="robotHubPage">
      <RobotPageTitle deviceName={device.name} label={t('TeeBot')} />
      <Box paddingHorizontal={16} paddingTop={4}>
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
              <Image source={referenceImages.robotBody} style={styles.heroRobot} resizeMode="contain" accessibilityLabel={t('Connected Robot')} />
            </Box>
            <Box flex={1}>
              <Text fontWeight="600" style={[styles.statusText, { color: connectionColor }]} i18n={false}>{connectionLabel}</Text>
              <Text fontWeight="700" style={styles.readyText}>Ready for today</Text>
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
        <Text fontWeight="700" style={styles.sectionLabel}>Today</Text>
        <Box style={styles.rowCard}>
          <DeviceRow
            icon={<Icon name="BookOpenText" size={20} color={DV.ink2} strokeWidth={2.3} testID="robotHubTodayLessonIcon" />}
            title="Unit 2 · Animals"
            body={translateTemplate('{{minutes}} min · {{words}} words', { minutes: 7, words: 6 }, { locale: language })}
            onClick={() => navigation.navigate(ROUTES.CourseLibraryScreen)}
          />
          <DeviceRow
            icon={<Icon name="Sparkles" size={20} color={DV.ink2} strokeWidth={2.3} testID="robotHubReviewIcon" />}
            title="3 words to revisit"
            body="words ready to review"
            onClick={() => navigation.navigate(ROUTES.TodayProgressScreen)}
          />
          <DeviceRow
            icon={<Icon name="CircleCheck" size={20} color={DV.ink2} strokeWidth={2.3} testID="robotHubHistoryIcon" />}
            title="Yesterday: 1 lesson · 4 min"
            body="lesson report"
            onClick={() => navigation.navigate(ROUTES.ParentHistoryScreen)}
          />
        </Box>
      </Box>

      <Box paddingHorizontal={16} paddingTop={18}>
        <Text fontWeight="700" style={styles.sectionLabel}>Robot</Text>
        <Box style={styles.rowCard}>
          <DeviceRow
            icon={<Icon name="Volume2" size={20} color={DV.ink2} strokeWidth={2.3} testID="robotHubChimeIcon" />}
            title="Make Robot chime"
            body="Find Robot if it's misplaced"
            onClick={() => navigation.navigate(ROUTES.DeviceLostScreen)}
          />
          <DeviceRow
            icon={<Icon name="Clock3" size={20} color={DV.ink2} strokeWidth={2.3} testID="robotHubQuietHoursIcon" />}
            title="Quiet hours"
            body="9:00 PM – 7:00 AM"
            onClick={() => navigation.navigate(ROUTES.ParentSafetyScreen)}
          />
          <DeviceRow
            icon={<Icon name="Plus" size={20} color={DV.ink2} strokeWidth={2.3} testID="robotHubPairIcon" />}
            title="Pair another Robot"
            body="Open the guided five-step setup"
            onClick={() => navigation.navigate(ROUTES.PairAddScreen)}
          />
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
  eyebrow: { color: DV.accent, fontSize: 11, letterSpacing: 0.7, marginBottom: 4, textTransform: 'uppercase' },
  pageTitle: { color: DV.ink, fontSize: 30, lineHeight: 35 },
  emptyCard: { backgroundColor: DV.card, borderRadius: 32, padding: 26, borderWidth: 1, borderColor: DV.hair, gap: 14, ...referenceShadow.card },
  loadingCard: { backgroundColor: DV.card, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: DV.hair, ...referenceShadow.card },
  emptyRobot: { width: 150, height: 150 },
  emptyTitle: { fontSize: 24, color: DV.ink, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: DV.ink2, lineHeight: 21, textAlign: 'center' },
  errorText: { fontSize: 13, color: '#C0392B', paddingHorizontal: 14, paddingVertical: 10 },
  heroCard: { backgroundColor: DV.card, borderRadius: 28, padding: 18, borderWidth: 1, borderColor: DV.hair, ...referenceShadow.card },
  robotWell: { width: 104, height: 104, borderRadius: 28, backgroundColor: '#FFF7F2', overflow: 'hidden' },
  heroRobot: { width: 96, height: 96 },
  statusText: { fontSize: 13, backgroundColor: '#DFF7EA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start', overflow: 'hidden' },
  readyText: { fontSize: 20, color: DV.ink, marginTop: 8 },
  metaText: { fontSize: 12, color: DV.ink2 },
  sectionLabel: { fontSize: 16, color: DV.ink, letterSpacing: 0, marginBottom: 10 },
  rowCard: { backgroundColor: DV.card, borderRadius: referenceRadii.cardLarge, borderWidth: 1, borderColor: DV.hair, paddingVertical: 6, paddingHorizontal: 6, ...referenceShadow.card },
});
