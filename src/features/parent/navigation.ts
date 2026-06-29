import ParentGateScreen from './screens/ParentGateScreen';
import ParentSummaryScreen from './screens/ParentSummaryScreen';
import ParentTodayScreen from './screens/ParentTodayScreen';
import ParentHistoryScreen from './screens/ParentHistoryScreen';
import ParentSafetyScreen from './screens/ParentSafetyScreen';
import ParentSettingsScreen from './screens/ParentSettingsScreen';
import ParentAccountPrivacyScreen from './screens/ParentAccountPrivacyScreen';
import ParentLockedOutScreen from './screens/ParentLockedOutScreen';
import AddChildScreen from './screens/AddChildScreen';
import { User } from 'lucide-react-native';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const PROFILE_TAB_SCREEN = {
  name: ROUTES.ParentSummaryScreen,
  component: ParentSummaryScreen,
  role: 'tab',
  tabName: 'Profile',
  title: 'Profile',
  tabOrder: 5,
  tabIcon: User,
  tabBarButtonTestID: 'profileTab',
  stateMachineId: 'parent_summary',
} as const;

export const PARENT_SCREENS = defineFeatureScreens([
  { name: ROUTES.ParentGateScreen, component: ParentGateScreen, role: 'fallback-entry', backTarget: ROUTES.ParentSummaryScreen, stateMachineId: 'parent_gate' },
  { name: ROUTES.ParentTodayScreen, component: ParentTodayScreen, role: 'stack', backTarget: ROUTES.ParentSummaryScreen, stateMachineId: 'parent_today' },
  { name: ROUTES.ParentHistoryScreen, component: ParentHistoryScreen, role: 'stack', backTarget: ROUTES.ParentSummaryScreen, stateMachineId: 'parent_history' },
  { name: ROUTES.ParentSafetyScreen, component: ParentSafetyScreen, role: 'stack', backTarget: ROUTES.ParentSummaryScreen, stateMachineId: 'parent_safety' },
  { name: ROUTES.ParentSettingsScreen, component: ParentSettingsScreen, role: 'stack-entry', backTarget: ROUTES.ParentSummaryScreen, stateMachineId: 'parent_settings' },
  { name: ROUTES.ParentAccountPrivacyScreen, component: ParentAccountPrivacyScreen, role: 'stack', backTarget: ROUTES.ParentSettingsScreen, stateMachineId: 'parent_account_privacy' },
  { name: ROUTES.ParentLockedOutScreen, component: ParentLockedOutScreen, role: 'fallback-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'parent_locked_out' },
  { name: ROUTES.AddChildScreen, component: AddChildScreen, role: 'stack', backTarget: ROUTES.ParentSettingsScreen, stateMachineId: 'parent_add_child' },
]);

export const PARENT_NAVIGATION = {
  owner: 'parent',
  rootBranch: 'protected',
  stackScreens: PARENT_SCREENS,
  modalScreens: [],
  tabScreen: PROFILE_TAB_SCREEN,
} as const satisfies FeatureNavigationConfig;
