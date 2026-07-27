import React from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  BatteryCharging,
  ChevronRight,
  CloudDownload,
  LocateFixed,
  Radio,
  RotateCcw,
  Wifi,
} from 'lucide-react-native';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import DeviceBigBtn from '@/components/DeviceBigBtn';
import ConnectorStateNotice from '@/components/ConnectorStateNotice';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceImages, referenceRadii, referenceShadow } from '@/design-system/referenceTheme';
import { fetchRobotStatus, type RobotStatusSnapshot } from '@/services/connectors/robot-status.connector';
import type { ConnectorResult } from '@/services/connectors/types';
import { useAppLanguage } from '@/services/i18n/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceOverviewScreen'>;
type IconComponent = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

type DeviceRowProps = {
  icon: IconComponent;
  label: string;
  value?: string;
  tone?: 'coral' | 'teal' | 'gold' | 'neutral';
  onPress: () => void;
  testID?: string;
};

export default function DeviceOverviewScreen({ navigation, route }: Props) {
  const { t } = useAppLanguage();
  const [statusResult, setStatusResult] = React.useState<ConnectorResult<RobotStatusSnapshot> | null>(null);
  const [error, setError] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    setError(false);
    try {
      setStatusResult(await fetchRobotStatus());
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const snapshot = statusResult?.state === 'ok' ? statusResult.value : null;
  const device = snapshot?.device;
  const deviceId = route.params?.deviceId ?? device?.id;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} testID="deviceOverviewScroll">
      <Box paddingHorizontal={24} style={styles.header}>
        <Text i18n={false} fontWeight="800" style={styles.screenTitle}>
          {device ? `Robot • ${device.serialNumber ?? shortDeviceId(device.id)}` : t('Robot')}
        </Text>
      </Box>

      {!statusResult && !error ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={referenceColors.primary} />
        </View>
      ) : null}

      {device ? (
        <>
          <Box paddingHorizontal={20}>
            <View style={styles.robotCard}>
              <View style={styles.robotImageWrap}>
                <Image
                  source={referenceImages.robotHead}
                  style={styles.robotImage}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              </View>
              <View style={styles.robotCopy}>
                <View style={styles.stateLine}>
                  <View style={[styles.statusDot, !device.online && styles.statusDotOffline]} />
                  <Text fontWeight="800" style={[styles.stateLabel, !device.online && styles.stateLabelOffline]}>
                    {device.online ? t('Online') : t('Offline')}
                  </Text>
                  {snapshot?.simulated ? <Text fontWeight="700" style={styles.demoBadge}>{t('Demo mode')}</Text> : null}
                </View>
                <Text i18n={false} fontWeight="800" numberOfLines={1} style={styles.robotName}>{device.name}</Text>
                <Text fontWeight="700" style={styles.readyLabel}>
                  {device.online ? t('Ready for today') : t('Robot status')}
                </Text>
                <View style={styles.quickFacts}>
                  <BatteryCharging color={referenceColors.secondary} size={17} strokeWidth={2.4} />
                  <Text i18n={false} fontWeight="800" style={styles.quickFactText}>{device.batteryPercent}%</Text>
                  <Wifi color={referenceColors.primary} size={17} strokeWidth={2.4} />
                  <Text i18n={false} fontWeight="700" numberOfLines={1} style={styles.wifiFact}>
                    {device.wifiSsid ?? t('Wi-Fi not reported')}
                  </Text>
                </View>
              </View>
            </View>
          </Box>

          <Section title={t('Status')}>
            <DeviceRow
              testID="deviceStatusRow"
              icon={Radio}
              label={t('Robot status')}
              value={device.online ? t('Online') : t('Offline')}
              tone="teal"
              onPress={() => navigation.navigate(ROUTES.RobotStatusScreen)}
            />
            <Divider />
            <DeviceRow
              testID="deviceBatteryRow"
              icon={BatteryCharging}
              label={t('Battery')}
              value={`${device.batteryPercent}%`}
              tone="gold"
              onPress={() => navigation.navigate(ROUTES.RobotBatteryScreen)}
            />
            <Divider />
            <DeviceRow
              icon={Wifi}
              label={t('Wi-Fi')}
              value={device.wifiSsid ?? t('Wi-Fi not reported')}
              tone="coral"
              onPress={() => navigation.navigate(ROUTES.RobotStatusScreen)}
            />
          </Section>

          <Section title={t('Robot')}>
            <DeviceRow
              testID="deviceFirmwareRow"
              icon={CloudDownload}
              label={t('Update Robot Firmware')}
              tone="neutral"
              onPress={() => navigation.navigate(ROUTES.DeviceFirmwareScreen, { deviceId })}
            />
            <Divider />
            <DeviceRow
              testID="deviceFindRow"
              icon={LocateFixed}
              label={t('Find Robot')}
              tone="neutral"
              onPress={() => navigation.navigate(ROUTES.DeviceLostScreen)}
            />
            <Divider />
            <DeviceRow
              testID="deviceResetRow"
              icon={RotateCcw}
              label={t('Factory reset')}
              tone="coral"
              onPress={() => navigation.navigate(ROUTES.FactoryResetScreen)}
            />
          </Section>
        </>
      ) : statusResult && statusResult.state !== 'ok' ? (
        <Box paddingHorizontal={20} style={styles.blockedWrap}>
          <ConnectorStateNotice
            state={statusResult.state}
            onRetry={statusResult.retryable ? () => { void loadStatus(); } : undefined}
          />
          {statusResult.state === 'not_connected' ? (
            <View style={styles.setupWrap}>
              <DeviceBigBtn onClick={() => navigation.navigate(ROUTES.PairAddScreen)}>
                {t('Set up your Robot')}
              </DeviceBigBtn>
            </View>
          ) : null}
        </Box>
      ) : error ? (
        <Box paddingHorizontal={20} style={styles.blockedWrap}>
          <Text>{t('Robot status could not be loaded.')}</Text>
        </Box>
      ) : null}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box paddingHorizontal={20} style={styles.section}>
      <Text fontWeight="800" style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuCard}>{children}</View>
    </Box>
  );
}

function DeviceRow({ icon: Icon, label, value, tone = 'neutral', onPress, testID }: DeviceRowProps) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.74}
      onPress={onPress}
      style={styles.menuRow}
    >
      <View style={[styles.menuIcon, styles[`menuIcon_${tone}`]]}>
        <Icon color={iconColor(tone)} size={21} strokeWidth={2.3} />
      </View>
      <Text fontWeight="800" style={styles.menuLabel}>{label}</Text>
      {value ? <Text i18n={false} numberOfLines={1} style={styles.menuValue}>{value}</Text> : null}
      <ChevronRight color={referenceColors.inkMuted} size={19} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function shortDeviceId(deviceId: string): string {
  return deviceId.slice(-8).toUpperCase();
}

function iconColor(tone: NonNullable<DeviceRowProps['tone']>): string {
  if (tone === 'teal') return referenceColors.secondary;
  if (tone === 'gold') return '#A26D11';
  if (tone === 'coral') return referenceColors.primary;
  return referenceColors.inkSoft;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: referenceColors.bg },
  content: { paddingTop: 30, paddingBottom: 128 },
  header: { marginBottom: 18 },
  screenTitle: { fontSize: 29, lineHeight: 36, color: referenceColors.ink },
  loadingWrap: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  blockedWrap: { marginTop: 8 },
  setupWrap: { marginTop: 20 },
  robotCard: {
    minHeight: 150,
    backgroundColor: referenceColors.card,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: referenceColors.line,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    overflow: 'hidden',
    ...referenceShadow.card,
  },
  robotImageWrap: {
    width: 94,
    height: 94,
    borderRadius: 28,
    backgroundColor: referenceColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotImage: { width: 84, height: 84 },
  robotCopy: { flex: 1, minWidth: 0 },
  stateLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: referenceColors.success },
  statusDotOffline: { backgroundColor: referenceColors.primary },
  stateLabel: { color: referenceColors.success, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  stateLabelOffline: { color: referenceColors.primary },
  demoBadge: { color: referenceColors.inkMuted, fontSize: 10 },
  robotName: { color: referenceColors.ink, fontSize: 22, lineHeight: 28 },
  readyLabel: { color: referenceColors.inkSoft, fontSize: 12, marginTop: 2 },
  quickFacts: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  quickFactText: { color: referenceColors.inkSoft, fontSize: 12, marginRight: 4 },
  wifiFact: { flex: 1, color: referenceColors.inkSoft, fontSize: 12 },
  section: { marginTop: 28 },
  sectionTitle: {
    color: referenceColors.inkSoft,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 6,
  },
  menuCard: {
    backgroundColor: referenceColors.card,
    borderRadius: referenceRadii.cardLarge,
    borderWidth: 1,
    borderColor: referenceColors.line,
    overflow: 'hidden',
    ...referenceShadow.card,
  },
  menuRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon_teal: { backgroundColor: referenceColors.secondarySoft },
  menuIcon_gold: { backgroundColor: referenceColors.goldSoft },
  menuIcon_coral: { backgroundColor: referenceColors.primarySoft },
  menuIcon_neutral: { backgroundColor: referenceColors.cardSoft },
  menuLabel: { flex: 1, color: referenceColors.ink, fontSize: 15 },
  menuValue: { maxWidth: 112, color: referenceColors.inkMuted, fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: referenceColors.line, marginLeft: 68 },
});
