import type React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';

export type FeatureRouteOwner =
  | 'auth'
  | 'onboarding'
  | 'home'
  | 'course'
  | 'course-library'
  | 'purchase'
  | 'lesson-session'
  | 'lesson-demo'
  | 'progress'
  | 'parent'
  | 'device'
  | 'robot-mgmt'
  | 'fallback';

export type FeatureRouteRole =
  | 'auth'
  | 'onboarding'
  | 'onboarding-root'
  | 'tab'
  | 'stack-entry'
  | 'stack'
  | 'modal'
  | 'modal-entry'
  | 'state-machine'
  | 'fallback-entry';

export type FeatureForwardCycleGroup =
  | 'auth-trust-login'
  | 'course-dispatch-picker'
  | 'device-pairing-retry'
  | 'lesson-demo-review'
  | 'lesson-session-loop'
  | 'network-retry'
  | 'support-help';

export type FeatureTabName =
  | 'Home'
  | 'Devices'
  | 'Library'
  | 'Progress'
  | 'Profile';

export type FeatureRootBranch =
  | 'auth'
  | 'onboarding'
  | 'protected';

export type FeatureStackScreen<RouteName extends keyof RootStackParamList = keyof RootStackParamList> = {
  readonly name: RouteName;
  readonly component: React.ElementType;
  readonly role: FeatureRouteRole;
  readonly productionVisible?: boolean;
  readonly productionHiddenReason?: 'backend-contract-unavailable' | 'static-prototype-hidden' | 'mvp-scope-hidden';
  readonly backTarget?: keyof RootStackParamList;
  readonly forwardCycleGroup?: FeatureForwardCycleGroup;
  readonly stateMachineId?: string;
  readonly stateMachineIds?: readonly string[];
};

export type FeatureTabScreen<RouteName extends keyof RootStackParamList = keyof RootStackParamList> =
  FeatureStackScreen<RouteName> & {
    readonly tabName: FeatureTabName;
    readonly title: FeatureTabName;
    readonly tabOrder: number;
    readonly tabIcon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
    readonly tabBarButtonTestID?: string;
  };

export type FeatureNavigationConfig = {
  readonly owner: FeatureRouteOwner;
  readonly rootBranch: FeatureRootBranch;
  readonly initialRoute?: keyof RootStackParamList;
  readonly stackScreens: readonly FeatureStackScreen[];
  readonly modalScreens: readonly FeatureStackScreen[];
  readonly tabScreen?: FeatureTabScreen;
  readonly pendingDeviceSetupRoute?: keyof RootStackParamList;
};

export function defineFeatureScreens<const Screens extends readonly FeatureStackScreen[]>(
  screens: Screens,
): Screens {
  return screens;
}

export type LearningStackParamList = RootStackParamList & {
  LessonPlanner: { childId?: string };
  ChildPractice: { childId: string; sessionId?: string };
  LessonDemo: undefined;
  Progress: undefined;
};

export type LearningScreenProps<
  RouteName extends keyof LearningStackParamList = keyof LearningStackParamList,
> = NativeStackScreenProps<LearningStackParamList, RouteName>;
