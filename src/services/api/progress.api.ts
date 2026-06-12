import client from '@/services/http/client';
import type { AssignmentState } from '@/services/api/course-library.api';

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

// ───────────────────────────────────────────────────────────────────────────
// US-006 Slice-01 (LANE-MOBILE, M3 surface-b): aggregate child-scoped progress.
//
// This is the dashboard aggregate (mastery/streak/lessons-completed). It is the
// SECOND progress surface — the first is the live device-scoped poll
// (getCurrentAssignment + getPreloadStatus, course-library.api.ts). This needs
// its OWN normalizer (DIV-MOBILE-NORMALIZER) — do NOT force-fit
// normalizeProgressSummaryPayload, which parses the legacy minutes/words tree.
//
// Path: extends the existing learning/children tree (plan M3 "extending the
// existing learning kpis tree"; lesson-api §3.12 OPEN resolves to the
// `learning/children/:childId` tree, not a bare `/children/` surface). Bare of
// `/v1` (Config.API_BASE_URL already ends in /v1).
// `lessonsCompleted` here is the AGGREGATE count projection of the authoritative
// progress_events.lesson_completed rows — NOT a live assignment.state read.
// ───────────────────────────────────────────────────────────────────────────

export interface ChildProgressByCourse {
  courseId: string;
  lessonsCompleted: number;
  lessonsTotal: number;
}

export interface ChildProgress {
  childId: string;
  lessonsCompleted: number;
  currentStreakDays: number;
  masteredWords: number;
  byCourse: ChildProgressByCourse[];
}

export function normalizeChildProgressPayload(payload: unknown): ChildProgress {
  const envelope = pickEnvelope<Record<string, unknown>>(payload) ?? {};
  const summary =
    envelope.summary && typeof envelope.summary === 'object'
      ? (envelope.summary as Record<string, unknown>)
      : {};
  const byCourseRaw = envelope.byCourse ?? envelope.by_course;
  const byCourse: ChildProgressByCourse[] = Array.isArray(byCourseRaw)
    ? byCourseRaw.map((entry) => {
        const c = (entry ?? {}) as Record<string, unknown>;
        return {
          courseId: (c.course_id ?? c.courseId ?? '') as string,
          lessonsCompleted: Number(c.lessons_completed ?? c.lessonsCompleted ?? 0),
          lessonsTotal: Number(c.lessons_total ?? c.lessonsTotal ?? 0),
        };
      })
    : [];
  return {
    childId: (envelope.child_id ?? envelope.childId ?? '') as string,
    lessonsCompleted: Number(summary.lessons_completed ?? summary.lessonsCompleted ?? 0),
    currentStreakDays: Number(summary.current_streak_days ?? summary.currentStreakDays ?? 0),
    masteredWords: Number(summary.mastered_words ?? summary.masteredWords ?? 0),
    byCourse,
  };
}

export async function getChildProgress(childId: string): Promise<ChildProgress> {
  const response = await client.get(`/learning/children/${childId}/progress`);
  return normalizeChildProgressPayload(response.data);
}

// ───────────────────────────────────────────────────────────────────────────
// US-006 lesson-runtime progress (parent dashboard). Child-scoped feed of a
// child's lesson ASSIGNMENTS + per-assignment step counts, newest first. This
// is the live per-assignment monitoring surface (distinct from the aggregate
// getChildProgress above): it powers Today (latest/active) + History (terminal
// assignments). Backend: GET children/:childId/lesson-progress (parent JWT,
// child-scoped) -> { data: { assignments: AssignmentProgress[] } }. Wire fields
// are camelCase (server SQL aliases), so no snake_case fallback is needed; the
// envelope unwrap mirrors getChildProgress (DIV-MOBILE-NORMALIZER). Bare of
// `/v1` — Config.API_BASE_URL already ends in /v1.
// ───────────────────────────────────────────────────────────────────────────

const ASSIGNMENT_STATES: readonly AssignmentState[] = [
  'UNASSIGNED', 'ASSIGNED', 'PRELOADING', 'READY', 'RUNNING', 'COMPLETED', 'PAUSED', 'FAILED', 'CANCELLED',
];

function toAssignmentState(value: unknown): AssignmentState {
  return typeof value === 'string' && (ASSIGNMENT_STATES as readonly string[]).includes(value)
    ? (value as AssignmentState)
    : 'UNASSIGNED';
}

export interface AssignmentProgress {
  assignmentId: string;
  deviceId: string;
  childId: string;
  lessonId: string;
  lessonVersion: number;
  lessonTitle: string | null;
  profile: string;
  state: AssignmentState;
  startedAt: string | null;
  completedAt: string | null;
  stepsCompleted: number;
  stepsSucceeded: number;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function normalizeAssignmentProgress(entry: unknown): AssignmentProgress {
  const r = (entry ?? {}) as Record<string, unknown>;
  const lessonTitle = r.lessonTitle;
  return {
    assignmentId: (r.assignmentId ?? '') as string,
    deviceId: (r.deviceId ?? '') as string,
    childId: (r.childId ?? '') as string,
    lessonId: (r.lessonId ?? '') as string,
    lessonVersion: Number(r.lessonVersion ?? 0),
    lessonTitle: typeof lessonTitle === 'string' ? lessonTitle : null,
    profile: (r.profile ?? '') as string,
    state: toAssignmentState(r.state),
    startedAt: (r.startedAt ?? null) as string | null,
    completedAt: (r.completedAt ?? null) as string | null,
    stepsCompleted: Number(r.stepsCompleted ?? 0),
    stepsSucceeded: Number(r.stepsSucceeded ?? 0),
    lastEventAt: (r.lastEventAt ?? null) as string | null,
    createdAt: (r.createdAt ?? '') as string,
    updatedAt: (r.updatedAt ?? '') as string,
  };
}

export function normalizeChildLessonProgressPayload(payload: unknown): AssignmentProgress[] {
  const envelope = pickEnvelope<Record<string, unknown>>(payload) ?? {};
  const rows = envelope.assignments;
  return Array.isArray(rows) ? rows.map(normalizeAssignmentProgress) : [];
}

export async function getChildLessonProgress(childId: string): Promise<AssignmentProgress[]> {
  const response = await client.get(`/children/${childId}/lesson-progress`);
  return normalizeChildLessonProgressPayload(response.data);
}
