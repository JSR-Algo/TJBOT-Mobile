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
  ChildProfileScreen: undefined;
  FirstLessonEntryScreen: undefined;

  // home
  HomeHubScreen: undefined;

  // course
  CourseScreen: undefined | { courseId?: string };
  LevelScreen: undefined | { levelId?: string };
  UnitScreen: undefined | { unitId?: string };
  LessonListScreen: undefined | { unitId?: string };
  LessonDetailScreen: undefined | { lessonId?: string };
  ReviewEntryScreen: undefined;
  DailyMissionScreen: undefined;

  // course-library
  CourseLibraryScreen: undefined;
  CourseDetailScreen: undefined | { courseId?: string };
  BuyCourseScreen: undefined | { courseId?: string };
  CourseAddedScreen: undefined | { courseId?: string };
  CourseCompleteScreen: undefined | { courseId?: string };
  CourseLockedScreen: undefined | { courseId?: string };
  NeedsSyncScreen: undefined | { courseId?: string };
  SendToRobotScreen: undefined | { courseId?: string };
  RobotReadyScreen: undefined | { courseId?: string };
  RunningScreen: undefined | { courseId?: string };
  CompanionScreen: undefined;

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

  // lesson-session
  ConnectingScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  GreetingScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  LessonReadyScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  RobotListeningScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  UserSpeakingScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  RobotSpeakingScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  ThinkingScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  ActivityIntroScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  ActivityDoneScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  SuccessScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  LessonDoneScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect'; wordsLearned?: number };
  ExitConfirmScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  RetryScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  SilenceScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  BargeinScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  GentleScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  OfftopicScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  SafetyScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  CostCappedScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  ParentStoppedScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  TimedOutScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  AudioErrorScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  AbandonedDisconnectScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };
  ReconnectingScreen: undefined | { courseId?: string; courseTitle?: string; unitId?: string; unitTitle?: string; lessonId?: string; lessonTitle?: string; contentVersion?: string; mode?: 'lesson' | 'review' | 'mission'; activityIndex?: number; activityTotal?: number; beatIndex?: number; lastPrompt?: string; lastAcceptedProgress?: number; voiceStateBeforeInterruption?: string; resumeReason?: 'normal' | 'reconnecting' | 'audio_error' | 'timed_out' | 'exit_confirm' | 'parent_stopped' | 'cost_capped' | 'abandoned_disconnect' };

  // progress
  TodayProgressScreen: undefined;
  WordsPracticedScreen: undefined;
  LessonSummaryScreen: undefined | { lessonId?: string };
  ReviewNeededScreen: undefined;
  CelebrationScreen: undefined;
  LessonDemoHomeScreen: undefined;
  LessonDemoRoadmapScreen: undefined | { ageBand?: '4-6' | '7-9' | '10-11' };
  LessonDemoSessionScreen: undefined | { week?: number; day?: number; ageBand?: '4-6' | '7-9' | '10-11' };
  LessonDemoParentSummaryScreen: undefined | { lessonId?: string; ageBand?: '4-6' | '7-9' | '10-11' };
  LessonDemoShowcaseScreen: undefined | { ageBand?: '4-6' | '7-9' | '10-11' };
  LessonPlannerScreen: undefined | { childId?: string };
  ChildPracticeScreen: undefined | { childId?: string; sessionId?: string };
  RobotLessonControlScreen: undefined | { deviceId?: string; lessonId?: string; sessionIndex?: number };

  // parent
  ParentGateScreen: undefined | { next?: 'ParentSummaryScreen' | 'ParentSettingsScreen' | 'ParentSafetyScreen' | 'ParentHistoryScreen' | 'ParentTodayScreen' | 'ParentAccountPrivacyScreen' };
  ParentSummaryScreen: undefined | { deviceId?: string; summaryDate?: string };
  ParentTodayScreen: undefined;
  ParentHistoryScreen: undefined;
  ParentSafetyScreen: undefined;
  ParentSettingsScreen: undefined;
  ParentAccountPrivacyScreen: undefined;
  ParentLockedOutScreen: undefined;

  // device / pairing
  PairIntroScreen: undefined;
  PairSearchScreen: undefined;
  PairFoundScreen: undefined | { deviceId?: string };
  PairConnectingScreen: undefined | { deviceId?: string; code?: string; ssid?: string; password?: string };
  PairCodeScreen: undefined | { deviceId?: string };
  PairAddScreen: undefined;
  PairRenameScreen: undefined | { deviceId?: string };
  PairWifiScreen: undefined | { deviceId?: string; code?: string };
  PairWifiPasswordScreen: undefined | { deviceId?: string; code?: string; ssid?: string };
  PairOfflineScreen: undefined;
  PairFailedScreen: undefined | { deviceId?: string; code?: string; ssid?: string };
  PairSuccessScreen: undefined | { deviceId?: string };
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
  'ChildProfileScreen': 'ChildProfileScreen',
  'FirstLessonEntryScreen': 'FirstLessonEntryScreen',
  'HomeHubScreen': 'HomeHubScreen',
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
  'LessonDemoHomeScreen': 'LessonDemoHomeScreen',
  'LessonDemoRoadmapScreen': 'LessonDemoRoadmapScreen',
  'LessonDemoSessionScreen': 'LessonDemoSessionScreen',
  'LessonDemoParentSummaryScreen': 'LessonDemoParentSummaryScreen',
  'LessonDemoShowcaseScreen': 'LessonDemoShowcaseScreen',
  'LessonPlannerScreen': 'LessonPlannerScreen',
  'ChildPracticeScreen': 'ChildPracticeScreen',
  'RobotLessonControlScreen': 'RobotLessonControlScreen',
  'ParentGateScreen': 'ParentGateScreen',
  'ParentSummaryScreen': 'ParentSummaryScreen',
  'ParentTodayScreen': 'ParentTodayScreen',
  'ParentHistoryScreen': 'ParentHistoryScreen',
  'ParentSafetyScreen': 'ParentSafetyScreen',
  'ParentSettingsScreen': 'ParentSettingsScreen',
  'ParentAccountPrivacyScreen': 'ParentAccountPrivacyScreen',
  'ParentLockedOutScreen': 'ParentLockedOutScreen',
  'PairIntroScreen': 'PairIntroScreen',
  'PairSearchScreen': 'PairSearchScreen',
  'PairFoundScreen': 'PairFoundScreen',
  'PairConnectingScreen': 'PairConnectingScreen',
  'PairCodeScreen': 'PairCodeScreen',
  'PairAddScreen': 'PairAddScreen',
  'PairRenameScreen': 'PairRenameScreen',
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
