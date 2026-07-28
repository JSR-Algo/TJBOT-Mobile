import LoginScreen from './screens/LoginScreen';
import SplashScreen from './screens/SplashScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import TrustScreen from './screens/TrustScreen';
import IntroListenScreen from './screens/IntroListenScreen';
import IntroSpeakScreen from './screens/IntroSpeakScreen';
import IntroRetryScreen from './screens/IntroRetryScreen';
import IntroCelebrateScreen from './screens/IntroCelebrateScreen';
import { MVP_SCOPE_HIDDEN } from '@/navigation/mvpProductionRoutes';
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
  // Marketing intro theater — keep files for __DEV__/demos; hide from production nav.
  { name: ROUTES.WelcomeScreen, component: WelcomeScreen, role: 'auth', stateMachineId: 'onb_welcome', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.IntroListenScreen, component: IntroListenScreen, role: 'auth', backTarget: ROUTES.WelcomeScreen, stateMachineId: 'onb_intro_listen', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.IntroSpeakScreen, component: IntroSpeakScreen, role: 'auth', backTarget: ROUTES.IntroListenScreen, stateMachineId: 'onb_intro_speak', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.IntroRetryScreen, component: IntroRetryScreen, role: 'auth', backTarget: ROUTES.IntroSpeakScreen, stateMachineId: 'onb_intro_retry', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.IntroCelebrateScreen, component: IntroCelebrateScreen, role: 'auth', backTarget: ROUTES.IntroRetryScreen, stateMachineId: 'onb_intro_celebrate', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.TrustScreen, component: TrustScreen, role: 'auth', backTarget: ROUTES.IntroCelebrateScreen, stateMachineId: 'onb_trust', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.LoginScreen, component: LoginScreen, role: 'auth', stateMachineId: 'onb_login' },
]);

export const AUTH_NAVIGATION = {
  owner: 'auth',
  rootBranch: 'auth',
  initialRoute: AUTH_ENTRY_SCREEN.name,
  stackScreens: AUTH_SCREENS,
  modalScreens: [],
} as const satisfies FeatureNavigationConfig;
