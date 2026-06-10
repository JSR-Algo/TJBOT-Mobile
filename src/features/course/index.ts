import CourseScreen from './screens/CourseScreen';
import LevelScreen from './screens/LevelScreen';
import UnitScreen from './screens/UnitScreen';
import LessonListScreen from './screens/LessonListScreen';
import LessonDetailScreen from './screens/LessonDetailScreen';
import ReviewEntryScreen from './screens/ReviewEntryScreen';
import DailyMissionScreen from './screens/DailyMissionScreen';
import { STATES } from './states';

export const SCREEN_MAP = {
  course: CourseScreen,
  level: LevelScreen,
  unit: UnitScreen,
  lesson_list: LessonListScreen,
  lesson_detail: LessonDetailScreen,
  review_entry: ReviewEntryScreen,
  daily_mission: DailyMissionScreen,
};

export { STATES };
