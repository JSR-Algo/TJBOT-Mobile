import MyRobotScreen from './screens/MyRobotScreen';
import RobotStatusScreen from './screens/RobotStatusScreen';
import RobotBatteryScreen from './screens/RobotBatteryScreen';
import RobotStorageScreen from './screens/RobotStorageScreen';
import RobotFirmwareScreen from './screens/RobotFirmwareScreen';
import RobotWifiScreen from './screens/RobotWifiScreen';
import RobotSoundScreen from './screens/RobotSoundScreen';
import MicTestScreen from './screens/MicTestScreen';
import SpeakerTestScreen from './screens/SpeakerTestScreen';
import FactoryResetScreen from './screens/FactoryResetScreen';
import OfflineHelpScreen from './screens/OfflineHelpScreen';
import SupportScreen from './screens/SupportScreen';
import { MVP_SCOPE_HIDDEN } from '@/navigation/mvpProductionRoutes';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const ROBOT_MGMT_SCREENS = defineFeatureScreens([
  // Duplicate robot tab/hub — MVP robot-fleet/detail is DeviceHome/DeviceOverview.
  { name: ROUTES.MyRobotScreen, component: MyRobotScreen, role: 'stack-entry', backTarget: ROUTES.ParentSummaryScreen, stateMachineId: 'rm_my_robot', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.RobotStatusScreen, component: RobotStatusScreen, role: 'stack', backTarget: ROUTES.MyRobotScreen, stateMachineId: 'rm_status', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.RobotBatteryScreen, component: RobotBatteryScreen, role: 'stack', productionVisible: false, productionHiddenReason: 'backend-contract-unavailable', backTarget: ROUTES.MyRobotScreen, stateMachineId: 'rm_battery' },
  { name: ROUTES.RobotStorageScreen, component: RobotStorageScreen, role: 'stack', productionVisible: false, productionHiddenReason: 'backend-contract-unavailable', backTarget: ROUTES.MyRobotScreen, stateMachineId: 'rm_storage' },
  { name: ROUTES.RobotFirmwareScreen, component: RobotFirmwareScreen, role: 'stack', productionVisible: false, productionHiddenReason: 'backend-contract-unavailable', backTarget: ROUTES.MyRobotScreen, stateMachineId: 'rm_firmware' },
  { name: ROUTES.RobotWifiScreen, component: RobotWifiScreen, role: 'stack', backTarget: ROUTES.MyRobotScreen, stateMachineId: 'rm_wifi', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.RobotSoundScreen, component: RobotSoundScreen, role: 'stack', backTarget: ROUTES.MyRobotScreen, stateMachineId: 'rm_sound', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.MicTestScreen, component: MicTestScreen, role: 'stack', productionVisible: false, productionHiddenReason: 'backend-contract-unavailable', backTarget: ROUTES.MyRobotScreen, stateMachineId: 'rm_mic_test' },
  { name: ROUTES.SpeakerTestScreen, component: SpeakerTestScreen, role: 'stack', productionVisible: false, productionHiddenReason: 'backend-contract-unavailable', backTarget: ROUTES.MyRobotScreen, stateMachineId: 'rm_speaker_test' },
  { name: ROUTES.FactoryResetScreen, component: FactoryResetScreen, role: 'stack', backTarget: ROUTES.MyRobotScreen, stateMachineId: 'rm_factory', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.OfflineHelpScreen, component: OfflineHelpScreen, role: 'stack', backTarget: ROUTES.MyRobotScreen, stateMachineId: 'rm_offline_help', ...MVP_SCOPE_HIDDEN },
  // Light recovery CTA kept for pairing/error paths.
  { name: ROUTES.SupportScreen, component: SupportScreen, role: 'stack-entry', backTarget: ROUTES.DeviceHomeScreen, stateMachineId: 'rm_support' },
]);

export const ROBOT_MGMT_NAVIGATION = {
  owner: 'robot-mgmt',
  rootBranch: 'protected',
  stackScreens: ROBOT_MGMT_SCREENS,
  modalScreens: [],
} as const satisfies FeatureNavigationConfig;
