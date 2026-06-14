import {
  AGE_BANDS,
  adaptLessonForAgeBand,
  getLessonById,
  getLessonByWeekDay,
  getLessonsForAgeBand,
  sixMonthLessonPack,
} from '@/features/progress/lesson-demo';

const childFacingText = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(childFacingText);
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    if (['id', 'sourceCardIds', 'fallbackLessonId', 'lessonId'].includes(key)) return [];
    return childFacingText(entry);
  });
};

describe('lesson demo pack', () => {
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

  it('adapts each lesson to safe age bands without exposing source-card metadata', () => {
    const baseLesson = getLessonByWeekDay(21, 2);
    expect(baseLesson).toBeDefined();

    const younger = adaptLessonForAgeBand(baseLesson!, '4-6');
    const middle = adaptLessonForAgeBand(baseLesson!, '7-9');
    const older = adaptLessonForAgeBand(baseLesson!, '10-11');

    expect(younger.focusItems).toHaveLength(1);
    expect(middle.focusItems.length).toBeGreaterThanOrEqual(2);
    expect(middle.focusItems.length).toBeLessThanOrEqual(3);
    expect(older.focusItems.length).toBeGreaterThanOrEqual(3);
    expect(older.focusItems.length).toBeLessThanOrEqual(5);

    for (const ageBand of AGE_BANDS) {
      expect(getLessonsForAgeBand(ageBand)).toHaveLength(120);
    }
    expect(getLessonById('w01-d01-hello-name')?.lessonId).toBe('w01-d01-hello-name');

    const leakPattern = /(https?:\/\/|www\.|source[_ -]?card|framework-\d+|book-\d+|app-\d+|method-\d+|market-\d+)/i;
    for (const ageBand of AGE_BANDS) {
      for (const lesson of getLessonsForAgeBand(ageBand)) {
        expect(lesson.sourceCardIds.length).toBeGreaterThan(0);
        const visibleText = childFacingText({
          objective: lesson.objective,
          focusItems: lesson.focusItems,
          rewardEvent: lesson.rewardEvent,
          parentSummary: lesson.parentSummary,
          steps: lesson.steps,
        });
        expect(visibleText.join('\n')).not.toMatch(leakPattern);
      }
    }
  });
});
