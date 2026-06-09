import client from '@/services/http/client';
import {
  getChildProgress,
  normalizeChildProgressPayload,
  normalizeProgressSummaryPayload,
} from '@/services/api/progress.api';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockedClient = client as jest.Mocked<typeof client>;

// M3 surface-b — aggregate child-scoped progress. Has its OWN normalizer
// (DIV-MOBILE-NORMALIZER); must NOT be the legacy minutes/words parser.
describe('US-006 S11 — aggregate child progress (M3 surface-b)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes the §3.12 summary envelope (snake or camel)', () => {
    expect(
      normalizeChildProgressPayload({
        data: {
          childId: 'ch-1',
          summary: { lessonsCompleted: 12, currentStreakDays: 3, masteredWords: 18 },
          byCourse: [{ courseId: 'c_animals', lessonsCompleted: 8, lessonsTotal: 24 }],
        },
      }),
    ).toEqual({
      childId: 'ch-1',
      lessonsCompleted: 12,
      currentStreakDays: 3,
      masteredWords: 18,
      byCourse: [{ courseId: 'c_animals', lessonsCompleted: 8, lessonsTotal: 24 }],
    });

    expect(
      normalizeChildProgressPayload({
        data: {
          child_id: 'ch-2',
          summary: { lessons_completed: 1, current_streak_days: 0, mastered_words: 4 },
          by_course: [{ course_id: 'c_food', lessons_completed: 1, lessons_total: 10 }],
        },
      }),
    ).toEqual({
      childId: 'ch-2',
      lessonsCompleted: 1,
      currentStreakDays: 0,
      masteredWords: 4,
      byCourse: [{ courseId: 'c_food', lessonsCompleted: 1, lessonsTotal: 10 }],
    });
  });

  it('returns a safe empty shape for missing/partial data', () => {
    expect(normalizeChildProgressPayload(undefined)).toEqual({
      childId: '',
      lessonsCompleted: 0,
      currentStreakDays: 0,
      masteredWords: 0,
      byCourse: [],
    });
  });

  it('does NOT collapse into the legacy progress-summary shape', () => {
    const aggregate = normalizeChildProgressPayload({ data: { summary: { lessonsCompleted: 5 } } });
    // distinct field set from the legacy parser (no minutesDone/weeklyBars etc.)
    expect(aggregate).not.toHaveProperty('weeklyBars');
    const legacy = normalizeProgressSummaryPayload({ data: { lessons_completed: 5 } });
    expect(legacy).toHaveProperty('weeklyBars');
  });

  it('reads the learning/children tree (plan M3 — extends the existing kpis tree)', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: { childId: 'ch-1', summary: {}, byCourse: [] } } });
    await getChildProgress('ch-1');
    expect(mockedClient.get).toHaveBeenCalledWith('/learning/children/ch-1/progress');
  });
});
