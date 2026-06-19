import React from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import TopBar from '@/components/TopBar';
import CircleBtn from '@/design-system/components/CircleBtn';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import PulseRing from '@/design-system/components/PulseRing';
import HomeStateChip from '../components/HomeStateChip';
import HomeSecondaryButton from '../components/HomeSecondaryButton';
import { useHomeState } from '../hooks/useHomeState';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { referenceColors, referenceImages, referenceShadow } from '@/design-system/referenceTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeHubScreen'>;

export const HOME_HUB_ROBOT_STAGE_TOP_PADDING = 116;
export const HOME_HUB_SECONDARY_ROW_BOTTOM = 116;
export const HOME_HUB_PRIMARY_CTA_BOTTOM = 220;

export default function HomeHubScreen({ navigation }: Props) {
  const { variant, cfg, isLoading } = useHomeState();
  const [greet, setGreet] = React.useState(false);
  const greetTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onRobotTap = () => {
    setGreet(true);
    if (greetTimer.current) {
      clearTimeout(greetTimer.current);
    }
    greetTimer.current = setTimeout(() => setGreet(false), 1800);
  };
  React.useEffect(() => () => clearTimeout(greetTimer.current!), []);

  const showingGreet = greet || cfg.forceGreet;
  const bg = variant === 'offline' ? '#EFEDE8' : variant === 'completed_today' ? '#EEF8EF' : referenceColors.bg;

  if (isLoading) {
    return (
      <ScreenShell bg={bg}>
        <Box flex={1} alignItems="center" justifyContent="center">
          <Image source={referenceImages.robotHead} style={styles.loadingRobot} accessibilityIgnoresInvertColors />
        </Box>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell bg={bg}>
      <ReferenceDots />
      <TopBar
        left={
          <CircleBtn
            size={44}
            accessibilityLabel="Open parent dashboard"
            onPress={() => navigation.navigate(ROUTES.ParentSummaryScreen)}
          >
            <UserIcon />
          </CircleBtn>
        }
        right={
          <CircleBtn
            size={44}
            accessibilityLabel="Open parent settings"
            onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)}
          >
            <SettingsIcon />
          </CircleBtn>
        }
      />

      <Box style={[StyleSheet.absoluteFillObject, styles.robotStage]} alignItems="center" justifyContent="flex-start">
        <Text fontWeight="700" style={styles.greeting}>
          {variant === 'completed_today' ? 'Hi again!' : variant === 'offline' ? 'Hold on…' : 'Hi, friend!'}
        </Text>

        <Box style={{ minHeight: 32, alignItems: 'center', justifyContent: 'center' }}>
          {cfg.chip ? (
            <HomeStateChip color={cfg.chip.color}>{cfg.chip.text}</HomeStateChip>
          ) : null}
        </Box>

        <TouchableOpacity
          onPress={onRobotTap}
          style={[styles.robotWrap, showingGreet && styles.robotWrapGreeting]}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Say hi to Robot"
        >
          <Box style={styles.ringOuter} />
          <Box style={styles.ringInner} />
          {variant === 'daily_available' && !showingGreet ? (
            <Box style={styles.pulseWrap}>
              <PulseRing size={258} color={referenceColors.primary} />
            </Box>
          ) : null}
          <Image
            source={referenceImages.robotHead}
            style={styles.robotImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </TouchableOpacity>

        <Text fontWeight="800" style={styles.robotName}>Robot</Text>
        <Text fontWeight="600" style={styles.tapHint}>Tap me to say hi</Text>
      </Box>

      <Box style={styles.primaryCta}>
        <PrimaryCTA
          testID="homePrimaryCta"
          onPress={() => navigateHomeCtaTarget(navigation, cfg.ctaTarget)}
          color={cfg.ctaColor}
          disabled={!cfg.ctaEnabled}
        >
          {cfg.ctaLabel}
        </PrimaryCTA>
      </Box>

      <Box style={styles.secondaryRow} flexDirection="row" gap={10}>
        <HomeSecondaryButton label="Course"   icon="🗺️" onPress={() => navigation.navigate(ROUTES.CourseScreen)}         dim={cfg.dimSecondary} />
        <HomeSecondaryButton label="Review"   icon="🔁" onPress={() => navigation.navigate(ROUTES.ReviewNeededScreen)}   dim={cfg.dimSecondary} badge={cfg.reviewBadge} />
        <HomeSecondaryButton label="Progress" icon="⭐" onPress={() => navigation.navigate(ROUTES.TodayProgressScreen)} dim={cfg.dimSecondary} />
        <HomeSecondaryButton label="Robot"    icon="🤖" onPress={() => navigation.navigate(ROUTES.DeviceOverviewScreen)} dim={cfg.dimSecondary} />
      </Box>
    </ScreenShell>
  );
}

function navigateHomeCtaTarget(
  navigation: Props['navigation'],
  target: keyof RootStackParamList,
): void {
  if (target === ROUTES.LessonReadyScreen) {
    navigation.navigate(ROUTES.LessonReadyScreen);
    return;
  }
  if (target === ROUTES.TodayProgressScreen) {
    navigation.navigate(ROUTES.TodayProgressScreen);
    return;
  }
  if (target === ROUTES.ParentSummaryScreen) {
    navigation.navigate(ROUTES.ParentSummaryScreen);
    return;
  }
  if (target === ROUTES.DeviceOverviewScreen) {
    navigation.navigate(ROUTES.DeviceOverviewScreen);
    return;
  }
  navigation.navigate(ROUTES.HomeHubScreen);
}

function ReferenceDots(): React.JSX.Element {
  return (
    <Box pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {Array.from({ length: 64 }).map((_, index) => {
        const row = Math.floor(index / 8);
        const col = index % 8;
        return (
          <Box
            key={index}
            style={[
              styles.dot,
              {
                left: 10 + col * 48,
                top: 28 + row * 70,
                opacity: row % 2 === 0 ? 0.22 : 0.14,
              },
            ]}
          />
        );
      })}
    </Box>
  );
}

function UserIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </Svg>
  );
}

function SettingsIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round">
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5h0a1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: referenceColors.inkMuted,
  },
  loadingRobot: {
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  robotStage: {
    paddingTop: 116,
    paddingHorizontal: 24,
    paddingBottom: 290,
    gap: 12,
  },
  greeting: {
    fontSize: 20,
    color: referenceColors.ink,
  },
  robotWrap: {
    position: 'relative',
    width: 272,
    height: 272,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotWrapGreeting: {
    transform: [{ translateY: -2 }],
  },
  ringOuter: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1,
    borderColor: 'rgba(255,107,111,0.08)',
    backgroundColor: 'rgba(255,107,111,0.025)',
  },
  ringInner: {
    position: 'absolute',
    width: 224,
    height: 224,
    borderRadius: 112,
    borderWidth: 1,
    borderColor: 'rgba(255,107,111,0.12)',
  },
  pulseWrap: {
    position: 'absolute',
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
  },
  robotImage: {
    width: 228,
    height: 228,
    borderRadius: 114,
    ...referenceShadow.card,
  },
  robotName: {
    fontSize: 34,
    color: referenceColors.ink,
    letterSpacing: 0,
    marginTop: 0,
  },
  tapHint: {
    fontSize: 12,
    color: referenceColors.inkSoft,
    marginTop: -8,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  primaryCta: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: HOME_HUB_PRIMARY_CTA_BOTTOM,
  },
  secondaryRow: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: HOME_HUB_SECONDARY_ROW_BOTTOM,
  },
});
