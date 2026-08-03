import { normalizeAssignmentProgress, normalizeChildLessonProgressPayload } from '@/services/api/progress.api';

describe('US-006 lesson-runtime progress — assignment normalization', () => {
  describe('normalizeAssignmentProgress', () => {
    it('normalizes a complete assignment with all fields', () => {
      const input = {
        assignmentId: 'assign-123',
        deviceId: 'device-456',
        childId: 'child-789',
        lessonId: 'lesson-101',
        lessonVersion: 2,
        lessonTitle: 'Animals A-Z',
        profile: 'learner',
        state: 'COMPLETED',
        startedAt: '2024-01-15T10:30:00Z',
        completedAt: '2024-01-15T11:00:00Z',
        stepsCompleted: 5,
        stepsSucceeded: 5,
        lastEventAt: '2024-01-15T10:59:59Z',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
      };

      const result = normalizeAssignmentProgress(input);

      expect(result).toEqual({
        assignmentId: 'assign-123',
        deviceId: 'device-456',
        childId: 'child-789',
        lessonId: 'lesson-101',
        lessonVersion: 2,
        lessonTitle: 'Animals A-Z',
        profile: 'learner',
        state: 'COMPLETED',
        startedAt: '2024-01-15T10:30:00Z',
        completedAt: '2024-01-15T11:00:00Z',
        stepsCompleted: 5,
        stepsSucceeded: 5,
        lastEventAt: '2024-01-15T10:59:59Z',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
      });
    });

    it('handles missing fields with sensible defaults', () => {
      const input = {};

      const result = normalizeAssignmentProgress(input);

      expect(result).toEqual({
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

    it('handles null/undefined input', () => {
      const resultNull = normalizeAssignmentProgress(null);
      const resultUndefined = normalizeAssignmentProgress(undefined);

      expect(resultNull).toEqual({
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
      expect(resultUndefined).toEqual(resultNull);
    });

    it('handles lessonTitle correctly (string vs non-string)', () => {
      expect(normalizeAssignmentProgress({ lessonTitle: 'Valid Title' }).lessonTitle).toBe('Valid Title');
      expect(normalizeAssignmentProgress({ lessonTitle: null }).lessonTitle).toBe(null);
      expect(normalizeAssignmentProgress({ lessonTitle: undefined }).lessonTitle).toBe(null);
      expect(normalizeAssignmentProgress({ lessonTitle: 123 }).lessonTitle).toBe(null);
      expect(normalizeAssignmentProgress({ lessonTitle: {} }).lessonTitle).toBe(null);
      expect(normalizeAssignmentProgress({}).lessonTitle).toBe(null);
    });

    it('coerces number fields to valid numbers', () => {
      const input = {
        lessonVersion: '5',
        stepsCompleted: '3',
        stepsSucceeded: '2',
      };

      const result = normalizeAssignmentProgress(input);

      expect(result.lessonVersion).toBe(5);
      expect(result.stepsCompleted).toBe(3);
      expect(result.stepsSucceeded).toBe(2);
    });

    it('handles invalid number coercions gracefully', () => {
      const input = {
        lessonVersion: 'invalid',
        stepsCompleted: null,
        stepsSucceeded: undefined,
      };

      const result = normalizeAssignmentProgress(input);

      expect(isNaN(result.lessonVersion)).toBe(true);
      expect(result.stepsCompleted).toBe(0);
      expect(result.stepsSucceeded).toBe(0);
    });

    it('handles various assignment states', () => {
      const validStates = ['UNASSIGNED', 'ASSIGNED', 'PRELOADING', 'READY', 'RUNNING', 'COMPLETED', 'PAUSED', 'FAILED', 'CANCELLED'];

      validStates.forEach((state) => {
        const result = normalizeAssignmentProgress({ state });
        expect(result.state).toBe(state);
      });
    });

    it('defaults to UNASSIGNED for invalid states', () => {
      const result = normalizeAssignmentProgress({ state: 'INVALID_STATE' });
      expect(result.state).toBe('UNASSIGNED');

      const result2 = normalizeAssignmentProgress({ state: 123 });
      expect(result2.state).toBe('UNASSIGNED');

      const result3 = normalizeAssignmentProgress({ state: null });
      expect(result3.state).toBe('UNASSIGNED');
    });

    it('preserves nullable date fields as null or string', () => {
      const input = {
        startedAt: '2024-01-15T10:00:00Z',
        completedAt: null,
        lastEventAt: undefined,
      };

      const result = normalizeAssignmentProgress(input);

      expect(result.startedAt).toBe('2024-01-15T10:00:00Z');
      expect(result.completedAt).toBe(null);
      expect(result.lastEventAt).toBe(null);
    });

    it('coerces string fields to empty string when missing', () => {
      const input = {
        assignmentId: null,
        deviceId: undefined,
        childId: null,
        lessonId: null,
        profile: null,
        createdAt: null,
        updatedAt: undefined,
      };

      const result = normalizeAssignmentProgress(input);

      expect(result.assignmentId).toBe('');
      expect(result.deviceId).toBe('');
      expect(result.childId).toBe('');
      expect(result.lessonId).toBe('');
      expect(result.profile).toBe('');
      expect(result.createdAt).toBe('');
      expect(result.updatedAt).toBe('');
    });

    it('preserves non-string values when using nullish coalescing', () => {
      const input = {
        assignmentId: 123,
        childId: true,
        deviceId: { obj: 'ect' },
      };

      const result = normalizeAssignmentProgress(input);

      expect(result.assignmentId).toBe(123);
      expect(result.childId).toBe(true);
      expect(result.deviceId).toEqual({ obj: 'ect' });
    });

    it('handles partial data for a real assignment mid-progress', () => {
      const input = {
        assignmentId: 'assign-abc',
        deviceId: 'device-xyz',
        childId: 'child-001',
        lessonId: 'lesson-food',
        lessonVersion: 1,
        lessonTitle: 'Food Vocabulary',
        profile: 'student',
        state: 'RUNNING',
        startedAt: '2024-01-20T14:00:00Z',
        completedAt: null,
        stepsCompleted: 2,
        stepsSucceeded: 2,
        lastEventAt: '2024-01-20T14:05:30Z',
        createdAt: '2024-01-20T14:00:00Z',
        updatedAt: '2024-01-20T14:05:30Z',
      };

      const result = normalizeAssignmentProgress(input);

      expect(result.state).toBe('RUNNING');
      expect(result.completedAt).toBe(null);
      expect(result.stepsCompleted).toBe(2);
      expect(result.stepsSucceeded).toBe(2);
      expect(result.lessonTitle).toBe('Food Vocabulary');
    });
  });

  describe('normalizeChildLessonProgressPayload', () => {
    it('normalizes envelope with assignments array', () => {
      const payload = {
        data: {
          assignments: [
            {
              assignmentId: 'a1',
              deviceId: 'd1',
              childId: 'c1',
              lessonId: 'l1',
              state: 'COMPLETED',
              createdAt: '2024-01-15T10:00:00Z',
              updatedAt: '2024-01-15T11:00:00Z',
            },
          ],
        },
      };

      const result = normalizeChildLessonProgressPayload(payload);

      expect(result).toHaveLength(1);
      expect(result[0].assignmentId).toBe('a1');
      expect(result[0].state).toBe('COMPLETED');
    });

    it('returns empty array for missing assignments', () => {
      expect(normalizeChildLessonProgressPayload({ data: {} })).toEqual([]);
      expect(normalizeChildLessonProgressPayload({})).toEqual([]);
      expect(normalizeChildLessonProgressPayload(null)).toEqual([]);
    });

    it('processes multiple assignments', () => {
      const payload = {
        data: {
          assignments: [
            { assignmentId: 'a1', lessonId: 'l1', createdAt: 'c1', updatedAt: 'u1' },
            { assignmentId: 'a2', lessonId: 'l2', createdAt: 'c2', updatedAt: 'u2' },
            { assignmentId: 'a3', lessonId: 'l3', createdAt: 'c3', updatedAt: 'u3' },
          ],
        },
      };

      const result = normalizeChildLessonProgressPayload(payload);

      expect(result).toHaveLength(3);
      expect(result.map((a) => a.assignmentId)).toEqual(['a1', 'a2', 'a3']);
    });
  });
});
