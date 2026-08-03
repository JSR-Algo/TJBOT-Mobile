import HomeHubScreen from './screens/HomeHubScreen';
import HomeChildProfileScreen from './screens/HomeChildProfileScreen';
import { Home } from 'lucide-react-native';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const HOME_TAB_SCREEN = {
  name: ROUTES.HomeHubScreen,
  component: HomeHubScreen,
  role: 'tab',
  tabName: 'Home',
  title: 'Home',
  tabOrder: 1,
  tabIcon: Home,
  tabBarButtonTestID: 'homeTab',
  stateMachineIds: [
    'home_hub_idle',
    'home_hub_greet',
    'home_hub_daily',
    'home_hub_done',
    'home_hub_mic',
    'home_hub_offline',
    'home_hub_zero_child',
    'home_hub_multiple_children',
    'home_hub_unpaired_robot',
    'home_hub_offline_24h',
    'home_hub_paused',
    'home_hub_quiet_hours',
    'home_hub_error',
  ],
} as const;

export const HOME_SCREENS = defineFeatureScreens([
  {
    name: ROUTES.HomeChildProfileScreen,
    component: HomeChildProfileScreen,
    role: 'stack-entry',
    backTarget: ROUTES.HomeHubScreen,
    stateMachineId: 'home_child_profile',
  },
]);

export const HOME_NAVIGATION = {
  owner: 'home',
  rootBranch: 'protected',
  stackScreens: HOME_SCREENS,
  modalScreens: [],
  tabScreen: HOME_TAB_SCREEN,
} as const satisfies FeatureNavigationConfig;
