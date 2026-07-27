import { buildCanonicalProgressDashboard } from '@/features/progress/hooks/useChildProgressDashboardQuery';
import type { ParentLearningStatus } from '@/services/api/parentLearning.api';

it('derives every dashboard total from the canonical parent projection', () => {
  const status: ParentLearningStatus = {
    activeLearning: null,
    recentSessions: { items: [{ childId: 'child-1', assignmentId: 'a-1', sessionId: 's-1', courseId: 'c-1', courseTitle: 'English', lessonId: 'l-1', lessonTitle: 'Farm', state: 'COMPLETED', completedAt: '2026-07-27T00:00:00Z', durationSec: 90, reportAvailable: true }], nextCursor: null },
    courseProgress: [{ courseId: 'c-1', courseTitle: 'English', currentLessonNumber: 4, completedLessons: 3, totalLessons: 10, percent: 30, suggestedNextLesson: null }],
    projectionRevision: '7',
  };
  expect(buildCanonicalProgressDashboard(status)).toMatchObject({ completedLessons: 3, totalLessons: 10, completedSessions: 1, recentDurationSec: 90 });
  expect(buildCanonicalProgressDashboard({ ...status, courseProgress: [{ ...status.courseProgress[0], completedLessons: 4, percent: 40 }], projectionRevision: '8' })).toMatchObject({ completedLessons: 4, totalLessons: 10 });
});
