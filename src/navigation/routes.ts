export type LessonSessionParams = {
  courseId?: string;
  courseTitle?: string;
  unitId?: string;
  unitTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  contentVersion?: string;
  mode?: 'lesson' | 'review' | 'mission';
  activityIndex?: number;
  activityTotal?: number;
  beatIndex?: number;
  lastPrompt?: string;
  lastAcceptedProgress?: number;
  voiceStateBeforeInterruption?: string;
  resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect';
};

export type RobotLessonDemoParams = {
  lessonId?: string;
  ageBand?: import('@/features/lesson-demo/types').LessonAgeBand;
  autoStartVoice?: boolean;
};

export type RootStackParamList = {
  // auth
  LoginScreen: undefined;

  // onboarding
  // Parent onboarding screens remain out of this stack until legal-reviewed
  // COPPA flow is reintroduced under the current design language.
  SplashScreen: undefined;
  WelcomeScreen: undefined;
  MicAskScreen: undefined;
  TrustScreen: undefined;
  IntroListenScreen: undefined;
  IntroSpeakScreen: undefined;
  IntroRetryScreen: undefined;
  IntroCelebrateScreen: undefined;
  ParentConsentScreen: undefined;
  // Optional `pairing` context lets the parent create a child mid-pairing and
  // then FINISH the pairing they started (PairRenameScreen → here when the
  // household has no child yet), instead of being dropped into onboarding. When
  // absent, this is plain onboarding and the screen advances to MicAskScreen.
  ChildProfileScreen: undefined | {
    pairing?: { deviceId: string; provisioningAttemptId: string; serialNumber?: string };
  };
  FirstLessonEntryScreen: undefined;

  // home
  HomeHubScreen: undefined;
  HomeChildProfileScreen: undefined;

  // course
  CourseScreen: undefined | { courseId?: string };
  LevelScreen: undefined | { levelId?: string };
  UnitScreen: undefined | { unitId?: string };
  LessonListScreen: undefined | { unitId?: string };
  LessonDetailScreen: undefined | { lessonId?: string; courseId?: string };
  ReviewEntryScreen: undefined;
  DailyMissionScreen: undefined;

  // course-library
  CourseLibraryScreen: undefined;
  CourseDetailScreen: undefined | { courseId?: string };
  BuyCourseScreen: undefined | { courseId?: string };
  CourseAddedScreen: undefined | { courseId?: string; assignmentId?: string };
  CourseCompleteScreen: undefined | {
    courseId?: string;
    summary?: {
      heading: string;
      minutesTogether?: number;
      wordsPlayed?: number;
      words?: Array<{ word: string; confident: boolean }>;
    };
  };
  CourseLockedScreen: undefined | { courseId?: string };
  NeedsSyncScreen: undefined | { courseId?: string };
  // US-006 Slice-01 (LANE-MOBILE): the lesson-assignment happy path is re-keyed
  // from courseId to deviceId (DIV-MOBILE-DEVICEKEY). assignmentId/Version thread
  // forward for the ASSIGNMENT_CONFLICT refresh-and-retry; courseId stays for
  // back-compat with the existing browse entry.
  SendToRobotScreen: undefined | { courseId?: string };
  RobotReadyScreen: undefined | { courseId?: string; deviceId?: string; assignmentId?: string; assignmentVersion?: number; lessonTitle?: string };
  RunningScreen: undefined | { courseId?: string; deviceId?: string; assignmentId?: string; lessonTitle?: string };
  CompanionScreen: undefined | { deviceId?: string; assignmentId?: string };

  // purchase
  PurchaseIntroScreen: undefined;
  HowItWorksScreen: undefined;
  BundleScreen: undefined;
  IncludedScreen: undefined;
  CheckoutScreen: undefined;
  OrderConfirmScreen: undefined | { orderId?: string };
  ShippingScreen: undefined | { orderId?: string };
  ArrivedScreen: undefined | { orderId?: string };
  ActivateScreen: undefined | { orderId?: string };
  FirstCourseScreen: undefined | { orderId?: string };
  PrivacyScreen: undefined;
  SubscriptionsScreen: undefined | { orderId?: string };

  // lesson-demo
  LessonDemoHomeScreen: undefined;
  LessonRoadmapScreen: undefined | { ageBand?: import('@/features/lesson-demo/types').LessonAgeBand };
  LessonSessionScreen: undefined | { week?: number; day?: number; ageBand?: import('@/features/lesson-demo/types').LessonAgeBand };
  LessonShowcaseScreen: undefined | { ageBand?: import('@/features/lesson-demo/types').LessonAgeBand };
  ParentLessonSummaryScreen: undefined | { lessonId?: string; ageBand?: import('@/features/lesson-demo/types').LessonAgeBand };
  RobotLessonControlScreen: undefined | { deviceId?: string; lessonId?: string; sessionIndex?: number };
  LessonPickScreen: undefined | { ageBand?: import('@/features/lesson-demo/types').LessonAgeBand };
  RobotCompanionScreen: undefined | RobotLessonDemoParams;
  RobotFullscreenLessonScreen: undefined | RobotLessonDemoParams;

  // lesson-session
  ConnectingScreen: undefined | LessonSessionParams;
  GreetingScreen: undefined | LessonSessionParams;
  LessonReadyScreen: undefined | LessonSessionParams;
  RobotListeningScreen: undefined | LessonSessionParams;
  UserSpeakingScreen: undefined | LessonSessionParams;
  RobotSpeakingScreen: undefined | LessonSessionParams;
  ThinkingScreen: undefined | LessonSessionParams;
  ActivityIntroScreen: undefined | LessonSessionParams;
  ActivityDoneScreen: undefined | LessonSessionParams;
  SuccessScreen: undefined | LessonSessionParams;
  LessonDoneScreen: undefined | LessonSessionParams & { wordsLearned?: number };
  ExitConfirmScreen: undefined | LessonSessionParams;
  RetryScreen: undefined | LessonSessionParams;
  SilenceScreen: undefined | LessonSessionParams;
  BargeinScreen: undefined | LessonSessionParams;
  GentleScreen: undefined | LessonSessionParams;
  OfftopicScreen: undefined | LessonSessionParams;
  SafetyScreen: undefined | LessonSessionParams;
  CostCappedScreen: undefined | LessonSessionParams;
  ParentStoppedScreen: undefined | LessonSessionParams;
  TimedOutScreen: undefined | LessonSessionParams;
  AudioErrorScreen: undefined | LessonSessionParams;
  AbandonedDisconnectScreen: undefined | LessonSessionParams;
  ReconnectingScreen: undefined | LessonSessionParams;

  // progress
  TodayProgressScreen: undefined;
  WordsPracticedScreen: undefined;
  LessonSummaryScreen: undefined | { lessonId?: string };
  ReviewNeededScreen: undefined;
  CelebrationScreen: undefined;

  // parent
  ParentGateScreen: undefined | { next?: 'ParentSummaryScreen' | 'ParentSettingsScreen' | 'ParentSafetyScreen' | 'ParentHistoryScreen' | 'ParentTodayScreen' | 'ParentAccountPrivacyScreen' };
  ParentSummaryScreen: undefined | { deviceId?: string; summaryDate?: string };
  ParentTodayScreen: undefined;
  ParentHistoryScreen: undefined;
  ParentSafetyScreen: undefined;
  ParentSettingsScreen: undefined;
  ParentDiagnosticLogScreen: undefined;
  ParentAccountPrivacyScreen: undefined;
  ParentLockedOutScreen: undefined;

  // device / pairing
  PairIntroScreen: undefined;
  PairSearchScreen: undefined | { reconnectMode?: boolean };
  PairFoundScreen: undefined | { deviceId?: string; serialNumber?: string; provisioningAttemptId?: string; bleDeviceId?: string; provisioningTransport?: 'ble' | 'ble_reconnect' | 'hotspot' | 'legacy_backend' };
  PairQrScanScreen: undefined | { deviceId?: string; serialNumber?: string; provisioningAttemptId?: string; bleDeviceId?: string; provisioningTransport?: 'ble' | 'ble_reconnect' | 'hotspot' | 'legacy_backend' };
  PairConnectingScreen: undefined | { deviceId?: string; serialNumber?: string; provisioningAttemptId?: string; code?: string; ssid?: string; bleDeviceId?: string; provisioningTransport?: 'ble' | 'ble_reconnect' | 'hotspot' | 'legacy_backend' };
  PairCodeScreen: undefined | { deviceId?: string; serialNumber?: string; provisioningAttemptId?: string; bleDeviceId?: string; provisioningTransport?: 'ble' | 'ble_reconnect' | 'hotspot' | 'legacy_backend' };
  PairAddScreen: undefined;
  PairRenameScreen: undefined | { deviceId?: string; serialNumber?: string; provisioningAttemptId?: string };
  PairChildProfileScreen: undefined | { pairing?: { deviceId: string; provisioningAttemptId: string; serialNumber?: string } };
  PairWifiScreen: undefined | { deviceId?: string; serialNumber?: string; provisioningAttemptId?: string; code?: string; bleDeviceId?: string; provisioningTransport?: 'ble' | 'ble_reconnect' | 'hotspot' | 'legacy_backend' };
  PairWifiPasswordScreen: undefined | { deviceId?: string; serialNumber?: string; provisioningAttemptId?: string; code?: string; ssid?: string; errorCode?: string; bleDeviceId?: string; provisioningTransport?: 'ble' | 'ble_reconnect' | 'hotspot' | 'legacy_backend' };
  PairOfflineScreen: undefined;
  PairFailedScreen: undefined | { deviceId?: string; serialNumber?: string; provisioningAttemptId?: string; code?: string; ssid?: string; errorCode?: string; bleDeviceId?: string; provisioningTransport?: 'ble' | 'ble_reconnect' | 'hotspot' | 'legacy_backend' };
  PairSuccessScreen: undefined | { deviceId?: string; serialNumber?: string; provisioningAttemptId?: string };
  PairFirstLessonScreen: undefined;

  DeviceHomeScreen: undefined;
  DeviceOverviewScreen: undefined | { deviceId?: string };
  DeviceFirmwareScreen: undefined | { deviceId?: string };
  DeviceSessionScreen: undefined | { sessionId?: string };
  DeviceLostScreen: undefined;
  LCDLessonTurnScreen: undefined;
  LCDLibraryScreen: undefined;

  // robot-mgmt
  MyRobotScreen: undefined;
  RobotStatusScreen: undefined;
  RobotBatteryScreen: undefined;
  RobotStorageScreen: undefined;
  RobotFirmwareScreen: undefined;
  RobotWifiScreen: undefined;
  RobotSoundScreen: undefined;
  MicTestScreen: undefined;
  SpeakerTestScreen: undefined;
  FactoryResetScreen: undefined;
  OfflineHelpScreen: undefined;
  SupportScreen: undefined | { context?: import('@/features/fallback/recoveryTypes').SupportContext };

  // fallback screens
  NetworkErrorScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint; attemptCount?: number };
  AppErrorScreen: undefined | { supportContext?: import('@/features/fallback/recoveryTypes').SupportContext };
  MicMissingScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint };
  VoiceFailedScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint };
  AudioRecoveryScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint };
  SafetyRedirectScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint };
  HelpFaqScreen: undefined;
  KidSettingsScreen: undefined;
  LessonResumeScreen: undefined | { checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint };

  // modals & overlays (presented as modal)
  UnlockConfirmScreen: undefined | { courseId?: string };
  ReconnectingOverlay: undefined | { attempt?: number; maxAttempts?: number; reconnectDelayMs?: number; checkpoint?: import('@/features/fallback/recoveryTypes').LessonCheckpoint; failureTarget?: typeof ROUTES.HelpFaqScreen | typeof ROUTES.HomeHubScreen };

};

export const ROUTES = {
  'LoginScreen': 'LoginScreen',
  'SplashScreen': 'SplashScreen',
  'WelcomeScreen': 'WelcomeScreen',
  'MicAskScreen': 'MicAskScreen',
  'TrustScreen': 'TrustScreen',
  'IntroListenScreen': 'IntroListenScreen',
  'IntroSpeakScreen': 'IntroSpeakScreen',
  'IntroRetryScreen': 'IntroRetryScreen',
  'IntroCelebrateScreen': 'IntroCelebrateScreen',
  'ParentConsentScreen': 'ParentConsentScreen',
  'ChildProfileScreen': 'ChildProfileScreen',
  'FirstLessonEntryScreen': 'FirstLessonEntryScreen',
  'HomeHubScreen': 'HomeHubScreen',
  'HomeChildProfileScreen': 'HomeChildProfileScreen',
  'CourseScreen': 'CourseScreen',
  'LevelScreen': 'LevelScreen',
  'UnitScreen': 'UnitScreen',
  'LessonListScreen': 'LessonListScreen',
  'LessonDetailScreen': 'LessonDetailScreen',
  'ReviewEntryScreen': 'ReviewEntryScreen',
  'DailyMissionScreen': 'DailyMissionScreen',
  'CourseLibraryScreen': 'CourseLibraryScreen',
  'CourseDetailScreen': 'CourseDetailScreen',
  'BuyCourseScreen': 'BuyCourseScreen',
  'CourseAddedScreen': 'CourseAddedScreen',
  'CourseCompleteScreen': 'CourseCompleteScreen',
  'CourseLockedScreen': 'CourseLockedScreen',
  'NeedsSyncScreen': 'NeedsSyncScreen',
  'SendToRobotScreen': 'SendToRobotScreen',
  'RobotReadyScreen': 'RobotReadyScreen',
  'RunningScreen': 'RunningScreen',
  'CompanionScreen': 'CompanionScreen',
  'PurchaseIntroScreen': 'PurchaseIntroScreen',
  'HowItWorksScreen': 'HowItWorksScreen',
  'BundleScreen': 'BundleScreen',
  'IncludedScreen': 'IncludedScreen',
  'CheckoutScreen': 'CheckoutScreen',
  'OrderConfirmScreen': 'OrderConfirmScreen',
  'ShippingScreen': 'ShippingScreen',
  'ArrivedScreen': 'ArrivedScreen',
  'ActivateScreen': 'ActivateScreen',
  'FirstCourseScreen': 'FirstCourseScreen',
  'PrivacyScreen': 'PrivacyScreen',
  'SubscriptionsScreen': 'SubscriptionsScreen',
  'LessonDemoHomeScreen': 'LessonDemoHomeScreen',
  'LessonRoadmapScreen': 'LessonRoadmapScreen',
  'LessonSessionScreen': 'LessonSessionScreen',
  'LessonShowcaseScreen': 'LessonShowcaseScreen',
  'ParentLessonSummaryScreen': 'ParentLessonSummaryScreen',
  'RobotLessonControlScreen': 'RobotLessonControlScreen',
  'LessonPickScreen': 'LessonPickScreen',
  'RobotCompanionScreen': 'RobotCompanionScreen',
  'RobotFullscreenLessonScreen': 'RobotFullscreenLessonScreen',
  'ConnectingScreen': 'ConnectingScreen',
  'GreetingScreen': 'GreetingScreen',
  'LessonReadyScreen': 'LessonReadyScreen',
  'RobotListeningScreen': 'RobotListeningScreen',
  'UserSpeakingScreen': 'UserSpeakingScreen',
  'RobotSpeakingScreen': 'RobotSpeakingScreen',
  'ThinkingScreen': 'ThinkingScreen',
  'ActivityIntroScreen': 'ActivityIntroScreen',
  'ActivityDoneScreen': 'ActivityDoneScreen',
  'SuccessScreen': 'SuccessScreen',
  'LessonDoneScreen': 'LessonDoneScreen',
  'ExitConfirmScreen': 'ExitConfirmScreen',
  'RetryScreen': 'RetryScreen',
  'SilenceScreen': 'SilenceScreen',
  'BargeinScreen': 'BargeinScreen',
  'GentleScreen': 'GentleScreen',
  'OfftopicScreen': 'OfftopicScreen',
  'SafetyScreen': 'SafetyScreen',
  'CostCappedScreen': 'CostCappedScreen',
  'ParentStoppedScreen': 'ParentStoppedScreen',
  'TimedOutScreen': 'TimedOutScreen',
  'AudioErrorScreen': 'AudioErrorScreen',
  'AbandonedDisconnectScreen': 'AbandonedDisconnectScreen',
  'ReconnectingScreen': 'ReconnectingScreen',
  'TodayProgressScreen': 'TodayProgressScreen',
  'WordsPracticedScreen': 'WordsPracticedScreen',
  'LessonSummaryScreen': 'LessonSummaryScreen',
  'ReviewNeededScreen': 'ReviewNeededScreen',
  'CelebrationScreen': 'CelebrationScreen',
  'ParentGateScreen': 'ParentGateScreen',
  'ParentSummaryScreen': 'ParentSummaryScreen',
  'ParentTodayScreen': 'ParentTodayScreen',
  'ParentHistoryScreen': 'ParentHistoryScreen',
  'ParentSafetyScreen': 'ParentSafetyScreen',
  'ParentSettingsScreen': 'ParentSettingsScreen',
  'ParentDiagnosticLogScreen': 'ParentDiagnosticLogScreen',
  'ParentAccountPrivacyScreen': 'ParentAccountPrivacyScreen',
  'ParentLockedOutScreen': 'ParentLockedOutScreen',
  'PairIntroScreen': 'PairIntroScreen',
  'PairSearchScreen': 'PairSearchScreen',
  'PairFoundScreen': 'PairFoundScreen',
  'PairQrScanScreen': 'PairQrScanScreen',
  'PairConnectingScreen': 'PairConnectingScreen',
  'PairCodeScreen': 'PairCodeScreen',
  'PairAddScreen': 'PairAddScreen',
  'PairRenameScreen': 'PairRenameScreen',
  'PairChildProfileScreen': 'PairChildProfileScreen',
  'PairWifiScreen': 'PairWifiScreen',
  'PairWifiPasswordScreen': 'PairWifiPasswordScreen',
  'PairOfflineScreen': 'PairOfflineScreen',
  'PairFailedScreen': 'PairFailedScreen',
  'PairSuccessScreen': 'PairSuccessScreen',
  'PairFirstLessonScreen': 'PairFirstLessonScreen',
  'DeviceHomeScreen': 'DeviceHomeScreen',
  'DeviceOverviewScreen': 'DeviceOverviewScreen',
  'DeviceFirmwareScreen': 'DeviceFirmwareScreen',
  'DeviceSessionScreen': 'DeviceSessionScreen',
  'DeviceLostScreen': 'DeviceLostScreen',
  'LCDLessonTurnScreen': 'LCDLessonTurnScreen',
  'LCDLibraryScreen': 'LCDLibraryScreen',
  'MyRobotScreen': 'MyRobotScreen',
  'RobotStatusScreen': 'RobotStatusScreen',
  'RobotBatteryScreen': 'RobotBatteryScreen',
  'RobotStorageScreen': 'RobotStorageScreen',
  'RobotFirmwareScreen': 'RobotFirmwareScreen',
  'RobotWifiScreen': 'RobotWifiScreen',
  'RobotSoundScreen': 'RobotSoundScreen',
  'MicTestScreen': 'MicTestScreen',
  'SpeakerTestScreen': 'SpeakerTestScreen',
  'FactoryResetScreen': 'FactoryResetScreen',
  'OfflineHelpScreen': 'OfflineHelpScreen',
  'SupportScreen': 'SupportScreen',
  'NetworkErrorScreen': 'NetworkErrorScreen',
  'AppErrorScreen': 'AppErrorScreen',
  'MicMissingScreen': 'MicMissingScreen',
  'VoiceFailedScreen': 'VoiceFailedScreen',
  'AudioRecoveryScreen': 'AudioRecoveryScreen',
  'SafetyRedirectScreen': 'SafetyRedirectScreen',
  'HelpFaqScreen': 'HelpFaqScreen',
  'KidSettingsScreen': 'KidSettingsScreen',
  'LessonResumeScreen': 'LessonResumeScreen',
  'UnlockConfirmScreen': 'UnlockConfirmScreen',
  'ReconnectingOverlay': 'ReconnectingOverlay',
} as const satisfies { readonly [RouteName in keyof RootStackParamList]: RouteName };
