// Round-2 coverage closeout for the lesson/course/progress normalizer NULL-ROW
// guard arms and alternate-key fallbacks that round-1 left dark.
//
// Each test targets a specific *branch arm* (not just a statement) flagged by
// the v8/istanbul branch report on the scoped surface:
//   - course.api.ts L104 `(raw ?? {})`   — null lesson row in normalizeLessonListPayload
//   - course.api.ts L105 `lesson_id ?? id ?? ''` — alternate-key + empty fallback
//   - course.api.ts L123-125 — `'course' in` *false* arm → `(envelope ?? {})` unwrap,
//     including the `envelope === undefined` right-hand `?? {}` arm.
//   - progress.api.ts L218 `(entry ?? {})` — null assignment row in normalizeAssignmentProgress
//
// Pure functions, no I/O. Non-tautology: each assertion pins the EXACT defaulted
// output the guarded arm produces, distinguishing it from the populated arm.

import {
  normalizeLessonListPayload,
  normalizeCourseDetailPayload,
} from '@/services/api/course.api';
import { normalizeChildLessonProgressPayload } from '@/services/api/progress.api';

describe('normalizeLessonListPayload — null-row + alternate-key arms', () => {
  // L104 `(raw ?? {})` null-row arm + L105 `lesson_id ?? id ?? ''` final '' fallback.
  it('maps a null lesson entry to all-empty defaults (raw ?? {} arm)', () => {
    const out = normalizeLessonListPayload({ data: { lesson_list: [null] } });
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      id: '', // lesson_id ?? id ?? '' → '' (both absent)
      unitId: '',
      title: '',
      durationMinutes: 0,
      wordsCount: 0,
      state: 'available', // not locked, no explicit status
      stars: 0,
    });
  });

  // L105 alternate-key: lesson_id absent but `id` present → id wins over the '' fallback.
  it('resolves the `id` alternate key when `lesson_id` is absent', () => {
    const out = normalizeLessonListPayload({ data: { lessons: [{ id: 'fallback-id' }] } });
    expect(out[0].id).toBe('fallback-id');
  });

  // L105 primary: lesson_id present takes precedence over id.
  it('prefers `lesson_id` over `id` when both are present', () => {
    const out = normalizeLessonListPayload({ data: { lesson_list: [{ lesson_id: 'L', id: 'I' }] } });
    expect(out[0].id).toBe('L');
  });
});

describe('normalizeCourseDetailPayload — no-wrapper (`course` absent) arm', () => {
  // L123-125: `'course' in envelope` is FALSE → `(envelope ?? {})` used directly,
  // and the flat object supplies id/title via the camel/snake fallbacks.
  it('uses the envelope directly when the `course` key is absent', () => {
    const detail = normalizeCourseDetailPayload({
      data: { course_id: 'flat-id', name: 'Flat Name', level_count: 4 },
    });
    expect(detail.courseId).toBe('flat-id');
    expect(detail.title).toBe('Flat Name');
    expect(detail.levelCount).toBe(4);
    expect(detail.previewUrl).toBeNull();
    expect(detail.owned).toBe(false);
    expect(detail.locked).toBe(false);
  });

  // L124 right-hand `(envelope ?? {})` arm where envelope itself is undefined:
  // a non-object payload makes pickEnvelope return undefined → `?? {}` → all defaults.
  it('falls back to {} when the envelope is undefined (non-object payload)', () => {
    const detail = normalizeCourseDetailPayload('not-an-object' as unknown);
    expect(detail).toEqual({
      courseId: '',
      title: '',
      description: '',
      levelCount: 0,
      lessonCount: 0,
      previewUrl: null,
      owned: false,
      locked: false,
    });
  });
});

describe('normalizeAssignmentProgress — null-row guard (progress.api L218)', () => {
  // L218 `(entry ?? {})`: a null assignment row must normalize to all defaults,
  // not throw. Distinct from the `{}` case (round-1) because the `?? {}` LEFT
  // operand here is actually null, exercising the null arm of the coalescer.
  it('maps a null assignment entry to all-default fields', () => {
    const rows = normalizeChildLessonProgressPayload({ data: { assignments: [null] } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      assignmentId: '',
      deviceId: '',
      childId: '',
      lessonId: '',
      lessonVersion: 0,
      lessonTitle: null,
      profile: '',
      state: 'UNASSIGNED',
      startedAt: null,
      completedAt: null,
      stepsCompleted: 0,
      stepsSucceeded: 0,
      lastEventAt: null,
      createdAt: '',
      updatedAt: '',
    });
  });
});
