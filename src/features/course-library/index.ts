import CourseLibraryScreen from './screens/CourseLibraryScreen';
import CourseDetailScreen from './screens/CourseDetailScreen';
import BuyCourseScreen from './screens/BuyCourseScreen';
import UnlockConfirmModalPage from './UnlockConfirmModal';
import CourseAddedScreen from './screens/CourseAddedScreen';
import SendToRobotScreen from './screens/SendToRobotScreen';
import RobotReadyScreen from './screens/RobotReadyScreen';
import RunningScreen from './screens/RunningScreen';
import CompanionScreen from './screens/CompanionScreen';
import CourseCompleteScreen from './screens/CourseCompleteScreen';
import NeedsSyncScreen from './screens/NeedsSyncScreen';
import CourseLockedScreen from './screens/CourseLockedScreen';
import { STATES } from './states';

export const SCREEN_MAP = {
  cl_library: CourseLibraryScreen,
  cl_detail: CourseDetailScreen,
  cl_add_free: BuyCourseScreen,
  cl_unlock_confirm: UnlockConfirmModalPage,
  cl_added: CourseAddedScreen,
  cl_send: SendToRobotScreen,
  cl_robot_ready: RobotReadyScreen,
  cl_running: RunningScreen,
  cl_companion: CompanionScreen,
  cl_complete: CourseCompleteScreen,
  cl_needs_sync: NeedsSyncScreen,
  cl_locked: CourseLockedScreen,
};

export { STATES };
