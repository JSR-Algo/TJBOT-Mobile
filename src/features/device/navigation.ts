import PairIntroScreen from './pairing/screens/PairIntroScreen';
import PairSearchScreen from './pairing/screens/PairSearchScreen';
import PairFoundScreen from './pairing/screens/PairFoundScreen';
import PairConnectingScreen from './pairing/screens/PairConnectingScreen';
import PairCodeScreen from './pairing/screens/PairCodeScreen';
import PairQrScanScreen from './pairing/screens/PairQrScanScreen';
import PairAddScreen from './pairing/screens/PairAddScreen';
import PairRenameScreen from './pairing/screens/PairRenameScreen';
import PairWifiScreen from './pairing/screens/PairWifiScreen';
import PairWifiPasswordScreen from './pairing/screens/PairWifiPasswordScreen';
import PairOfflineScreen from './pairing/screens/PairOfflineScreen';
import PairFailedScreen from './pairing/screens/PairFailedScreen';
import PairSuccessScreen from './pairing/screens/PairSuccessScreen';
import PairFirstLessonScreen from './pairing/screens/PairFirstLessonScreen';
import PairChildProfileScreen from './pairing/screens/PairChildProfileScreen';
import DeviceHomeScreen from './screens/DeviceHomeScreen';
import DeviceOverviewScreen from './screens/DeviceOverviewScreen';
import DeviceFirmwareScreen from './screens/DeviceFirmwareScreen';
import DeviceSessionScreen from './screens/DeviceSessionScreen';
import DeviceLostScreen from './screens/DeviceLostScreen';
import LCDLessonTurnScreen from './screens/LCDLessonTurnScreen';
import LCDLibraryScreen from './screens/LCDLibraryScreen';
import { Bot } from 'lucide-react-native';
import { MVP_SCOPE_HIDDEN } from '@/navigation/mvpProductionRoutes';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const DEVICE_TAB_SCREEN = {
  name: ROUTES.DeviceHomeScreen,
  component: DeviceHomeScreen,
  role: 'tab',
  stateMachineId: 'dv_home',
  tabName: 'Devices',
  title: 'Devices',
  tabOrder: 2,
  tabIcon: Bot,
  tabBarButtonTestID: 'devicesTab',
} as const;

export const DEVICE_PAIRING_ENTRY_SCREEN = {
  name: ROUTES.DeviceOverviewScreen,
  component: DeviceOverviewScreen,
  role: 'stack-entry',
  stateMachineId: 'dv_overview',
} as const;

export const DEVICE_SCREENS = defineFeatureScreens([
  DEVICE_PAIRING_ENTRY_SCREEN,
  { name: ROUTES.PairIntroScreen, component: PairIntroScreen, role: 'stack', backTarget: ROUTES.PairAddScreen, stateMachineId: 'dv_pair_intro' },
  { name: ROUTES.PairSearchScreen, component: PairSearchScreen, role: 'stack', backTarget: ROUTES.PairIntroScreen, forwardCycleGroup: 'device-pairing-retry', stateMachineId: 'dv_pair_search' },
  { name: ROUTES.PairFoundScreen, component: PairFoundScreen, role: 'state-machine', backTarget: ROUTES.PairIntroScreen, forwardCycleGroup: 'device-pairing-retry', stateMachineId: 'dv_pair_found' },
  { name: ROUTES.PairQrScanScreen, component: PairQrScanScreen, role: 'stack', backTarget: ROUTES.PairFoundScreen, forwardCycleGroup: 'device-pairing-retry', stateMachineId: 'dv_pair_qr_scan' },
  { name: ROUTES.PairConnectingScreen, component: PairConnectingScreen, role: 'stack', backTarget: ROUTES.PairWifiPasswordScreen, forwardCycleGroup: 'device-pairing-retry', stateMachineId: 'dv_pair_connecting' },
  { name: ROUTES.PairCodeScreen, component: PairCodeScreen, role: 'stack', backTarget: ROUTES.PairQrScanScreen, forwardCycleGroup: 'device-pairing-retry', stateMachineId: 'dv_pair_code' },
  { name: ROUTES.PairAddScreen, component: PairAddScreen, role: 'stack', backTarget: ROUTES.DeviceOverviewScreen, stateMachineId: 'dv_pair_add' },
  { name: ROUTES.PairRenameScreen, component: PairRenameScreen, role: 'stack', backTarget: ROUTES.PairSuccessScreen, forwardCycleGroup: 'device-pairing-retry', stateMachineId: 'dv_pair_rename' },
  { name: ROUTES.PairChildProfileScreen, component: PairChildProfileScreen, role: 'stack', backTarget: ROUTES.PairRenameScreen, stateMachineId: 'dv_pair_child' },
  { name: ROUTES.PairWifiScreen, component: PairWifiScreen, role: 'stack', backTarget: ROUTES.PairCodeScreen, forwardCycleGroup: 'device-pairing-retry', stateMachineId: 'dv_pair_wifi' },
  { name: ROUTES.PairWifiPasswordScreen, component: PairWifiPasswordScreen, role: 'stack', backTarget: ROUTES.PairWifiScreen, forwardCycleGroup: 'device-pairing-retry', stateMachineId: 'dv_pair_wifi_pw' },
  { name: ROUTES.PairOfflineScreen, component: PairOfflineScreen, role: 'stack', backTarget: ROUTES.PairAddScreen, stateMachineId: 'dv_pair_offline' },
  { name: ROUTES.PairFailedScreen, component: PairFailedScreen, role: 'stack', backTarget: ROUTES.PairIntroScreen, forwardCycleGroup: 'device-pairing-retry', stateMachineId: 'dv_pair_failed' },
  { name: ROUTES.PairSuccessScreen, component: PairSuccessScreen, role: 'state-machine', backTarget: ROUTES.PairConnectingScreen, stateMachineId: 'dv_pair_success' },
  { name: ROUTES.PairFirstLessonScreen, component: PairFirstLessonScreen, role: 'stack', backTarget: ROUTES.PairRenameScreen, stateMachineId: 'dv_pair_first_lesson' },
  // Deep OTA / demo session / LCD theater — fold into overview later.
  { name: ROUTES.DeviceFirmwareScreen, component: DeviceFirmwareScreen, role: 'stack', backTarget: ROUTES.DeviceHomeScreen, stateMachineId: 'dv_firmware', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.DeviceSessionScreen, component: DeviceSessionScreen, role: 'stack', backTarget: ROUTES.DeviceHomeScreen, stateMachineId: 'dv_session', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.DeviceLostScreen, component: DeviceLostScreen, role: 'stack', backTarget: ROUTES.DeviceHomeScreen, stateMachineId: 'dv_lost' },
  { name: ROUTES.LCDLessonTurnScreen, component: LCDLessonTurnScreen, role: 'state-machine', backTarget: ROUTES.DeviceHomeScreen, stateMachineId: 'dv_lcd_turn', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.LCDLibraryScreen, component: LCDLibraryScreen, role: 'fallback-entry', backTarget: ROUTES.DeviceHomeScreen, stateMachineId: 'dv_lcd', ...MVP_SCOPE_HIDDEN },
]);

export const DEVICE_NAVIGATION = {
  owner: 'device',
  rootBranch: 'protected',
  stackScreens: DEVICE_SCREENS,
  modalScreens: [],
  tabScreen: DEVICE_TAB_SCREEN,
  pendingDeviceSetupRoute: DEVICE_PAIRING_ENTRY_SCREEN.name,
} as const satisfies FeatureNavigationConfig;
