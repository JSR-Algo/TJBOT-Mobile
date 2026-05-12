import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './navigation/routes';

// auth
import LoginScreen from '@/features/auth/screens/LoginScreen';
import LoginErrorScreen from '@/features/auth/screens/LoginErrorScreen';
import ChildProfileScreen from '@/features/auth/screens/ChildProfileScreen';

// onboarding
import SplashScreen from '@/features/onboarding/screens/SplashScreen';
import WelcomeScreen from '@/features/onboarding/screens/WelcomeScreen';
import MicAskScreen from '@/features/onboarding/screens/MicAskScreen';
import TrustScreen from '@/features/onboarding/screens/TrustScreen';
import IntroListenScreen from '@/features/onboarding/screens/IntroListenScreen';
import IntroSpeakScreen from '@/features/onboarding/screens/IntroSpeakScreen';
import IntroRetryScreen from '@/features/onboarding/screens/IntroRetryScreen';
import IntroCelebrateScreen from '@/features/onboarding/screens/IntroCelebrateScreen';
import FirstLessonEntryScreen from '@/features/onboarding/screens/FirstLessonEntryScreen';

// home
import HomeHubScreen from '@/features/home/screens/HomeHubScreen';

// course
import CourseScreen from '@/features/course/screens/CourseScreen';
import LevelScreen from '@/features/course/screens/LevelScreen';
import UnitScreen from '@/features/course/screens/UnitScreen';
import LessonListScreen from '@/features/course/screens/LessonListScreen';
import LessonDetailScreen from '@/features/course/screens/LessonDetailScreen';
import ReviewEntryScreen from '@/features/course/screens/ReviewEntryScreen';
import DailyMissionScreen from '@/features/course/screens/DailyMissionScreen';

// course-library
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
import UnlockConfirmModal from '@/features/course-library/UnlockConfirmModal';

// purchase
import PurchaseIntroScreen from '@/features/purchase/screens/PurchaseIntroScreen';
import HowItWorksScreen from '@/features/purchase/screens/HowItWorksScreen';
import BundleScreen from '@/features/purchase/screens/BundleScreen';
import IncludedScreen from '@/features/purchase/screens/IncludedScreen';
import CheckoutScreen from '@/features/purchase/screens/CheckoutScreen';
import OrderConfirmScreen from '@/features/purchase/screens/OrderConfirmScreen';
import ShippingScreen from '@/features/purchase/screens/ShippingScreen';
import ArrivedScreen from '@/features/purchase/screens/ArrivedScreen';
import ActivateScreen from '@/features/purchase/screens/ActivateScreen';
import FirstCourseScreen from '@/features/purchase/screens/FirstCourseScreen';
import PrivacyScreen from '@/features/purchase/screens/PrivacyScreen';
import SubscriptionsScreen from '@/features/purchase/screens/SubscriptionsScreen';

// lesson-session
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

// progress
import TodayProgressScreen from '@/features/progress/screens/TodayProgressScreen';
import WordsPracticedScreen from '@/features/progress/screens/WordsPracticedScreen';
import LessonSummaryScreen from '@/features/progress/screens/LessonSummaryScreen';
import ReviewNeededScreen from '@/features/progress/screens/ReviewNeededScreen';
import CelebrationScreen from '@/features/progress/screens/CelebrationScreen';

// parent
import ParentGateScreen from '@/features/parent/screens/ParentGateScreen';
import ParentSummaryScreen from '@/features/parent/screens/ParentSummaryScreen';
import ParentTodayScreen from '@/features/parent/screens/ParentTodayScreen';
import ParentHistoryScreen from '@/features/parent/screens/ParentHistoryScreen';
import ParentSafetyScreen from '@/features/parent/screens/ParentSafetyScreen';
import ParentSettingsScreen from '@/features/parent/screens/ParentSettingsScreen';
import ParentLockedOutScreen from '@/features/parent/screens/ParentLockedOutScreen';

// device / pairing
import PairIntroScreen from '@/features/device/pairing/screens/PairIntroScreen';
import PairSearchScreen from '@/features/device/pairing/screens/PairSearchScreen';
import PairFoundScreen from '@/features/device/pairing/screens/PairFoundScreen';
import PairConnectingScreen from '@/features/device/pairing/screens/PairConnectingScreen';
import PairCodeScreen from '@/features/device/pairing/screens/PairCodeScreen';
import PairAddScreen from '@/features/device/pairing/screens/PairAddScreen';
import PairRenameScreen from '@/features/device/pairing/screens/PairRenameScreen';
import PairWifiScreen from '@/features/device/pairing/screens/PairWifiScreen';
import PairWifiPasswordScreen from '@/features/device/pairing/screens/PairWifiPasswordScreen';
import PairOfflineScreen from '@/features/device/pairing/screens/PairOfflineScreen';
import PairFailedScreen from '@/features/device/pairing/screens/PairFailedScreen';
import PairSuccessScreen from '@/features/device/pairing/screens/PairSuccessScreen';
import PairFirstLessonScreen from '@/features/device/pairing/screens/PairFirstLessonScreen';

import DeviceHomeScreen from '@/features/device/screens/DeviceHomeScreen';
import DeviceOverviewScreen from '@/features/device/screens/DeviceOverviewScreen';
import DeviceFirmwareScreen from '@/features/device/screens/DeviceFirmwareScreen';
import DeviceSessionScreen from '@/features/device/screens/DeviceSessionScreen';
import DeviceLostScreen from '@/features/device/screens/DeviceLostScreen';
import LCDLessonTurnScreen from '@/features/device/screens/LCDLessonTurnScreen';
import LCDLibraryScreen from '@/features/device/screens/LCDLibraryScreen';

// robot-mgmt
import MyRobotScreen from '@/features/robot-mgmt/screens/MyRobotScreen';
import RobotStatusScreen from '@/features/robot-mgmt/screens/RobotStatusScreen';
import RobotBatteryScreen from '@/features/robot-mgmt/screens/RobotBatteryScreen';
import RobotStorageScreen from '@/features/robot-mgmt/screens/RobotStorageScreen';
import RobotFirmwareScreen from '@/features/robot-mgmt/screens/RobotFirmwareScreen';
import RobotWifiScreen from '@/features/robot-mgmt/screens/RobotWifiScreen';
import RobotSoundScreen from '@/features/robot-mgmt/screens/RobotSoundScreen';
import MicTestScreen from '@/features/robot-mgmt/screens/MicTestScreen';
import SpeakerTestScreen from '@/features/robot-mgmt/screens/SpeakerTestScreen';
import FactoryResetScreen from '@/features/robot-mgmt/screens/FactoryResetScreen';
import OfflineHelpScreen from '@/features/robot-mgmt/screens/OfflineHelpScreen';
import SupportScreen from '@/features/robot-mgmt/screens/SupportScreen';

// fallback screens
import NetworkErrorScreen from '@/features/fallback/screens/NetworkErrorScreen';
import AppErrorScreen from '@/features/fallback/screens/AppErrorScreen';
import MicMissingScreen from '@/features/fallback/screens/MicMissingScreen';
import VoiceFailedScreen from '@/features/fallback/screens/VoiceFailedScreen';
import AudioRecoveryScreen from '@/features/fallback/screens/AudioRecoveryScreen';
import SafetyRedirectScreen from '@/features/fallback/screens/SafetyRedirectScreen';
import HelpFaqScreen from '@/features/fallback/screens/HelpFaqScreen';
import KidSettingsScreen from '@/features/fallback/screens/KidSettingsScreen';
import LessonResumeScreen from '@/features/fallback/screens/LessonResumeScreen';
import ReconnectingOverlay from '@/features/fallback/ReconnectingOverlay';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="SplashScreen"
      screenOptions={{ headerShown: false }}
    >
      {/* auth */}
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="LoginErrorScreen" component={LoginErrorScreen} />
      <Stack.Screen name="ChildProfileScreen" component={ChildProfileScreen} />

      {/* onboarding */}
      <Stack.Screen name="SplashScreen" component={SplashScreen} />
      <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
      <Stack.Screen name="MicAskScreen" component={MicAskScreen} />
      <Stack.Screen name="TrustScreen" component={TrustScreen} />
      <Stack.Screen name="IntroListenScreen" component={IntroListenScreen} />
      <Stack.Screen name="IntroSpeakScreen" component={IntroSpeakScreen} />
      <Stack.Screen name="IntroRetryScreen" component={IntroRetryScreen} />
      <Stack.Screen name="IntroCelebrateScreen" component={IntroCelebrateScreen} />
      <Stack.Screen name="FirstLessonEntryScreen" component={FirstLessonEntryScreen} />

      {/* home */}
      <Stack.Screen name="HomeHubScreen" component={HomeHubScreen} />

      {/* course */}
      <Stack.Screen name="CourseScreen" component={CourseScreen} />
      <Stack.Screen name="LevelScreen" component={LevelScreen} />
      <Stack.Screen name="UnitScreen" component={UnitScreen} />
      <Stack.Screen name="LessonListScreen" component={LessonListScreen} />
      <Stack.Screen name="LessonDetailScreen" component={LessonDetailScreen} />
      <Stack.Screen name="ReviewEntryScreen" component={ReviewEntryScreen} />
      <Stack.Screen name="DailyMissionScreen" component={DailyMissionScreen} />

      {/* course-library */}
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

      {/* purchase */}
      <Stack.Screen name="PurchaseIntroScreen" component={PurchaseIntroScreen} />
      <Stack.Screen name="HowItWorksScreen" component={HowItWorksScreen} />
      <Stack.Screen name="BundleScreen" component={BundleScreen} />
      <Stack.Screen name="IncludedScreen" component={IncludedScreen} />
      <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
      <Stack.Screen name="OrderConfirmScreen" component={OrderConfirmScreen} />
      <Stack.Screen name="ShippingScreen" component={ShippingScreen} />
      <Stack.Screen name="ArrivedScreen" component={ArrivedScreen} />
      <Stack.Screen name="ActivateScreen" component={ActivateScreen} />
      <Stack.Screen name="FirstCourseScreen" component={FirstCourseScreen} />
      <Stack.Screen name="PrivacyScreen" component={PrivacyScreen} />
      <Stack.Screen name="SubscriptionsScreen" component={SubscriptionsScreen} />

      {/* lesson-session */}
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

      {/* progress */}
      <Stack.Screen name="TodayProgressScreen" component={TodayProgressScreen} />
      <Stack.Screen name="WordsPracticedScreen" component={WordsPracticedScreen} />
      <Stack.Screen name="LessonSummaryScreen" component={LessonSummaryScreen} />
      <Stack.Screen name="ReviewNeededScreen" component={ReviewNeededScreen} />
      <Stack.Screen name="CelebrationScreen" component={CelebrationScreen} />

      {/* parent */}
      <Stack.Screen name="ParentGateScreen" component={ParentGateScreen} />
      <Stack.Screen name="ParentSummaryScreen" component={ParentSummaryScreen} />
      <Stack.Screen name="ParentTodayScreen" component={ParentTodayScreen} />
      <Stack.Screen name="ParentHistoryScreen" component={ParentHistoryScreen} />
      <Stack.Screen name="ParentSafetyScreen" component={ParentSafetyScreen} />
      <Stack.Screen name="ParentSettingsScreen" component={ParentSettingsScreen} />
      <Stack.Screen name="ParentLockedOutScreen" component={ParentLockedOutScreen} />

      {/* device / pairing */}
      <Stack.Screen name="PairIntroScreen" component={PairIntroScreen} />
      <Stack.Screen name="PairSearchScreen" component={PairSearchScreen} />
      <Stack.Screen name="PairFoundScreen" component={PairFoundScreen} />
      <Stack.Screen name="PairConnectingScreen" component={PairConnectingScreen} />
      <Stack.Screen name="PairCodeScreen" component={PairCodeScreen} />
      <Stack.Screen name="PairAddScreen" component={PairAddScreen} />
      <Stack.Screen name="PairRenameScreen" component={PairRenameScreen} />
      <Stack.Screen name="PairWifiScreen" component={PairWifiScreen} />
      <Stack.Screen name="PairWifiPasswordScreen" component={PairWifiPasswordScreen} />
      <Stack.Screen name="PairOfflineScreen" component={PairOfflineScreen} />
      <Stack.Screen name="PairFailedScreen" component={PairFailedScreen} />
      <Stack.Screen name="PairSuccessScreen" component={PairSuccessScreen} />
      <Stack.Screen name="PairFirstLessonScreen" component={PairFirstLessonScreen} />

      <Stack.Screen name="DeviceHomeScreen" component={DeviceHomeScreen} />
      <Stack.Screen name="DeviceOverviewScreen" component={DeviceOverviewScreen} />
      <Stack.Screen name="DeviceFirmwareScreen" component={DeviceFirmwareScreen} />
      <Stack.Screen name="DeviceSessionScreen" component={DeviceSessionScreen} />
      <Stack.Screen name="DeviceLostScreen" component={DeviceLostScreen} />
      <Stack.Screen name="LCDLessonTurnScreen" component={LCDLessonTurnScreen} />
      <Stack.Screen name="LCDLibraryScreen" component={LCDLibraryScreen} />

      {/* robot-mgmt */}
      <Stack.Screen name="MyRobotScreen" component={MyRobotScreen} />
      <Stack.Screen name="RobotStatusScreen" component={RobotStatusScreen} />
      <Stack.Screen name="RobotBatteryScreen" component={RobotBatteryScreen} />
      <Stack.Screen name="RobotStorageScreen" component={RobotStorageScreen} />
      <Stack.Screen name="RobotFirmwareScreen" component={RobotFirmwareScreen} />
      <Stack.Screen name="RobotWifiScreen" component={RobotWifiScreen} />
      <Stack.Screen name="RobotSoundScreen" component={RobotSoundScreen} />
      <Stack.Screen name="MicTestScreen" component={MicTestScreen} />
      <Stack.Screen name="SpeakerTestScreen" component={SpeakerTestScreen} />
      <Stack.Screen name="FactoryResetScreen" component={FactoryResetScreen} />
      <Stack.Screen name="OfflineHelpScreen" component={OfflineHelpScreen} />
      <Stack.Screen name="SupportScreen" component={SupportScreen} />

      {/* fallback screens */}
      <Stack.Screen name="NetworkErrorScreen" component={NetworkErrorScreen} />
      <Stack.Screen name="AppErrorScreen" component={AppErrorScreen} />
      <Stack.Screen name="MicMissingScreen" component={MicMissingScreen} />
      <Stack.Screen name="VoiceFailedScreen" component={VoiceFailedScreen} />
      <Stack.Screen name="AudioRecoveryScreen" component={AudioRecoveryScreen} />
      <Stack.Screen name="SafetyRedirectScreen" component={SafetyRedirectScreen} />
      <Stack.Screen name="HelpFaqScreen" component={HelpFaqScreen} />
      <Stack.Screen name="KidSettingsScreen" component={KidSettingsScreen} />
      <Stack.Screen name="LessonResumeScreen" component={LessonResumeScreen} />

      {/* modals & overlays */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="UnlockConfirmScreen" component={UnlockConfirmModal} />
        <Stack.Screen name="ReconnectingOverlay" component={ReconnectingOverlay} />
      </Stack.Group>

      {/* phantom stub routes — referenced by screens, not yet backed by dedicated views */}
      <Stack.Screen name="ListenScreen" component={PhantomScreen} />
      <Stack.Screen name="SpeakScreen" component={PhantomScreen} />
      <Stack.Screen name="DevicePairWifiScreen" component={PhantomScreen} />
      <Stack.Screen name="ParentHomeScreen" component={PhantomScreen} />
    </Stack.Navigator>
  );
}

function PhantomScreen() {
  return <View style={{ flex: 1 }} />;
}
