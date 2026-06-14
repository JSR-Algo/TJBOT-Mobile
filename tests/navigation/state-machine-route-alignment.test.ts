import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ROUTE_MAP } from '@/navigation/routeMap';
import { ROUTES } from '@/navigation/routes';
import type { FeatureRouteOwner } from '@/navigation/types';

const root = join(__dirname, '..', '..');
const featureStatePaths: Record<FeatureRouteOwner, { jsPath: string; tsPath: string }> = {
  auth: {
    tsPath: join(root, 'src', 'features', 'auth', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'auth', 'states.js'),
  },
  onboarding: {
    tsPath: join(root, 'src', 'features', 'onboarding', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'onboarding', 'states.js'),
  },
  home: {
    tsPath: join(root, 'src', 'features', 'home', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'home', 'states.js'),
  },
  course: {
    tsPath: join(root, 'src', 'features', 'course', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'course', 'states.js'),
  },
  'course-library': {
    tsPath: join(root, 'src', 'features', 'course-library', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'course-library', 'states.js'),
  },
  purchase: {
    tsPath: join(root, 'src', 'features', 'purchase', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'purchase', 'states.js'),
  },
  'lesson-session': {
    tsPath: join(root, 'src', 'features', 'lesson-session', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'lesson-session', 'states.js'),
  },
  progress: {
    tsPath: join(root, 'src', 'features', 'progress', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'progress', 'states.js'),
  },
  parent: {
    tsPath: join(root, 'src', 'features', 'parent', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'parent', 'states.js'),
  },
  device: {
    tsPath: join(root, 'src', 'features', 'device', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'device', 'states.js'),
  },
  'robot-mgmt': {
    tsPath: join(root, 'src', 'features', 'robot-mgmt', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'robot-mgmt', 'states.js'),
  },
  fallback: {
    tsPath: join(root, 'src', 'features', 'fallback', 'states.ts'),
    jsPath: join(root, 'src', 'features', 'fallback', 'states.js'),
  },
};

function readFeatureStates(feature: FeatureRouteOwner): string {
  const { tsPath, jsPath } = featureStatePaths[feature];
  if (existsSync(tsPath)) return readFileSync(tsPath, 'utf8');

  if (existsSync(jsPath)) return readFileSync(jsPath, 'utf8');

  return '';
}

function stateIds(feature: FeatureRouteOwner): readonly string[] {
  return Array.from(readFeatureStates(feature).matchAll(/\{\s*id:\s*'([^']+)'/g), match => match[1]);
}

function routeStateMachineId(route: keyof typeof ROUTE_MAP): unknown {
  return Reflect.get(ROUTE_MAP[route], 'stateMachineId');
}

function routeStateMachineIds(route: keyof typeof ROUTE_MAP): unknown {
  return Reflect.get(ROUTE_MAP[route], 'stateMachineIds');
}

describe('state-machine route alignment', () => {
  it('maps every state-machine route to a state owned by the same feature', () => {
    const offenders = Object.entries(ROUTE_MAP)
      .filter(([, entry]) => entry.role === 'state-machine')
      .map(([route, entry]) => {
        const stateMachineId = routeStateMachineId(route as keyof typeof ROUTE_MAP);
        const featureStateIds = stateIds(entry.feature);

        return typeof stateMachineId === 'string' && featureStateIds.includes(stateMachineId)
          ? null
          : `${route} (${entry.feature}) -> ${String(stateMachineId)}`;
      })
      .filter((entry): entry is string => entry !== null);

    expect(offenders).toEqual([]);
  });

  it('maps every lesson-session state to exactly one route', () => {
    const lessonStateIds = stateIds('lesson-session');
    const routeStateIds = Object.values(ROUTE_MAP)
      .filter(entry => entry.feature === 'lesson-session')
      .map(entry => routeStateMachineId(entry.route as keyof typeof ROUTE_MAP))
      .filter((stateMachineId): stateMachineId is string => typeof stateMachineId === 'string');

    expect(routeStateIds.sort()).toEqual([...lessonStateIds].sort());
  });

  it('maps purchase modal business flow routes to purchase states in order', () => {
    const purchaseStateIds = stateIds('purchase');
    const purchaseRouteStateIds = Object.values(ROUTE_MAP)
      .filter(entry => entry.feature === 'purchase')
      .map(entry => routeStateMachineId(entry.route as keyof typeof ROUTE_MAP));

    expect(purchaseRouteStateIds).toEqual(purchaseStateIds);
  });

  it('maps every device setup and device management route to a device state', () => {
    const expectedDeviceStateIds = new Map([
      [ROUTES.DeviceHomeScreen, 'dv_home'],
      [ROUTES.DeviceOverviewScreen, 'dv_overview'],
      [ROUTES.PairAddScreen, 'dv_pair_add'],
      [ROUTES.PairIntroScreen, 'dv_pair_intro'],
      [ROUTES.PairSearchScreen, 'dv_pair_search'],
      [ROUTES.PairFoundScreen, 'dv_pair_found'],
      [ROUTES.PairCodeScreen, 'dv_pair_code'],
      [ROUTES.PairWifiScreen, 'dv_pair_wifi'],
      [ROUTES.PairWifiPasswordScreen, 'dv_pair_wifi_pw'],
      [ROUTES.PairConnectingScreen, 'dv_pair_connecting'],
      [ROUTES.PairSuccessScreen, 'dv_pair_success'],
      [ROUTES.PairFailedScreen, 'dv_pair_failed'],
      [ROUTES.PairOfflineScreen, 'dv_pair_offline'],
      [ROUTES.PairRenameScreen, 'dv_pair_rename'],
      [ROUTES.PairFirstLessonScreen, 'dv_pair_first_lesson'],
      [ROUTES.DeviceSessionScreen, 'dv_session'],
      [ROUTES.DeviceLostScreen, 'dv_lost'],
      [ROUTES.DeviceFirmwareScreen, 'dv_firmware'],
      [ROUTES.LCDLibraryScreen, 'dv_lcd'],
      [ROUTES.LCDLessonTurnScreen, 'dv_lcd_turn'],
    ]);
    const actualDeviceStateIds = new Map(
      Object.values(ROUTE_MAP)
        .filter(entry => entry.feature === 'device')
        .map(entry => [entry.route, routeStateMachineId(entry.route as keyof typeof ROUTE_MAP)] as const),
    );

    expect(actualDeviceStateIds).toEqual(expectedDeviceStateIds);
    expect(Array.from(actualDeviceStateIds.values()).sort()).toEqual([...stateIds('device')].sort());
  });

  it('maps every course-library route to a course-library state', () => {
    const expectedCourseLibraryStateIds = new Map([
      [ROUTES.CourseLibraryScreen, 'cl_library'],
      [ROUTES.CourseDetailScreen, 'cl_detail'],
      [ROUTES.BuyCourseScreen, 'cl_add_free'],
      [ROUTES.UnlockConfirmScreen, 'cl_unlock_confirm'],
      [ROUTES.CourseAddedScreen, 'cl_added'],
      [ROUTES.SendToRobotScreen, 'cl_send'],
      [ROUTES.RobotReadyScreen, 'cl_robot_ready'],
      [ROUTES.RunningScreen, 'cl_running'],
      [ROUTES.CompanionScreen, 'cl_companion'],
      [ROUTES.CourseCompleteScreen, 'cl_complete'],
      [ROUTES.NeedsSyncScreen, 'cl_needs_sync'],
      [ROUTES.CourseLockedScreen, 'cl_locked'],
    ]);
    const actualCourseLibraryStateIds = new Map(
      Object.values(ROUTE_MAP)
        .filter(entry => entry.feature === 'course-library')
        .map(entry => [entry.route, routeStateMachineId(entry.route as keyof typeof ROUTE_MAP)] as const),
    );

    expect(actualCourseLibraryStateIds).toEqual(expectedCourseLibraryStateIds);
    expect(Array.from(actualCourseLibraryStateIds.values()).sort()).toEqual([...stateIds('course-library')].sort());
  });

  it('maps every progress route to a progress state', () => {
    const expectedProgressStateIds = new Map([
      [ROUTES.TodayProgressScreen, 'today_progress'],
      [ROUTES.WordsPracticedScreen, 'words_practiced'],
      [ROUTES.LessonSummaryScreen, 'lesson_summary'],
      [ROUTES.ReviewNeededScreen, 'review_needed'],
      [ROUTES.CelebrationScreen, 'celebration'],
      [ROUTES.LessonDemoHomeScreen, 'lesson_demo_home'],
      [ROUTES.LessonDemoRoadmapScreen, 'lesson_demo_roadmap'],
      [ROUTES.LessonDemoSessionScreen, 'lesson_demo_session'],
      [ROUTES.LessonDemoParentSummaryScreen, 'lesson_demo_parent_summary'],
      [ROUTES.LessonDemoShowcaseScreen, 'lesson_demo_showcase'],
      [ROUTES.LessonPlannerScreen, 'lesson_planner'],
      [ROUTES.ChildPracticeScreen, 'child_practice'],
      [ROUTES.RobotLessonControlScreen, 'robot_lesson_control'],
    ]);
    const actualProgressStateIds = new Map(
      Object.values(ROUTE_MAP)
        .filter(entry => entry.feature === 'progress')
        .map(entry => [entry.route, routeStateMachineId(entry.route as keyof typeof ROUTE_MAP)] as const),
    );

    expect(actualProgressStateIds).toEqual(expectedProgressStateIds);
    expect(Array.from(actualProgressStateIds.values()).sort()).toEqual([...stateIds('progress')].sort());
  });

  it('maps every course route to a course state', () => {
    const expectedCourseStateIds = new Map([
      [ROUTES.CourseScreen, 'course'],
      [ROUTES.LevelScreen, 'level'],
      [ROUTES.UnitScreen, 'unit'],
      [ROUTES.LessonListScreen, 'lesson_list'],
      [ROUTES.LessonDetailScreen, 'lesson_detail'],
      [ROUTES.ReviewEntryScreen, 'review_entry'],
      [ROUTES.DailyMissionScreen, 'daily_mission'],
    ]);
    const actualCourseStateIds = new Map(
      Object.values(ROUTE_MAP)
        .filter(entry => entry.feature === 'course')
        .map(entry => [entry.route, routeStateMachineId(entry.route as keyof typeof ROUTE_MAP)] as const),
    );

    expect(actualCourseStateIds).toEqual(expectedCourseStateIds);
    expect(Array.from(actualCourseStateIds.values()).sort()).toEqual([...stateIds('course')].sort());
  });

  it('maps every parent route to a parent state', () => {
    const expectedParentStateIds = new Map([
      [ROUTES.ParentGateScreen, 'parent_gate'],
      [ROUTES.ParentLockedOutScreen, 'parent_locked_out'],
      [ROUTES.ParentSummaryScreen, 'parent_summary'],
      [ROUTES.ParentTodayScreen, 'parent_today'],
      [ROUTES.ParentHistoryScreen, 'parent_history'],
      [ROUTES.ParentSafetyScreen, 'parent_safety'],
      [ROUTES.ParentSettingsScreen, 'parent_settings'],
      [ROUTES.ParentAccountPrivacyScreen, 'parent_account_privacy'],
    ]);
    const actualParentStateIds = new Map(
      Object.values(ROUTE_MAP)
        .filter(entry => entry.feature === 'parent')
        .map(entry => [entry.route, routeStateMachineId(entry.route as keyof typeof ROUTE_MAP)] as const),
    );

    expect(actualParentStateIds).toEqual(expectedParentStateIds);
    expect(Array.from(actualParentStateIds.values()).sort()).toEqual([...stateIds('parent')].sort());
  });

  it('maps every robot management route to a robot management state', () => {
    const expectedRobotMgmtStateIds = new Map([
      [ROUTES.MyRobotScreen, 'rm_my_robot'],
      [ROUTES.RobotStatusScreen, 'rm_status'],
      [ROUTES.RobotBatteryScreen, 'rm_battery'],
      [ROUTES.RobotWifiScreen, 'rm_wifi'],
      [ROUTES.RobotStorageScreen, 'rm_storage'],
      [ROUTES.RobotFirmwareScreen, 'rm_firmware'],
      [ROUTES.RobotSoundScreen, 'rm_sound'],
      [ROUTES.MicTestScreen, 'rm_mic_test'],
      [ROUTES.SpeakerTestScreen, 'rm_speaker_test'],
      [ROUTES.FactoryResetScreen, 'rm_factory'],
      [ROUTES.OfflineHelpScreen, 'rm_offline_help'],
      [ROUTES.SupportScreen, 'rm_support'],
    ]);
    const actualRobotMgmtStateIds = new Map(
      Object.values(ROUTE_MAP)
        .filter(entry => entry.feature === 'robot-mgmt')
        .map(entry => [entry.route, routeStateMachineId(entry.route as keyof typeof ROUTE_MAP)] as const),
    );

    expect(actualRobotMgmtStateIds).toEqual(expectedRobotMgmtStateIds);
    expect(Array.from(actualRobotMgmtStateIds.values()).sort()).toEqual([...stateIds('robot-mgmt')].sort());
  });

  it('maps every fallback route to a fallback state', () => {
    const expectedFallbackStateIds = new Map([
      [ROUTES.KidSettingsScreen, 'kid_settings'],
      [ROUTES.MicMissingScreen, 'mic_missing'],
      [ROUTES.NetworkErrorScreen, 'network_error'],
      [ROUTES.VoiceFailedScreen, 'voice_failed'],
      [ROUTES.SafetyRedirectScreen, 'safety_redirect'],
      [ROUTES.HelpFaqScreen, 'help_faq'],
      [ROUTES.ReconnectingOverlay, 'reconnecting_overlay'],
      [ROUTES.AudioRecoveryScreen, 'audio_recovery'],
      [ROUTES.LessonResumeScreen, 'lesson_resume'],
      [ROUTES.AppErrorScreen, 'app_error'],
    ]);
    const actualFallbackStateIds = new Map(
      Object.values(ROUTE_MAP)
        .filter(entry => entry.feature === 'fallback')
        .map(entry => [entry.route, routeStateMachineId(entry.route as keyof typeof ROUTE_MAP)] as const),
    );

    expect(actualFallbackStateIds).toEqual(expectedFallbackStateIds);
    expect(Array.from(actualFallbackStateIds.values()).sort()).toEqual([...stateIds('fallback')].sort());
  });

  it('maps every auth route to an auth state', () => {
    const expectedAuthStateIds = new Map([
      [ROUTES.SplashScreen, 'onb_splash'],
      [ROUTES.WelcomeScreen, 'onb_welcome'],
      [ROUTES.IntroListenScreen, 'onb_intro_listen'],
      [ROUTES.IntroSpeakScreen, 'onb_intro_speak'],
      [ROUTES.IntroRetryScreen, 'onb_intro_retry'],
      [ROUTES.IntroCelebrateScreen, 'onb_intro_celebrate'],
      [ROUTES.TrustScreen, 'onb_trust'],
      [ROUTES.LoginScreen, 'onb_login'],
    ]);
    const actualAuthStateIds = new Map(
      Object.values(ROUTE_MAP)
        .filter(entry => entry.feature === 'auth')
        .map(entry => [entry.route, routeStateMachineId(entry.route as keyof typeof ROUTE_MAP)] as const),
    );

    expect(actualAuthStateIds).toEqual(expectedAuthStateIds);
    expect(Array.from(actualAuthStateIds.values()).sort()).toEqual([...stateIds('auth')].sort());
  });

  it('maps every onboarding route to an onboarding state', () => {
    const expectedOnboardingStateIds = new Map([
      [ROUTES.ChildProfileScreen, 'onb_child'],
      [ROUTES.MicAskScreen, 'onb_mic'],
      [ROUTES.FirstLessonEntryScreen, 'onb_first_lesson'],
    ]);
    const actualOnboardingStateIds = new Map(
      Object.values(ROUTE_MAP)
        .filter(entry => entry.feature === 'onboarding')
        .map(entry => [entry.route, routeStateMachineId(entry.route as keyof typeof ROUTE_MAP)] as const),
    );

    expect(actualOnboardingStateIds).toEqual(expectedOnboardingStateIds);
    expect(Array.from(actualOnboardingStateIds.values()).sort()).toEqual([...stateIds('onboarding')].sort());
  });

  it('maps the home hub route to every home UI state it owns', () => {
    expect(routeStateMachineIds(ROUTES.HomeHubScreen)).toEqual(stateIds('home'));
  });
});
