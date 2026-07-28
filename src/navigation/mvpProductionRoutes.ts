import type { RootStackParamList } from './routes';
import { ROUTES } from './routes';

/**
 * Parent-app MVP production destinations (accepted 21-page scope + system chrome).
 * Non-listed feature routes should set `productionVisible: false` with
 * `productionHiddenReason: 'mvp-scope-hidden'` (or an existing backend/prototype reason).
 *
 * Source: parent-app-mvp-scope.md + research KEEP table.
 */
export const MVP_PRODUCTION_ROUTE_NAMES = [
  // today-command
  ROUTES.HomeHubScreen,
  ROUTES.ParentTodayScreen,
  ROUTES.DailyMissionScreen,
  // live-status
  ROUTES.RunningScreen,
  ROUTES.CompanionScreen,
  ROUTES.ReconnectingOverlay,
  // report-detail
  ROUTES.LessonSummaryScreen,
  ROUTES.ParentSessionReportScreen,
  // course-library / course-detail / send-robot
  ROUTES.CourseLibraryScreen,
  ROUTES.CourseDetailScreen,
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
  // progress-overview / history / family
  ROUTES.TodayProgressScreen,
  ROUTES.ParentHistoryScreen,
  ROUTES.ParentSummaryScreen,
  // edit-child / consent / permissions (onboarding)
  ROUTES.ChildProfileScreen,
  ROUTES.MicAskScreen,
  ROUTES.FirstLessonEntryScreen,
  ROUTES.AddChildScreen,
  // safety / data-rights / language / account
  ROUTES.ParentGateScreen,
  ROUTES.ParentSafetyScreen,
  ROUTES.ParentAccountPrivacyScreen,
  ROUTES.ParentSettingsScreen,
  ROUTES.ParentLockedOutScreen,
  // system chrome + recovery
  ROUTES.SplashScreen,
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
