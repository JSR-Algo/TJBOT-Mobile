import CourseLibraryScreen from './screens/CourseLibraryScreen';
import CourseDetailScreen from './screens/CourseDetailScreen';
import BuyCourseScreen from './screens/BuyCourseScreen';
import CourseAddedScreen from './screens/CourseAddedScreen';
import CourseCompleteScreen from './screens/CourseCompleteScreen';
import CourseLockedScreen from './screens/CourseLockedScreen';
import NeedsSyncScreen from './screens/NeedsSyncScreen';
import SendToRobotScreen from './screens/SendToRobotScreen';
import RobotReadyScreen from './screens/RobotReadyScreen';
import RunningScreen from './screens/RunningScreen';
import CompanionScreen from './screens/CompanionScreen';
import UnlockConfirmModal from './UnlockConfirmModal';
import { BookOpen } from 'lucide-react-native';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const LIBRARY_TAB_SCREEN = {
  name: ROUTES.CourseLibraryScreen,
  component: CourseLibraryScreen,
  role: 'tab',
  stateMachineId: 'cl_library',
  tabName: 'Library',
  title: 'Library',
  tabOrder: 3,
  tabIcon: BookOpen,
  tabBarButtonTestID: 'libraryTab',
} as const;

export const COURSE_LIBRARY_SCREENS = defineFeatureScreens([
  { name: ROUTES.CourseDetailScreen, component: CourseDetailScreen, role: 'stack', backTarget: ROUTES.CourseLibraryScreen, stateMachineId: 'cl_detail' },
  { name: ROUTES.BuyCourseScreen, component: BuyCourseScreen, role: 'stack-entry', backTarget: ROUTES.CourseDetailScreen, stateMachineId: 'cl_add_free' },
  { name: ROUTES.CourseAddedScreen, component: CourseAddedScreen, role: 'stack-entry', stateMachineId: 'cl_added' },
  { name: ROUTES.CourseCompleteScreen, component: CourseCompleteScreen, role: 'state-machine', backTarget: ROUTES.CourseLibraryScreen, stateMachineId: 'cl_complete' },
  { name: ROUTES.CourseLockedScreen, component: CourseLockedScreen, role: 'state-machine', backTarget: ROUTES.CourseLibraryScreen, stateMachineId: 'cl_locked' },
  { name: ROUTES.NeedsSyncScreen, component: NeedsSyncScreen, role: 'state-machine', backTarget: ROUTES.CourseLibraryScreen, stateMachineId: 'cl_needs_sync' },
  { name: ROUTES.SendToRobotScreen, component: SendToRobotScreen, role: 'stack', backTarget: ROUTES.DeviceHomeScreen, forwardCycleGroup: 'course-dispatch-picker', stateMachineId: 'cl_send' },
  { name: ROUTES.RobotReadyScreen, component: RobotReadyScreen, role: 'stack', backTarget: ROUTES.SendToRobotScreen, forwardCycleGroup: 'course-dispatch-picker', stateMachineId: 'cl_robot_ready' },
  { name: ROUTES.RunningScreen, component: RunningScreen, role: 'stack-entry', backTarget: ROUTES.RobotReadyScreen, stateMachineId: 'cl_running' },
  { name: ROUTES.CompanionScreen, component: CompanionScreen, role: 'stack-entry', backTarget: ROUTES.RunningScreen, stateMachineId: 'cl_companion' },
]);

export const COURSE_LIBRARY_MODAL_SCREENS = defineFeatureScreens([
  { name: ROUTES.UnlockConfirmScreen, component: UnlockConfirmModal, role: 'modal', backTarget: ROUTES.CourseDetailScreen, stateMachineId: 'cl_unlock_confirm' },
]);

export const COURSE_LIBRARY_NAVIGATION = {
  owner: 'course-library',
  rootBranch: 'protected',
  stackScreens: COURSE_LIBRARY_SCREENS,
  modalScreens: COURSE_LIBRARY_MODAL_SCREENS,
  tabScreen: LIBRARY_TAB_SCREEN,
} as const satisfies FeatureNavigationConfig;
