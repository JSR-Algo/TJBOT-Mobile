import CourseLibraryScreen from './screens/CourseLibraryScreen';
import CourseDetailScreen from './screens/CourseDetailScreen';
import BuyCourseScreen from './screens/BuyCourseScreen';
import UnlockConfirmModalPage from './UnlockConfirmModal';
import CourseAddedScreen from './screens/CourseAddedScreen';
import CourseCompleteScreen from './screens/CourseCompleteScreen';
import CourseLockedScreen from './screens/CourseLockedScreen';
import { STATES } from './states';

export const SCREEN_MAP = {
  cl_library: CourseLibraryScreen,
  cl_detail: CourseDetailScreen,
  cl_add_free: BuyCourseScreen,
  cl_unlock_confirm: UnlockConfirmModalPage,
  cl_added: CourseAddedScreen,
  cl_complete: CourseCompleteScreen,
  cl_locked: CourseLockedScreen,
};

export { STATES };
