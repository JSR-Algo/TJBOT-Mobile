import type { LessonAgeBand } from '../types';
import { LESSON_AGE_BANDS } from '../types';
import {
  getInitialLessonDemoProgress,
  useLessonDemoProgressStore,
} from '../store/useLessonDemoProgressStore';

export const screenAgeBands: LessonAgeBand[] = LESSON_AGE_BANDS;

const ageBandCopy: Record<LessonAgeBand, string> = {
  '4-6': 'Pictures, gestures, and one tiny phrase.',
  '7-9': 'Two or three words with a simple sentence frame.',
  '10-11': 'Short role-play with a parent grammar note.',
};

export function getAgeBandCopy(ageBand: LessonAgeBand): string {
  return ageBandCopy[ageBand];
}

export function resetLessonDemoScreenProgress(): void {
  useLessonDemoProgressStore.setState({
    progress: getInitialLessonDemoProgress(),
    hydrated: true,
  });
}

export function getCompletedLessonLabel(count: number): string {
  return count === 1 ? '1 lesson' : `${count} lessons`;
}
