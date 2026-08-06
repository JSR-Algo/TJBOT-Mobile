import LessonDemoHomeScreen from './screens/LessonDemoHomeScreen';
import LessonPickScreen from './screens/LessonPickScreen';
import LessonRoadmapScreen from './screens/LessonRoadmapScreen';
import LessonSessionScreen from './screens/LessonSessionScreen';
import LessonShowcaseScreen from './screens/LessonShowcaseScreen';
import ParentLessonSummaryScreen from './screens/ParentLessonSummaryScreen';
import RobotCompanionScreen from './screens/RobotCompanionScreen';
import RobotFullscreenLessonScreen from './screens/RobotFullscreenLessonScreen';
import RobotLessonControlScreen from './screens/RobotLessonControlScreen';

export const SCREEN_MAP = {
  lesson_demo_home: LessonDemoHomeScreen,
  lesson_demo_roadmap: LessonRoadmapScreen,
  lesson_demo_session: LessonSessionScreen,
  lesson_demo_showcase: LessonShowcaseScreen,
  parent_lesson_summary: ParentLessonSummaryScreen,
  robot_lesson_control: RobotLessonControlScreen,
  lesson_pick: LessonPickScreen,
  robot_companion: RobotCompanionScreen,
  robot_fullscreen_lesson: RobotFullscreenLessonScreen,
};

export { STATES } from './states';
export * from './types';
export * from './content/barnSayItLesson';
export * from './content/curatedLegacyLessons';
export * from './content/legacyLessonBuilder';
export * from './content/sixMonthLessonPack';
export * from './lessonVoicePrompt';
export * from './providers/StaticLessonContentProvider';
export * from './store/useLessonDemoProgressStore';
export * from './scene';
