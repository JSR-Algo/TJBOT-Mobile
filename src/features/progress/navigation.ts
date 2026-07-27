import TodayProgressScreen from './screens/TodayProgressScreen';
import WordsPracticedScreen from './screens/WordsPracticedScreen';
import LessonSummaryScreen from './screens/LessonSummaryScreen';
import ReviewNeededScreen from './screens/ReviewNeededScreen';
import CelebrationScreen from './screens/CelebrationScreen';
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
  { name: ROUTES.LessonSummaryScreen, component: LessonSummaryScreen, role: 'stack-entry', stateMachineId: 'lesson_summary', forwardCycleGroup: 'lesson-session-loop' },
  { name: ROUTES.ReviewNeededScreen, component: ReviewNeededScreen, role: 'stack-entry', backTarget: ROUTES.HomeHubScreen, stateMachineId: 'review_needed' },
  { name: ROUTES.CelebrationScreen, component: CelebrationScreen, role: 'state-machine', stateMachineId: 'celebration' },
]);

export const PROGRESS_NAVIGATION = {
  owner: 'progress',
  rootBranch: 'protected',
  stackScreens: PROGRESS_SCREENS,
  modalScreens: [],
  tabScreen: PROGRESS_TAB_SCREEN,
} as const satisfies FeatureNavigationConfig;
