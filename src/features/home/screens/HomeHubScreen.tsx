import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Bot, BookOpen, Flame, Play, Repeat2, Settings, Sprout, Star } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/routes';
import ScreenShell from '@/components/ScreenShell';
import HomeStateChip from '../components/HomeStateChip';
import { useHomeState } from '../hooks/useHomeState';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { ROUTES } from '@/navigation/routes';
import { referenceColors, referenceImages } from '@/design-system/referenceTheme';
import { gardenColors, gardenRadii } from '@/design-system/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeHubScreen'>;

export const HOME_HUB_ROBOT_STAGE_TOP_PADDING = 116;
export const HOME_HUB_SECONDARY_ROW_BOTTOM = 116;
export const HOME_HUB_PRIMARY_CTA_BOTTOM = 220;

const ROBOT_HANG_TITLE = 'Robot pairing later';
const ROBOT_HANG_BODY =
  'Phone lessons work with Nest now. Physical robot pairing and send-to-robot stay hung until the ESP bridge is ready.';

function showRobotHang(): void {
  Alert.alert(ROBOT_HANG_TITLE, ROBOT_HANG_BODY, [{ text: 'OK' }]);
}

export default function HomeHubScreen({ navigation }: Props) {
  const { variant, cfg, isLoading } = useHomeState();
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header with greeting and avatar */}
        <Box style={styles.headerRow} flexDirection="row" alignItems="center" justifyContent="space-between">
          <Box flexDirection="row" alignItems="center" gap={12}>
            <Text fontWeight="700" style={styles.greeting}>Hi, friend!</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.ParentSummaryScreen)}
              style={styles.headerAction}
              accessibilityRole="button"
              accessibilityLabel="Open parent dashboard"
            >
              <Image source={referenceImages.robotHead} style={styles.smallAvatar} resizeMode="contain" />
            </TouchableOpacity>
          </Box>
          <TouchableOpacity
            onPress={() => navigation.navigate(ROUTES.ParentSettingsScreen)}
            style={styles.headerAction}
            accessibilityRole="button"
            accessibilityLabel="Open parent settings"
          >
            <Settings size={24} color={gardenColors.ink} strokeWidth={2.25} />
          </TouchableOpacity>
        </Box>

        {/* Ready chip */}
        <Box style={styles.chipRow}>
          {cfg.chip ? (
            <HomeStateChip color={cfg.chip.color}>{cfg.chip.text}</HomeStateChip>
          ) : null}
        </Box>

        {/* Hero section - Today's lesson */}
        <Box style={styles.heroCard}>
          <Box style={styles.heroTextWrap}>
            <Text fontWeight="700" style={styles.eyebrow}>Today's lesson</Text>
            <Text fontWeight="800" style={styles.heroTitle}>Barn & Farm words</Text>
            <Text fontWeight="700" style={styles.heroSubtitle}>Learn 4 words with sounds</Text>

            {/* Progress bar */}
            <Box style={styles.progressTrack}>
              <Box style={[styles.progressFill, { width: '0%' }]} />
            </Box>
            <Text fontWeight="700" style={styles.progressLabel}>Not started</Text>
          </Box>

          {/* Robot body positioned right - tappable to start companion chat */}
          <TouchableOpacity
            onPress={() => navigation.navigate(ROUTES.RobotCompanionScreen, {
              lessonId: 'w01-d01-barn-say-it',
              ageBand: '4-6',
              autoStartVoice: true,
            })}
            style={styles.heroRobotTouchable}
            accessibilityRole="button"
            accessibilityLabel="Talk to Robot before barn lesson"
          >
            <Image
              source={referenceImages.robotBody}
              style={styles.heroRobot}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </TouchableOpacity>

          {/* Start lesson CTA */}
          <TouchableOpacity
            onPress={() => navigateHomeCtaTarget(navigation, cfg.ctaTarget)}
            style={styles.heroCta}
            testID="homePrimaryCta"
            accessibilityRole="button"
            accessibilityLabel="Start lesson"
          >
            <Play size={18} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2.5} />
            <Text fontWeight="800" style={styles.heroCtaText}>Start lesson</Text>
          </TouchableOpacity>
        </Box>

        {/* Streak card */}
        <Box style={styles.streakCard} flexDirection="row" gap={12} alignItems="center">
          <Box style={styles.streakIcon}>
            <Flame size={24} color={gardenColors.ink} strokeWidth={2.25} />
          </Box>
          <Box flex={1}>
            <Text fontWeight="800" style={styles.streakBig}>1-day streak</Text>
            <Text fontWeight="700" style={styles.streakSmall}>Keep it going!</Text>
          </Box>
        </Box>

        {/* Quick actions */}
        <Text fontWeight="700" style={styles.quickActionsLabel}>Quick actions</Text>
        <Box style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.qaCard}
            onPress={() => navigation.navigate(ROUTES.LessonPickScreen, { ageBand: '4-6' })}
            testID="homeQuickAction_lessons"
            accessibilityRole="button"
            accessibilityLabel="Browse lessons"
          >
            <BookOpen size={24} color={gardenColors.coral} strokeWidth={2.25} />
            <Text fontWeight="700" style={styles.qaLabel}>Lessons</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.qaCard}
            onPress={() => navigation.navigate(ROUTES.ReviewNeededScreen)}
            testID="homeQuickAction_review"
            accessibilityRole="button"
            accessibilityLabel="Review words"
          >
            <Repeat2 size={24} color={gardenColors.coral} strokeWidth={2.25} />
            <Text fontWeight="700" style={styles.qaLabel}>Review</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.qaCard}
            onPress={() => navigation.navigate(ROUTES.TodayProgressScreen)}
            testID="homeQuickAction_progress"
            accessibilityRole="button"
            accessibilityLabel="View progress"
          >
            <Star size={24} color={gardenColors.coral} strokeWidth={2.25} />
            <Text fontWeight="700" style={styles.qaLabel}>Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.qaCard}
            onPress={() => navigation.navigate(ROUTES.DeviceOverviewScreen)}
            testID="homeQuickAction_robot"
            accessibilityRole="button"
            accessibilityLabel="Robot"
          >
            <Bot size={24} color={gardenColors.coral} strokeWidth={2.25} />
            <Text fontWeight="700" style={styles.qaLabel}>Robot</Text>
          </TouchableOpacity>
        </Box>

        {/* My Garden card */}
        <Box style={styles.gardenCard}>
          <Box style={styles.gardenTitleRow} flexDirection="row" alignItems="center" gap={6}>
            <Text fontWeight="800" style={styles.gardenTitle}>My Garden</Text>
            <Sprout size={16} color={gardenColors.inkSoft} strokeWidth={2.25} />
          </Box>
          <Box style={styles.gardenContent} flexDirection="row" gap={12} alignItems="center">
            <Box style={styles.gardenAvatar}>
              <Image source={referenceImages.robotBody} style={styles.gardenAvatarImg} resizeMode="contain" />
            </Box>
            <Box flex={1}>
              <Text fontWeight="800" style={styles.gardenLevel}>Level 1</Text>
              <Text fontWeight="600" style={styles.gardenSub}>4 seeds · keep watering</Text>
            </Box>
          </Box>
        </Box>

      </ScrollView>
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
    showRobotHang();
    return;
  }
  navigation.navigate(ROUTES.HomeHubScreen);
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  loadingRobot: {
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  headerRow: {
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  greeting: {
    fontSize: 18,
    color: gardenColors.ink,
  },
  smallAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerAction: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroCard: {
    backgroundColor: gardenColors.paper,
    borderRadius: gardenRadii.card,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: 92,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 12,
    color: gardenColors.inkSoft,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    color: gardenColors.ink,
    marginBottom: 4,
    lineHeight: 22,
  },
  heroSubtitle: {
    fontSize: 13,
    color: gardenColors.inkSoft,
    marginBottom: 12,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: gardenColors.mint,
  },
  progressLabel: {
    fontSize: 12,
    color: gardenColors.inkSoft,
  },
  heroRobotTouchable: {
    position: 'absolute',
    right: 8,
    bottom: 10,
    height: 120,
    width: 86,
  },
  heroRobot: {
    height: '100%',
    width: '100%',
  },
  heroCta: {
    backgroundColor: gardenColors.coral,
    borderRadius: gardenRadii.cta,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  heroCtaText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  streakCard: {
    backgroundColor: gardenColors.sun,
    borderRadius: gardenRadii.card,
    padding: 14,
    marginBottom: 16,
  },
  streakIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: gardenColors.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBig: {
    fontSize: 16,
    color: gardenColors.ink,
  },
  streakSmall: {
    fontSize: 12,
    color: gardenColors.inkSoft,
  },
  quickActionsLabel: {
    fontSize: 13,
    color: gardenColors.inkSoft,
    marginBottom: 8,
    marginLeft: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  qaCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    backgroundColor: gardenColors.paper,
    borderRadius: gardenRadii.card,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: {
    fontSize: 12,
    color: gardenColors.ink,
    textAlign: 'center',
    marginTop: 6,
  },
  gardenCard: {
    backgroundColor: gardenColors.cream2,
    borderRadius: gardenRadii.card,
    padding: 14,
    marginBottom: 16,
  },
  gardenTitle: {
    fontSize: 12,
    color: gardenColors.inkSoft,
  },
  gardenTitleRow: {
    marginBottom: 10,
  },
  gardenContent: {
    alignItems: 'center',
  },
  gardenAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: gardenColors.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gardenAvatarImg: {
    width: '100%',
    height: '100%',
  },
  gardenLevel: {
    fontSize: 13,
    color: gardenColors.ink,
  },
  gardenSub: {
    fontSize: 11,
    color: gardenColors.inkSoft,
  },
});
