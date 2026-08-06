import client from '@/services/http/client';
import {
  isLessonProfile,
  listChildEnrollments,
  presentAssignmentState,
  purchaseCourse,
  type AssignmentState,
} from '@/services/api/course-library.api';
import { BackendContractUnavailableError } from '@/services/api/undocumented-api-routes';
import {
  getChildLessonProgress,
  normalizeChildLessonProgressPayload,
  normalizeProgressSummaryPayload,
} from '@/services/api/progress.api';
import {
  getCourse,
  getDailyMission,
  getLessonDetail,
  getLessonList,
  getLevel,
  getReviewQueue as getCourseReviewQueue,
  getUnit,
  listCourseCatalog,
} from '@/services/api/course.api';
import {
  getLessonSummary,
  getReviewQueue as getProgressReviewQueue,
  getTodayProgress,
  getWordsPracticed,
} from '@/services/api/progress.api';
import {
  endSession,
  getActivityList,
  reportSafetyEvent,
  sendUtterance,
  startSession,
} from '@/services/api/lesson-session.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

// These tests close the LEARNING-FLOW coverage gaps the screen tests miss:
// the parent/e2e screen suites MOCK these modules, so the REAL normalizers +
// http calls below never execute under their coverage. Each assertion pins a
// real output (non-tautology mutations noted inline).
describe('learning-flow API coverage gaps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── course-library.api.ts: listChildEnrollments (573-580) ──────────────────
  describe('listChildEnrollments — child enrollment feed (parent dashboard)', () => {
    it('GETs the child-scoped bare path and normalizes a wrapped list', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: {
          data: {
            enrollments: [
              { id: 'enr-1', child_id: 'ch-1', course_id: 'c_barn', device_id: 'dev-1', status: 'active', current_lesson_key: 'w01-d01' },
              { enrollment_id: 'enr-2', childId: 'ch-1', courseId: 'c_food', status: 'completed' },
            ],
          },
        },
      });

      const result = await listChildEnrollments('ch-1');

      expect(mockedClient.get).toHaveBeenCalledWith('/children/ch-1/enrollments');
      expect(result).toEqual({
        enrollments: [
          { id: 'enr-1', childId: 'ch-1', courseId: 'c_barn', deviceId: 'dev-1', status: 'ACTIVE', currentLessonKey: 'w01-d01' },
          // device_id absent → null; status lowercased→upper; no current_lesson_key → null.
          { id: 'enr-2', childId: 'ch-1', courseId: 'c_food', deviceId: null, status: 'COMPLETED', currentLessonKey: null },
        ],
      });
      // Mutation guard: if the parser dropped the snake_case fallback, enr-1 status would be 'ACTIVE' default, not from 'active'.
      expect(result.enrollments[1]!.deviceId).toBeNull();
    });

    it('accepts a bare-array envelope (no enrollments wrapper)', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: { data: [{ id: 'enr-9', child_id: 'ch-1', course_id: 'c_x', status: 'paused' }] },
      });
      const result = await listChildEnrollments('ch-1');
      expect(result.enrollments).toHaveLength(1);
      expect(result.enrollments[0]!.status).toBe('PAUSED');
    });

    it('returns an empty list for a child with no enrollments', async () => {
      mockedClient.get.mockResolvedValueOnce({ data: { data: {} } });
      await expect(listChildEnrollments('ch-1')).resolves.toEqual({ enrollments: [] });
    });
  });

  // ── course-library.api.ts: isLessonProfile (318) ───────────────────────────
  describe('isLessonProfile — narrows a wire profile to the backend LESSON_PROFILES set', () => {
    it('accepts only espTft/piTft/mobile and rejects null/unknown', () => {
      expect(isLessonProfile('espTft')).toBe(true);
      expect(isLessonProfile('piTft')).toBe(true);
      expect(isLessonProfile('mobile')).toBe(true);
      // Mutation guard: a parser that defaulted unknown→true would fail these.
      expect(isLessonProfile('web')).toBe(false);
      expect(isLessonProfile(null)).toBe(false);
      expect(isLessonProfile(undefined)).toBe(false);
    });
  });

  // ── course-library.api.ts: presentAssignmentState default branch (599) ─────
  describe('presentAssignmentState — deferred (default) lifecycle states', () => {
    it('maps UNASSIGNED/PAUSED/CANCELLED to the cl_send fallback with no chip', () => {
      for (const state of ['UNASSIGNED', 'PAUSED', 'CANCELLED'] as AssignmentState[]) {
        expect(presentAssignmentState(state)).toEqual({ clState: 'cl_send', copy: 'Sending to <robot>…' });
        // Mutation guard: any of these accidentally getting a chipState would break this.
        expect(presentAssignmentState(state)).not.toHaveProperty('chipState');
      }
    });
  });

  // ── course-library.api.ts: purchaseCourse (97) ─────────────────────────────
  describe('purchaseCourse — no documented backend contract', () => {
    it('throws BackendContractUnavailableError carrying the operation name', async () => {
      await expect(purchaseCourse('c_barn')).rejects.toBeInstanceOf(BackendContractUnavailableError);
      await expect(purchaseCourse('c_barn')).rejects.toMatchObject({ code: 'BACKEND_CONTRACT_UNAVAILABLE' });
      await expect(purchaseCourse('c_barn')).rejects.toThrow('purchaseCourse:c_barn');
    });
  });

  // ── progress.api.ts: getChildLessonProgress + normalizer (194-247) ─────────
  describe('getChildLessonProgress — live per-assignment monitoring feed', () => {
    it('GETs the child-scoped bare path and normalizes camelCase assignment rows', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: {
          data: {
            assignments: [
              {
                assignmentId: 'asg-1',
                deviceId: 'dev-1',
                childId: 'ch-1',
                lessonId: 'w01-d01-barn-say-it',
                lessonVersion: 2,
                lessonTitle: 'This Is a Barn',
                profile: 'espTft',
                state: 'COMPLETED',
                startedAt: '2026-06-20T09:00:00Z',
                completedAt: '2026-06-20T09:05:00Z',
                stepsCompleted: 3,
                stepsSucceeded: 3,
                lastEventAt: '2026-06-20T09:05:00Z',
                createdAt: '2026-06-20T08:59:00Z',
                updatedAt: '2026-06-20T09:05:00Z',
              },
            ],
          },
        },
      });

      const rows = await getChildLessonProgress('ch-1');

      expect(mockedClient.get).toHaveBeenCalledWith('/children/ch-1/lesson-progress');
      expect(rows).toEqual([
        {
          assignmentId: 'asg-1',
          deviceId: 'dev-1',
          childId: 'ch-1',
          lessonId: 'w01-d01-barn-say-it',
          lessonVersion: 2,
          lessonTitle: 'This Is a Barn',
          profile: 'espTft',
          state: 'COMPLETED',
          startedAt: '2026-06-20T09:00:00Z',
          completedAt: '2026-06-20T09:05:00Z',
          stepsCompleted: 3,
          stepsSucceeded: 3,
          lastEventAt: '2026-06-20T09:05:00Z',
          createdAt: '2026-06-20T08:59:00Z',
          updatedAt: '2026-06-20T09:05:00Z',
        },
      ]);
      // lessonVersion is a NUMBER on the wire (D-LV).
      expect(typeof rows[0]!.lessonVersion).toBe('number');
    });

    it('coerces missing fields to safe defaults: null title, 0 counts, UNASSIGNED on bad state', () => {
      const rows = normalizeChildLessonProgressPayload({
        data: {
          assignments: [
            { assignmentId: 'asg-2', state: 'NOT_A_REAL_STATE', lessonTitle: 42 },
          ],
        },
      });
      expect(rows).toHaveLength(1);
      const row = rows[0]!;
      // toAssignmentState rejects unknown → UNASSIGNED (mutation guard: a passthrough would leave NOT_A_REAL_STATE).
      expect(row.state).toBe('UNASSIGNED');
      // Non-string lessonTitle (42) → null, not coerced to "42".
      expect(row.lessonTitle).toBeNull();
      expect(row.stepsCompleted).toBe(0);
      expect(row.stepsSucceeded).toBe(0);
      expect(row.lessonVersion).toBe(0);
      expect(row.startedAt).toBeNull();
      expect(row.completedAt).toBeNull();
      expect(row.lastEventAt).toBeNull();
    });

    it('keeps a known terminal state verbatim and returns [] for a missing/non-array feed', () => {
      const ok = normalizeChildLessonProgressPayload({ data: { assignments: [{ assignmentId: 'a', state: 'RUNNING' }] } });
      expect(ok[0]!.state).toBe('RUNNING');
      expect(normalizeChildLessonProgressPayload({ data: { assignments: 'nope' } })).toEqual([]);
      expect(normalizeChildLessonProgressPayload(undefined)).toEqual([]);
    });
  });

  // ── progress.api.ts: un-enveloped payload + full weekly chart (59, 76) ─────
  describe('normalizeProgressSummaryPayload — bare payload + 7-day chart paths', () => {
    it('reads a bare (un-enveloped) object payload, not just { data: {...} }', () => {
      // Hits pickEnvelope `return obj as T` (no `data` wrapper). Mutation guard:
      // a parser that REQUIRED a data envelope would zero these out.
      const summary = normalizeProgressSummaryPayload({ minutes_done: 7, stars_today: 2 });
      expect(summary.minutesDone).toBe(7);
      expect(summary.starsToday).toBe(2);
    });

    it('maps a real 7-length weekly_bars array (full chart), coercing junk to 0', () => {
      const summary = normalizeProgressSummaryPayload({
        data: { weekly_bars: [1, 2, 3, 4, 5, 'x', 7] },
      });
      // Length-7 array → mapped through Number(n)||0; 'x' → 0. A length!=7 array
      // would fall back to all-zeros (the already-covered branch).
      expect(summary.weeklyBars).toEqual([1, 2, 3, 4, 5, 0, 7]);
    });
  });

  // ── progress.api.ts: undesigned-backend stubs (100-112) ────────────────────
  // These endpoints are NOT designed yet; they deterministically reject so a
  // caller can't silently get a fake value. Covering them pins that contract.
  describe('progress.api stubs reject until the backend is designed', () => {
    // They used to reject with a bare `new Error('not implemented')`, which
    // carries no `code` and normalizes to UNKNOWN_ERROR — indistinguishable
    // from a real server fault. T5.2 moved them onto the typed sentinel every
    // other uncontracted operation uses.
    it('rejects with the typed backend-contract error', async () => {
      await expect(getTodayProgress()).rejects.toMatchObject({ code: 'BACKEND_CONTRACT_UNAVAILABLE' });
      await expect(getWordsPracticed()).rejects.toMatchObject({ code: 'BACKEND_CONTRACT_UNAVAILABLE' });
      await expect(getLessonSummary('l1')).rejects.toMatchObject({ code: 'BACKEND_CONTRACT_UNAVAILABLE' });
      await expect(getProgressReviewQueue()).rejects.toMatchObject({ code: 'BACKEND_CONTRACT_UNAVAILABLE' });
    });
  });

  // ── course.api.ts: public catalog reads + explicit unavailable contracts ───
  describe('course.api public catalog reads', () => {
    it('GETs /courses and normalizes the catalog without seed literals', async () => {
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

      await expect(listCourseCatalog()).resolves.toEqual([
        { id: 'c_barn', title: 'Barn Friends', language: 'en', levelCount: 0, lessonCount: 2, locked: false, progress: 0 },
        { id: 'c_food', title: 'Yummy Words', language: 'en', levelCount: 0, lessonCount: 5, locked: false, progress: 0 },
      ]);
      expect(mockedClient.get).toHaveBeenCalledWith('/courses');
    });

    it('GETs /courses/:courseId/lessons and normalizes public lessons', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: {
          data: {
            lessons: [
              { lesson_id: 'w01-d01-barn-say-it', title: 'This Is a Barn', estimated_duration_sec: 180, status: 'ready' },
            ],
          },
        },
      });

      await expect(getLessonList('c_barn')).resolves.toEqual([
        {
          id: 'w01-d01-barn-say-it',
          unitId: 'c_barn',
          title: 'This Is a Barn',
          durationMinutes: 3,
          wordsCount: 0,
          state: 'ready',
          stars: 0,
        },
      ]);
      expect(mockedClient.get).toHaveBeenCalledWith('/courses/c_barn/lessons');
    });
  });

  describe('course.api routes without documented backend contracts', () => {
    it('rejects with BackendContractUnavailableError instead of raw not-implemented throws', async () => {
      await expect(getCourse('c1')).rejects.toBeInstanceOf(BackendContractUnavailableError);
      await expect(getLevel('lv1')).rejects.toMatchObject({ code: 'BACKEND_CONTRACT_UNAVAILABLE' });
      await expect(getUnit('u1')).rejects.toThrow('getUnit:u1');
      await expect(getLessonDetail('l1')).rejects.toThrow('getLessonDetail:l1');
      await expect(getCourseReviewQueue('user1')).rejects.toThrow('course.getReviewQueue:user1');
      await expect(getDailyMission('user1')).rejects.toThrow('getDailyMission:user1');
    });
  });

  // ── lesson-session.api.ts: explicit unavailable REST contract (WS-only) ───
  // Lesson runtime is WS-only BY DESIGN; this REST surface is an undesigned
  // placeholder that must reject with a typed contract error rather than
  // fabricate a session or crash with a raw "not implemented".
  describe('lesson-session.api REST surface rejects with typed backend-contract errors', () => {
    it('rejects with BackendContractUnavailableError', async () => {
      await expect(startSession({ lessonId: 'l1', childId: 'ch-1' })).rejects.toBeInstanceOf(BackendContractUnavailableError);
      await expect(endSession('s1')).rejects.toMatchObject({ code: 'BACKEND_CONTRACT_UNAVAILABLE' });
      await expect(sendUtterance({ sessionId: 's1', audioBase64: 'AAA=' })).rejects.toThrow('sendUtterance:s1');
      await expect(getActivityList('s1')).rejects.toThrow('getActivityList:s1');
      await expect(reportSafetyEvent({ sessionId: 's1', kind: 'k', utterance: 'u' })).rejects.toThrow('reportSafetyEvent:s1:k');
    });
  });
});
