import LoginScreen from './screens/LoginScreen';
import SplashScreen from './screens/SplashScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import TrustScreen from './screens/TrustScreen';
import IntroListenScreen from './screens/IntroListenScreen';
import IntroSpeakScreen from './screens/IntroSpeakScreen';
import IntroRetryScreen from './screens/IntroRetryScreen';
import IntroCelebrateScreen from './screens/IntroCelebrateScreen';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const AUTH_ENTRY_SCREEN = {
  name: ROUTES.SplashScreen,
  component: SplashScreen,
  role: 'auth',
  stateMachineId: 'onb_splash',
} as const;

export const AUTH_SCREENS = defineFeatureScreens([
  AUTH_ENTRY_SCREEN,
  { name: ROUTES.WelcomeScreen, component: WelcomeScreen, role: 'auth', stateMachineId: 'onb_welcome' },
  { name: ROUTES.IntroListenScreen, component: IntroListenScreen, role: 'auth', backTarget: ROUTES.WelcomeScreen, stateMachineId: 'onb_intro_listen' },
  { name: ROUTES.IntroSpeakScreen, component: IntroSpeakScreen, role: 'auth', backTarget: ROUTES.IntroListenScreen, stateMachineId: 'onb_intro_speak' },
  { name: ROUTES.IntroRetryScreen, component: IntroRetryScreen, role: 'auth', backTarget: ROUTES.IntroSpeakScreen, stateMachineId: 'onb_intro_retry' },
  { name: ROUTES.IntroCelebrateScreen, component: IntroCelebrateScreen, role: 'auth', backTarget: ROUTES.IntroRetryScreen, stateMachineId: 'onb_intro_celebrate' },
  { name: ROUTES.TrustScreen, component: TrustScreen, role: 'auth', backTarget: ROUTES.IntroCelebrateScreen, forwardCycleGroup: 'auth-trust-login', stateMachineId: 'onb_trust' },
  { name: ROUTES.LoginScreen, component: LoginScreen, role: 'auth', forwardCycleGroup: 'auth-trust-login', stateMachineId: 'onb_login' },
]);

export const AUTH_NAVIGATION = {
  owner: 'auth',
  rootBranch: 'auth',
  initialRoute: AUTH_ENTRY_SCREEN.name,
  stackScreens: AUTH_SCREENS,
  modalScreens: [],
} as const satisfies FeatureNavigationConfig;
