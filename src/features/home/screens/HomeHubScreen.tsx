import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "@/navigation/routes";
import ScreenShell from "@/components/ScreenShell";
import { Box } from "@/design-system/primitives/Box";
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

// Blueprint page 01 robot = R4 cat-eared TeeBot (local SOT asset).
const SLEEK_ASSETS = {
  robotHead: mascot.r4Head,
} as const;

export const HOME_HUB_ROBOT_STAGE_TOP_PADDING = 32;

export default function HomeHubScreen({
  navigation,
}: Props): React.JSX.Element {
  const {
    variant,
    isLoading,
    isError = false,
    contentMode = 'live',
    data,
    demoBadge = { simulated: false, label: null },
    refetch,
    selectChild,
  } = useHomeState();
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const unavailable = contentMode === 'unavailable';
  const failed = contentMode === 'error' || isError;

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
      <ScreenShell bg={SLEEK.background} gradient={false}>
        <TodayCommandView
          childName={t('Maestro')}
          homeReady={false}
          onProgress={openChildProfile}
          onRecovery={openChildProfile}
          onReport={openChildProfile}
          recoveryLabel={t('Set up a child')}
          reportsReady={0}
          wordsReady={0}
        />
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
        wordsLearnedThisWeek={data.wordsLearnedThisWeek}
        onProgress={() => navigation.navigate(ROUTES.TodayProgressScreen)}
      />
    );
  }

  const childName =
    data && "childName" in data && typeof data.childName === "string" && data.childName.trim()
      ? data.childName.trim()
      : null;
  const greetingName = childName ?? t("Mia");
  const lesson = data?.nextLesson;
  const homeReady = demoBadge.simulated || (!failed && !unavailable);

  return (
    <ScreenShell bg={SLEEK.background} gradient={false}>
      <TodayCommandView
        childName={greetingName}
        homeReady={homeReady}
        recoveryLabel={failed ? t('Retry') : unavailable ? t('Browse library') : undefined}
        onProgress={() => navigation.navigate(ROUTES.TodayProgressScreen)}
        onReport={() => navigation.navigate(ROUTES.LessonSummaryScreen, { lessonId: lesson?.id })}
        onRecovery={failed ? () => { void refetch(); } : unavailable ? () => navigation.navigate(ROUTES.CourseLibraryScreen) : undefined}
        reportsReady={data?.lessonsCompletedToday ?? 0}
        wordsReady={data?.wordsLearnedThisWeek ?? 0}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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
