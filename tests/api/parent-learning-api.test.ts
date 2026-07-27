import client from '@/services/http/client';
import {
  getParentLearningHistory,
  getParentLearningStatus,
  getParentSessionReport,
  normalizeParentLearningStatus,
  normalizeParentSessionReport,
} from '@/services/api/parentLearning.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockGet = client.get as jest.MockedFunction<typeof client.get>;

describe('parentLearning.api', () => {
  beforeEach(() => jest.clearAllMocks());

  it('normalizes nullable active learning and drops non-allowlisted fields', () => {
    expect(normalizeParentLearningStatus({
      activeLearning: null,
      recentSessions: { items: [], nextCursor: null, transcript: 'unsafe' },
      courseProgress: [],
      projectionRevision: '9007199254740993',
      rawAudioUrl: 'unsafe',
    })).toEqual({
      activeLearning: null,
      recentSessions: { items: [], nextCursor: null },
      courseProgress: [],
      projectionRevision: '9007199254740993',
    });
  });

  it('normalizes the backend learning-status contract without legacy mobile aliases', () => {
    const status = normalizeParentLearningStatus({
      activeLearning: {
        assignmentId: 'assign-1', sessionId: 'session-1', courseId: 'course-1', courseTitle: 'English',
        lessonId: 'lesson-1', lessonTitle: 'Farm Friends', state: 'RUNNING', startedAt: '2026-07-28T01:00:00Z',
        currentStep: null, positionPercent: 25, activeDurationSec: 60, deviceId: 'must-be-dropped',
      },
      recentSessions: {
        items: [{
          childId: 'child-1', assignmentId: 'assign-1', sessionId: 'session-1', courseId: 'course-1',
          courseTitle: 'English', lessonId: 'lesson-1', lessonTitle: 'Farm Friends', terminalState: 'COMPLETED',
          startedAt: '2026-07-28T01:00:00Z', completedAt: '2026-07-28T01:01:00Z', durationSec: 60,
          reportAvailable: true,
        }],
        nextCursor: null,
      },
      courseProgress: [{
        courseId: 'course-1', title: 'English', currentLessonPosition: 2, completedLessonCount: 1,
        totalLessonCount: 10, positionPercent: 10, suggestedNextLesson: null,
      }],
      projectionRevision: '42',
    });

    expect(status.activeLearning).toEqual({
      assignmentId: 'assign-1', sessionId: 'session-1', courseId: 'course-1', courseTitle: 'English',
      lessonId: 'lesson-1', lessonTitle: 'Farm Friends', state: 'RUNNING', startedAt: '2026-07-28T01:00:00Z',
      currentStep: null, positionPercent: 25, activeDurationSec: 60,
    });
    expect(status.activeLearning).not.toHaveProperty('deviceId');
    expect(status.recentSessions.items[0]).toMatchObject({
      terminalState: 'COMPLETED',
      startedAt: '2026-07-28T01:00:00Z',
    });
    expect(status.recentSessions.items[0]).not.toHaveProperty('state');
    expect(status.courseProgress[0]).toEqual({
      courseId: 'course-1', title: 'English', currentLessonPosition: 2, completedLessonCount: 1,
      totalLessonCount: 10, positionPercent: 10, suggestedNextLesson: null,
    });
    expect(status.courseProgress[0]).not.toHaveProperty('courseTitle');
  });

  it('accepts large decimal-string revisions and rejects numeric revisions', () => {
    const base = { activeLearning: null, recentSessions: { items: [], nextCursor: null }, courseProgress: [] };
    expect(normalizeParentLearningStatus({ ...base, projectionRevision: '900719925474099312345' }).projectionRevision).toBe('900719925474099312345');
    expect(normalizeParentLearningStatus({ ...base, projectionRevision: 9007199254740992 }).projectionRevision).toBe('0');
  });

  it('normalizes a report through a strict privacy-safe allowlist', () => {
    expect(normalizeParentSessionReport({
      childId: 'child-1', sessionId: 'session-1', assignmentId: 'assign-1',
      courseId: 'course-1', courseTitle: 'English', lessonId: 'lesson-1',
      lessonTitle: 'Farm Friends', objective: null, state: 'COMPLETED',
      durationSec: 420, presented: ['barn'], attempted: ['barn'], accepted: ['barn'],
      needsReview: [], activities: [], reward: { xp: 12, stars: 2, ledgerDebug: 'drop' },
      suggestedNextLesson: null, transcript: 'drop', confidence: 0.99,
    })).toEqual({
      childId: 'child-1', sessionId: 'session-1', assignmentId: 'assign-1',
      courseId: 'course-1', courseTitle: 'English', lessonId: 'lesson-1',
      lessonTitle: 'Farm Friends', objective: null, state: 'COMPLETED',
      durationSec: 420, presented: ['barn'], attempted: ['barn'], accepted: ['barn'],
      needsReview: [], activities: [], reward: { xp: 12, stars: 2 },
      suggestedNextLesson: null,
    });
  });

  it('preserves a nullable report instead of fabricating an empty report', () => {
    expect(normalizeParentSessionReport(null)).toBeNull();
  });

  it('uses mobile paths without duplicating the v1 base prefix', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { activeLearning: null, recentSessions: { items: [], nextCursor: null }, courseProgress: [], projectionRevision: '0' } })
      .mockResolvedValueOnce({ data: { items: [], nextCursor: null } })
      .mockResolvedValueOnce({ data: { childId: 'c', sessionId: 's', assignmentId: 'a', courseId: 'co', courseTitle: 'C', lessonId: 'l', lessonTitle: 'L', objective: null, state: 'COMPLETED', durationSec: 1, presented: [], attempted: [], accepted: [], needsReview: [], activities: [], reward: null, suggestedNextLesson: null } });

    await getParentLearningStatus('child 1');
    await getParentLearningHistory('child 1', 'next cursor');
    await getParentSessionReport('child 1', 'session 1');

    expect(mockGet).toHaveBeenNthCalledWith(1, '/mobile/children/child%201/learning-status');
    expect(mockGet).toHaveBeenNthCalledWith(2, '/mobile/children/child%201/learning-status', { params: { cursor: 'next cursor' } });
    expect(mockGet).toHaveBeenNthCalledWith(3, '/mobile/children/child%201/learning-sessions/session%201/report');
  });
});
