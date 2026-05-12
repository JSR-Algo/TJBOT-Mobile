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

// Stub screen used for all feature routes not yet migrated (PR5-7 replaces each)
function StubScreen() {
  return <View style={{ flex: 1 }} />;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

// Main authenticated stack: tabs root + domain screens (stubs until PR5-7) + modal group
export function ModalStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeHubScreen" component={MainTabs} />

      {/* course — TODO(PR5): replace StubScreen with real feature screen */}
      <Stack.Screen name="CourseScreen" component={StubScreen} />
      <Stack.Screen name="LevelScreen" component={StubScreen} />
      <Stack.Screen name="UnitScreen" component={StubScreen} />
      <Stack.Screen name="LessonListScreen" component={StubScreen} />
      <Stack.Screen name="LessonDetailScreen" component={StubScreen} />
      <Stack.Screen name="ReviewEntryScreen" component={StubScreen} />
      <Stack.Screen name="DailyMissionScreen" component={StubScreen} />

      {/* course-library — TODO(PR5) */}
      <Stack.Screen name="CourseLibraryScreen" component={StubScreen} />
      <Stack.Screen name="CourseDetailScreen" component={StubScreen} />
      <Stack.Screen name="BuyCourseScreen" component={StubScreen} />
      <Stack.Screen name="CourseAddedScreen" component={StubScreen} />
      <Stack.Screen name="CourseCompleteScreen" component={StubScreen} />
      <Stack.Screen name="CourseLockedScreen" component={StubScreen} />
      <Stack.Screen name="NeedsSyncScreen" component={StubScreen} />
      <Stack.Screen name="SendToRobotScreen" component={StubScreen} />
      <Stack.Screen name="RobotReadyScreen" component={StubScreen} />
      <Stack.Screen name="RunningScreen" component={StubScreen} />
      <Stack.Screen name="CompanionScreen" component={StubScreen} />

      {/* purchase — TODO(PR5) */}
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

      {/* lesson-session — TODO(PR6) */}
      <Stack.Screen name="ConnectingScreen" component={StubScreen} />
      <Stack.Screen name="GreetingScreen" component={StubScreen} />
      <Stack.Screen name="LessonReadyScreen" component={StubScreen} />
      <Stack.Screen name="RobotListeningScreen" component={StubScreen} />
      <Stack.Screen name="UserSpeakingScreen" component={StubScreen} />
      <Stack.Screen name="RobotSpeakingScreen" component={StubScreen} />
      <Stack.Screen name="ThinkingScreen" component={StubScreen} />
      <Stack.Screen name="ActivityIntroScreen" component={StubScreen} />
      <Stack.Screen name="ActivityDoneScreen" component={StubScreen} />
      <Stack.Screen name="SuccessScreen" component={StubScreen} />
      <Stack.Screen name="LessonDoneScreen" component={StubScreen} />
      <Stack.Screen name="ExitConfirmScreen" component={StubScreen} />
      <Stack.Screen name="RetryScreen" component={StubScreen} />
      <Stack.Screen name="SilenceScreen" component={StubScreen} />
      <Stack.Screen name="BargeinScreen" component={StubScreen} />
      <Stack.Screen name="GentleScreen" component={StubScreen} />
      <Stack.Screen name="OfftopicScreen" component={StubScreen} />
      <Stack.Screen name="SafetyScreen" component={StubScreen} />
      <Stack.Screen name="CostCappedScreen" component={StubScreen} />
      <Stack.Screen name="ParentStoppedScreen" component={StubScreen} />
      <Stack.Screen name="TimedOutScreen" component={StubScreen} />
      <Stack.Screen name="AudioErrorScreen" component={StubScreen} />
      <Stack.Screen name="AbandonedDisconnectScreen" component={StubScreen} />
      <Stack.Screen name="ReconnectingScreen" component={StubScreen} />

      {/* progress — TODO(PR5) */}
      <Stack.Screen name="TodayProgressScreen" component={StubScreen} />
      <Stack.Screen name="WordsPracticedScreen" component={StubScreen} />
      <Stack.Screen name="LessonSummaryScreen" component={StubScreen} />
      <Stack.Screen name="ReviewNeededScreen" component={StubScreen} />
      <Stack.Screen name="CelebrationScreen" component={StubScreen} />

      {/* parent — TODO(PR5) */}
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

      {/* robot-mgmt — TODO(PR5) */}
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

      {/* phantom routes — wired in PR6-7 */}
      <Stack.Screen name="ListenScreen" component={ListenScreen} />
      <Stack.Screen name="SpeakScreen" component={SpeakScreen} />
      <Stack.Screen name="DevicePairWifiScreen" component={DevicePairWifiScreen} />

      {/* modals — TODO(PR5): replace StubScreen with real modal components */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="UnlockConfirmScreen" component={StubScreen} />
        <Stack.Screen name="ReconnectingOverlay" component={StubScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
