import {
  AGE_BANDS,
  adaptLessonForAgeBand,
  getLessonById,
  getLessonByWeekDay,
  getLessonsForAgeBand,
  sixMonthLessonPack,
} from '../../../src/features/lesson-demo/content';

const childFacingText = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(childFacingText);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    if (['id', 'sourceCardIds', 'fallbackLessonId', 'lessonId'].includes(key)) return [];
    return childFacingText(entry);
  });
};

describe('sixMonthLessonPack', () => {
  it('contains a complete six-month spine with 24 weeks and 120 base sessions', () => {
    expect(sixMonthLessonPack).toHaveLength(120);

    const weeks = new Set(sixMonthLessonPack.map((lesson) => lesson.week));
    expect([...weeks]).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));

    for (let week = 1; week <= 24; week += 1) {
      const lessonsForWeek = sixMonthLessonPack.filter((lesson) => lesson.week === week);
      expect(lessonsForWeek).toHaveLength(5);
      expect(lessonsForWeek.map((lesson) => lesson.day)).toEqual([1, 2, 3, 4, 5]);
      expect(lessonsForWeek.every((lesson) => lesson.month === Math.ceil(week / 4))).toBe(true);
      expect(new Set(lessonsForWeek.map((lesson) => lesson.theme)).size).toBe(1);
    }
  });

  it('selects lessons by id and by week/day without exposing raw lookup details', () => {
    const lesson = getLessonByWeekDay(1, 1);

    expect(lesson).toBeDefined();
    expect(lesson?.lessonId).toBe('w01-d01-hello-name');
    expect(getLessonById('w01-d01-hello-name')).toEqual(lesson);
    expect(getLessonByWeekDay(24, 5)?.theme).toBe('Six-month showcase');
    expect(getLessonByWeekDay(25, 1)).toBeUndefined();
  });

  it('adapts each lesson to the supported age bands', () => {
    const baseLesson = getLessonByWeekDay(21, 2);
    expect(baseLesson).toBeDefined();

    const younger = adaptLessonForAgeBand(baseLesson!, '4-6');
    const middle = adaptLessonForAgeBand(baseLesson!, '7-9');
    const older = adaptLessonForAgeBand(baseLesson!, '10-11');

    expect(younger.ageBand).toBe('4-6');
    expect(younger.focusItems).toHaveLength(1);
    expect(younger.reviewItems).toHaveLength(1);
    expect(younger.parentSummary.vietnameseSupport).not.toMatch(/grammar/i);
    expect(younger.steps.map((step) => step.type)).toEqual([
      'warmup',
      'teach',
      'listen',
      'repeat',
      'choice',
      'review',
      'reward',
    ]);

    expect(middle.ageBand).toBe('7-9');
    expect(middle.focusItems.length).toBeGreaterThanOrEqual(2);
    expect(middle.focusItems.length).toBeLessThanOrEqual(3);
    expect(middle.parentSummary.nextReview).toContain('sentence frame');

    expect(older.ageBand).toBe('10-11');
    expect(older.focusItems.length).toBeGreaterThanOrEqual(3);
    expect(older.focusItems.length).toBeLessThanOrEqual(5);
    expect(older.parentSummary.nextReview).toContain('role-play');

    for (const ageBand of AGE_BANDS) {
      expect(getLessonsForAgeBand(ageBand)).toHaveLength(120);
    }
  });

  it('keeps URLs and source-card ids out of child-facing fields', () => {
    const leakPattern = /(https?:\/\/|www\.|source[_ -]?card|framework-\d+|book-\d+|app-\d+|method-\d+|market-\d+)/i;

    for (const ageBand of AGE_BANDS) {
      for (const lesson of getLessonsForAgeBand(ageBand)) {
        expect(lesson.sourceCardIds.length).toBeGreaterThan(0);
        const visibleText = childFacingText({
          objective: lesson.objective,
          focusItems: lesson.focusItems,
          vietnameseL1Target: lesson.vietnameseL1Target,
          practiceMethod: lesson.practiceMethod,
          reviewItems: lesson.reviewItems,
          rewardEvent: lesson.rewardEvent,
          parentSummary: lesson.parentSummary,
          steps: lesson.steps,
        });

        expect(visibleText.join('\n')).not.toMatch(leakPattern);
      }
    }
  });
});
