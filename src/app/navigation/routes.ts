export type RootStackParamList = {
  // auth (tbot-design flow only)
  LoginScreen: undefined;
  LoginErrorScreen: undefined;
  ChildProfileScreen: undefined;

  // onboarding (tbot-design flow only — kid intro)
  // TODO(POST-PR5-PARENT-ONBOARDING-RE-IMPLEMENTATION):
  // re-implement CoppaConsent/HouseholdCreate/AddChild/InterestSetup/
  // DeviceSetupIntro/VoiceTest under tbot-design design language before
  // legal sign-off for under-13 users.
  SplashScreen: undefined;
  WelcomeScreen: undefined;
  MicAskScreen: undefined;
  TrustScreen: undefined;
  IntroListenScreen: undefined;
  IntroSpeakScreen: undefined;
  IntroRetryScreen: undefined;
  IntroCelebrateScreen: undefined;
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
  FirstCourseScreen: undefined;
  PrivacyScreen: undefined;
  SubscriptionsScreen: undefined;

  // lesson-session
  ConnectingScreen: undefined;
  GreetingScreen: undefined;
  LessonReadyScreen: undefined;
  RobotListeningScreen: undefined;
  UserSpeakingScreen: undefined;
  RobotSpeakingScreen: undefined;
  ThinkingScreen: undefined;
  ActivityIntroScreen: undefined | { activityId?: string };
  ActivityDoneScreen: undefined | { activityId?: string };
  SuccessScreen: undefined;
  LessonDoneScreen: undefined | { lessonId?: string };
  ExitConfirmScreen: undefined;
  RetryScreen: undefined;
  SilenceScreen: undefined;
  BargeinScreen: undefined;
  GentleScreen: undefined;
  OfftopicScreen: undefined;
  SafetyScreen: undefined;
  CostCappedScreen: undefined;
  ParentStoppedScreen: undefined;
  TimedOutScreen: undefined;
  AudioErrorScreen: undefined;
  AbandonedDisconnectScreen: undefined;
  ReconnectingScreen: undefined;

  // progress
  TodayProgressScreen: undefined;
  WordsPracticedScreen: undefined;
  LessonSummaryScreen: undefined | { lessonId?: string };
  ReviewNeededScreen: undefined;
  CelebrationScreen: undefined;

  // parent
  ParentGateScreen: undefined;
  ParentSummaryScreen: undefined;
  ParentTodayScreen: undefined;
  ParentHistoryScreen: undefined;
  ParentSafetyScreen: undefined;
  ParentSettingsScreen: undefined;
  ParentLockedOutScreen: undefined;

  // device / pairing
  PairIntroScreen: undefined;
  PairSearchScreen: undefined;
  PairFoundScreen: undefined | { deviceId?: string };
  PairConnectingScreen: undefined | { deviceId?: string };
  PairCodeScreen: undefined | { deviceId?: string };
  PairAddScreen: undefined;
  PairRenameScreen: undefined | { deviceId?: string };
  PairWifiScreen: undefined | { deviceId?: string };
  PairWifiPasswordScreen: undefined | { deviceId?: string; ssid?: string };
  PairOfflineScreen: undefined;
  PairFailedScreen: undefined;
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
  SupportScreen: undefined;

  // fallback screens
  NetworkErrorScreen: undefined;
  AppErrorScreen: undefined;
  MicMissingScreen: undefined;
  VoiceFailedScreen: undefined;
  AudioRecoveryScreen: undefined;
  SafetyRedirectScreen: undefined;
  HelpFaqScreen: undefined;
  KidSettingsScreen: undefined;
  LessonResumeScreen: undefined;

  // modals & overlays (presented as modal)
  UnlockConfirmScreen: undefined | { courseId?: string };
  ReconnectingOverlay: undefined;

  // phantom routes referenced by screens (not yet wired to real screens)
  ListenScreen: undefined;
  SpeakScreen: undefined;
  DevicePairWifiScreen: undefined;
};
