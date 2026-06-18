import type { PublishedLesson } from '@/services/api/course-library.api';
import type { KPIs, PronunciationTrend } from '@/services/api/learning';
import type { AssignmentProgress, ChildProgress, ChildProgressByCourse } from '@/services/api/progress.api';

const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

export interface CoursePathItem extends ChildProgressByCourse {
  percent: number;
}

export interface CourseInsightDashboard {
  completedLessons: number;
  currentStreakDays: number;
  masteredWords: number;
  completionRatePct: number;
  stepSuccessPct: number;
  activeLessons: number;
  failedLessons: number;
  engagementScore: number;
  retentionRate: number;
  pronunciationScore: number;
  pronunciationTrend: PronunciationTrend['trend'] | 'none';
  coursePath: CoursePathItem[];
  strongestCourse: CoursePathItem | null;
  nextCourse: CoursePathItem | null;
}

export function buildCourseInsightDashboard(input: {
  progress?: ChildProgress | null;
  assignments?: AssignmentProgress[] | null;
  kpis?: KPIs | null;
  pronunciationTrend?: PronunciationTrend | null;
}): CourseInsightDashboard {
  const assignments = input.assignments ?? [];
  const terminal = assignments.filter((a) => TERMINAL_STATES.has(a.state));
  const completed = terminal.filter((a) => a.state === 'COMPLETED').length;
  const failed = terminal.filter((a) => a.state === 'FAILED').length;
  const stepsCompleted = assignments.reduce((sum, a) => sum + Math.max(0, a.stepsCompleted), 0);
  const stepsSucceeded = assignments.reduce((sum, a) => sum + Math.max(0, a.stepsSucceeded), 0);
  const coursePath = (input.progress?.byCourse ?? []).map((course) => ({
    ...course,
    percent: course.lessonsTotal > 0 ? Math.round((course.lessonsCompleted / course.lessonsTotal) * 100) : 0,
  }));

  const sortedByProgress = [...coursePath].sort((a, b) => b.percent - a.percent);
  const sortedNext = [...coursePath].sort((a, b) => a.percent - b.percent);

  return {
    completedLessons: input.progress?.lessonsCompleted ?? completed,
    currentStreakDays: input.progress?.currentStreakDays ?? input.kpis?.daily_streak ?? 0,
    masteredWords: input.progress?.masteredWords ?? 0,
    completionRatePct: terminal.length > 0 ? Math.round((completed / terminal.length) * 100) : 0,
    stepSuccessPct: stepsCompleted > 0 ? Math.round((stepsSucceeded / stepsCompleted) * 100) : 0,
    activeLessons: assignments.filter((a) => !TERMINAL_STATES.has(a.state)).length,
    failedLessons: failed,
    engagementScore: input.kpis?.engagement_score ?? 0,
    retentionRate: input.kpis?.retention_rate ?? 0,
    pronunciationScore: input.pronunciationTrend?.avg_score ?? 0,
    pronunciationTrend: input.pronunciationTrend?.trend ?? 'none',
    coursePath,
    strongestCourse: sortedByProgress[0] ?? null,
    nextCourse: sortedNext.find((c) => c.lessonsCompleted < c.lessonsTotal) ?? null,
  };
}

export function lessonFitCopy(lesson: PublishedLesson): string {
  const parts: string[] = [];
  const matches = lesson.personalization?.matchedTopics ?? [];
  if (lesson.personalization?.reasonCode === 'interest_match' && matches.length > 0) {
    parts.push(`Interest match: ${matches.join(', ')}`);
  } else if (lesson.personalization?.reasonCode === 'personality_match' && matches.length > 0) {
    parts.push(`Best fit: ${matches.join(', ')}`);
  } else if (lesson.personalization?.rank) {
    parts.push(`Personalized rank #${lesson.personalization.rank}`);
  }
  if (lesson.difficultyBand) parts.push(lesson.difficultyBand);
  if (lesson.estimatedDurationSec) parts.push(`${Math.max(1, Math.round(lesson.estimatedDurationSec / 60))} min`);
  if (parts.length === 0 && lesson.topicTags?.length) parts.push(lesson.topicTags.slice(0, 3).join(', '));
  return parts.join(' · ');
}

export function qualityLabel(percent: number): string {
  if (percent >= 85) return 'Strong';
  if (percent >= 60) return 'Needs attention';
  if (percent > 0) return 'At risk';
  return 'No data';
}
