import React from 'react';
import { Image, type ImageSourcePropType, StyleSheet, TouchableOpacity } from 'react-native';
import { Map, RefreshCw, Settings, Star } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import TopBar from '@/components/TopBar';
import CircleBtn from '@/design-system/components/CircleBtn';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PulseRing from '@/design-system/components/PulseRing';
import HomeStateChip from '../components/HomeStateChip';
import { useHomeState } from '../hooks/useHomeState';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeHubScreen'>;

const robotFaceSource: ImageSourcePropType = require('../../../assets/export-html-7/robot-face.png');
const profileBadgeSource: ImageSourcePropType = require('../../../assets/export-html-7/profile-badge.png');

export default function HomeHubScreen({ navigation }: Props) {
  const { variant, cfg, isLoading } = useHomeState();
  const { t } = useTranslation();
  const [greet, setGreet] = React.useState(false);
  const greetTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onRobotTap = () => {
    setGreet(true);
    clearTimeout(greetTimer.current!);
    greetTimer.current = setTimeout(() => setGreet(false), 1800);
  };
  React.useEffect(() => () => clearTimeout(greetTimer.current!), []);

  const showingGreet = greet || cfg.forceGreet;

  const bg = variant === 'offline' ? '#E8EEF3' : variant === 'completed_today' ? '#EAF7F0' : '#FAF5EB';

  if (isLoading) {
    return (
      <ScreenShell bg={bg}>
        <Box flex={1} alignItems="center" justifyContent="center">
          <Image source={robotFaceSource} style={styles.loadingRobot} resizeMode="contain" />
        </Box>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell bg={bg}>
      <TopBar
        left={
          <CircleBtn size={36} onPress={() => navigation.navigate(ROUTES.ParentGateScreen)} accessibilityLabel="Open parent profile">
            <Image source={profileBadgeSource} style={styles.profileBadge} resizeMode="cover" />
          </CircleBtn>
        }
        right={
          <CircleBtn size={38} onPress={() => navigation.navigate(ROUTES.ParentGateScreen)} accessibilityLabel="Open parent settings">
            <Settings size={18} color="#2D3436" strokeWidth={2.8} />
          </CircleBtn>
        }
      />

      <Box style={[StyleSheet.absoluteFillObject, styles.robotStage]} alignItems="center" justifyContent="flex-start">
        <Text fontWeight="800" style={styles.greeting}>
          {variant === 'completed_today' ? 'Hi again!' : variant === 'offline' ? 'Hold on…' : 'Hi, friend!'}
        </Text>

        <Box style={{ minHeight: 32, alignItems: 'center', justifyContent: 'center' }}>
          {cfg.chip ? (
            <HomeStateChip color={cfg.chip.color}>{cfg.chip.text}</HomeStateChip>
          ) : null}
        </Box>

        <TouchableOpacity
          onPress={onRobotTap}
          style={styles.robotWrap}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('Friendly Robot face')}
          accessibilityHint={t('Tap me to say hi')}
        >
          {variant === 'daily_available' && !showingGreet ? (
            <Box style={styles.pulseWrap}>
              <PulseRing size={244} color="#FF6F61" />
            </Box>
          ) : null}
          <Image
            source={robotFaceSource}
            style={[styles.robotFace, variant === 'offline' ? styles.robotFaceDim : undefined]}
            resizeMode="contain"
            accessible={false}
          />
          {showingGreet ? (
            <Box style={styles.speechWrap}>
              <SpeechBubble color="#fff">Hi!</SpeechBubble>
            </Box>
          ) : null}
        </TouchableOpacity>

        <Text fontWeight="800" style={styles.robotName}>Robot</Text>
        <Text fontWeight="800" style={styles.tapHint}>TAP ME TO SAY HI</Text>
      </Box>

      <Box style={styles.primaryCta}>
        <PrimaryCTA
          onPress={() => navigateHomeCtaTarget(navigation, cfg.ctaTarget)}
          color={cfg.ctaColor}
          accessibilityLabel={t(cfg.accessibilityLabel)}
          accessibilityHint={t(cfg.accessibilityHint)}
        >
          {cfg.ctaLabel}
        </PrimaryCTA>
      </Box>

      <Box style={styles.secondaryRow} flexDirection="row" gap={10}>
        <QuickAction label="Course" onPress={() => navigation.navigate(ROUTES.CourseScreen)} dim={cfg.dimSecondary} tone="#DDF7F0">
          <Map size={21} color="#4ECDC4" strokeWidth={2.6} />
        </QuickAction>
        <QuickAction label="Review" onPress={() => navigation.navigate(ROUTES.ReviewNeededScreen)} dim={cfg.dimSecondary} badge={cfg.reviewBadge} tone="#F4EAFE">
          <RefreshCw size={21} color="#A679D8" strokeWidth={2.6} />
        </QuickAction>
        <QuickAction label="Progress" onPress={() => navigation.navigate(ROUTES.TodayProgressScreen)} dim={cfg.dimSecondary} tone="#FFF3C8">
          <Star size={21} color="#E0A800" strokeWidth={2.6} />
        </QuickAction>
      </Box>
    </ScreenShell>
  );
}

type QuickActionProps = {
  label: string;
  children: React.ReactNode;
  onPress?: () => void;
  dim?: boolean;
  badge?: number | null;
  tone: string;
};

function QuickAction({ label, children, onPress, dim, badge, tone }: QuickActionProps): React.JSX.Element {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={dim}
      style={[styles.quickAction, dim ? styles.quickActionDim : undefined]}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(dim) }}
    >
      <Box style={[styles.quickIcon, { backgroundColor: tone }]} alignItems="center" justifyContent="center">
        {children}
      </Box>
      <Text fontWeight="800" style={styles.quickLabel}>{label}</Text>
      {badge != null ? (
        <Box style={styles.quickBadge} alignItems="center" justifyContent="center">
          <Text fontWeight="800" style={styles.quickBadgeText}>{badge}</Text>
        </Box>
      ) : null}
    </TouchableOpacity>
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
  if (target === ROUTES.ParentGateScreen) {
    navigation.navigate(ROUTES.ParentGateScreen);
    return;
  }
  if (target === ROUTES.DeviceOverviewScreen) {
    navigation.navigate(ROUTES.DeviceOverviewScreen);
    return;
  }
  navigation.navigate(ROUTES.HomeHubScreen);
}

const styles = StyleSheet.create({
  loadingRobot: { width: 176, height: 176 },
  profileBadge: { width: 24, height: 24, borderRadius: 12 },
  robotStage: { paddingTop: 126, paddingHorizontal: 24, paddingBottom: 276, gap: 10 },
  greeting: { fontSize: 18, color: '#2D3436' },
  robotWrap: { position: 'relative', width: 236, height: 220, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  pulseWrap: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10 },
  robotFace: {
    width: 214,
    height: 214,
    shadowColor: '#C86B55',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
  },
  robotFaceDim: { opacity: 0.72 },
  speechWrap: { position: 'absolute', top: -10, alignSelf: 'center' },
  robotName: { fontSize: 31, color: '#2D3436', letterSpacing: 0, marginTop: 0 },
  tapHint: { fontSize: 11, color: '#636E72', marginTop: -7, letterSpacing: 0.7 },
  primaryCta: { position: 'absolute', left: 24, right: 24, bottom: 124 },
  secondaryRow: { position: 'absolute', left: 24, right: 24, bottom: 32 },
  quickAction: {
    flex: 1,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    shadowColor: '#A98F77',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 2,
    position: 'relative',
  },
  quickActionDim: { opacity: 0.55 },
  quickIcon: { width: 34, height: 34, borderRadius: 17 },
  quickLabel: { fontSize: 10, color: '#2D3436' },
  quickBadge: {
    position: 'absolute',
    top: 7,
    right: 9,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#FF6F61',
  },
  quickBadgeText: { color: '#FFFFFF', fontSize: 11 },
});
