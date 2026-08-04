import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import {
  ArrowLeft,
  BatteryCharging,
  ChevronRight,
  HardDrive,
  Info,
  RefreshCcw,
  UserRoundCheck,
  Wifi,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import { ROUTES } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import RobotImage from '@/components/RobotImage';
import ConnectorStateNotice from '@/components/ConnectorStateNotice';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { parentColors, parentRadii, parentShadows } from '@/design-system/tokens';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';
import { useRobotTelemetry } from '../telemetry';
import { MainTabIcon, SLEEK_TAB_ICON_SOURCES } from '@/navigation/SleekTabBarVisuals';
import { MAIN_TAB_SCREENS } from '@/navigation/featureRegistry';
import { getSleekTabBarLayout } from '@/design-system/sleekHomeLayout';
import type { FeatureTabName } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RobotStatusScreen'>;

export default function RobotStatusScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { language, t } = useAppLanguage();
  const {
    telemetry,
    loading,
    linkState,
    simulated,
    retry,
  } = useRobotTelemetry();
  const noticeState = simulated ? 'simulated' : linkState;
  const hasTelemetry = !loading && Boolean(telemetry.deviceId);
  const unavailableValue = t('Not available');
  const wifiSignal = telemetry.wifiRssi === null
    ? null
    : telemetry.wifiRssi >= -60
      ? t('Strong signal')
      : t('Weak signal');
  const wifiSummary = wifiSignal
    ? `${telemetry.wifiLabel} · ${wifiSignal}`
    : telemetry.wifiLabel;
  const displayRobotName = hasTelemetry ? telemetry.robotName : t('TeeBot');
  const displayRobotId = hasTelemetry
    ? telemetry.deviceId ?? unavailableValue
    : t('Connect Robot to load details');
  const robotLabel = translateTemplate(
    '{{name}} robot',
    { name: displayRobotName },
    { locale: language },
  );

  return (
    <ScreenShell bg={parentColors.bg} gradient={false}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <Box paddingHorizontal={18}>
          <TouchableOpacity
            onPress={() => navigation.navigate(ROUTES.MyRobotScreen)}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t('Go back')}
            activeOpacity={0.78}
          >
            <ArrowLeft size={20} color={parentColors.ink1} strokeWidth={2.5} />
          </TouchableOpacity>

          <Text fontWeight="800" style={styles.eyebrow}>{t('ROBOT OVERVIEW')}</Text>
          <Text fontWeight="800" style={styles.heading}>{t('Robot detail')}</Text>
          <Text style={styles.intro}>{t('One source of truth for status, readiness and the next safe command.')}</Text>
        </Box>

        <Box paddingHorizontal={18} paddingTop={18}>
          <Box style={styles.heroCard} flexDirection="row" alignItems="center" gap={16} accessibilityLabel={robotLabel}>
            <Box style={styles.robotStage} alignItems="center" justifyContent="center">
              <RobotImage variant="body" size={94} accessibilityLabel={t('TeeBot')} />
            </Box>
            <Box flex={1}>
              <Box style={[styles.statusPill, !hasTelemetry && styles.statusPillUnavailable]}>
                <Text
                  fontWeight="800"
                  style={[styles.statusText, !hasTelemetry && styles.statusTextUnavailable]}
                >
                  ● {hasTelemetry ? telemetry.onlineLabel : t('Not ready')}
                </Text>
              </Box>
              <Text fontWeight="800" style={styles.robotName}>{displayRobotName}</Text>
              <Text style={styles.deviceId}>{displayRobotId}</Text>
            </Box>
          </Box>
        </Box>

        {loading ? (
          <Box paddingHorizontal={18} paddingTop={18}>
            <Text style={styles.message}>{t('Loading robot details')}</Text>
          </Box>
        ) : null}

        {!loading && noticeState ? (
          <Box paddingHorizontal={18} paddingTop={18}>
            <ConnectorStateNotice
              state={noticeState}
              onRetry={noticeState === 'server_unavailable' || noticeState === 'robot_offline' ? retry : undefined}
            />
          </Box>
        ) : null}

        <Box paddingHorizontal={18} paddingTop={24}>
          <Text fontWeight="800" style={styles.sectionLabel}>{t('Details')}</Text>
          <Box style={styles.detailCard}>
            <DetailRow
              icon={<BatteryCharging size={20} color={parentColors.accent} strokeWidth={2.4} />}
              label={t('Battery')}
              value={hasTelemetry ? `${telemetry.batteryLabel} · ${telemetry.chargingLabel}` : unavailableValue}
              onPress={hasTelemetry ? () => navigation.navigate(ROUTES.RobotBatteryScreen) : undefined}
            />
            <DetailRow
              icon={<Wifi size={20} color={parentColors.accent} strokeWidth={2.4} />}
              label={t('Wi-Fi')}
              value={hasTelemetry ? wifiSummary : unavailableValue}
              onPress={hasTelemetry ? () => navigation.navigate(ROUTES.RobotWifiScreen) : undefined}
            />
            <DetailRow
              icon={<HardDrive size={20} color={parentColors.accent} strokeWidth={2.4} />}
              label={t('Storage')}
              value={unavailableValue}
              onPress={hasTelemetry ? () => navigation.navigate(ROUTES.RobotStorageScreen) : undefined}
            />
            <DetailRow
              icon={<UserRoundCheck size={20} color={parentColors.accent} strokeWidth={2.4} />}
              label={t('Assigned child')}
              value={unavailableValue}
            />
            <DetailRow
              icon={<RefreshCcw size={20} color={parentColors.accent} strokeWidth={2.4} />}
              label={t('Software')}
              value={hasTelemetry ? telemetry.firmwareLabel : unavailableValue}
              onPress={hasTelemetry ? () => navigation.navigate(ROUTES.RobotFirmwareScreen) : undefined}
              isLast
            />
          </Box>
        </Box>

        <Box paddingHorizontal={18} paddingTop={18}>
          <Box style={styles.noteCard} flexDirection="row" alignItems="flex-start" gap={10}>
            <Info size={18} color={parentColors.accent} strokeWidth={2.4} />
            <Text style={styles.noteText}>
              {t("We don't read or store anything Robot hears. This page only checks the device itself.")}
            </Text>
          </Box>
        </Box>
      </ScrollView>

      <RobotDetailTabBar navigation={navigation} />
    </ScreenShell>
  );
}

type DetailRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
  isLast?: boolean;
};

function DetailRow({ icon, label, value, onPress, isLast = false }: DetailRowProps): React.JSX.Element {
  const disabled = onPress === undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.detailRow, !isLast && styles.detailRowBorder]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityState={{ disabled }}
      activeOpacity={0.76}
    >
      <Box style={styles.detailIcon} alignItems="center" justifyContent="center">{icon}</Box>
      <Box flex={1}>
        <Text fontWeight="800" style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </Box>
      {disabled ? null : <ChevronRight size={18} color={parentColors.ink2} strokeWidth={2.3} />}
    </TouchableOpacity>
  );
}

function RobotDetailTabBar({ navigation }: Pick<Props, 'navigation'>): React.JSX.Element {
  const { language, t } = useAppLanguage();
  const { width, height } = useWindowDimensions();
  const tabLayout = getSleekTabBarLayout(width, height);
  const tabActions: Record<FeatureTabName, () => void> = {
    Home: () => navigation.navigate(ROUTES.HomeHubScreen),
    Devices: () => navigation.navigate(ROUTES.DeviceHomeScreen),
    Library: () => navigation.navigate(ROUTES.CourseLibraryScreen),
    Progress: () => navigation.navigate(ROUTES.TodayProgressScreen),
    Profile: () => navigation.navigate(ROUTES.ParentSummaryScreen),
  };

  return (
    <View
      style={[
        styles.tabBar,
        {
          bottom: tabLayout.bottom,
          borderRadius: 40 * tabLayout.scale,
          height: tabLayout.height,
          left: tabLayout.left,
          paddingBottom: 8 * tabLayout.scale,
          paddingHorizontal: 8 * tabLayout.scale,
          paddingTop: 8 * tabLayout.scale,
          width: tabLayout.width,
        },
      ]}
    >
      {MAIN_TAB_SCREENS.map(screen => {
        const focused = screen.tabName === 'Devices';

        return (
          <TouchableOpacity
            key={screen.tabName}
            testID={screen.tabBarButtonTestID}
            style={[
              styles.tabItem,
              { borderRadius: 32 * tabLayout.scale },
              focused && styles.tabItemFocused,
            ]}
            onPress={tabActions[screen.tabName]}
            accessibilityRole="tab"
            accessibilityLabel={translateTemplate(
              '{{title}}, tab',
              { title: t(screen.title) },
              { locale: language },
            )}
            accessibilityState={{ selected: focused }}
            activeOpacity={0.78}
          >
            <MainTabIcon
              Icon={screen.tabIcon}
              color={focused ? parentColors.accent : parentColors.ink2}
              focused={focused}
              imageSource={SLEEK_TAB_ICON_SOURCES[screen.tabName]}
              layoutScale={tabLayout.scale}
            />
            <Text
              fontWeight="800"
              style={[
                styles.tabLabel,
                {
                  color: focused ? parentColors.accent : parentColors.ink2,
                  fontSize: 9 * tabLayout.scale,
                  lineHeight: 12 * tabLayout.scale,
                },
              ]}
            >
              {screen.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: parentColors.bg },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingBottom: 164,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: parentColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    ...parentShadows.card,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: parentColors.accent,
    marginBottom: 5,
  },
  heading: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: parentColors.ink1,
  },
  intro: {
    maxWidth: 350,
    fontSize: 14,
    lineHeight: 21,
    color: parentColors.ink2,
    marginTop: 4,
  },
  message: {
    fontSize: 16,
    color: parentColors.ink1,
  },
  heroCard: {
    minHeight: 142,
    borderRadius: parentRadii.hero,
    backgroundColor: parentColors.card,
    padding: 16,
    ...parentShadows.card,
  },
  robotStage: {
    width: 112,
    height: 112,
    borderRadius: 28,
    backgroundColor: parentColors.cream,
    overflow: 'hidden',
  },
  statusPill: {
    borderRadius: parentRadii.pill,
    backgroundColor: parentColors.okBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    color: parentColors.okFg,
  },
  statusPillUnavailable: {
    backgroundColor: parentColors.badBg,
  },
  statusTextUnavailable: {
    color: parentColors.badFg,
  },
  robotName: {
    fontSize: 20,
    lineHeight: 25,
    color: parentColors.ink1,
  },
  deviceId: {
    fontSize: 11,
    lineHeight: 17,
    color: parentColors.ink2,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    color: parentColors.ink1,
    marginBottom: 8,
  },
  detailCard: {
    borderRadius: parentRadii.card,
    backgroundColor: parentColors.card,
    overflow: 'hidden',
    ...parentShadows.card,
  },
  detailRow: {
    minHeight: 74,
    marginHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: parentColors.line,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: parentColors.card2,
  },
  detailLabel: {
    fontSize: 14,
    color: parentColors.ink1,
  },
  detailValue: {
    fontSize: 12,
    lineHeight: 18,
    color: parentColors.ink2,
    marginTop: 2,
  },
  noteCard: {
    borderRadius: parentRadii.card,
    backgroundColor: parentColors.card2,
    padding: 14,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: parentColors.ink2,
    lineHeight: 19,
  },
  tabBar: {
    position: 'absolute',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(235,220,199,0.6)',
    backgroundColor: parentColors.card,
    ...parentShadows.card,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemFocused: {
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  tabLabel: {
    marginTop: 1,
  },
});
