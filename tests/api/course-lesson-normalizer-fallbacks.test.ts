// Round-1 coverage closeout for the lesson/course normalizer fallback branches.
// These exercise the alternate-key / empty-envelope / wrapper paths in the pure
// normalize* functions (no I/O). Each test targets a specific uncovered branch
// called out in the mobile-lane coverage report.

import {
  normalizeCourseCatalogPayload,
  normalizeLessonListPayload,
  normalizeCourseDetailPayload,
} from '@/services/api/course.api';
import {
  normalizeProgressSummaryPayload,
  normalizeChildProgressPayload,
  normalizeChildLessonProgressPayload,
} from '@/services/api/progress.api';
import {
  normalizeCourseLibraryPayload,
  normalizeCourseLibraryDetailPayload,
  normalizeRobotSyncStatusPayload,
  normalizePublishedCoursesPayload,
  normalizePublishedLessonsPayload,
  normalizeAssignmentPayload,
  normalizeCurrentAssignmentPayload,
  normalizePreloadStatusPayload,
  normalizeEnrollmentPayload,
  normalizeAssignmentRefPayload,
} from '@/services/api/course-library.api';

describe('course.api normalizer fallback branches', () => {
  // pickEnvelope: non-object payload → undefined (course.api.ts:68)
  it('returns [] for non-object catalog payload (envelope undefined path)', () => {
    expect(normalizeCourseCatalogPayload('nope' as unknown)).toEqual([]);
    expect(normalizeCourseCatalogPayload(null)).toEqual([]);
    expect(normalizeCourseCatalogPayload(42 as unknown)).toEqual([]);
  });

  // catalog: bare-array envelope branch + per-item alternate keys (76-90)
  it('accepts a bare-array catalog envelope and maps camelCase + name/id fallbacks', () => {
    const out = normalizeCourseCatalogPayload([
      { id: 'c1', name: 'Camel Course', levelCount: 3, lessonCount: 7, locked: true, progress: 0.5 },
      null, // raw ?? {} fallback (82)
    ]);
    expect(out[0]).toEqual({
      id: 'c1',
      title: 'Camel Course',
      language: 'en', // default (85)
      levelCount: 3,
      lessonCount: 7,
      locked: true,
      progress: 0.5,
    });
    // null entry → all empty/zero defaults
    expect(out[1]).toEqual({
      id: '',
      title: '',
      language: 'en',
      levelCount: 0,
      lessonCount: 0,
      locked: false,
      progress: 0,
    });
  });

  // catalog: envelope with neither array nor .courses → [] (80)
  it('returns [] when catalog envelope has no array and no courses key', () => {
    expect(normalizeCourseCatalogPayload({ data: { somethingElse: 1 } })).toEqual([]);
  });

  // lesson list: bare array + lessons[] fallback + locked-derived state (96-112)
  it('lesson list: bare array, lessons[] alt key, and locked→state derivation', () => {
    // bare array branch (96)
    const bare = normalizeLessonListPayload([
      { id: 'l1', unitId: 'u1', title: 'Camel', durationMinutes: 4, wordsCount: 6, locked: true },
    ]);
    expect(bare[0].state).toBe('locked'); // explicitStatus undefined → locked branch (112)
    expect(bare[0].unitId).toBe('u1');
    expect(bare[0].title).toBe('Camel');

    // available branch (not locked, no explicit status)
    const open = normalizeLessonListPayload({ data: { lesson_list: [{ lesson_id: 'l2' }] } });
    expect(open[0].state).toBe('available');

    // lessons[] alt-key envelope (100)
    const alt = normalizeLessonListPayload({ data: { lessons: [{ id: 'l3', status: 'done' }] } });
    expect(alt[0].state).toBe('done'); // explicitStatus wins
  });

  // lesson list: envelope present but neither lesson_list nor lessons → [] (102)
  it('lesson list returns [] for an envelope with no recognized array key', () => {
    expect(normalizeLessonListPayload({ data: { other: true } })).toEqual([]);
  });

  // course detail: `course` wrapper branch (121-130) + camelCase fallbacks
  it('course detail unwraps the {course:{...}} wrapper and maps camelCase', () => {
    const detail = normalizeCourseDetailPayload({
      data: {
        course: {
          id: 'cx',
          name: 'Wrapped',
          description: 'desc',
          levelCount: 2,
          lessonCount: 9,
          previewUrl: 'http://x/p.png',
          owned: true,
          locked: true,
        },
      },
    });
    expect(detail).toEqual({
      courseId: 'cx',
      title: 'Wrapped',
      description: 'desc',
      levelCount: 2,
      lessonCount: 9,
      previewUrl: 'http://x/p.png',
      owned: true,
      locked: true,
    });
  });

  // course detail: no `course` wrapper → envelope used directly + null preview default (107,129)
  it('course detail without wrapper uses envelope directly and defaults previewUrl null', () => {
    const detail = normalizeCourseDetailPayload({ course_id: 'flat', title: 'Flat' });
    expect(detail.courseId).toBe('flat');
    expect(detail.previewUrl).toBeNull();
    expect(detail.owned).toBe(false);
  });
});

describe('progress.api normalizer fallback branches', () => {
  // words non-array → filtered to [] (progress.api.ts:71)
  it('coerces a non-array words field to [] and filters non-strings', () => {
    expect(normalizeProgressSummaryPayload({ words: 'not-an-array' }).words).toEqual([]);
    expect(
      normalizeProgressSummaryPayload({ words: ['hi', 7, null, 'bye'] }).words,
    ).toEqual(['hi', 'bye']);
  });

  // pickEnvelope undefined → ?? {} default path (59 via 63)
  it('returns the empty-ish summary for a non-object progress payload', () => {
    const s = normalizeProgressSummaryPayload(undefined);
    expect(s.minutesDone).toBe(0);
    expect(s.weeklyBars).toHaveLength(7);
  });

  // byCourse snake_case + camelCase mapping (155-159)
  it('child progress maps by_course snake_case entries and per-entry fallbacks', () => {
    const snake = normalizeChildProgressPayload({
      data: {
        child_id: 'ch-snake',
        summary: { lessons_completed: 5, current_streak_days: 2, mastered_words: 11 },
        by_course: [
          { course_id: 'c_a', lessons_completed: 3, lessons_total: 10 },
          null, // entry ?? {} default → zeros
        ],
      },
    });
    expect(snake.childId).toBe('ch-snake');
    expect(snake.lessonsCompleted).toBe(5);
    expect(snake.byCourse[0]).toEqual({ courseId: 'c_a', lessonsCompleted: 3, lessonsTotal: 10 });
    expect(snake.byCourse[1]).toEqual({ courseId: '', lessonsCompleted: 0, lessonsTotal: 0 });
  });

  it('child progress falls back to [] byCourse and empty summary when missing', () => {
    const out = normalizeChildProgressPayload({ data: { child_id: 'x', by_course: 'nope' } });
    expect(out.byCourse).toEqual([]);
    expect(out.masteredWords).toBe(0);
  });

  // assignment-progress field fallbacks: lessonTitle non-string → null (218-221)
  it('lesson-progress assignment normalizer defaults missing/typed fields', () => {
    const rows = normalizeChildLessonProgressPayload({
      data: {
        assignments: [
          { assignmentId: 'a1', lessonTitle: 123, state: 'BOGUS' }, // non-string title → null; bad state → UNASSIGNED
          {}, // all defaults
        ],
      },
    });
    expect(rows[0].lessonTitle).toBeNull();
    expect(rows[0].state).toBe('UNASSIGNED');
    expect(rows[0].startedAt).toBeNull();
    expect(rows[0].stepsCompleted).toBe(0);
    expect(rows[1].assignmentId).toBe('');
    expect(rows[1].createdAt).toBe('');
  });

  it('lesson-progress normalizer keeps a valid string lessonTitle and state', () => {
    const rows = normalizeChildLessonProgressPayload({
      data: { assignments: [{ assignmentId: 'a2', lessonTitle: 'Animals', state: 'COMPLETED', startedAt: '2026-01-01' }] },
    });
    expect(rows[0].lessonTitle).toBe('Animals');
    expect(rows[0].state).toBe('COMPLETED');
    expect(rows[0].startedAt).toBe('2026-01-01');
  });
});

describe('course-library.api normalizer fallback branches', () => {
  // library list: bare-array envelope + id/courseId/name fallbacks + synced alt keys (41-58)
  it('library list accepts a bare array and resolves id/name/synced fallbacks', () => {
    const out = normalizeCourseLibraryPayload([
      { id: 'lib1', name: 'Via Name', synced: true },
      null,
    ]);
    expect(out[0]).toEqual({
      courseId: 'lib1',
      title: 'Via Name',
      language: 'en',
      price: 0,
      owned: true,
      syncedToDevice: true,
      locked: false,
    });
    expect(out[1].courseId).toBe('');
  });

  it('library list returns [] for an envelope without courses/array', () => {
    expect(normalizeCourseLibraryPayload({ data: { x: 1 } })).toEqual([]);
  });

  // library detail: flat (no course wrapper) + id/name fallbacks (67-68, 78-81 sync)
  it('library detail uses flat envelope and id/name fallbacks', () => {
    const d = normalizeCourseLibraryDetailPayload({ data: { id: 'd1', name: 'Flat Detail' } });
    expect(d.courseId).toBe('d1');
    expect(d.title).toBe('Flat Detail');
    expect(d.previewUrl).toBeNull();
  });

  // robot sync status: camelCase + defaults (78-84)
  it('robot sync status maps camelCase and defaults', () => {
    expect(normalizeRobotSyncStatusPayload({ courseId: 'c', synced: true, lastSyncAt: 't' })).toEqual({
      courseId: 'c',
      synced: true,
      lastSyncAt: 't',
    });
    expect(normalizeRobotSyncStatusPayload(undefined)).toEqual({
      courseId: '',
      synced: false,
      lastSyncAt: null,
    });
  });

  // published courses: bare array + id fallback (182-184)
  it('published courses accept a bare array and resolve id/name fallbacks', () => {
    const out = normalizePublishedCoursesPayload([{ id: 'pc', name: 'Pub' }]);
    expect(out[0]).toEqual({ courseId: 'pc', title: 'Pub', lessonCount: 0 });
  });

  it('published courses return [] without a recognized array', () => {
    expect(normalizePublishedCoursesPayload({ data: { nope: 1 } })).toEqual([]);
  });

  // published lessons: bare array (193), profile null default (210-218 region),
  // personalization absent → undefined branch, id/name fallback
  it('published lessons: bare array, null profile, and no personalization', () => {
    const out = normalizePublishedLessonsPayload([
      { id: 'pl', name: 'No Profile', manifestReady: false },
    ]);
    expect(out[0].lessonId).toBe('pl');
    expect(out[0].title).toBe('No Profile');
    expect(out[0].profile).toBeNull();
    expect(out[0].manifestReady).toBe(false);
    expect(out[0].personalization).toBeUndefined();
  });

  it('published lessons: builds personalization when reasonCode is valid (snake_case)', () => {
    const out = normalizePublishedLessonsPayload({
      data: {
        lessons: [
          {
            lesson_id: 'pl2',
            lesson_version: 4,
            profile: 'espTft',
            manifest_ready: true,
            personalization: { rank: 2, reason_code: 'interest_match', matched_topics: ['cats', 9] },
          },
        ],
      },
    });
    expect(out[0].personalization).toEqual({
      rank: 2,
      reasonCode: 'interest_match',
      matchedTopics: ['cats'],
    });
  });

  it('published lessons: invalid reasonCode drops personalization to undefined', () => {
    const out = normalizePublishedLessonsPayload([
      { id: 'pl3', personalization: { rank: 1, reasonCode: 'garbage' } },
    ]);
    expect(out[0].personalization).toBeUndefined();
  });

  it('published lessons return [] without a recognized array', () => {
    expect(normalizePublishedLessonsPayload({ data: { other: true } })).toEqual([]);
  });

  // assignment payload: `assignment` wrapper + snake_case (379-392)
  it('assignment payload unwraps {assignment:{...}} and maps snake_case', () => {
    const a = normalizeAssignmentPayload({
      data: {
        assignment: {
          assignment_id: 'as1',
          assignment_version: 2,
          device_id: 'd1',
          child_id: 'ch1',
          lesson_id: 'l1',
          lesson_version: 3,
          manifest_checksum: 'sum',
          profile: 'piTft',
          state: 'READY',
          created_at: 'now',
        },
      },
    });
    expect(a).toEqual({
      assignmentId: 'as1',
      assignmentVersion: 2,
      deviceId: 'd1',
      childId: 'ch1',
      lessonId: 'l1',
      lessonVersion: 3,
      manifestChecksum: 'sum',
      profile: 'piTft',
      state: 'READY',
      createdAt: 'now',
    });
  });

  it('assignment payload defaults profile to espTft and state to UNASSIGNED', () => {
    const a = normalizeAssignmentPayload({});
    expect(a.profile).toBe('espTft');
    expect(a.state).toBe('UNASSIGNED');
    expect(a.manifestChecksum).toBeNull();
  });

  // current assignment: null + missing-id → null (396,399), then populated camelCase (399-411)
  it('current assignment returns null for explicit null and missing id', () => {
    expect(normalizeCurrentAssignmentPayload({ data: { assignment: null } })).toBeNull();
    expect(normalizeCurrentAssignmentPayload({ data: {} })).toBeNull();
  });

  it('current assignment maps a populated camelCase assignment', () => {
    const c = normalizeCurrentAssignmentPayload({
      data: {
        assignment: {
          assignmentId: 'cur1',
          lessonId: 'l9',
          lessonTitle: 'Live',
          lessonVersion: 1,
          state: 'RUNNING',
          childId: 'ch9',
        },
      },
    });
    expect(c).not.toBeNull();
    expect(c!.assignmentId).toBe('cur1');
    expect(c!.lessonTitle).toBe('Live');
    expect(c!.profile).toBe('espTft');
  });

  // preload status: assets non-array → [] + errorCode omitted (414-431 + 437)
  it('preload status defaults assets to [] and omits errorCode when blank', () => {
    const p = normalizePreloadStatusPayload({ data: { assignment_id: 'as', state: 'PRELOADING', assets: 'nope' } });
    expect(p.assets).toEqual([]);
    expect(p.errorCode).toBeUndefined();
    expect(p.state).toBe('PRELOADING');
    expect(p.profile).toBe('espTft');
  });

  it('preload status maps assets (snake+camel checksum) and surfaces errorCode', () => {
    const p = normalizePreloadStatusPayload({
      data: {
        preload: {
          assignment_id: 'as2',
          state: 'FAILED',
          critical_total: 3,
          critical_ready: 1,
          error_code: 'MANIFEST_MISSING',
          assets: [
            { asset_id: 'a1', state: 'READY', checksum_ok: true },
            { id: 'a2' }, // defaults: state PENDING, checksum null
          ],
        },
      },
    });
    expect(p.errorCode).toBe('MANIFEST_MISSING');
    expect(p.criticalTotal).toBe(3);
    expect(p.assets[0]).toEqual({ assetId: 'a1', state: 'READY', checksumOk: true });
    expect(p.assets[1]).toEqual({ assetId: 'a2', state: 'PENDING', checksumOk: null });
  });

  // enrollment payload: snake_case id/enrollment_id fallbacks + status normalize (540-555)
  it('enrollment payload resolves enrollment_id fallback and uppercases status', () => {
    const e = normalizeEnrollmentPayload({
      enrollment_id: 'en1',
      child_id: 'ch1',
      course_id: 'co1',
      device_id: 'dev1',
      status: 'paused',
      current_lesson_key: 'k1',
    });
    expect(e).toEqual({
      id: 'en1',
      childId: 'ch1',
      courseId: 'co1',
      deviceId: 'dev1',
      status: 'PAUSED',
      currentLessonKey: 'k1',
    });
  });

  it('enrollment payload defaults to ACTIVE status and null device/lessonKey', () => {
    const e = normalizeEnrollmentPayload({ status: 'unknown-state' });
    expect(e.status).toBe('ACTIVE');
    expect(e.deviceId).toBeNull();
    expect(e.currentLessonKey).toBeNull();
  });

  // assignmentRef payload: assignment_id fallback + snake_case (561-571)
  it('assignmentRef payload resolves assignment_id fallback and snake_case fields', () => {
    const r = normalizeAssignmentRefPayload({
      assignment_id: 'ar1',
      assignment_version: 5,
      device_id: 'd1',
      child_id: 'ch1',
      lesson_id: 'l1',
      lesson_title: 'Hello',
      lesson_version: 2,
      manifest_checksum: 'sum',
      profile: 'mobile',
      state: 'ASSIGNED',
    });
    expect(r.id).toBe('ar1');
    expect(r.assignmentVersion).toBe(5);
    expect(r.lessonTitle).toBe('Hello');
    expect(r.profile).toBe('mobile');
    expect(r.state).toBe('ASSIGNED');
  });

  it('assignmentRef payload defaults profile/state/checksum', () => {
    const r = normalizeAssignmentRefPayload({});
    expect(r.profile).toBe('espTft');
    expect(r.state).toBe('UNASSIGNED');
    expect(r.manifestChecksum).toBeNull();
  });
});
