import {
  BARN_SAY_IT_LESSON_ID,
  CAT_DOG_LESSON_ID,
  CURATED_LESSON_IDS,
  HAPPY_SAD_LESSON_ID,
  RED_BLUE_LESSON_ID,
  getCuratedLessonCatalog,
  getCuratedLessonById,
} from '../../../src/features/lessonDemo/content/curatedLegacyLessons';
import { staticLessonContentProvider } from '../../../src/features/lessonDemo';

describe('curated legacy lessons', () => {
  it('ships four age 4-6 lessons with nine steps and media each', () => {
    expect(CURATED_LESSON_IDS).toEqual([
      BARN_SAY_IT_LESSON_ID,
      HAPPY_SAD_LESSON_ID,
      RED_BLUE_LESSON_ID,
      CAT_DOG_LESSON_ID,
    ]);

    const catalog = getCuratedLessonCatalog('4-6');
    expect(catalog).toHaveLength(4);
    for (const lesson of catalog) {
      expect(lesson.steps).toHaveLength(9);
      expect(lesson.media?.videoSource).toBeTruthy();
      expect(lesson.title).toBeTruthy();
    }
  });

  it('resolves happy-sad and cat-dog through the content provider', () => {
    const happy = staticLessonContentProvider.getLessonById(HAPPY_SAD_LESSON_ID, '4-6');
    const animals = getCuratedLessonById(CAT_DOG_LESSON_ID, '4-6');

    expect(happy?.focusItems).toEqual(['happy', 'sad', 'brave']);
    expect(animals?.focusItems).toEqual(['cat', 'dog', 'bird']);
  });
});