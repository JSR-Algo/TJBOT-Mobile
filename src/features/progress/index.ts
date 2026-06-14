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
import { STATES } from './states';

export const SCREEN_MAP = {
  today_progress: TodayProgressScreen,
  words_practiced: WordsPracticedScreen,
  lesson_summary: LessonSummaryScreen,
  review_needed: ReviewNeededScreen,
  celebration: CelebrationScreen,
  lesson_demo_home: LessonDemoHomeScreen,
  lesson_demo_roadmap: LessonDemoRoadmapScreen,
  lesson_demo_session: LessonDemoSessionScreen,
  lesson_demo_parent_summary: LessonDemoParentSummaryScreen,
  lesson_demo_showcase: LessonDemoShowcaseScreen,
  lesson_planner: LessonPlannerScreen,
  child_practice: ChildPracticeScreen,
  robot_lesson_control: RobotLessonControlScreen,
};

export { STATES };
