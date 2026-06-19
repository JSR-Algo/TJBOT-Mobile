import {
  BARN_SAY_IT_LESSON_ID,
  getBarnSayItLesson,
} from '../../../src/features/lessonDemo/content/barnSayItLesson';
import { staticLessonContentProvider } from '../../../src/features/lessonDemo';

describe('barn say-it legacy lesson', () => {
  it('exports the canonical lesson id from legacy handoff', () => {
    expect(BARN_SAY_IT_LESSON_ID).toBe('w01-d01-barn-say-it');
  });

  it('maps all nine legacy steps with barn focus words', () => {
    const lesson = getBarnSayItLesson('4-6');
    expect(lesson.theme).toBe('Barn Farm Place Words');
    expect(lesson.focusItems).toEqual(['barn', 'farm', 'hay']);
    expect(lesson.steps).toHaveLength(9);
    expect(lesson.steps[0]?.prompt).toContain('TeeBot is so happy');
    expect(lesson.steps[6]?.choices?.find((choice) => choice.label === 'barn')?.isPreferred).toBe(true);
    expect(lesson.media?.videoSource).toBeTruthy();
  });

  it('is resolved by the static lesson provider', () => {
    const lesson = staticLessonContentProvider.getLessonById(BARN_SAY_IT_LESSON_ID, '4-6');
    expect(lesson?.lessonId).toBe(BARN_SAY_IT_LESSON_ID);
    expect(lesson?.steps).toHaveLength(9);
  });
});