export interface TodayProgress {
  minutesDone: number;
  minutesGoal: number;
  lessonsCompleted: number;
}

export interface WordsPracticed {
  date: string;
  words: string[];
  count: number;
}

export interface LessonSummary {
  lessonId: string;
  score: number;
  wordsLearned: number;
  durationSeconds: number;
}

export interface ReviewQueueItem {
  lessonId: string;
  wordId: string;
  dueAt: string;
}

export async function getTodayProgress(): Promise<TodayProgress> {
  throw new Error('not implemented');
}

export async function getWordsPracticed(): Promise<WordsPracticed> {
  throw new Error('not implemented');
}

export async function getLessonSummary(_lessonId: string): Promise<LessonSummary> {
  throw new Error('not implemented');
}

export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  throw new Error('not implemented');
}
