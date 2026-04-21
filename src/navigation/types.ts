import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
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
  ParentControls: { deviceId: string };
  NotificationPrefs: undefined;
  GeminiConversation: undefined;
  // Reused from OnboardingStack so a post-onboarded user with 0 children
  // can still reach the add-child flow from the Home dashboard CTA.
  AddChild: { householdId: string };
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
