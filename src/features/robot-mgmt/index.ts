import FactoryResetScreen from './screens/FactoryResetScreen';
import MicTestScreen from './screens/MicTestScreen';
import MyRobotScreen from './screens/MyRobotScreen';
import OfflineHelpScreen from './screens/OfflineHelpScreen';
import RobotBatteryScreen from './screens/RobotBatteryScreen';
import RobotFirmwareScreen from './screens/RobotFirmwareScreen';
import RobotSoundScreen from './screens/RobotSoundScreen';
import RobotStatusScreen from './screens/RobotStatusScreen';
import RobotStorageScreen from './screens/RobotStorageScreen';
import RobotWifiScreen from './screens/RobotWifiScreen';
import SpeakerTestScreen from './screens/SpeakerTestScreen';
import SupportScreen from './screens/SupportScreen';

export { STATES } from './states';

export const SCREEN_MAP = {
  rm_my_robot: MyRobotScreen,
  rm_status: RobotStatusScreen,
  rm_battery: RobotBatteryScreen,
  rm_wifi: RobotWifiScreen,
  rm_storage: RobotStorageScreen,
  rm_firmware: RobotFirmwareScreen,
  rm_sound: RobotSoundScreen,
  rm_mic_test: MicTestScreen,
  rm_speaker_test: SpeakerTestScreen,
  rm_factory: FactoryResetScreen,
  rm_offline_help: OfflineHelpScreen,
  rm_support: SupportScreen,
};
