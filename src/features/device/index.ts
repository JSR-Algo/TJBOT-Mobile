import PairIntroScreen from './pairing/screens/PairIntroScreen';
import PairSearchScreen from './pairing/screens/PairSearchScreen';
import PairFoundScreen from './pairing/screens/PairFoundScreen';
import PairConnectingScreen from './pairing/screens/PairConnectingScreen';
import PairCodeScreen from './pairing/screens/PairCodeScreen';
import PairAddScreen from './pairing/screens/PairAddScreen';
import PairRenameScreen from './pairing/screens/PairRenameScreen';
import PairWifiScreen from './pairing/screens/PairWifiScreen';
import PairWifiPasswordScreen from './pairing/screens/PairWifiPasswordScreen';
import PairOfflineScreen from './pairing/screens/PairOfflineScreen';
import PairFailedScreen from './pairing/screens/PairFailedScreen';
import PairSuccessScreen from './pairing/screens/PairSuccessScreen';
import PairFirstLessonScreen from './pairing/screens/PairFirstLessonScreen';
import DeviceHomeScreen from './screens/DeviceHomeScreen';
import DeviceOverviewScreen from './screens/DeviceOverviewScreen';
import DeviceFirmwareScreen from './screens/DeviceFirmwareScreen';
import DeviceSessionScreen from './screens/DeviceSessionScreen';
import DeviceLostScreen from './screens/DeviceLostScreen';
import LCDLessonTurnScreen from './screens/LCDLessonTurnScreen';
import LCDLibraryScreen from './screens/LCDLibraryScreen';

export { STATES } from './states';

export const SCREEN_MAP = {
  dv_overview: DeviceOverviewScreen,
  dv_pair_add: PairAddScreen,
  dv_pair_intro: PairIntroScreen,
  dv_pair_search: PairSearchScreen,
  dv_pair_found: PairFoundScreen,
  dv_pair_code: PairCodeScreen,
  dv_pair_wifi: PairWifiScreen,
  dv_pair_wifi_pw: PairWifiPasswordScreen,
  dv_pair_connecting: PairConnectingScreen,
  dv_pair_success: PairSuccessScreen,
  dv_pair_failed: PairFailedScreen,
  dv_pair_offline: PairOfflineScreen,
  dv_pair_rename: PairRenameScreen,
  dv_pair_first_lesson: PairFirstLessonScreen,
  dv_home: DeviceHomeScreen,
  dv_session: DeviceSessionScreen,
  dv_lost: DeviceLostScreen,
  dv_firmware: DeviceFirmwareScreen,
  dv_lcd: LCDLibraryScreen,
  dv_lcd_turn: LCDLessonTurnScreen,
};
