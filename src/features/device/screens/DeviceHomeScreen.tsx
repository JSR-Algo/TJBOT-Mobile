import React from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import DeviceShell from '@/components/DeviceShell';
import DeviceRow from '@/components/DeviceRow';
import { Reveal, StatusPulse } from '@/design-system/animations';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/icons';
import { DV } from '@/components/Device-tokens';
import { ROUTES } from '@/navigation/routes';
import { referenceColors, referenceImages, referenceRadii, referenceShadow } from '@/design-system/referenceTheme';
import { getDeviceStatus, type DeviceStatus, unpairDevice } from '@/services/api/device.api';
import { localeDateTag, translateCopy, useAppLanguage } from '@/services/i18n/i18n';
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
  const lastSeenDate = device.lastSeenAt ? new Date(device.lastSeenAt) : null;
  const lastSeenLabel = lastSeenDate && !Number.isNaN(lastSeenDate.getTime())
    ? lastSeenDate.toLocaleString(localeDateTag(language), {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : t('Not reported');

  return (
    <DeviceShell hideHeader screenTestID="robotHubPage">
      <Box paddingHorizontal={20} paddingTop={28} gap={24}>
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

        <Box gap={14}>
          <Reveal index={0} testID="robotHeroReveal">
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
                <StatusPulse
                  active={device.online === true}
                  color={connectionColor}
                  size={9}
                  testID="robotOnlinePulse"
                />
                <Text fontWeight="700" style={[styles.statusText, { color: connectionColor }]} i18n={false}>{connectionLabel}</Text>
              </Box>
              <Text i18n={false} fontWeight="800" numberOfLines={1} style={styles.heroName}>{device.name}</Text>
              <Text i18n={false} fontWeight="700" numberOfLines={1} style={styles.heroConnection}>{batteryLabel} · {wifiLabel}</Text>
              <Image source={referenceImages.robotBody} style={styles.heroRobot} resizeMode="contain" accessibilityLabel={t('Connected Robot')} />
            </Box>
            </TouchableOpacity>
          </Reveal>

          <Reveal index={1} testID="robotMetricsReveal">
            <Box gap={12}>
              <Box flexDirection="row" gap={12}>
                <Box flex={1} style={[styles.metricCard, styles.batteryCard]}>
                  <Icon name="BatteryCharging" size={20} color="#167A52" strokeWidth={2.5} testID="robotHubBatteryIcon" />
                  <Text fontWeight="800" style={styles.metricEyebrow}>Battery</Text>
                  <Text i18n={false} fontWeight="800" style={styles.metricLarge}>{batteryLabel}</Text>
                </Box>
                <Box flex={1} style={[styles.metricCard, styles.wifiCard]}>
                  <Icon name="Wifi" size={20} color="#6752A8" strokeWidth={2.5} />
                  <Text fontWeight="800" style={styles.metricEyebrow}>Wi-Fi</Text>
                  <Text i18n={false} fontWeight="800" numberOfLines={1} style={styles.metricLargeSmall}>{wifiLabel}</Text>
                </Box>
              </Box>

              <Box style={styles.lastSeenCard} flexDirection="row" alignItems="center" gap={10}>
                <Icon name="Clock3" size={18} color={DV.ink2} strokeWidth={2.4} />
                <Text fontWeight="700" style={styles.lastSeenTitle}>Last seen</Text>
                <Text i18n={false} numberOfLines={1} style={styles.lastSeenValue}>{lastSeenLabel}</Text>
              </Box>
            </Box>
          </Reveal>
        </Box>

        <Reveal index={2} testID="robotLearningReveal">
        <Box>
          <Text fontWeight="800" style={styles.sectionLabel}>Learning</Text>
          <TouchableOpacity
            accessibilityLabel={t('Review learning progress')}
            accessibilityRole="button"
            activeOpacity={0.78}
            onPress={() => navigation.navigate(ROUTES.TodayProgressScreen)}
            style={styles.progressCard}
            testID="robotProgressCard"
          >
            <Box flex={1} gap={4}>
              <Text fontWeight="800" style={styles.progressEyebrow}>Progress</Text>
              <Text fontWeight="800" style={styles.progressTitle}>Review learning progress</Text>
              <Text style={styles.progressCopy}>See completed lessons, practiced words, and what needs review.</Text>
            </Box>
            <Box style={styles.progressArrow} alignItems="center" justifyContent="center">
              <Icon name="ArrowRight" size={18} color="#FFFFFF" strokeWidth={2.8} />
            </Box>
          </TouchableOpacity>
        </Box>
        </Reveal>

        <Reveal index={3} testID="robotControlsReveal">
        <Box>
          <Text fontWeight="800" style={styles.sectionLabel}>Controls</Text>
          <Box style={styles.rowCard}>
            <DeviceRow
              title="Find Robot"
              body="Make Robot ring when it is nearby"
              icon={<Icon name="Volume2" size={20} color={referenceColors.secondary} strokeWidth={2.3} />}
              onClick={() => navigation.navigate(ROUTES.DeviceLostScreen)}
            />
            <DeviceRow
              title="Robot settings"
              body="Status, firmware, Wi-Fi, and recovery"
              icon={<Icon name="Settings" size={20} color={referenceColors.secondary} strokeWidth={2.3} />}
              onClick={() => navigation.navigate(ROUTES.DeviceOverviewScreen, { deviceId: device.id })}
            />
          </Box>
        </Box>
        </Reveal>

        <Box>
          <Text fontWeight="800" style={styles.sectionLabel}>Manage</Text>
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
  addButton: { minHeight: 46, borderRadius: 999, paddingHorizontal: 16, backgroundColor: referenceColors.primary, flexDirection: 'row', alignItems: 'center', gap: 7, ...referenceShadow.button },
  addButtonText: { fontSize: 14, color: referenceColors.ctaInk },
  heroCard: { backgroundColor: DV.card, borderRadius: referenceRadii.cardLarge, borderWidth: 1, borderColor: DV.hair, overflow: 'hidden', ...referenceShadow.card },
  robotWell: { height: 330, backgroundColor: referenceColors.primarySoft, overflow: 'hidden', paddingTop: 74 },
  heroRobot: { width: 150, height: 230, marginTop: 6 },
  heroName: { position: 'absolute', top: 42, left: 70, right: 18, textAlign: 'center', fontSize: 25, color: DV.ink },
  heroConnection: { position: 'absolute', top: 75, left: 76, right: 22, textAlign: 'center', fontSize: 12, color: DV.ink2 },
  statusChip: { position: 'absolute', left: 16, top: 16, zIndex: 1, minHeight: 34, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12 },
  metricCard: { minHeight: 132, borderRadius: 24, padding: 17, gap: 7, ...referenceShadow.card },
  batteryCard: { backgroundColor: '#DCF6E9' },
  wifiCard: { backgroundColor: '#EEE8FF' },
  metricEyebrow: { fontSize: 11, color: DV.ink2, textTransform: 'uppercase', letterSpacing: 0.7 },
  metricLarge: { fontSize: 30, color: DV.ink },
  metricLargeSmall: { fontSize: 17, color: DV.ink },
  lastSeenCard: { minHeight: 52, borderRadius: 18, paddingHorizontal: 16, backgroundColor: DV.card, borderWidth: 1, borderColor: DV.hair },
  lastSeenTitle: { fontSize: 13, color: DV.ink },
  lastSeenValue: { flex: 1, textAlign: 'right', fontSize: 12, color: DV.ink2 },
  sectionLabel: { fontSize: 12, color: DV.ink2, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 10 },
  progressCard: { minHeight: 156, borderRadius: 28, padding: 20, backgroundColor: referenceColors.primary, flexDirection: 'row', alignItems: 'center', gap: 14, ...referenceShadow.button },
  progressEyebrow: { fontSize: 11, color: '#FFE8E3', textTransform: 'uppercase', letterSpacing: 0.8 },
  progressTitle: { fontSize: 22, lineHeight: 27, color: '#FFFFFF' },
  progressCopy: { fontSize: 13, lineHeight: 19, color: '#FFF5F2' },
  progressArrow: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)' },
  rowCard: { backgroundColor: DV.card, borderRadius: referenceRadii.card, borderWidth: 1, borderColor: DV.hair, paddingVertical: 6, paddingHorizontal: 6, overflow: 'hidden' },
});
