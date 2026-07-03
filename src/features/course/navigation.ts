import CourseScreen from './screens/CourseScreen';
import LevelScreen from './screens/LevelScreen';
import UnitScreen from './screens/UnitScreen';
import LessonListScreen from './screens/LessonListScreen';
import LessonDetailScreen from './screens/LessonDetailScreen';
import ReviewEntryScreen from './screens/ReviewEntryScreen';
import DailyMissionScreen from './screens/DailyMissionScreen';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

const HIDDEN_COURSE_PROTOTYPE_ROUTE = {
  productionVisible: false,
  productionHiddenReason: 'static-prototype-hidden',
} as const;

export const COURSE_SCREENS = defineFeatureScreens([
  { name: ROUTES.CourseScreen, component: CourseScreen, role: 'stack-entry', stateMachineId: 'course' },
  { name: ROUTES.LevelScreen, component: LevelScreen, role: 'stack-entry', backTarget: ROUTES.CourseScreen, stateMachineId: 'level', ...HIDDEN_COURSE_PROTOTYPE_ROUTE },
  { name: ROUTES.UnitScreen, component: UnitScreen, role: 'stack', backTarget: ROUTES.LevelScreen, stateMachineId: 'unit', ...HIDDEN_COURSE_PROTOTYPE_ROUTE },
  { name: ROUTES.LessonListScreen, component: LessonListScreen, role: 'state-machine', backTarget: ROUTES.UnitScreen, stateMachineId: 'lesson_list', ...HIDDEN_COURSE_PROTOTYPE_ROUTE },
  { name: ROUTES.LessonDetailScreen, component: LessonDetailScreen, role: 'stack', backTarget: ROUTES.UnitScreen, stateMachineId: 'lesson_detail', ...HIDDEN_COURSE_PROTOTYPE_ROUTE },
  { name: ROUTES.ReviewEntryScreen, component: ReviewEntryScreen, role: 'stack', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'review_entry' },
  { name: ROUTES.DailyMissionScreen, component: DailyMissionScreen, role: 'stack-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'daily_mission' },
]);

export const COURSE_NAVIGATION = {
  owner: 'course',
  rootBranch: 'protected',
  stackScreens: COURSE_SCREENS,
  modalScreens: [],
} as const satisfies FeatureNavigationConfig;
