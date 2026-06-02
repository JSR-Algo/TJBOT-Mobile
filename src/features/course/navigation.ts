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

export const COURSE_SCREENS = defineFeatureScreens([
  { name: ROUTES.CourseScreen, component: CourseScreen, role: 'stack-entry', stateMachineId: 'course' },
  { name: ROUTES.LevelScreen, component: LevelScreen, role: 'stack', backTarget: ROUTES.CourseScreen, stateMachineId: 'level' },
  { name: ROUTES.UnitScreen, component: UnitScreen, role: 'stack', backTarget: ROUTES.LevelScreen, stateMachineId: 'unit' },
  { name: ROUTES.LessonListScreen, component: LessonListScreen, role: 'state-machine', backTarget: ROUTES.UnitScreen, stateMachineId: 'lesson_list' },
  { name: ROUTES.LessonDetailScreen, component: LessonDetailScreen, role: 'stack', backTarget: ROUTES.UnitScreen, stateMachineId: 'lesson_detail' },
  { name: ROUTES.ReviewEntryScreen, component: ReviewEntryScreen, role: 'stack', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'review_entry' },
  { name: ROUTES.DailyMissionScreen, component: DailyMissionScreen, role: 'stack-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'daily_mission' },
]);

export const COURSE_NAVIGATION = {
  owner: 'course',
  rootBranch: 'protected',
  stackScreens: COURSE_SCREENS,
  modalScreens: [],
} as const satisfies FeatureNavigationConfig;
