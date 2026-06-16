import MicAskScreen from './screens/MicAskScreen';
import ParentConsentScreen from './screens/ParentConsentScreen';
import ChildProfileScreen from './screens/ChildProfileScreen';
import FirstLessonEntryScreen from './screens/FirstLessonEntryScreen';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const ONBOARDING_ENTRY_SCREEN = {
  name: ROUTES.ParentConsentScreen,
  component: ParentConsentScreen,
  role: 'onboarding-root',
  stateMachineId: 'onb_coppa',
} as const;

export const ONBOARDING_SCREENS = defineFeatureScreens([
  ONBOARDING_ENTRY_SCREEN,
  { name: ROUTES.ChildProfileScreen, component: ChildProfileScreen, role: 'onboarding', backTarget: ROUTES.ParentConsentScreen, stateMachineId: 'onb_child' },
  { name: ROUTES.MicAskScreen, component: MicAskScreen, role: 'onboarding', backTarget: ROUTES.ChildProfileScreen, stateMachineId: 'onb_mic' },
  { name: ROUTES.FirstLessonEntryScreen, component: FirstLessonEntryScreen, role: 'onboarding', backTarget: ROUTES.MicAskScreen, stateMachineId: 'onb_first_lesson' },
]);

export const ONBOARDING_NAVIGATION = {
  owner: 'onboarding',
  rootBranch: 'onboarding',
  initialRoute: ONBOARDING_ENTRY_SCREEN.name,
  stackScreens: ONBOARDING_SCREENS,
  modalScreens: [],
} as const satisfies FeatureNavigationConfig;
