import {
  applyLessonCompletion,
  getInitialLessonDemoProgress,
  nextLessonPosition,
} from '../../../src/features/lessonDemo/store/useLessonDemoProgressStore';
import { staticLessonContentProvider } from '../../../src/features/lessonDemo/providers/StaticLessonContentProvider';

describe('lesson demo progress store helpers', () => {
  it('moves through week/day positions safely', () => {
    expect(nextLessonPosition(1, 1)).toEqual({ currentWeek: 1, currentDay: 2 });
    expect(nextLessonPosition(1, 5)).toEqual({ currentWeek: 2, currentDay: 1 });
    expect(nextLessonPosition(24, 5)).toEqual({ currentWeek: 24, currentDay: 5 });
  });

  it('applies lesson completion without real child PII', () => {
    const lesson = staticLessonContentProvider.getTodaySession('7-9');
    const completed = applyLessonCompletion(
      getInitialLessonDemoProgress(),
      lesson,
      '7-9',
      '2026-05-19T00:00:00.000Z',
    );

    expect(completed.completedLessonIds).toEqual([lesson.lessonId]);
    expect(completed.streakCount).toBe(1);
    expect(completed.masteredFocusItems).toEqual(lesson.focusItems);
    expect(completed.weakVietnameseL1Targets).toEqual([lesson.vietnameseL1Target]);
    expect(JSON.stringify(completed)).not.toMatch(/Mai|parent@|session_id|child_id|https?:\/\//i);
  });
});
