import { MVP_SCOPE_HIDDEN } from '@/navigation/mvpProductionRoutes';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';
import RobotLessonControlScreen from './screens/RobotLessonControlScreen';
import LessonDemoHomeScreen from './screens/LessonDemoHomeScreen';
import LessonRoadmapScreen from './screens/LessonRoadmapScreen';
import LessonSessionScreen from './screens/LessonSessionScreen';
import LessonShowcaseScreen from './screens/LessonShowcaseScreen';
import ParentLessonSummaryScreen from './screens/ParentLessonSummaryScreen';
import LessonPickScreen from './screens/LessonPickScreen';
import RobotCompanionScreen from './screens/RobotCompanionScreen';
import RobotFullscreenLessonScreen from './screens/RobotFullscreenLessonScreen';

// Investor/demo phone lesson player — not part of parent MVP (robot-first).
const HIDDEN = MVP_SCOPE_HIDDEN;

export const LESSON_DEMO_SCREENS = defineFeatureScreens([
  { name: ROUTES.LessonDemoHomeScreen, component: LessonDemoHomeScreen, role: 'stack-entry', stateMachineId: 'lesson_demo_home', ...HIDDEN },
  { name: ROUTES.LessonRoadmapScreen, component: LessonRoadmapScreen, role: 'stack-entry', backTarget: ROUTES.LessonDemoHomeScreen, forwardCycleGroup: 'lesson-demo-review', stateMachineId: 'lesson_demo_roadmap', ...HIDDEN },
  { name: ROUTES.LessonSessionScreen, component: LessonSessionScreen, role: 'stack', backTarget: ROUTES.LessonDemoHomeScreen, forwardCycleGroup: 'lesson-demo-review', stateMachineId: 'lesson_demo_session', ...HIDDEN },
  { name: ROUTES.LessonShowcaseScreen, component: LessonShowcaseScreen, role: 'stack', backTarget: ROUTES.LessonDemoHomeScreen, stateMachineId: 'lesson_demo_showcase', ...HIDDEN },
  { name: ROUTES.ParentLessonSummaryScreen, component: ParentLessonSummaryScreen, role: 'stack', backTarget: ROUTES.LessonSessionScreen, forwardCycleGroup: 'lesson-demo-review', stateMachineId: 'parent_lesson_summary', ...HIDDEN },
  { name: ROUTES.RobotLessonControlScreen, component: RobotLessonControlScreen, role: 'stack', backTarget: ROUTES.LessonDemoHomeScreen, stateMachineId: 'robot_lesson_control', ...HIDDEN },
  { name: ROUTES.LessonPickScreen, component: LessonPickScreen, role: 'stack-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'lesson_pick', ...HIDDEN },
  { name: ROUTES.RobotCompanionScreen, component: RobotCompanionScreen, role: 'stack-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'robot_companion', ...HIDDEN },
  { name: ROUTES.RobotFullscreenLessonScreen, component: RobotFullscreenLessonScreen, role: 'stack', backTarget: ROUTES.RobotCompanionScreen, stateMachineId: 'robot_fullscreen_lesson', ...HIDDEN },
]);

export const LESSON_DEMO_NAVIGATION = {
  owner: 'lesson-demo',
  rootBranch: 'protected',
  stackScreens: LESSON_DEMO_SCREENS,
  modalScreens: [],
} as const satisfies FeatureNavigationConfig;
