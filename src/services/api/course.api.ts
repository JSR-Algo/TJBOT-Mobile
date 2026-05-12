export interface Course {
  id: string;
  title: string;
  language: string;
  levelCount: number;
}

export interface Level {
  id: string;
  courseId: string;
  number: number;
  unitCount: number;
}

export interface Unit {
  id: string;
  levelId: string;
  title: string;
  lessonCount: number;
}

export interface LessonDetail {
  id: string;
  unitId: string;
  title: string;
  durationMinutes: number;
  wordsCount: number;
}

export interface ReviewQueueItem {
  lessonId: string;
  dueAt: string;
}

export interface DailyMission {
  targetMinutes: number;
  lessonsRemaining: number;
  wordsToReview: number;
}

export async function getCourse(_courseId: string): Promise<Course> {
  throw new Error('not implemented');
}

export async function getLevel(_levelId: string): Promise<Level> {
  throw new Error('not implemented');
}

export async function getUnit(_unitId: string): Promise<Unit> {
  throw new Error('not implemented');
}

export async function getLessonDetail(_lessonId: string): Promise<LessonDetail> {
  throw new Error('not implemented');
}

export async function getLessonList(_unitId: string): Promise<LessonDetail[]> {
  throw new Error('not implemented');
}

export async function getReviewQueue(_userId: string): Promise<ReviewQueueItem[]> {
  throw new Error('not implemented');
}

export async function getDailyMission(_userId: string): Promise<DailyMission> {
  throw new Error('not implemented');
}
