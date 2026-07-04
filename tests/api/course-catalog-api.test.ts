import client from '@/services/http/client';
import {
  getCourseLessons,
  getCourses,
  normalizePublishedCoursesPayload,
  normalizePublishedLessonsPayload,
} from '@/services/api/course-library.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('P4 — published course/lesson catalog API (GET /courses, GET /courses/:id/lessons)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCourses', () => {
    it('GETs the bare /courses path (baseURL already carries /v1) and normalizes the list', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: {
          data: {
            courses: [
              { course_id: 'c_barn', title: 'Barn Friends', lesson_count: 2 },
              { course_id: 'c_food', title: 'Yummy Words', lesson_count: 5 },
            ],
          },
        },
      });

      const courses = await getCourses();

      expect(mockedClient.get).toHaveBeenCalledWith('/courses');
      expect(courses).toEqual([
        { courseId: 'c_barn', title: 'Barn Friends', lessonCount: 2 },
        { courseId: 'c_food', title: 'Yummy Words', lessonCount: 5 },
      ]);
      expect(typeof courses[0]!.lessonCount).toBe('number');
    });

    it('accepts a bare array envelope and camelCase keys', () => {
      expect(
        normalizePublishedCoursesPayload([{ courseId: 'c1', title: 'One', lessonCount: 3 }]),
      ).toEqual([{ courseId: 'c1', title: 'One', lessonCount: 3 }]);
    });

    it('returns an empty list for an empty/absent payload', () => {
      expect(normalizePublishedCoursesPayload({ data: {} })).toEqual([]);
      expect(normalizePublishedCoursesPayload(null)).toEqual([]);
    });

    it('uses the local investor-demo course catalog without a protected backend token', async () => {
      process.env.EXPO_PUBLIC_INVESTOR_DEMO = 'true';
      try {
        await expect(getCourses()).resolves.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ courseId: 'c_barn', lessonCount: expect.any(Number) }),
          ]),
        );
        expect(mockedClient.get).not.toHaveBeenCalled();
      } finally {
        process.env.EXPO_PUBLIC_INVESTOR_DEMO = 'false';
      }
    });
  });

  describe('getCourseLessons', () => {
    it('GETs the course-scoped bare path and keeps lessonVersion a NUMBER (D-LV)', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: {
          data: {
            lessons: [
              { lesson_id: 'w01-d01-barn-say-it', lesson_version: 1, title: 'This Is a Barn', profile: 'espTft', manifest_ready: true },
              { lesson_id: 'w01-d02-barn-colors', lesson_version: 3, title: 'Barn Colors', profile: 'espTft', manifest_ready: false },
            ],
          },
        },
      });

      const lessons = await getCourseLessons('c_barn');

      expect(mockedClient.get).toHaveBeenCalledWith('/courses/c_barn/lessons', {});
      expect(lessons).toEqual([
        { lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, title: 'This Is a Barn', profile: 'espTft', manifestReady: true },
        { lessonId: 'w01-d02-barn-colors', lessonVersion: 3, title: 'Barn Colors', profile: 'espTft', manifestReady: false },
      ]);
      // lessonVersion is a JSON number — flows straight into createAssignment.
      expect(typeof lessons[0]!.lessonVersion).toBe('number');
      // manifestReady is a real boolean, advisory only (READY gate stays server-authoritative).
      expect(typeof lessons[1]!.manifestReady).toBe('boolean');
    });

    it('passes childId for personalized lesson ordering and normalizes safe personalization metadata', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              lessonId: 'w01-d02-barn-say-it',
              lessonVersion: 1,
              title: 'Barn — Say It',
              profile: 'espTft',
              manifestReady: true,
              lessonType: 'lesson',
              topicTags: ['animals', 'visual'],
              difficultyBand: 'beginner',
              estimatedDurationSec: 150,
              monitorable: true,
              personalization: { rank: 1, reasonCode: 'personality_match', matchedTopics: ['animals', 'visual'] },
            },
          ],
          meta: { count: 1, personalized: true },
        },
      });

      const lessons = await getCourseLessons('c_barn', { childId: 'child 1' });

      expect(mockedClient.get).toHaveBeenCalledWith('/courses/c_barn/lessons', { params: { childId: 'child 1' } });
      expect(lessons).toEqual([
        {
          lessonId: 'w01-d02-barn-say-it',
          lessonVersion: 1,
          title: 'Barn — Say It',
          profile: 'espTft',
          manifestReady: true,
          lessonType: 'lesson',
          topicTags: ['animals', 'visual'],
          difficultyBand: 'beginner',
          estimatedDurationSec: 150,
          monitorable: true,
          personalization: { rank: 1, reasonCode: 'personality_match', matchedTopics: ['animals', 'visual'] },
        },
      ]);
      expect(JSON.stringify(lessons)).not.toContain('interests');
    });

    it('coerces a string lessonVersion to a number and keeps profile null when absent (unbundled)', () => {
      expect(
        normalizePublishedLessonsPayload({
          lessons: [{ lesson_id: 'l1', lesson_version: '2', title: 'L1' }],
        }),
      ).toEqual([{ lessonId: 'l1', lessonVersion: 2, title: 'L1', profile: null, manifestReady: false }]);
    });

    it('uses local investor-demo lessons without a protected backend token', async () => {
      process.env.EXPO_PUBLIC_INVESTOR_DEMO = 'true';
      try {
        await expect(getCourseLessons('c_barn', { childId: 'investor-demo-child' })).resolves.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ lessonId: 'demo-barn-animals', manifestReady: true }),
          ]),
        );
        expect(mockedClient.get).not.toHaveBeenCalled();
      } finally {
        process.env.EXPO_PUBLIC_INVESTOR_DEMO = 'false';
      }
    });

    it('returns an empty list for a course with no published lessons', () => {
      expect(normalizePublishedLessonsPayload({ data: { lessons: [] } })).toEqual([]);
    });
  });
});
