import {
  buildCourseInsightDashboard,
  lessonFitCopy,
} from '@/features/parent/courseInsights';
import type { AssignmentProgress, ChildProgress } from '@/services/api/progress.api';
import type { KPIs, PronunciationTrend } from '@/services/api/learning';
import type { PublishedLesson } from '@/services/api/course-library.api';

function assignment(overrides: Partial<AssignmentProgress> = {}): AssignmentProgress {
  return {
    assignmentId: 'a1',
    deviceId: 'd1',
    childId: 'c1',
    lessonId: 'l1',
    lessonVersion: 1,
    lessonTitle: 'Barn',
    profile: 'espTft',
    state: 'COMPLETED',
    startedAt: '2026-06-18T08:00:00.000Z',
    completedAt: '2026-06-18T08:05:00.000Z',
    stepsCompleted: 5,
    stepsSucceeded: 4,
    lastEventAt: '2026-06-18T08:05:00.000Z',
    createdAt: '2026-06-18T07:59:00.000Z',
    updatedAt: '2026-06-18T08:05:00.000Z',
    ...overrides,
  };
}

const progress: ChildProgress = {
  childId: 'c1',
  lessonsCompleted: 7,
  currentStreakDays: 3,
  masteredWords: 18,
  byCourse: [
    { courseId: 'animals', lessonsCompleted: 4, lessonsTotal: 10 },
    { courseId: 'space', lessonsCompleted: 3, lessonsTotal: 6 },
  ],
};

const kpis: KPIs = {
  vocab_words_this_week: 5,
  speaking_confidence: 62,
  engagement_score: 80,
  retention_rate: 75,
  sessions_this_week: 4,
  daily_streak: 3,
  weak_words: ['red'],
};

const trend: PronunciationTrend = {
  avg_score: 71,
  trend: 'improving',
  points: [{ date: '2026-06-18', score: 71 }],
};

describe('parent course insight dashboard helpers', () => {
  it('summarizes session quality and learning path from parent-safe feeds', () => {
    const dashboard = buildCourseInsightDashboard({
      progress,
      assignments: [
        assignment(),
        assignment({ assignmentId: 'a2', state: 'FAILED', stepsCompleted: 3, stepsSucceeded: 1 }),
        assignment({ assignmentId: 'a3', state: 'RUNNING', stepsCompleted: 2, stepsSucceeded: 2, completedAt: null }),
      ],
      kpis,
      pronunciationTrend: trend,
    });

    expect(dashboard).toMatchObject({
      completedLessons: 7,
      currentStreakDays: 3,
      masteredWords: 18,
      completionRatePct: 50,
      stepSuccessPct: 70,
      activeLessons: 1,
      failedLessons: 1,
      engagementScore: 80,
      retentionRate: 75,
      pronunciationScore: 71,
      pronunciationTrend: 'improving',
      strongestCourse: { courseId: 'space', percent: 50 },
      nextCourse: { courseId: 'animals', percent: 40 },
    });
  });

  it('returns safe zero dashboard when feeds are unavailable', () => {
    expect(buildCourseInsightDashboard({})).toMatchObject({
      completionRatePct: 0,
      stepSuccessPct: 0,
      completedLessons: 0,
      activeLessons: 0,
      coursePath: [],
    });
  });

  it('explains why a personalized lesson fits without leaking raw child profile', () => {
    const lesson: PublishedLesson = {
      lessonId: 'lesson-1',
      lessonVersion: 1,
      lessonType: 'lesson',
      title: 'Animal Jobs',
      profile: 'espTft',
      manifestReady: true,
      topicTags: ['animals', 'engineer'],
      difficultyBand: 'beginner',
      estimatedDurationSec: 150,
      monitorable: true,
      personalization: { rank: 1, reasonCode: 'personality_match', matchedTopics: ['animals', 'engineer'] },
    };

    expect(lessonFitCopy(lesson)).toBe('Best fit: animals, engineer · beginner · 3 min');
  });
});
