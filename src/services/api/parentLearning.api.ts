import client from '@/services/http/client';

export interface ParentLearningStep { stepId: string; stepNumber: number; total: number; activityTitle: string; phase: string; subject: string | null }
export interface ParentActiveLearning { assignmentId: string; sessionId: string | null; courseId: string; courseTitle: string; lessonId: string; lessonTitle: string; state: string; startedAt: string | null; currentStep: ParentLearningStep | null; positionPercent: number; activeDurationSec: number }
export interface ParentSessionSummary { childId: string; assignmentId: string; sessionId: string; courseId: string; courseTitle: string; lessonId: string; lessonTitle: string; terminalState: string; startedAt?: string | null; completedAt: string; durationSec: number; reportAvailable: boolean }
export interface ParentLearningHistoryPage { items: ParentSessionSummary[]; nextCursor: string | null }
export interface ParentCourseProgress { courseId: string; title: string; currentLessonPosition: number; completedLessonCount: number; totalLessonCount: number; positionPercent: number; suggestedNextLesson: SuggestedLesson | null }
export interface SuggestedLesson { lessonId: string; lessonTitle: string }
export interface ParentLearningStatus { activeLearning: ParentActiveLearning | null; recentSessions: ParentLearningHistoryPage; courseProgress: ParentCourseProgress[]; projectionRevision: string }
export interface ParentReportActivity { stepId: string; activityTitle: string; subject: string | null; outcome: string; attempts: number; finalResponseClass: string | null }
export interface ParentSessionReport { childId: string; sessionId: string; assignmentId: string; courseId: string; courseTitle: string; lessonId: string; lessonTitle: string; objective: string | null; state: string; durationSec: number; presented: string[]; attempted: string[]; accepted: string[]; needsReview: string[]; activities: ParentReportActivity[]; reward: { xp: number; stars: number } | null; suggestedNextLesson: SuggestedLesson | null }

export async function getParentLearningStatus(childId: string): Promise<ParentLearningStatus> {
  const response = await client.get(`/mobile/children/${encodeURIComponent(childId)}/learning-status`);
  return normalizeParentLearningStatus(response.data);
}

export async function getParentLearningHistory(childId: string, cursor?: string | null): Promise<ParentLearningHistoryPage> {
  const response = await client.get(`/mobile/children/${encodeURIComponent(childId)}/learning-status`, { params: cursor ? { cursor } : undefined });
  const root = record(unwrap(response.data));
  return normalizeHistoryPage(root.items === undefined ? root.recentSessions : root);
}

export async function getParentSessionReport(childId: string, sessionId: string): Promise<ParentSessionReport | null> {
  const response = await client.get(`/mobile/children/${encodeURIComponent(childId)}/learning-sessions/${encodeURIComponent(sessionId)}/report`);
  return normalizeParentSessionReport(response.data);
}

export function normalizeParentLearningStatus(payload: unknown): ParentLearningStatus {
  const value = record(unwrap(payload));
  return {
    activeLearning: value.activeLearning === null || value.activeLearning === undefined ? null : normalizeActiveLearning(value.activeLearning),
    recentSessions: normalizeHistoryPage(value.recentSessions),
    courseProgress: array(value.courseProgress).map(normalizeCourseProgress),
    projectionRevision: revision(value.projectionRevision),
  };
}

export function normalizeParentSessionReport(payload: unknown): ParentSessionReport | null {
  const unwrapped = unwrap(payload);
  if (unwrapped === null) return null;
  const value = record(unwrapped);
  return {
    childId: string(value.childId), sessionId: string(value.sessionId), assignmentId: string(value.assignmentId),
    courseId: string(value.courseId), courseTitle: string(value.courseTitle), lessonId: string(value.lessonId), lessonTitle: string(value.lessonTitle),
    objective: nullableString(value.objective), state: string(value.state), durationSec: nonNegative(value.durationSec),
    presented: strings(value.presented), attempted: strings(value.attempted), accepted: strings(value.accepted), needsReview: strings(value.needsReview),
    activities: array(value.activities).map(normalizeActivity), reward: value.reward == null ? null : normalizeReward(value.reward),
    suggestedNextLesson: value.suggestedNextLesson == null ? null : normalizeSuggestedLesson(value.suggestedNextLesson),
  };
}

function normalizeActiveLearning(input: unknown): ParentActiveLearning {
  const value = record(input);
  return { assignmentId: string(value.assignmentId), sessionId: nullableString(value.sessionId), courseId: string(value.courseId), courseTitle: string(value.courseTitle), lessonId: string(value.lessonId), lessonTitle: string(value.lessonTitle), state: string(value.state), startedAt: nullableString(value.startedAt), currentStep: value.currentStep == null ? null : normalizeStep(value.currentStep), positionPercent: nonNegative(value.positionPercent), activeDurationSec: nonNegative(value.activeDurationSec) };
}
function normalizeStep(input: unknown): ParentLearningStep { const v = record(input); return { stepId: string(v.stepId), stepNumber: nonNegative(v.stepNumber), total: nonNegative(v.total), activityTitle: string(v.activityTitle), phase: string(v.phase), subject: nullableString(v.subject) }; }
function normalizeSummary(input: unknown): ParentSessionSummary { const v = record(input); return { childId: string(v.childId), assignmentId: string(v.assignmentId), sessionId: string(v.sessionId), courseId: string(v.courseId), courseTitle: string(v.courseTitle), lessonId: string(v.lessonId), lessonTitle: string(v.lessonTitle), terminalState: string(v.terminalState), ...('startedAt' in v ? { startedAt: nullableString(v.startedAt) } : {}), completedAt: string(v.completedAt), durationSec: nonNegative(v.durationSec), reportAvailable: v.reportAvailable === true }; }
function normalizeHistoryPage(input: unknown): ParentLearningHistoryPage { const v = record(input); return { items: array(v.items).map(normalizeSummary), nextCursor: nullableString(v.nextCursor) }; }
function normalizeCourseProgress(input: unknown): ParentCourseProgress { const v = record(input); return { courseId: string(v.courseId), title: string(v.title), currentLessonPosition: nonNegative(v.currentLessonPosition), completedLessonCount: nonNegative(v.completedLessonCount), totalLessonCount: nonNegative(v.totalLessonCount), positionPercent: nonNegative(v.positionPercent), suggestedNextLesson: v.suggestedNextLesson == null ? null : normalizeSuggestedLesson(v.suggestedNextLesson) }; }
function normalizeSuggestedLesson(input: unknown): SuggestedLesson { const v = record(input); return { lessonId: string(v.lessonId), lessonTitle: string(v.lessonTitle) }; }
function normalizeActivity(input: unknown): ParentReportActivity { const v = record(input); return { stepId: string(v.stepId), activityTitle: string(v.activityTitle), subject: nullableString(v.subject), outcome: string(v.outcome), attempts: nonNegative(v.attempts), finalResponseClass: nullableString(v.finalResponseClass) }; }
function normalizeReward(input: unknown): { xp: number; stars: number } { const v = record(input); return { xp: nonNegative(v.xp), stars: nonNegative(v.stars) }; }
function unwrap(input: unknown): unknown { const v = record(input); return v.data !== undefined ? v.data : input; }
function record(input: unknown): Record<string, unknown> { return typeof input === 'object' && input !== null && !Array.isArray(input) ? input as Record<string, unknown> : {}; }
function array(input: unknown): unknown[] { return Array.isArray(input) ? input : []; }
function string(input: unknown): string { return typeof input === 'string' ? input : ''; }
function nullableString(input: unknown): string | null { return typeof input === 'string' ? input : null; }
function strings(input: unknown): string[] { return array(input).filter((v): v is string => typeof v === 'string'); }
function nonNegative(input: unknown): number { return typeof input === 'number' && Number.isFinite(input) && input >= 0 ? input : 0; }
function revision(input: unknown): string { if (typeof input !== 'string' || !/^\d+$/.test(input)) return '0'; return input.replace(/^0+(?=\d)/, ''); }
