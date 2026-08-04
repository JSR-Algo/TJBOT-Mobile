import client from '@/services/http/client';
import {
  createAssignment,
  enrollCourse,
  cancelCourseEnrollment,
  getCurrentAssignment,
  getPreloadStatus,
  isPreloadReady,
  lessonAssignmentIdempotencyKey,
  normalizeAssignmentPayload,
  normalizeAssignmentRefPayload,
  normalizeCurrentAssignmentPayload,
  normalizeEnrollmentPayload,
  normalizePreloadStatusPayload,
  presentAssignmentState,
  type AssignmentState,
} from '@/services/api/course-library.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedClient = client as jest.Mocked<typeof client>;

describe('US-006 S11 — lesson assignment API (M1/M2/M5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // §10.4 — Assign call: device-scoped bare path, lessonVersion number,
  // assignmentId/assignmentVersion captured, explicit Idempotency-Key passed.
  describe('M1 — createAssignment (§10.4 assign call)', () => {
    it('POSTs the device-scoped bare path with lessonVersion as a NUMBER and an Idempotency-Key', async () => {
      mockedClient.post.mockResolvedValueOnce({
        data: {
          data: {
            assignment: {
              assignment_id: 'asg-1',
              assignment_version: 1,
              device_id: 'dev-1',
              child_id: 'ch-1',
              lesson_id: 'w01-d01-barn-say-it',
              lesson_version: 1,
              manifest_checksum: 'sha256:direct-assignment-v1',
              profile: 'espTft',
              state: 'PRELOADING',
              created_at: '2026-06-03T10:00:00Z',
            },
          },
        },
      });

      const result = await createAssignment({
        deviceId: 'dev-1',
        childId: 'ch-1',
        lessonId: 'w01-d01-barn-say-it',
        lessonVersion: 1,
        profile: 'espTft',
      });

      // device-scoped, bare path (no /v1 — baseURL already carries it)
      expect(mockedClient.post).toHaveBeenCalledWith(
        '/devices/dev-1/assignments',
        { lessonId: 'w01-d01-barn-say-it', lessonVersion: 1, childId: 'ch-1', profile: 'espTft' },
        { headers: { 'Idempotency-Key': 'lesson-assign:dev-1:w01-d01-barn-say-it:ch-1' } },
      );

      // lessonVersion is a JSON number on the wire (D-LV)
      const sentBody = mockedClient.post.mock.calls[0]![1] as { lessonVersion: unknown };
      expect(typeof sentBody.lessonVersion).toBe('number');

      // captures assignmentId + assignmentVersion (number)
      expect(result.assignmentId).toBe('asg-1');
      expect(result.assignmentVersion).toBe(1);
      expect(typeof result.assignmentVersion).toBe('number');
      expect(result.manifestChecksum).toBe('sha256:direct-assignment-v1');
      expect(result.state).toBe('PRELOADING');
    });

    it('derives a stable idempotency key from (deviceId, lessonId, childId)', () => {
      const key = lessonAssignmentIdempotencyKey({ deviceId: 'd', lessonId: 'l', childId: 'c' });
      expect(key).toBe('lesson-assign:d:l:c');
      // same triple → same key (so a retry is deduped server-side)
      expect(lessonAssignmentIdempotencyKey({ deviceId: 'd', lessonId: 'l', childId: 'c' })).toBe(key);
    });

    it('defaults profile to espTft when omitted', async () => {
      mockedClient.post.mockResolvedValueOnce({ data: { data: { assignment: { assignment_id: 'asg-2' } } } });
      await createAssignment({ deviceId: 'dev-1', childId: 'ch-1', lessonId: 'w01-d01-barn-say-it', lessonVersion: 1 });
      const body = mockedClient.post.mock.calls[0]![1] as { profile: string };
      expect(body.profile).toBe('espTft');
    });

    it('normalizes snake_case assignment envelopes to camelCase', () => {
      expect(
        normalizeAssignmentPayload({
          data: {
            assignment: {
              assignment_id: 'asg-9',
              assignment_version: 3,
              device_id: 'dev-9',
              child_id: 'ch-9',
              lesson_id: 'w01-d01-barn-say-it',
              lesson_version: 2,
              manifest_checksum: 'sha256:snake-direct-v2',
              profile: 'espTft',
              state: 'ASSIGNED',
              created_at: '2026-06-03T10:00:00Z',
            },
          },
        }),
      ).toEqual({
        assignmentId: 'asg-9',
        assignmentVersion: 3,
        deviceId: 'dev-9',
        childId: 'ch-9',
        lessonId: 'w01-d01-barn-say-it',
        lessonVersion: 2,
        manifestChecksum: 'sha256:snake-direct-v2',
        profile: 'espTft',
        state: 'ASSIGNED',
        createdAt: '2026-06-03T10:00:00Z',
      });
    });
  });

  describe('course enrollment assignment ref', () => {
    it('POSTs the course enroll path with childId and deviceId, then normalizes the assigned first lesson', async () => {
      mockedClient.post.mockResolvedValueOnce({
        data: {
          data: {
            enrollment: {
              id: 'enr-1',
              child_id: 'ch-1',
              course_id: 'c_barn',
              device_id: 'dev-1',
              status: 'ACTIVE',
              current_lesson_key: 'w01-d01',
            },
            assignment: {
              assignment_id: 'asg-course-1',
              assignment_version: 2,
              lesson_id: 'w01-d01-barn-say-it',
              lesson_version: 1,
              state: 'PRELOADING',
            },
          },
        },
      });

      const result = await enrollCourse('c_barn', { childId: 'ch-1', deviceId: 'dev-1' });

      expect(mockedClient.post).toHaveBeenCalledWith('/courses/c_barn/enroll', { childId: 'ch-1', deviceId: 'dev-1' });
      expect(result).toEqual({
        enrollment: {
          id: 'enr-1',
          childId: 'ch-1',
          courseId: 'c_barn',
          deviceId: 'dev-1',
          status: 'ACTIVE',
          currentLessonKey: 'w01-d01',
        },
        assignment: {
          id: 'asg-course-1',
          assignmentVersion: 2,
          deviceId: '',
          childId: '',
          lessonId: 'w01-d01-barn-say-it',
          lessonTitle: '',
          lessonVersion: 1,
          manifestChecksum: null,
          profile: 'espTft',
          state: 'PRELOADING',
        },
      });
      expect(typeof result.assignment.assignmentVersion).toBe('number');
      expect(typeof result.assignment.lessonVersion).toBe('number');
    });

    it('normalizes assignmentVersion so course enrollment can resume RobotReady polling', () => {
      expect(
        normalizeAssignmentRefPayload({
          id: 'asg-course-1',
          assignment_version: 7,
          lesson_id: 'w01-d01-barn-say-it',
          lesson_version: 2,
          state: 'PRELOADING',
        }),
      ).toEqual({
        id: 'asg-course-1',
        assignmentVersion: 7,
        deviceId: '',
        childId: '',
        lessonId: 'w01-d01-barn-say-it',
        lessonTitle: '',
        lessonVersion: 2,
        manifestChecksum: null,
        profile: 'espTft',
        state: 'PRELOADING',
      });
    });

    it('preserves the full backend assignment contract from course enrollment for robot-ready polling', async () => {
      mockedClient.post.mockResolvedValueOnce({
        data: {
          data: {
            enrollment: {
              id: 'enr-1',
              child_id: 'ch-1',
              course_id: 'c_barn',
              device_id: 'dev-1',
              status: 'ACTIVE',
              current_lesson_key: 'w01-d01',
            },
            assignment: {
              assignment_id: 'asg-course-1',
              assignment_version: 7,
              device_id: 'dev-1',
              child_id: 'ch-1',
              lesson_id: 'w01-d01-barn-say-it',
              lesson_title: 'This Is a Barn',
              lesson_version: 2,
              manifest_checksum: 'sha256:lesson-manifest-v2',
              profile: 'espTft',
              state: 'PRELOADING',
            },
          },
        },
      });

      const result = await enrollCourse('c_barn', { childId: 'ch-1', deviceId: 'dev-1' });

      expect(result.assignment).toEqual({
        id: 'asg-course-1',
        assignmentVersion: 7,
        deviceId: 'dev-1',
        childId: 'ch-1',
        lessonId: 'w01-d01-barn-say-it',
        lessonTitle: 'This Is a Barn',
        lessonVersion: 2,
        manifestChecksum: 'sha256:lesson-manifest-v2',
        profile: 'espTft',
        state: 'PRELOADING',
      });
    });

    it('normalizes lowercase backend enrollment statuses without reopening completed courses as active', () => {
      expect(normalizeEnrollmentPayload({ id: 'enr-1', child_id: 'ch-1', course_id: 'c_barn', status: 'active' }).status).toBe('ACTIVE');
      expect(normalizeEnrollmentPayload({ id: 'enr-2', child_id: 'ch-1', course_id: 'c_barn', status: 'completed' }).status).toBe('COMPLETED');
      expect(normalizeEnrollmentPayload({ id: 'enr-3', child_id: 'ch-1', course_id: 'c_barn', status: 'cancelled' }).status).toBe('CANCELLED');
    });

    it('throws on malformed enrollment ids or statuses instead of fabricating a lifecycle', () => {
      expect(() => normalizeEnrollmentPayload({ id: '', child_id: 'ch-1', course_id: 'c_barn', status: 'active' })).toThrow('Invalid enrollment payload');
      expect(() => normalizeEnrollmentPayload({ id: 'enr-bad', child_id: 'ch-1', course_id: 'c_barn', status: 'unknown' })).toThrow('Invalid enrollment payload');
      expect(() => normalizeEnrollmentPayload({ id: 'enr-bad', child_id: '', course_id: 'c_barn', status: 'active' })).toThrow('Invalid enrollment payload');
    });

    it('DELETEs the exact child enrollment path and strictly parses the cancelled boolean', async () => {
      mockedClient.delete.mockResolvedValueOnce({
        data: {
          data: {
            cancelled: true,
          },
        },
      });

      const result = await cancelCourseEnrollment('c_barn', 'ch-1');

      expect(mockedClient.delete).toHaveBeenCalledWith('/courses/c_barn/enroll/ch-1');
      expect(result).toEqual({ cancelled: true });
    });

    it('rejects cancel responses that do not contain a boolean cancelled result', async () => {
      mockedClient.delete.mockResolvedValueOnce({
        data: {
          data: {
            cancelled: 'yes',
          },
        },
      });

      await expect(cancelCourseEnrollment('c_barn', 'ch-1')).rejects.toThrow('Invalid cancel enrollment payload');
      expect(mockedClient.delete).toHaveBeenCalledWith('/courses/c_barn/enroll/ch-1');
    });
  });

  // §10.4 — Preload-status render (kills fake-ready): readiness gates on the
  // REAL server state, never a hardcoded good:true.
  describe('M2 — preload-status real-READY gate (§10.4 kills fake-ready)', () => {
    it('isPreloadReady is true ONLY for state === READY', () => {
      expect(isPreloadReady({ state: 'READY' })).toBe(true);
      const notReady: AssignmentState[] = ['UNASSIGNED', 'ASSIGNED', 'PRELOADING', 'RUNNING', 'COMPLETED', 'PAUSED', 'FAILED', 'CANCELLED'];
      for (const state of notReady) {
        expect(isPreloadReady({ state })).toBe(false);
      }
    });

    it('a PRELOADING status with criticalReady < criticalTotal is NOT ready', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: {
          data: {
            preload: {
              assignment_id: 'asg-1',
              state: 'PRELOADING',
              profile: 'espTft',
              critical_total: 2,
              critical_ready: 1,
              assets: [
                { asset_id: 'background', state: 'READY', checksum_ok: true },
                { asset_id: 'barn', state: 'DOWNLOADING', checksum_ok: null },
              ],
            },
          },
        },
      });

      const status = await getPreloadStatus('dev-1');
      expect(mockedClient.get).toHaveBeenCalledWith('/devices/dev-1/preload-status');
      expect(status).toEqual({
        assignmentId: 'asg-1',
        state: 'PRELOADING',
        profile: 'espTft',
        criticalTotal: 2,
        criticalReady: 1,
        assets: [
          { assetId: 'background', state: 'READY', checksumOk: true },
          { assetId: 'barn', state: 'DOWNLOADING', checksumOk: null },
        ],
      });
      expect(isPreloadReady(status)).toBe(false);
    });

    it('a READY status surfaces ready and carries an errorCode only when present', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: { data: { preload: { assignment_id: 'asg-1', state: 'READY', profile: 'espTft', critical_total: 2, critical_ready: 2, assets: [], error_code: 'PRELOAD_TIMEOUT' } } },
      });
      const status = await getPreloadStatus('dev-1');
      expect(isPreloadReady(status)).toBe(true);
      expect(status.errorCode).toBe('PRELOAD_TIMEOUT');
    });

    it('omits errorCode when the server sends none', () => {
      const status = normalizePreloadStatusPayload({ data: { preload: { assignment_id: 'a', state: 'PRELOADING' } } });
      expect('errorCode' in status).toBe(false);
    });
  });

  describe('M2 — getCurrentAssignment (lessonTitle)', () => {
    it('normalizes the current assignment including denormalized lessonTitle', async () => {
      mockedClient.get.mockResolvedValueOnce({
        data: {
          data: {
            assignment: {
              assignmentId: 'asg-1',
              assignmentVersion: 2,
              lessonId: 'w01-d01-barn-say-it',
              lessonTitle: 'This Is a Barn',
              lessonVersion: 1,
              manifestChecksum: 'sha256:current-assignment-v1',
              sessionId: 'sess-current-1',
              state: 'READY',
              childId: 'ch-1',
              profile: 'espTft',
            },
          },
        },
      });
      const current = await getCurrentAssignment('dev-1');
      expect(mockedClient.get).toHaveBeenCalledWith('/devices/dev-1/assignment/current');
      expect(current?.lessonTitle).toBe('This Is a Barn');
      expect(current?.manifestChecksum).toBe('sha256:current-assignment-v1');
      expect(current?.sessionId).toBe('sess-current-1');
      expect(current?.state).toBe('READY');
    });

    it('preserves a camelCase null sessionId without blocking the current assignment', () => {
      const current = normalizeCurrentAssignmentPayload({
        data: {
          assignment: {
            assignmentId: 'asg-null-session',
            assignmentVersion: 2,
            lessonId: 'w01-d01-barn-say-it',
            lessonTitle: 'This Is a Barn',
            lessonVersion: 1,
            manifestChecksum: 'sha256:current-assignment-v1',
            sessionId: null,
            state: 'READY',
            childId: 'ch-1',
            profile: 'espTft',
          },
        },
      });

      expect(current).toEqual({
        assignmentId: 'asg-null-session',
        assignmentVersion: 2,
        lessonId: 'w01-d01-barn-say-it',
        lessonTitle: 'This Is a Barn',
        lessonVersion: 1,
        manifestChecksum: 'sha256:current-assignment-v1',
        sessionId: null,
        state: 'READY',
        childId: 'ch-1',
        profile: 'espTft',
      });
    });

    it('preserves a camelCase sessionId from the backend current-assignment envelope', () => {
      const current = normalizeCurrentAssignmentPayload({
        data: {
          assignment: {
            assignmentId: 'asg-running-session',
            assignmentVersion: 3,
            lessonId: 'w01-d01-barn-say-it',
            lessonTitle: 'This Is a Barn',
            lessonVersion: 1,
            manifestChecksum: 'sha256:current-assignment-v1',
            sessionId: '99999999-9999-4999-8999-999999999999',
            state: 'RUNNING',
            childId: 'ch-1',
            profile: 'espTft',
          },
        },
      });

      expect(current?.sessionId).toBe('99999999-9999-4999-8999-999999999999');
      expect(current?.assignmentId).toBe('asg-running-session');
      expect(current?.state).toBe('RUNNING');
    });

    it('returns null when the device has no active assignment', () => {
      expect(normalizeCurrentAssignmentPayload({ data: { assignment: null } })).toBeNull();
    });
  });

  // §10.4 — Progress surface: COMPLETED → "Finished!" terminal state.
  describe('M5 — assignment lifecycle → cl_* / chip / copy (§10.4 progress surface)', () => {
    it('maps COMPLETED to the cl_complete "Finished!" terminal state', () => {
      expect(presentAssignmentState('COMPLETED')).toEqual({
        clState: 'cl_complete',
        chipState: 'completed',
        copy: 'Finished! 🎉',
      });
    });

    it('maps the full slice lifecycle to the existing cl_* chips (M5 table)', () => {
      expect(presentAssignmentState('ASSIGNED')).toMatchObject({ clState: 'cl_send' });
      expect(presentAssignmentState('PRELOADING')).toMatchObject({ clState: 'cl_send' });
      expect(presentAssignmentState('READY')).toEqual({ clState: 'cl_robot_ready', chipState: 'ready', copy: 'Ready for today' });
      expect(presentAssignmentState('RUNNING')).toMatchObject({ clState: 'cl_running', copy: 'Lesson playing on <robot>' });
      expect(presentAssignmentState('FAILED')).toMatchObject({ clState: 'cl_needs_sync', chipState: 'needs_sync' });
    });
  });
});
