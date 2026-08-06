import CourseLibraryScreen from './screens/CourseLibraryScreen';
import CourseDetailScreen from './screens/CourseDetailScreen';
import BuyCourseScreen from './screens/BuyCourseScreen';
import CourseAddedScreen from './screens/CourseAddedScreen';
import CourseCompleteScreen from './screens/CourseCompleteScreen';
import CourseLockedScreen from './screens/CourseLockedScreen';
import UnlockConfirmModal from './UnlockConfirmModal';
import { BookOpen } from 'lucide-react-native';
import { MVP_SCOPE_HIDDEN } from '@/navigation/mvpProductionRoutes';
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
  { name: ROUTES.BuyCourseScreen, component: BuyCourseScreen, role: 'stack-entry', backTarget: ROUTES.CourseDetailScreen, stateMachineId: 'cl_add_free', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.CourseAddedScreen, component: CourseAddedScreen, role: 'stack-entry', stateMachineId: 'cl_added', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.CourseCompleteScreen, component: CourseCompleteScreen, role: 'state-machine', backTarget: ROUTES.CourseLibraryScreen, stateMachineId: 'cl_complete', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.CourseLockedScreen, component: CourseLockedScreen, role: 'state-machine', backTarget: ROUTES.CourseLibraryScreen, stateMachineId: 'cl_locked', ...MVP_SCOPE_HIDDEN },
]);

export const COURSE_LIBRARY_MODAL_SCREENS = defineFeatureScreens([
  { name: ROUTES.UnlockConfirmScreen, component: UnlockConfirmModal, role: 'modal', backTarget: ROUTES.CourseDetailScreen, stateMachineId: 'cl_unlock_confirm', ...MVP_SCOPE_HIDDEN },
]);

export const COURSE_LIBRARY_NAVIGATION = {
  owner: 'course-library',
  rootBranch: 'protected',
  stackScreens: COURSE_LIBRARY_SCREENS,
  modalScreens: COURSE_LIBRARY_MODAL_SCREENS,
  tabScreen: LIBRARY_TAB_SCREEN,
} as const satisfies FeatureNavigationConfig;
