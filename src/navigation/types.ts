import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  EmailVerify: { email?: string };
  Coppa: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  CoppaConsent: undefined;
  HouseholdCreate: undefined;
  AddChild: { householdId: string };
  InterestSetup: { childId: string; householdId: string };
  DeviceSetupIntro: undefined;
  VoiceTest: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Devices: undefined;
  Activity: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  DeviceSetup: undefined;
  DeviceDetail: { deviceId: string };
  Interaction: { childId?: string } | undefined;
  ParentControls: { deviceId: string };
  NotificationPrefs: undefined;
  GeminiConversation: undefined;
  // Software-twin demo screen — registered only when EXPO_PUBLIC_DEMO_SCREEN=true.
  // Plan: expressive-robot-companion-rewrite §6 RM-01.
  RobotDemo: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> = NativeStackScreenProps<OnboardingStackParamList, T>;

export type MainStackScreenProps<T extends keyof MainStackParamList> = NativeStackScreenProps<MainStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<MainStackParamList>
>;
