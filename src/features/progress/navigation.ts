import TodayProgressScreen from './screens/TodayProgressScreen';
import WordsPracticedScreen from './screens/WordsPracticedScreen';
import LessonSummaryScreen from './screens/LessonSummaryScreen';
import ReviewNeededScreen from './screens/ReviewNeededScreen';
import CelebrationScreen from './screens/CelebrationScreen';
import LessonDemoHomeScreen from './screens/LessonDemoHomeScreen';
import LessonDemoRoadmapScreen from './screens/LessonDemoRoadmapScreen';
import LessonDemoSessionScreen from './screens/LessonDemoSessionScreen';
import LessonDemoParentSummaryScreen from './screens/LessonDemoParentSummaryScreen';
import LessonDemoShowcaseScreen from './screens/LessonDemoShowcaseScreen';
import LessonPlannerScreen from './screens/LessonPlannerScreen';
import ChildPracticeScreen from './screens/ChildPracticeScreen';
import RobotLessonControlScreen from './screens/RobotLessonControlScreen';
import { TrendingUp } from 'lucide-react-native';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const PROGRESS_TAB_SCREEN = {
  name: ROUTES.TodayProgressScreen,
  component: TodayProgressScreen,
  role: 'tab',
  stateMachineId: 'today_progress',
  tabName: 'Progress',
  title: 'Progress',
  tabOrder: 4,
  tabIcon: TrendingUp,
  tabBarButtonTestID: 'progressTab',
} as const;

export const PROGRESS_SCREENS = defineFeatureScreens([
  { name: ROUTES.WordsPracticedScreen, component: WordsPracticedScreen, role: 'state-machine', backTarget: ROUTES.TodayProgressScreen, stateMachineId: 'words_practiced' },
  { name: ROUTES.LessonSummaryScreen, component: LessonSummaryScreen, role: 'stack-entry', stateMachineId: 'lesson_summary' },
  { name: ROUTES.ReviewNeededScreen, component: ReviewNeededScreen, role: 'stack-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'review_needed' },
  { name: ROUTES.CelebrationScreen, component: CelebrationScreen, role: 'state-machine', stateMachineId: 'celebration' },
  { name: ROUTES.LessonDemoHomeScreen, component: LessonDemoHomeScreen, role: 'stack-entry', backTarget: ROUTES.TodayProgressScreen, stateMachineId: 'lesson_demo_home' },
  { name: ROUTES.LessonDemoRoadmapScreen, component: LessonDemoRoadmapScreen, role: 'stack-entry', backTarget: ROUTES.LessonDemoHomeScreen, stateMachineId: 'lesson_demo_roadmap' },
  { name: ROUTES.LessonDemoSessionScreen, component: LessonDemoSessionScreen, role: 'stack-entry', backTarget: ROUTES.LessonDemoHomeScreen, stateMachineId: 'lesson_demo_session' },
  { name: ROUTES.LessonDemoParentSummaryScreen, component: LessonDemoParentSummaryScreen, role: 'stack-entry', backTarget: ROUTES.LessonDemoSessionScreen, stateMachineId: 'lesson_demo_parent_summary' },
  { name: ROUTES.LessonDemoShowcaseScreen, component: LessonDemoShowcaseScreen, role: 'stack-entry', backTarget: ROUTES.LessonDemoHomeScreen, stateMachineId: 'lesson_demo_showcase' },
  { name: ROUTES.LessonPlannerScreen, component: LessonPlannerScreen, role: 'stack-entry', backTarget: ROUTES.TodayProgressScreen, stateMachineId: 'lesson_planner' },
  { name: ROUTES.ChildPracticeScreen, component: ChildPracticeScreen, role: 'stack-entry', backTarget: ROUTES.LessonPlannerScreen, stateMachineId: 'child_practice' },
  { name: ROUTES.RobotLessonControlScreen, component: RobotLessonControlScreen, role: 'stack-entry', backTarget: ROUTES.LessonDemoHomeScreen, stateMachineId: 'robot_lesson_control' },
]);

export const PROGRESS_NAVIGATION = {
  owner: 'progress',
  rootBranch: 'protected',
  stackScreens: PROGRESS_SCREENS,
  modalScreens: [],
  tabScreen: PROGRESS_TAB_SCREEN,
} as const satisfies FeatureNavigationConfig;
