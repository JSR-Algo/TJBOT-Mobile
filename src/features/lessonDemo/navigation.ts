import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';
import RobotLessonControlScreen from '../../screens/robot-lesson/RobotLessonControlScreen';
import LessonDemoHomeScreen from './screens/LessonDemoHomeScreen';
import LessonRoadmapScreen from './screens/LessonRoadmapScreen';
import LessonSessionScreen from './screens/LessonSessionScreen';
import LessonShowcaseScreen from './screens/LessonShowcaseScreen';
import ParentLessonSummaryScreen from './screens/ParentLessonSummaryScreen';

export const LESSON_DEMO_SCREENS = defineFeatureScreens([
  { name: ROUTES.LessonDemoHomeScreen, component: LessonDemoHomeScreen, role: 'stack-entry', stateMachineId: 'lesson_demo_home' },
  { name: ROUTES.LessonRoadmapScreen, component: LessonRoadmapScreen, role: 'stack', backTarget: ROUTES.LessonDemoHomeScreen, forwardCycleGroup: 'lesson-demo-review', stateMachineId: 'lesson_demo_roadmap' },
  { name: ROUTES.LessonSessionScreen, component: LessonSessionScreen, role: 'stack', backTarget: ROUTES.LessonDemoHomeScreen, forwardCycleGroup: 'lesson-demo-review', stateMachineId: 'lesson_demo_session' },
  { name: ROUTES.LessonShowcaseScreen, component: LessonShowcaseScreen, role: 'stack', backTarget: ROUTES.LessonDemoHomeScreen, stateMachineId: 'lesson_demo_showcase' },
  { name: ROUTES.ParentLessonSummaryScreen, component: ParentLessonSummaryScreen, role: 'stack', backTarget: ROUTES.LessonSessionScreen, forwardCycleGroup: 'lesson-demo-review', stateMachineId: 'parent_lesson_summary' },
  { name: ROUTES.RobotLessonControlScreen, component: RobotLessonControlScreen, role: 'stack', backTarget: ROUTES.LessonDemoHomeScreen, stateMachineId: 'robot_lesson_control' },
]);

export const LESSON_DEMO_NAVIGATION = {
  owner: 'lesson-demo',
  rootBranch: 'protected',
  stackScreens: LESSON_DEMO_SCREENS,
  modalScreens: [],
} as const satisfies FeatureNavigationConfig;
