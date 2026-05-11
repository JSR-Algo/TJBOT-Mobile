import MyRobotScreen from './screens/MyRobotScreen';
import RobotStatusScreen from './screens/RobotStatusScreen';
import RobotBatteryScreen from './screens/RobotBatteryScreen';
import RobotWifiScreen from './screens/RobotWifiScreen';
import RobotStorageScreen from './screens/RobotStorageScreen';
import RobotFirmwareScreen from './screens/RobotFirmwareScreen';
import RobotSoundScreen from './screens/RobotSoundScreen';
import MicTestScreen from './screens/MicTestScreen';
import SpeakerTestScreen from './screens/SpeakerTestScreen';
import FactoryResetScreen from './screens/FactoryResetScreen';
import OfflineHelpScreen from './screens/OfflineHelpScreen';
import SupportScreen from './screens/SupportScreen';

import { STATES } from './states';

export const SCREEN_MAP = {
  rm_my_robot:     MyRobotScreen,
  rm_status:       RobotStatusScreen,
  rm_battery:      RobotBatteryScreen,
  rm_wifi:         RobotWifiScreen,
  rm_storage:      RobotStorageScreen,
  rm_firmware:     RobotFirmwareScreen,
  rm_sound:        RobotSoundScreen,
  rm_mic_test:     MicTestScreen,
  rm_speaker_test: SpeakerTestScreen,
  rm_factory:      FactoryResetScreen,
  rm_offline_help: OfflineHelpScreen,
  rm_support:      SupportScreen,
};
export { STATES };
