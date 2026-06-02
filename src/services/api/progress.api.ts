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

export interface ProgressSummary {
  minutesDone: number;
  minutesGoal: number;
  lessonsCompleted: number;
  speakingTurns: number;
  starsToday: number;
  streakDays: number;
  words: string[];
  reviewDueCount: number;
  weeklyBars: number[];
}

const EMPTY_WEEK: readonly number[] = [0, 0, 0, 0, 0, 0, 0];

export const EMPTY_PROGRESS_SUMMARY: ProgressSummary = Object.freeze({
  minutesDone: 0,
  minutesGoal: 0,
  lessonsCompleted: 0,
  speakingTurns: 0,
  starsToday: 0,
  streakDays: 0,
  words: [],
  reviewDueCount: 0,
  weeklyBars: [...EMPTY_WEEK],
});

function pickEnvelope<T>(payload: unknown): T | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const obj = payload as Record<string, unknown>;
  if ('data' in obj && obj.data && typeof obj.data === 'object') return obj.data as T;
  return obj as T;
}

export function normalizeProgressSummaryPayload(payload: unknown): ProgressSummary {
  const envelope = pickEnvelope<Record<string, unknown>>(payload) ?? {};
  const minutesDone = Number(envelope.minutes_done ?? envelope.minutesDone ?? 0);
  const minutesGoal = Number(envelope.minutes_goal ?? envelope.minutesGoal ?? 0);
  const lessonsCompleted = Number(envelope.lessons_completed ?? envelope.lessonsCompleted ?? 0);
  const speakingTurns = Number(envelope.speaking_turns ?? envelope.speakingTurns ?? 0);
  const starsToday = Number(envelope.stars_today ?? envelope.starsToday ?? 0);
  const streakDays = Number(envelope.streak_days ?? envelope.streakDays ?? 0);
  const wordsRaw = (envelope.words ?? []) as unknown[];
  const words = Array.isArray(wordsRaw) ? wordsRaw.filter((w): w is string => typeof w === 'string') : [];
  const reviewDueCount = Number(envelope.review_due_count ?? envelope.reviewDueCount ?? 0);
  const weeklyRaw = (envelope.weekly_bars ?? envelope.weeklyBars ?? []) as unknown[];
  const weeklyBars =
    Array.isArray(weeklyRaw) && weeklyRaw.length === 7
      ? weeklyRaw.map((n) => Number(n) || 0)
      : [...EMPTY_WEEK];
  return {
    minutesDone,
    minutesGoal,
    lessonsCompleted,
    speakingTurns,
    starsToday,
    streakDays,
    words,
    reviewDueCount,
    weeklyBars,
  };
}

export async function getProgressSummary(): Promise<ProgressSummary> {
  return {
    ...EMPTY_PROGRESS_SUMMARY,
    words: [...EMPTY_PROGRESS_SUMMARY.words],
    weeklyBars: [...EMPTY_PROGRESS_SUMMARY.weeklyBars],
  };
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
