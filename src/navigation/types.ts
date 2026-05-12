// Temporary shim: PR5 deleted src/navigation/ but production screens at
// src/screens/* still import navigation types from here. Re-export from the
// canonical location at src/app/navigation/routes.ts.
//
// TODO(PR8): delete this shim when src/screens/* is retired (PR8 cleanup).
// Production screens here will be replaced by tbot-design feature screens
// across PR6 (learning) and PR7 (device + parent).

import type { RootStackParamList } from '@/app/navigation/routes';
export type { RootStackParamList } from '@/app/navigation/routes';

export type AuthStackParamList = RootStackParamList;
export type OnboardingStackParamList = RootStackParamList;
export type MainStackParamList = RootStackParamList;

export type MainTabParamList = {
  Home: undefined;
  Devices: undefined;
  Activity: undefined;
  Progress: undefined;
  Profile: undefined;
};

// Loose navigation prop types used by production screens. Retire in PR8.
interface LooseNavigation {
  navigate: (route: string, params?: Record<string, unknown>) => void;
  replace: (route: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  popToTop: () => void;
  setParams: (params: Record<string, unknown>) => void;
  reset: (state: Record<string, unknown>) => void;
}

interface LooseRoute {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;
  key?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface MainTabScreenProps<T extends string = string> {
  navigation: LooseNavigation;
  route: LooseRoute;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface MainStackScreenProps<T extends string = string> {
  navigation: LooseNavigation;
  route: LooseRoute;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface AuthStackScreenProps<T extends string = string> {
  navigation: LooseNavigation;
  route: LooseRoute;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface OnboardingStackScreenProps<T extends string = string> {
  navigation: LooseNavigation;
  route: LooseRoute;
}
