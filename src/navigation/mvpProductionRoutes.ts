import type { RootStackParamList } from './routes';
import { ROUTES } from './routes';

/**
 * Parent-app MVP production destinations (accepted 21-page scope + system chrome).
 * Non-listed feature routes should set `productionVisible: false` with
 * `productionHiddenReason: 'mvp-scope-hidden'` (or an existing backend/prototype reason).
 *
 * Documents tip adaptation (2026-07-29):
 * - No ParentSessionReportScreen / AddChildScreen yet — LessonSummaryScreen +
 *   ChildProfileScreen cover report/edit-child until those screens land.
 * - Phone lesson-session player routes are intentionally NOT listed (robot-first).
 */
export const MVP_PRODUCTION_ROUTE_NAMES = [
  // today-command
  ROUTES.HomeHubScreen,
  ROUTES.HomeChildProfileScreen,
  ROUTES.ParentTodayScreen,
  ROUTES.DailyMissionScreen,
  // live-status
  ROUTES.RunningScreen,
  ROUTES.CompanionScreen,
  ROUTES.ReconnectingOverlay,
  // report-detail
  ROUTES.LessonSummaryScreen,
  // course-library / course-detail / send-robot
  ROUTES.CourseLibraryScreen,
  ROUTES.CourseDetailScreen,
  ROUTES.LessonDetailScreen,
  ROUTES.SendToRobotScreen,
  ROUTES.RobotReadyScreen,
  ROUTES.NeedsSyncScreen,
  // robot-fleet / robot-detail
  ROUTES.DeviceHomeScreen,
  ROUTES.DeviceOverviewScreen,
  // pairing wizard + recovery
  ROUTES.PairIntroScreen,
  ROUTES.PairSearchScreen,
  ROUTES.PairFoundScreen,
  ROUTES.PairQrScanScreen,
  ROUTES.PairCodeScreen,
  ROUTES.PairAddScreen,
  ROUTES.PairWifiScreen,
  ROUTES.PairWifiPasswordScreen,
  ROUTES.PairConnectingScreen,
  ROUTES.PairSuccessScreen,
  ROUTES.PairRenameScreen,
  ROUTES.PairChildProfileScreen,
  ROUTES.PairFirstLessonScreen,
  ROUTES.PairFailedScreen,
  ROUTES.PairOfflineScreen,
  ROUTES.DeviceLostScreen,
  // progress-overview / history
  ROUTES.TodayProgressScreen,
  ROUTES.ParentHistoryScreen,
  ROUTES.ParentSummaryScreen,
  // edit-child / consent / permissions (onboarding)
  ROUTES.ChildProfileScreen,
  ROUTES.MicAskScreen,
  ROUTES.FirstLessonEntryScreen,
  ROUTES.ParentConsentScreen,
  // safety / data-rights / language / account
  ROUTES.ParentGateScreen,
  ROUTES.ParentSafetyScreen,
  ROUTES.ParentAccountPrivacyScreen,
  ROUTES.ParentSettingsScreen,
  ROUTES.ParentLockedOutScreen,
  // system chrome + recovery
  ROUTES.SplashScreen,
  ROUTES.WelcomeScreen,
  ROUTES.IntroListenScreen,
  ROUTES.IntroSpeakScreen,
  ROUTES.IntroRetryScreen,
  ROUTES.IntroCelebrateScreen,
  ROUTES.TrustScreen,
  ROUTES.LoginScreen,
  ROUTES.AppErrorScreen,
  ROUTES.NetworkErrorScreen,
  ROUTES.MicMissingScreen,
  ROUTES.VoiceFailedScreen,
  ROUTES.AudioRecoveryScreen,
  ROUTES.SafetyRedirectScreen,
  ROUTES.SupportScreen,
  ROUTES.HelpFaqScreen,
] as const satisfies readonly (keyof RootStackParamList)[];

export const MVP_PRODUCTION_ROUTE_NAME_SET: ReadonlySet<keyof RootStackParamList> = new Set(
  MVP_PRODUCTION_ROUTE_NAMES,
);

/** Shared flag blob for routes outside the parent MVP allowlist. */
export const MVP_SCOPE_HIDDEN = {
  productionVisible: false,
  productionHiddenReason: 'mvp-scope-hidden',
} as const;

export function isMvpProductionRoute(route: keyof RootStackParamList): boolean {
  return MVP_PRODUCTION_ROUTE_NAME_SET.has(route);
}
