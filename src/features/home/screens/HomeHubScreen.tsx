import React from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "@/navigation/routes";
import ScreenShell from "@/components/ScreenShell";
import { Box } from "@/design-system/primitives/Box";
import { Text } from "@/design-system/primitives/Text";
import { Icon } from "@/design-system/icons";
import { ROUTES } from "@/navigation/routes";
import { mascot } from "@/assets/mascot";
import { useAppLanguage } from "@/services/i18n/i18n";
import { useHomeState } from "../hooks/useHomeState";
import { HomeMultiChildState, HomeStreakLostState } from "../components/HomeHubStates";
import { TodayCommandView } from "../components/TodayCommandView";

type Props = NativeStackScreenProps<RootStackParamList, "HomeHubScreen">;

const SLEEK = {
  background: "#FAF5EB",
  foreground: "#2D3436",
  primary: "#FF6B6B",
  secondary: "#4ECDC4",
} as const;

const ROBOT_HANG_TITLE = "Robot pairing later";
const ROBOT_HANG_BODY =
  "Phone lessons work with Nest now. Physical robot pairing and send-to-robot are not connected yet.";

function showRobotHang(): void {
  Alert.alert(ROBOT_HANG_TITLE, ROBOT_HANG_BODY, [{ text: "OK" }]);
}

// Blueprint page 01 robot = R4 cat-eared TeeBot (local SOT asset).
const SLEEK_ASSETS = {
  robotHead: mascot.r4Head,
  emptyRobot: mascot.r4Wave,
} as const;

export const HOME_HUB_ROBOT_STAGE_TOP_PADDING = 32;

export default function HomeHubScreen({
  navigation,
}: Props): React.JSX.Element {
  const {
    variant,
    cfg,
    isLoading,
    isError = false,
    contentMode = 'live',
    data,
    refetch,
    demoBadge = { simulated: false, label: null },
    selectChild,
  } = useHomeState();
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const unavailable = contentMode === 'unavailable';
  const failed = contentMode === 'error' || isError;
  const primaryEnabled = failed || unavailable || cfg.ctaEnabled;

  if (isLoading) {
    return (
      <ScreenShell bg="#E0F7FA" gradient={false}>
        <ScrollView
          contentContainerStyle={[
            styles.loadingScene,
            { paddingTop: Math.max(insets.top + 20, 48) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Box testID="homeLoadingSkeleton">
            <Box
              testID="homeLoadingHeader"
              style={styles.loadingHeader}
              flexDirection="row"
              alignItems="flex-start"
              justifyContent="space-between"
            >
              <Box gap={8}>
                <Box style={[styles.loadingBlock, styles.loadingEyebrow]} />
                <Box style={[styles.loadingBlock, styles.loadingHeading]} />
                <Box style={[styles.loadingBlock, styles.loadingSubheading]} />
              </Box>
              <Box style={styles.loadingAvatar} />
            </Box>

            <Box testID="homeLoadingRobot" style={styles.loadingRobotStage}>
              <Box style={styles.loadingHaloOuter} />
              <Box style={styles.loadingHaloInner} />
              <Image
                source={SLEEK_ASSETS.robotHead}
                style={styles.loadingRobot}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </Box>

            <Box testID="homeLoadingLesson" style={styles.loadingLessonCard}>
              <Box style={[styles.loadingBlock, styles.loadingLessonTitle]} />
              <Box style={[styles.loadingBlock, styles.loadingLessonLine]} />
              <Box style={[styles.loadingBlock, styles.loadingLessonShortLine]} />
            </Box>

            <Box testID="homeLoadingMetrics" style={styles.loadingMetricRow}>
              <Box style={styles.loadingMetricCard}>
                <Box style={[styles.loadingBlock, styles.loadingMetricIcon]} />
                <Box flex={1} gap={8}>
                  <Box style={[styles.loadingBlock, styles.loadingMetricLabel]} />
                  <Box style={[styles.loadingBlock, styles.loadingMetricValue]} />
                </Box>
              </Box>
              <Box style={styles.loadingMetricCard}>
                <Box style={[styles.loadingBlock, styles.loadingMetricIcon]} />
                <Box flex={1} gap={8}>
                  <Box style={[styles.loadingBlock, styles.loadingMetricLabel]} />
                  <Box style={[styles.loadingBlock, styles.loadingMetricValue]} />
                </Box>
              </Box>
            </Box>

            <Box testID="homeLoadingAction" style={styles.loadingAction}>
              <Box style={[styles.loadingBlock, styles.loadingActionCopy]} />
            </Box>
          </Box>
        </ScrollView>
      </ScreenShell>
    );
  }

  if (variant === 'zero_child') {
    const openChildProfile = (): void => {
      navigation.navigate(ROUTES.HomeChildProfileScreen);
    };

    return (
      <ScreenShell bg="#E0F7FA" gradient={false}>
        <ScrollView
          contentContainerStyle={[
            styles.emptyScene,
            { paddingTop: Math.max(insets.top + 20, 48) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Box alignItems="center">
            <Text i18n={false} fontWeight="800" style={styles.emptyTitle}>
              {t('No lessons yet')}
            </Text>
            <Text i18n={false} fontWeight="700" style={styles.emptySubtitle}>
              {t("Let's start a joyful English journey with TeeBot")}
            </Text>
          </Box>

          <Box style={styles.emptyRobotStage}>
            <Box style={styles.emptyRobotGlow} />
            <Image
              source={SLEEK_ASSETS.emptyRobot}
              style={styles.emptyRobot}
              resizeMode="contain"
              accessibilityLabel={t('TeeBot')}
            />
          </Box>

          <TouchableOpacity
            testID="homeEmptyCard"
            style={styles.emptyCard}
            onPress={openChildProfile}
            accessibilityRole="button"
            accessibilityLabel={t('Name your child')}
          >
            <Text i18n={false} fontWeight="800" style={styles.emptyStep}>
              {t('First step')}
            </Text>
            <Box flexDirection="row" alignItems="center" gap={12}>
              <Icon name="Edit3" size={24} color={SLEEK.secondary} />
              <Text i18n={false} fontWeight="800" style={styles.emptyCardTitle}>
                {t('Name your child')}
              </Text>
            </Box>
            <Text i18n={false} fontWeight="700" style={styles.emptyCardCopy}>
              {t('Your child will feel special with a name of their own')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="homeEmptyCta"
            style={styles.emptyCta}
            onPress={openChildProfile}
            accessibilityRole="button"
            accessibilityLabel={t("Start today's lesson")}
          >
            <Icon name="Play" size={24} color="#FFFFFF" />
            <Text i18n={false} fontWeight="800" style={styles.emptyCtaCopy}>
              {t("Start today's lesson")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenShell>
    );
  }

  if (data?.variant === 'multiple_children') {
    return (
      <HomeMultiChildState
        children={data.children}
        onContinue={selectChild}
        onAddChild={() => navigation.navigate(ROUTES.HomeChildProfileScreen)}
      />
    );
  }

  if (data?.variant === 'streak_lost') {
    return (
      <HomeStreakLostState
        childName={data.childName}
        lesson={data.nextLesson}
        wordsLearnedThisWeek={data.wordsLearnedThisWeek}
        onStartLesson={() => navigation.navigate(ROUTES.LessonReadyScreen)}
        onBrowseLessons={() => navigation.navigate(ROUTES.CourseLibraryScreen)}
      />
    );
  }

  const childName =
    data && "childName" in data && typeof data.childName === "string" && data.childName.trim()
      ? data.childName.trim()
      : null;
  const greetingName = childName ?? t("Mia");
  const lesson = data?.nextLesson;
  const lessonReady = demoBadge.simulated || (!failed && !unavailable);
  const overviewLessonTitle = failed
    ? t('Could not load Home')
    : unavailable
      ? t('No lesson plan yet')
      : lesson?.title || t('Barn & Farm Words');
  const runPrimary = (): void => {
    if (demoBadge.simulated) {
      navigation.navigate(ROUTES.LessonReadyScreen);
    } else if (failed) {
      void refetch?.();
    } else if (unavailable) {
      navigation.navigate(ROUTES.CourseLibraryScreen);
    } else {
      navigateHomeCtaTarget(navigation, cfg.ctaTarget);
    }
  };

  return (
    <ScreenShell bg={SLEEK.background} gradient={false}>
      <TodayCommandView
        childName={greetingName}
        durationMinutes={lesson?.durationMinutes ?? 7}
        lessonReady={lessonReady}
        lessonStatusLabel={failed ? 'Try again' : unavailable ? 'Browse lessons' : 'Ready'}
        lessonTitle={overviewLessonTitle}
        onLiveStatus={() => navigation.navigate(ROUTES.RunningScreen, { lessonTitle: lesson?.title })}
        onPrimary={runPrimary}
        onReport={() => navigation.navigate(ROUTES.LessonSummaryScreen, { lessonId: lesson?.id })}
        online={lessonReady}
        primaryEnabled={demoBadge.simulated || primaryEnabled}
        primaryLabel={demoBadge.simulated ? 'Start' : failed ? 'Retry' : unavailable ? 'Browse' : 'Start'}
        reportsReady={data?.lessonsCompletedToday ?? 1}
        wordCount={Math.max(lesson?.focusItems.length ?? 6, 1)}
        wordsReady={data?.wordsLearnedThisWeek ?? 3}
      />
    </ScreenShell>
  );
}

function navigateHomeCtaTarget(
  navigation: Props["navigation"],
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
  if (target === ROUTES.CourseLibraryScreen) {
    navigation.navigate(ROUTES.CourseLibraryScreen);
    return;
  }
  navigation.navigate(ROUTES.HomeHubScreen);
}

const styles = StyleSheet.create({
  emptyScene: {
    alignItems: "center",
    flexGrow: 1,
    paddingBottom: 130,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: SLEEK.foreground,
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "rgba(99,110,114,0.82)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 310,
    textAlign: "center",
  },
  emptyRobotStage: {
    alignItems: "center",
    height: 264,
    justifyContent: "center",
    marginBottom: 28,
    marginTop: 16,
    position: "relative",
    width: 264,
  },
  emptyRobotGlow: {
    backgroundColor: "rgba(255,107,107,0.10)",
    borderRadius: 132,
    height: 264,
    position: "absolute",
    transform: [{ scale: 1.1 }],
    width: 264,
  },
  emptyRobot: {
    height: 256,
    width: 256,
    zIndex: 1,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(235,220,199,0.36)",
    borderRadius: 40,
    borderWidth: 1,
    gap: 12,
    marginBottom: 28,
    paddingHorizontal: 28,
    paddingVertical: 28,
    shadowColor: "#164E63",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    width: "100%",
    elevation: 4,
  },
  emptyStep: {
    color: SLEEK.secondary,
    fontSize: 10,
    letterSpacing: 2,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  emptyCardTitle: {
    color: SLEEK.foreground,
    fontSize: 20,
    lineHeight: 26,
  },
  emptyCardCopy: {
    color: "rgba(99,110,114,0.82)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  emptyCta: {
    alignItems: "center",
    backgroundColor: SLEEK.primary,
    borderRadius: 48,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    minHeight: 76,
    paddingHorizontal: 24,
    shadowColor: SLEEK.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    width: "100%",
    elevation: 7,
  },
  emptyCtaCopy: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
  },
  loadingScene: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  loadingBlock: {
    backgroundColor: "rgba(99,110,114,0.24)",
    borderRadius: 999,
  },
  loadingHeader: {
    minHeight: 72,
  },
  loadingEyebrow: {
    height: 12,
    width: 96,
  },
  loadingHeading: {
    height: 30,
    width: 160,
    borderRadius: 12,
  },
  loadingSubheading: {
    height: 12,
    width: 192,
  },
  loadingAvatar: {
    backgroundColor: "rgba(99,110,114,0.24)",
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  loadingRobotStage: {
    alignItems: "center",
    alignSelf: "center",
    height: 272,
    justifyContent: "center",
    marginTop: 16,
    width: 272,
  },
  loadingHaloOuter: {
    backgroundColor: "rgba(255,255,255,0.30)",
    borderColor: "rgba(78,205,196,0.18)",
    borderRadius: 132,
    borderWidth: 1,
    height: 264,
    position: "absolute",
    width: 264,
  },
  loadingHaloInner: {
    backgroundColor: "rgba(255,255,255,0.42)",
    borderColor: "rgba(78,205,196,0.22)",
    borderRadius: 105,
    borderWidth: 1,
    height: 210,
    position: "absolute",
    width: 210,
  },
  loadingRobot: {
    height: 180,
    width: 180,
    zIndex: 1,
  },
  loadingLessonCard: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: "rgba(255,255,255,0.74)",
    borderRadius: 32,
    borderWidth: 1,
    gap: 12,
    minHeight: 112,
    padding: 24,
    shadowColor: "#6BA8AA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  loadingLessonTitle: {
    height: 18,
    width: "65%",
  },
  loadingLessonLine: {
    height: 12,
    width: "100%",
  },
  loadingLessonShortLine: {
    height: 12,
    width: "75%",
  },
  loadingMetricRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  loadingMetricCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: "rgba(255,255,255,0.74)",
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 78,
    padding: 16,
  },
  loadingMetricIcon: {
    borderRadius: 14,
    height: 40,
    width: 40,
  },
  loadingMetricLabel: {
    height: 10,
    width: "100%",
  },
  loadingMetricValue: {
    height: 14,
    width: "70%",
  },
  loadingAction: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.48)",
    borderRadius: 36,
    justifyContent: "center",
    marginTop: 24,
    minHeight: 72,
  },
  loadingActionCopy: {
    height: 16,
    width: 128,
  },
});
