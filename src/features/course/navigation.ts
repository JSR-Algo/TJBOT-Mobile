import CourseScreen from './screens/CourseScreen';
import LevelScreen from './screens/LevelScreen';
import UnitScreen from './screens/UnitScreen';
import LessonListScreen from './screens/LessonListScreen';
import LessonDetailScreen from './screens/LessonDetailScreen';
import ReviewEntryScreen from './screens/ReviewEntryScreen';
import DailyMissionScreen from './screens/DailyMissionScreen';
import { MVP_SCOPE_HIDDEN } from '@/navigation/mvpProductionRoutes';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const COURSE_SCREENS = defineFeatureScreens([
  { name: ROUTES.CourseScreen, component: CourseScreen, role: 'stack-entry', stateMachineId: 'course', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.LevelScreen, component: LevelScreen, role: 'stack', backTarget: ROUTES.CourseScreen, stateMachineId: 'level', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.UnitScreen, component: UnitScreen, role: 'stack', backTarget: ROUTES.LevelScreen, stateMachineId: 'unit', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.LessonListScreen, component: LessonListScreen, role: 'state-machine', backTarget: ROUTES.UnitScreen, stateMachineId: 'lesson_list', ...MVP_SCOPE_HIDDEN },
  // Q8: keep LessonDetail in MVP path Library → Course → Lesson → Send
  { name: ROUTES.LessonDetailScreen, component: LessonDetailScreen, role: 'stack-entry', backTarget: ROUTES.CourseDetailScreen, stateMachineId: 'lesson_detail' },
  { name: ROUTES.ReviewEntryScreen, component: ReviewEntryScreen, role: 'stack', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'review_entry', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.DailyMissionScreen, component: DailyMissionScreen, role: 'stack-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'daily_mission' },
]);

export const COURSE_NAVIGATION = {
  owner: 'course',
  rootBranch: 'protected',
  stackScreens: COURSE_SCREENS,
  modalScreens: [],
} as const satisfies FeatureNavigationConfig;
