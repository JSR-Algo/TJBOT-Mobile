import TodayProgressScreen from './screens/TodayProgressScreen';
import WordsPracticedScreen from './screens/WordsPracticedScreen';
import LessonSummaryScreen from './screens/LessonSummaryScreen';
import ReviewNeededScreen from './screens/ReviewNeededScreen';
import CelebrationScreen from './screens/CelebrationScreen';
import { STATES } from './states';

export const SCREEN_MAP = {
  today_progress: TodayProgressScreen,
  words_practiced: WordsPracticedScreen,
  lesson_summary: LessonSummaryScreen,
  review_needed: ReviewNeededScreen,
  celebration: CelebrationScreen,
};

export { STATES };
