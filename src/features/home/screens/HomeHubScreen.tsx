import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import TopBar from '@/components/TopBar';
import CircleBtn from '@/design-system/components/CircleBtn';
import Robot from '@/design-system/components/Robot';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PulseRing from '@/design-system/components/PulseRing';
import HomeStateChip from '../components/HomeStateChip';
import HomeSecondaryButton from '../components/HomeSecondaryButton';
import { useHomeState } from '../hooks/useHomeState';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeHubScreen'>;

export const HOME_HUB_ROBOT_STAGE_TOP_PADDING = 116;

export default function HomeHubScreen({ navigation }: Props) {
  const { variant, cfg, isLoading } = useHomeState();
  const [greet, setGreet] = React.useState(false);
  const greetTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onRobotTap = () => {
    setGreet(true);
    clearTimeout(greetTimer.current!);
    greetTimer.current = setTimeout(() => setGreet(false), 1800);
  };
  React.useEffect(() => () => clearTimeout(greetTimer.current!), []);

  const showingGreet = greet || cfg.forceGreet;
  const emotion = showingGreet ? 'greet' : cfg.emotion;

  const bg = variant === 'offline' ? '#E8EEF3' : variant === 'completed_today' ? '#C5F1DD' : '#FFF5E6';

  if (isLoading) {
    return (
      <ScreenShell bg={bg}>
        <Box flex={1} alignItems="center" justifyContent="center">
          <Robot emotion="idle" size={180} />
        </Box>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell bg={bg}>
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

        <TouchableOpacity onPress={onRobotTap} style={styles.robotWrap} activeOpacity={0.9}>
          {variant === 'daily_available' && !showingGreet ? (
            <Box style={styles.pulseWrap}>
              <PulseRing size={260} color="#FF6F61" />
            </Box>
          ) : null}
          <Robot emotion={emotion} size={220} accent={cfg.accent} />
          {showingGreet ? (
            <Box style={styles.speechWrap}>
              <SpeechBubble color="#fff">Hi!</SpeechBubble>
            </Box>
          ) : null}
        </TouchableOpacity>

        <Text fontWeight="800" style={styles.robotName}>Robot</Text>
        <Text fontWeight="600" style={styles.tapHint}>Tap me to say hi</Text>
      </Box>

      <Box style={styles.primaryCta}>
        <PrimaryCTA
          testID="homePrimaryCta"
          onPress={() => navigateHomeCtaTarget(navigation, cfg.ctaTarget)}
          color={cfg.ctaColor}
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
  robotStage: { paddingTop: HOME_HUB_ROBOT_STAGE_TOP_PADDING, paddingHorizontal: 24, paddingBottom: 280, gap: 14 },
  greeting: { fontSize: 18, color: '#5C4F77' },
  robotWrap: { position: 'relative', width: 240, height: 240, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  pulseWrap: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10 },
  speechWrap: { position: 'absolute', top: -10, alignSelf: 'center' },
  robotName: { fontSize: 32, color: '#2B2140', letterSpacing: -0.4, marginTop: 4 },
  tapHint: { fontSize: 13, color: '#5C4F77', marginTop: -6 },
  primaryCta: { position: 'absolute', left: 24, right: 24, bottom: 128 },
  secondaryRow: { position: 'absolute', left: 24, right: 24, bottom: 36 },
});
