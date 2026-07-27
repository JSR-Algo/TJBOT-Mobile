import { buildCanonicalProgressDashboard } from '@/features/progress/hooks/useChildProgressDashboardQuery';
import type { ParentLearningStatus } from '@/services/api/parentLearning.api';

it('derives every dashboard total from the canonical parent projection', () => {
  const status: ParentLearningStatus = {
    activeLearning: null,
    recentSessions: { items: [{ childId: 'child-1', assignmentId: 'a-1', sessionId: 's-1', courseId: 'c-1', courseTitle: 'English', lessonId: 'l-1', lessonTitle: 'Farm', terminalState: 'COMPLETED', startedAt: '2026-07-26T23:58:30Z', completedAt: '2026-07-27T00:00:00Z', durationSec: 90, reportAvailable: true }], nextCursor: null },
    courseProgress: [{ courseId: 'c-1', title: 'English', currentLessonPosition: 4, completedLessonCount: 3, totalLessonCount: 10, positionPercent: 30, suggestedNextLesson: null }],
    projectionRevision: '7',
  };
  expect(buildCanonicalProgressDashboard(status)).toMatchObject({ completedLessons: 3, totalLessons: 10, completedSessions: 1, recentDurationSec: 90 });
  expect(buildCanonicalProgressDashboard({ ...status, courseProgress: [{ ...status.courseProgress[0], completedLessonCount: 4, positionPercent: 40 }], projectionRevision: '8' })).toMatchObject({ completedLessons: 4, totalLessons: 10 });
});
