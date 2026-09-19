import { buildCanonicalProgressDashboard } from '@/features/progress/hooks/useChildProgressDashboardQuery';
import type { ParentLearningStatus, ParentSessionSummary } from '@/services/api/parentLearning.api';
import { parentSessionStateLabel } from '@/features/parent/parentLearningCopy';

it('derives every dashboard total from the canonical parent projection', () => {
  const status: ParentLearningStatus = {
    activeLearning: null,
    recentSessions: { items: [{ childId: 'child-1', assignmentId: 'a-1', sessionId: 's-1', courseId: 'c-1', courseTitle: 'English', lessonId: 'l-1', lessonTitle: 'Farm', terminalState: 'COMPLETED', startedAt: '2026-07-26T23:58:30Z', completedAt: '2026-07-27T00:00:00Z', durationSec: 90, reportAvailable: true }], nextCursor: null },
    courseProgress: [{ courseId: 'c-1', title: 'English', currentLessonPosition: 4, completedLessonCount: 3, totalLessonCount: 10, positionPercent: 30, suggestedNextLesson: null }],
    projectionRevision: '7',
  };
  expect(buildCanonicalProgressDashboard(status)).toMatchObject({ completedLessons: 3, totalLessons: 10, completedSessions: 1, recentDurationSec: 90 });
  expect(buildCanonicalProgressDashboard(status)).toMatchObject({ failedSessions: 0, interruptedSessions: 0 });
  expect(buildCanonicalProgressDashboard({ ...status, courseProgress: [{ ...status.courseProgress[0], completedLessonCount: 4, positionPercent: 40 }], projectionRevision: '8' })).toMatchObject({ completedLessons: 4, totalLessons: 10 });
});

/**
 * D11 — a transport disconnect must not be reported to a parent as a failed session.
 *
 * `useChildProgressDashboardQuery` counted `terminalState !== 'COMPLETED'` as failed. D8 now
 * ends a vanished robot's assignment `CANCELLED`, which the backend masks to `ABANDONED`
 * before it reaches the client, so a Wi-Fi drop told a parent their child failed a lesson.
 */
function summary(overrides: Partial<ParentSessionSummary> & { sessionId: string; terminalState: string }): ParentSessionSummary {
  return {
    childId: 'child-1', assignmentId: `a-${overrides.sessionId}`, courseId: 'c-1', courseTitle: 'English',
    lessonId: 'l-1', lessonTitle: 'Farm', startedAt: '2026-07-26T23:58:30Z', completedAt: '2026-07-27T00:00:00Z',
    durationSec: 60, reportAvailable: true, ...overrides,
  };
}

function statusWith(sessions: ParentSessionSummary[]): ParentLearningStatus {
  return { activeLearning: null, recentSessions: { items: sessions, nextCursor: null }, courseProgress: [], projectionRevision: '1' };
}

it('does not count an interrupted session as a failed one', () => {
  // ABANDONED is what a disconnect-abandoned assignment looks like by the time it reaches a parent.
  const dashboard = buildCanonicalProgressDashboard(statusWith([summary({ sessionId: 's-1', terminalState: 'ABANDONED' })]));
  expect(dashboard.failedSessions).toBe(0);
  expect(dashboard.interruptedSessions).toBe(1);
});

it('still counts a genuine backend failure as a failure', () => {
  const dashboard = buildCanonicalProgressDashboard(statusWith([summary({ sessionId: 's-1', terminalState: 'FAILED' })]));
  expect(dashboard.failedSessions).toBe(1);
  expect(dashboard.interruptedSessions).toBe(0);
});

it('counts an unrecognised terminal state as interrupted, never as failed', () => {
  // The safe direction: an outcome this client does not recognise is never attributed to the child.
  const dashboard = buildCanonicalProgressDashboard(statusWith([summary({ sessionId: 's-1', terminalState: 'SOMETHING_NEW' })]));
  expect(dashboard.failedSessions).toBe(0);
  expect(dashboard.interruptedSessions).toBe(1);
});

it('keeps the three buckets exhaustive over every session', () => {
  const dashboard = buildCanonicalProgressDashboard(statusWith([
    summary({ sessionId: 's-1', terminalState: 'COMPLETED' }),
    summary({ sessionId: 's-2', terminalState: 'COMPLETED' }),
    summary({ sessionId: 's-3', terminalState: 'FAILED' }),
    summary({ sessionId: 's-4', terminalState: 'ABANDONED' }),
    summary({ sessionId: 's-5', terminalState: 'ABANDONED' }),
    summary({ sessionId: 's-6', terminalState: '' }),
  ]));
  expect(dashboard.completedSessions).toBe(2);
  expect(dashboard.failedSessions).toBe(1);
  expect(dashboard.interruptedSessions).toBe(3);
  expect(dashboard.completedSessions + dashboard.failedSessions + dashboard.interruptedSessions).toBe(dashboard.sessions.length);
});

it('words an interrupted session with the existing copy, not a new string', () => {
  // No new parent-facing string is introduced by D11: the surrounding UI already words a
  // session that stopped early as "Didn't finish", which is what a parent should read for a
  // robot that lost its network. ParentHistoryScreen renders exactly this label.
  expect(parentSessionStateLabel('ABANDONED', 'en')).toBe("Didn't finish");
  expect(parentSessionStateLabel('ABANDONED', 'en')).not.toMatch(/fail/i);
});
