import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import { MainTabs } from './MainTabs';
import ListenScreen from '../screens/ListenScreen';
import SpeakScreen from '../screens/SpeakScreen';
import DevicePairWifiScreen from '../screens/DevicePairWifiScreen';

// fallback feature screens (PR5 wave A)
import NetworkErrorScreen from '@/features/fallback/screens/NetworkErrorScreen';
import AppErrorScreen from '@/features/fallback/screens/AppErrorScreen';
import MicMissingScreen from '@/features/fallback/screens/MicMissingScreen';
import VoiceFailedScreen from '@/features/fallback/screens/VoiceFailedScreen';
import AudioRecoveryScreen from '@/features/fallback/screens/AudioRecoveryScreen';
import SafetyRedirectScreen from '@/features/fallback/screens/SafetyRedirectScreen';
import HelpFaqScreen from '@/features/fallback/screens/HelpFaqScreen';
import KidSettingsScreen from '@/features/fallback/screens/KidSettingsScreen';
import LessonResumeScreen from '@/features/fallback/screens/LessonResumeScreen';

// course (PR6-B)
import CourseScreen from '@/features/course/screens/CourseScreen';
import LevelScreen from '@/features/course/screens/LevelScreen';
import UnitScreen from '@/features/course/screens/UnitScreen';
import LessonListScreen from '@/features/course/screens/LessonListScreen';
import LessonDetailScreen from '@/features/course/screens/LessonDetailScreen';
import ReviewEntryScreen from '@/features/course/screens/ReviewEntryScreen';
import DailyMissionScreen from '@/features/course/screens/DailyMissionScreen';

// course-library (PR6-B)
import CourseLibraryScreen from '@/features/course-library/screens/CourseLibraryScreen';
import CourseDetailScreen from '@/features/course-library/screens/CourseDetailScreen';
import BuyCourseScreen from '@/features/course-library/screens/BuyCourseScreen';
import CourseAddedScreen from '@/features/course-library/screens/CourseAddedScreen';
import CourseCompleteScreen from '@/features/course-library/screens/CourseCompleteScreen';
import CourseLockedScreen from '@/features/course-library/screens/CourseLockedScreen';
import NeedsSyncScreen from '@/features/course-library/screens/NeedsSyncScreen';
import SendToRobotScreen from '@/features/course-library/screens/SendToRobotScreen';
import RobotReadyScreen from '@/features/course-library/screens/RobotReadyScreen';
import RunningScreen from '@/features/course-library/screens/RunningScreen';
import CompanionScreen from '@/features/course-library/screens/CompanionScreen';

// lesson-session (PR6-B)
import ConnectingScreen from '@/features/lesson-session/screens/ConnectingScreen';
import GreetingScreen from '@/features/lesson-session/screens/GreetingScreen';
import LessonReadyScreen from '@/features/lesson-session/screens/LessonReadyScreen';
import RobotListeningScreen from '@/features/lesson-session/screens/RobotListeningScreen';
import UserSpeakingScreen from '@/features/lesson-session/screens/UserSpeakingScreen';
import RobotSpeakingScreen from '@/features/lesson-session/screens/RobotSpeakingScreen';
import ThinkingScreen from '@/features/lesson-session/screens/ThinkingScreen';
import ActivityIntroScreen from '@/features/lesson-session/screens/ActivityIntroScreen';
import ActivityDoneScreen from '@/features/lesson-session/screens/ActivityDoneScreen';
import SuccessScreen from '@/features/lesson-session/screens/SuccessScreen';
import LessonDoneScreen from '@/features/lesson-session/screens/LessonDoneScreen';
import ExitConfirmScreen from '@/features/lesson-session/screens/ExitConfirmScreen';
import RetryScreen from '@/features/lesson-session/screens/RetryScreen';
import SilenceScreen from '@/features/lesson-session/screens/SilenceScreen';
import BargeinScreen from '@/features/lesson-session/screens/BargeinScreen';
import GentleScreen from '@/features/lesson-session/screens/GentleScreen';
import OfftopicScreen from '@/features/lesson-session/screens/OfftopicScreen';
import SafetyScreen from '@/features/lesson-session/screens/SafetyScreen';
import CostCappedScreen from '@/features/lesson-session/screens/CostCappedScreen';
import ParentStoppedScreen from '@/features/lesson-session/screens/ParentStoppedScreen';
import TimedOutScreen from '@/features/lesson-session/screens/TimedOutScreen';
import AudioErrorScreen from '@/features/lesson-session/screens/AudioErrorScreen';
import AbandonedDisconnectScreen from '@/features/lesson-session/screens/AbandonedDisconnectScreen';
import ReconnectingScreen from '@/features/lesson-session/screens/ReconnectingScreen';

// Stub screen used for all feature routes not yet migrated (PR7 replaces remaining)
function StubScreen() {
  return <View style={{ flex: 1 }} />;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

// Main authenticated stack: tabs root + domain screens (stubs until PR7) + modal group
export function ModalStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeHubScreen" component={MainTabs} />

      {/* course — wired in PR6 */}
      <Stack.Screen name="CourseScreen" component={CourseScreen} />
      <Stack.Screen name="LevelScreen" component={LevelScreen} />
      <Stack.Screen name="UnitScreen" component={UnitScreen} />
      <Stack.Screen name="LessonListScreen" component={LessonListScreen} />
      <Stack.Screen name="LessonDetailScreen" component={LessonDetailScreen} />
      <Stack.Screen name="ReviewEntryScreen" component={ReviewEntryScreen} />
      <Stack.Screen name="DailyMissionScreen" component={DailyMissionScreen} />

      {/* course-library — wired in PR6 */}
      <Stack.Screen name="CourseLibraryScreen" component={CourseLibraryScreen} />
      <Stack.Screen name="CourseDetailScreen" component={CourseDetailScreen} />
      <Stack.Screen name="BuyCourseScreen" component={BuyCourseScreen} />
      <Stack.Screen name="CourseAddedScreen" component={CourseAddedScreen} />
      <Stack.Screen name="CourseCompleteScreen" component={CourseCompleteScreen} />
      <Stack.Screen name="CourseLockedScreen" component={CourseLockedScreen} />
      <Stack.Screen name="NeedsSyncScreen" component={NeedsSyncScreen} />
      <Stack.Screen name="SendToRobotScreen" component={SendToRobotScreen} />
      <Stack.Screen name="RobotReadyScreen" component={RobotReadyScreen} />
      <Stack.Screen name="RunningScreen" component={RunningScreen} />
      <Stack.Screen name="CompanionScreen" component={CompanionScreen} />

      {/* purchase — TODO(PR7) */}
      <Stack.Screen name="PurchaseIntroScreen" component={StubScreen} />
      <Stack.Screen name="HowItWorksScreen" component={StubScreen} />
      <Stack.Screen name="BundleScreen" component={StubScreen} />
      <Stack.Screen name="IncludedScreen" component={StubScreen} />
      <Stack.Screen name="CheckoutScreen" component={StubScreen} />
      <Stack.Screen name="OrderConfirmScreen" component={StubScreen} />
      <Stack.Screen name="ShippingScreen" component={StubScreen} />
      <Stack.Screen name="ArrivedScreen" component={StubScreen} />
      <Stack.Screen name="ActivateScreen" component={StubScreen} />
      <Stack.Screen name="FirstCourseScreen" component={StubScreen} />
      <Stack.Screen name="PrivacyScreen" component={StubScreen} />
      <Stack.Screen name="SubscriptionsScreen" component={StubScreen} />

      {/* lesson-session — wired in PR6 */}
      <Stack.Screen name="ConnectingScreen" component={ConnectingScreen} />
      <Stack.Screen name="GreetingScreen" component={GreetingScreen} />
      <Stack.Screen name="LessonReadyScreen" component={LessonReadyScreen} />
      <Stack.Screen name="RobotListeningScreen" component={RobotListeningScreen} />
      <Stack.Screen name="UserSpeakingScreen" component={UserSpeakingScreen} />
      <Stack.Screen name="RobotSpeakingScreen" component={RobotSpeakingScreen} />
      <Stack.Screen name="ThinkingScreen" component={ThinkingScreen} />
      <Stack.Screen name="ActivityIntroScreen" component={ActivityIntroScreen} />
      <Stack.Screen name="ActivityDoneScreen" component={ActivityDoneScreen} />
      <Stack.Screen name="SuccessScreen" component={SuccessScreen} />
      <Stack.Screen name="LessonDoneScreen" component={LessonDoneScreen} />
      <Stack.Screen name="ExitConfirmScreen" component={ExitConfirmScreen} />
      <Stack.Screen name="RetryScreen" component={RetryScreen} />
      <Stack.Screen name="SilenceScreen" component={SilenceScreen} />
      <Stack.Screen name="BargeinScreen" component={BargeinScreen} />
      <Stack.Screen name="GentleScreen" component={GentleScreen} />
      <Stack.Screen name="OfftopicScreen" component={OfftopicScreen} />
      <Stack.Screen name="SafetyScreen" component={SafetyScreen} />
      <Stack.Screen name="CostCappedScreen" component={CostCappedScreen} />
      <Stack.Screen name="ParentStoppedScreen" component={ParentStoppedScreen} />
      <Stack.Screen name="TimedOutScreen" component={TimedOutScreen} />
      <Stack.Screen name="AudioErrorScreen" component={AudioErrorScreen} />
      <Stack.Screen name="AbandonedDisconnectScreen" component={AbandonedDisconnectScreen} />
      <Stack.Screen name="ReconnectingScreen" component={ReconnectingScreen} />

      {/* progress — TODO(PR7) */}
      <Stack.Screen name="TodayProgressScreen" component={StubScreen} />
      <Stack.Screen name="WordsPracticedScreen" component={StubScreen} />
      <Stack.Screen name="LessonSummaryScreen" component={StubScreen} />
      <Stack.Screen name="ReviewNeededScreen" component={StubScreen} />
      <Stack.Screen name="CelebrationScreen" component={StubScreen} />

      {/* parent — TODO(PR7) */}
      <Stack.Screen name="ParentGateScreen" component={StubScreen} />
      <Stack.Screen name="ParentSummaryScreen" component={StubScreen} />
      <Stack.Screen name="ParentTodayScreen" component={StubScreen} />
      <Stack.Screen name="ParentHistoryScreen" component={StubScreen} />
      <Stack.Screen name="ParentSafetyScreen" component={StubScreen} />
      <Stack.Screen name="ParentSettingsScreen" component={StubScreen} />
      <Stack.Screen name="ParentLockedOutScreen" component={StubScreen} />

      {/* device / pairing — TODO(PR7) */}
      <Stack.Screen name="PairIntroScreen" component={StubScreen} />
      <Stack.Screen name="PairSearchScreen" component={StubScreen} />
      <Stack.Screen name="PairFoundScreen" component={StubScreen} />
      <Stack.Screen name="PairConnectingScreen" component={StubScreen} />
      <Stack.Screen name="PairCodeScreen" component={StubScreen} />
      <Stack.Screen name="PairAddScreen" component={StubScreen} />
      <Stack.Screen name="PairRenameScreen" component={StubScreen} />
      <Stack.Screen name="PairWifiScreen" component={StubScreen} />
      <Stack.Screen name="PairWifiPasswordScreen" component={StubScreen} />
      <Stack.Screen name="PairOfflineScreen" component={StubScreen} />
      <Stack.Screen name="PairFailedScreen" component={StubScreen} />
      <Stack.Screen name="PairSuccessScreen" component={StubScreen} />
      <Stack.Screen name="PairFirstLessonScreen" component={StubScreen} />
      <Stack.Screen name="DeviceHomeScreen" component={StubScreen} />
      <Stack.Screen name="DeviceOverviewScreen" component={StubScreen} />
      <Stack.Screen name="DeviceFirmwareScreen" component={StubScreen} />
      <Stack.Screen name="DeviceSessionScreen" component={StubScreen} />
      <Stack.Screen name="DeviceLostScreen" component={StubScreen} />
      <Stack.Screen name="LCDLessonTurnScreen" component={StubScreen} />
      <Stack.Screen name="LCDLibraryScreen" component={StubScreen} />

      {/* robot-mgmt — TODO(PR7) */}
      <Stack.Screen name="MyRobotScreen" component={StubScreen} />
      <Stack.Screen name="RobotStatusScreen" component={StubScreen} />
      <Stack.Screen name="RobotBatteryScreen" component={StubScreen} />
      <Stack.Screen name="RobotStorageScreen" component={StubScreen} />
      <Stack.Screen name="RobotFirmwareScreen" component={StubScreen} />
      <Stack.Screen name="RobotWifiScreen" component={StubScreen} />
      <Stack.Screen name="RobotSoundScreen" component={StubScreen} />
      <Stack.Screen name="MicTestScreen" component={StubScreen} />
      <Stack.Screen name="SpeakerTestScreen" component={StubScreen} />
      <Stack.Screen name="FactoryResetScreen" component={StubScreen} />
      <Stack.Screen name="OfflineHelpScreen" component={StubScreen} />
      <Stack.Screen name="SupportScreen" component={StubScreen} />

      {/* fallback — wired in PR5 */}
      <Stack.Screen name="NetworkErrorScreen" component={NetworkErrorScreen} />
      <Stack.Screen name="AppErrorScreen" component={AppErrorScreen} />
      <Stack.Screen name="MicMissingScreen" component={MicMissingScreen} />
      <Stack.Screen name="VoiceFailedScreen" component={VoiceFailedScreen} />
      <Stack.Screen name="AudioRecoveryScreen" component={AudioRecoveryScreen} />
      <Stack.Screen name="SafetyRedirectScreen" component={SafetyRedirectScreen} />
      <Stack.Screen name="HelpFaqScreen" component={HelpFaqScreen} />
      <Stack.Screen name="KidSettingsScreen" component={KidSettingsScreen} />
      <Stack.Screen name="LessonResumeScreen" component={LessonResumeScreen} />

      {/* phantom routes — wired PR6 to real lesson-session components
          (cast suppresses the alias module's route-name narrowing) */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Stack.Screen name="ListenScreen" component={ListenScreen as any} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Stack.Screen name="SpeakScreen" component={SpeakScreen as any} />
      <Stack.Screen name="DevicePairWifiScreen" component={DevicePairWifiScreen} />

      {/* modals — TODO(PR7): replace StubScreen with real modal components */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="UnlockConfirmScreen" component={StubScreen} />
        <Stack.Screen name="ReconnectingOverlay" component={StubScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
