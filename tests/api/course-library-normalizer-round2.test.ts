// Round-2 coverage closeout for the course-library.api.ts normalizer branch
// arms that round-1 left half-covered (lines 100% but specific `??` / typeof /
// envelope arms uncovered). Each test targets a SPECIFIC arm from the report:
//   66-68    course-library detail FLAT envelope via camelCase + previewUrl truthy
//   182-183  published courses snake_case course_id/title alt-key arm
//   210-216  personalization rank default (missing rank) + camelCase reasonCode
//   241      difficultyBand present-but-non-string → null
//   246      estimatedDurationSec finite>0 path AND non-finite/≤0 → null
//   379      assignment pickEnvelope ?? {} (non-object payload)
//   396      current-assignment pickEnvelope ?? {} (non-object payload)
//   402-409  current-assignment snake_case populated arms
//   415,423,431  preload pickEnvelope ?? {}, asset `id` fallback, snake_case top
//   540      toEnrollmentStatus non-string value → '' → ACTIVE default
//   585-596  enrollCourse / listChildEnrollments pickEnvelope ?? {} + bare array
//
// enrollCourse / listChildEnrollments perform real client I/O, so the http
// client is mocked exactly like course-catalog-api.test.ts.

import client from '@/services/http/client';
import {
  normalizeCourseLibraryDetailPayload,
  normalizePublishedCoursesPayload,
  normalizePublishedLessonsPayload,
  normalizeAssignmentPayload,
  normalizeCurrentAssignmentPayload,
  normalizePreloadStatusPayload,
  normalizeEnrollmentPayload,
  enrollCourse,
  listChildEnrollments,
} from '@/services/api/course-library.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const mockedClient = client as jest.Mocked<typeof client>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('course-library detail — flat camelCase envelope (lines 66-68)', () => {
  it('uses the envelope directly (no `course` wrapper) and maps camelCase courseId/name/previewUrl', () => {
    // No `course` key in the envelope → the `(envelope ?? {})` arm of line 66
    // runs; camelCase courseId/name/previewUrl resolve the right side of each ??.
    const d = normalizeCourseLibraryDetailPayload({
      data: {
        courseId: 'cam-1',
        name: 'Camel Detail',
        levelCount: 4,
        lessonCount: 11,
        previewUrl: 'https://cdn/p.png',
      },
    });
    expect(d).toEqual({
      courseId: 'cam-1',
      title: 'Camel Detail',
      description: '',
      levelCount: 4,
      lessonCount: 11,
      previewUrl: 'https://cdn/p.png',
    });
  });

  it('a NON-object payload → pickEnvelope undefined → the `(envelope ?? {})` empty arm (line 66) yields all defaults', () => {
    // pickEnvelope returns undefined for a non-object → both the `'course' in`
    // wrapper test is short-circuited (envelope falsy) AND the `?? {}` arm fires.
    const d = normalizeCourseLibraryDetailPayload('not-an-object' as unknown);
    expect(d).toEqual({
      courseId: '',
      title: '',
      description: '',
      levelCount: 0,
      lessonCount: 0,
      previewUrl: null,
    });
  });
});

describe('published courses — snake_case alt-key arm (lines 182-183)', () => {
  it('resolves course_id / title (snake) and lesson_count', () => {
    const out = normalizePublishedCoursesPayload({
      data: { courses: [{ course_id: 'pc-snake', title: 'Snake Course', lesson_count: 6 }] },
    });
    expect(out[0]).toEqual({ courseId: 'pc-snake', title: 'Snake Course', lessonCount: 6 });
  });
});

describe('published lessons — personalization + filter metadata branch arms', () => {
  it('builds personalization with rank defaulting to 0 when rank is absent (lines 210-216, camelCase reasonCode)', () => {
    const out = normalizePublishedLessonsPayload([
      {
        id: 'pl-rank',
        personalization: { reasonCode: 'personality_match', matchedTopics: ['dogs'] },
      },
    ]);
    expect(out[0].personalization).toEqual({
      rank: 0, // rank ?? 0 default arm
      reasonCode: 'personality_match',
      matchedTopics: ['dogs'],
    });
  });

  it('coerces a present-but-non-string difficultyBand to null (line 241 false arm)', () => {
    const out = normalizePublishedLessonsPayload([
      { id: 'pl-d', difficulty_band: 42 }, // key present, value not a string → null
    ]);
    expect(out[0].difficultyBand).toBeNull();
  });

  it('keeps a valid string difficultyBand (line 241 true arm)', () => {
    const out = normalizePublishedLessonsPayload([{ id: 'pl-d2', difficultyBand: 'starter' }]);
    expect(out[0].difficultyBand).toBe('starter');
  });

  it('keeps a finite positive estimatedDurationSec (line 246 true arm) and nulls a non-finite/≤0 one (false arm)', () => {
    const good = normalizePublishedLessonsPayload([{ id: 'pl-e1', estimated_duration_sec: 240 }]);
    expect(good[0].estimatedDurationSec).toBe(240);

    const zero = normalizePublishedLessonsPayload([{ id: 'pl-e2', estimatedDurationSec: 0 }]);
    expect(zero[0].estimatedDurationSec).toBeNull();

    const nan = normalizePublishedLessonsPayload([{ id: 'pl-e3', estimated_duration_sec: 'soon' }]);
    expect(nan[0].estimatedDurationSec).toBeNull();
  });
});

describe('assignment / current / preload — pickEnvelope ?? {} and alt-key arms', () => {
  it('assignment payload on a NON-object input falls through pickEnvelope ?? {} → all defaults (line 379)', () => {
    const a = normalizeAssignmentPayload('not-an-object' as unknown);
    expect(a.assignmentId).toBe('');
    expect(a.profile).toBe('espTft');
    expect(a.state).toBe('UNASSIGNED');
    expect(a.manifestChecksum).toBeNull();
  });

  it('current-assignment payload on a NON-object input → pickEnvelope ?? {} then null (no id) (line 396)', () => {
    expect(normalizeCurrentAssignmentPayload('nope' as unknown)).toBeNull();
    expect(normalizeCurrentAssignmentPayload(7 as unknown)).toBeNull();
  });

  it('current-assignment maps a populated SNAKE_CASE assignment (lines 402-409)', () => {
    const c = normalizeCurrentAssignmentPayload({
      data: {
        assignment: {
          assignment_id: 'cur-snake',
          assignment_version: 3,
          lesson_id: 'l-7',
          lesson_title: 'Snake Lesson',
          lesson_version: 2,
          manifest_checksum: 'sha256:abc',
          session_id: 'sess-snake',
          state: 'RUNNING',
          child_id: 'ch-7',
          profile: 'piTft',
        },
      },
    });
    expect(c).not.toBeNull();
    expect(c!).toEqual({
      assignmentId: 'cur-snake',
      assignmentVersion: 3,
      lessonId: 'l-7',
      lessonTitle: 'Snake Lesson',
      lessonVersion: 2,
      manifestChecksum: 'sha256:abc',
      sessionId: 'sess-snake',
      state: 'RUNNING',
      childId: 'ch-7',
      profile: 'piTft',
    });
  });

  it('preload on a NON-object input → pickEnvelope ?? {} → all defaults (line 415)', () => {
    const p = normalizePreloadStatusPayload('nope' as unknown);
    expect(p.assignmentId).toBe('');
    expect(p.state).toBe('UNASSIGNED');
    expect(p.profile).toBe('espTft');
    expect(p.criticalTotal).toBe(0);
    expect(p.assets).toEqual([]);
  });

  it('preload maps snake_case top fields and resolves an asset `id` fallback (lines 423,431)', () => {
    const p = normalizePreloadStatusPayload({
      data: {
        preload: {
          assignment_id: 'as-snake',
          state: 'PRELOADING',
          critical_total: 5,
          critical_ready: 2,
          assets: [{ id: 'asset-id-fallback', state: 'DOWNLOADING' }], // asset_id absent → id arm (line 423)
        },
      },
    });
    expect(p.assignmentId).toBe('as-snake'); // line 431 snake arm
    expect(p.criticalTotal).toBe(5);
    expect(p.criticalReady).toBe(2);
    expect(p.assets[0]).toEqual({ assetId: 'asset-id-fallback', state: 'DOWNLOADING', checksumOk: null });
  });
});

// These drive the FINAL `?? ''` / `?? 0` arm of each alternate-key chain — the
// case where NONE of the snake/camel/id keys are present, so the terminal
// default is taken (lines 68, 182, 216, 423 and the current-assignment 402-409
// terminal arms behind the assignment_id null-guard).
describe('normalizers — terminal default arms when every alt-key is absent', () => {
  it('detail with an empty `course` wrapper takes the `empty-string` id/title/levelCount terminals (line 68)', () => {
    // The `course` wrapper is present (covering the wrapper arm of 64-65) but
    // empty → course_id/courseId/id all undefined → `?? ''`; counts/preview → defaults.
    const d = normalizeCourseLibraryDetailPayload({ data: { course: {} } });
    expect(d).toEqual({
      courseId: '',
      title: '',
      description: '',
      levelCount: 0,
      lessonCount: 0,
      previewUrl: null,
    });
  });

  it('published course row with NO id/title keys takes the `empty-string` terminals (lines 182-183)', () => {
    const out = normalizePublishedCoursesPayload({ data: { courses: [{}] } });
    expect(out[0]).toEqual({ courseId: '', title: '', lessonCount: 0 });
  });

  it('published lesson row with NO id key takes the `empty-string` lessonId terminal (line 216)', () => {
    const out = normalizePublishedLessonsPayload({ data: { lessons: [{}] } });
    expect(out[0].lessonId).toBe('');
    expect(out[0].title).toBe('');
    expect(out[0].lessonVersion).toBe(0);
    expect(out[0].profile).toBeNull();
  });

  it('current-assignment with ONLY assignment_id present takes the remaining `empty-string`/`?? 0` terminals (lines 402-409)', () => {
    // assignment_id present passes the null-guard (line 400); every OTHER field is
    // absent → each ?? chain falls to its terminal default.
    const c = normalizeCurrentAssignmentPayload({ data: { assignment: { assignment_id: 'only-id' } } });
    expect(c).toEqual({
      assignmentId: 'only-id',
      sessionId: null,
      assignmentVersion: 0,
      lessonId: '',
      lessonTitle: '',
      lessonVersion: 0,
      manifestChecksum: null,
      state: 'UNASSIGNED',
      childId: '',
      profile: 'espTft',
    });
  });

  it('preload asset with NO id keys takes the `empty-string` assetId terminal (line 423)', () => {
    const p = normalizePreloadStatusPayload({ data: { preload: { assignment_id: 'as', state: 'READY', assets: [{}] } } });
    expect(p.assets[0]).toEqual({ assetId: '', state: 'PENDING', checksumOk: null });
  });
});

describe('enrollment status coercion — non-string value arm (line 540)', () => {
  it('a non-string status value coerces to ACTIVE via the empty-string arm', () => {
    // status is a number → `typeof value === 'string'` false → normalized '' →
    // not in ENROLLMENT_STATUSES → ACTIVE default.
    const e = normalizeEnrollmentPayload({ id: 'en-x', status: 99 });
    expect(e.status).toBe('ACTIVE');
  });
});

describe('enrollCourse / listChildEnrollments — pickEnvelope ?? {} fallbacks (lines 585-596)', () => {
  it('enrollCourse with a NON-object response.data → envelope ?? {} → default enrollment + assignment', async () => {
    mockedClient.post.mockResolvedValueOnce({ data: null } as never);
    const result = await enrollCourse('c_food', { childId: 'ch-1' });

    expect(mockedClient.post).toHaveBeenCalledWith('/courses/c_food/enroll', { childId: 'ch-1' });
    // envelope.enrollment / envelope.assignment are undefined → `?? {}` arms feed
    // the normalizers, which produce fully-defaulted objects (no throw).
    expect(result.enrollment.id).toBe('');
    expect(result.enrollment.status).toBe('ACTIVE');
    expect(result.assignment.id).toBe('');
    expect(result.assignment.profile).toBe('espTft');
    expect(result.assignment.state).toBe('UNASSIGNED');
  });

  it('enrollCourse unwraps a populated { data: { enrollment, assignment } } envelope', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: {
        data: {
          enrollment: { id: 'en-9', child_id: 'ch-9', course_id: 'c_food', status: 'active' },
          assignment: { id: 'ar-9', device_id: 'd-9', lesson_id: 'l-9', state: 'ASSIGNED' },
        },
      },
    } as never);
    const result = await enrollCourse('c_food', { childId: 'ch-9', deviceId: 'd-9' });
    expect(result.enrollment.id).toBe('en-9');
    expect(result.assignment.id).toBe('ar-9');
    expect(result.assignment.state).toBe('ASSIGNED');
  });

  it('listChildEnrollments with a NON-object response.data → envelope ?? {} → empty enrollments (line 596)', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: undefined } as never);
    const result = await listChildEnrollments('ch-1');

    expect(mockedClient.get).toHaveBeenCalledWith('/children/ch-1/enrollments');
    expect(result.enrollments).toEqual([]);
  });

  it('listChildEnrollments accepts a BARE-array envelope of enrollments', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: [{ id: 'en-a', status: 'paused' }, { id: 'en-b' }],
    } as never);
    const result = await listChildEnrollments('ch-2');
    expect(result.enrollments).toHaveLength(2);
    expect(result.enrollments[0]).toMatchObject({ id: 'en-a', status: 'PAUSED' });
    expect(result.enrollments[1]).toMatchObject({ id: 'en-b', status: 'ACTIVE' });
  });

  it('listChildEnrollments unwraps a { data: { enrollments: [...] } } envelope', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: { data: { enrollments: [{ id: 'en-c', course_id: 'c_food' }] } },
    } as never);
    const result = await listChildEnrollments('ch-3');
    expect(result.enrollments).toHaveLength(1);
    expect(result.enrollments[0].courseId).toBe('c_food');
  });
});
