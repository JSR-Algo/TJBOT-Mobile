import type { LessonAgeBand, LessonSession } from '../types';
import {
  buildCuratedLesson,
  createStandardLessonSteps,
  type CuratedLessonDefinition,
} from './legacyLessonBuilder';

export const BARN_SAY_IT_LESSON_ID = 'w01-d01-barn-say-it';
export const HAPPY_SAD_LESSON_ID = 'w02-d01-happy-sad';
export const RED_BLUE_LESSON_ID = 'w05-d01-red-blue';
export const CAT_DOG_LESSON_ID = 'w07-d01-cat-dog';

const barnVideo = require('../../../assets/lessons/barn-round-field.mp4');
const barnPoster = require('../../../assets/lessons/barn-round-field-poster.jpg');
const sunnyVideo = require('../../../assets/lessons/sunny-sky-loop.mp4');
const sunnyPoster = require('../../../assets/lessons/sunny-sky-loop-poster.jpg');
const meadowVideo = require('../../../assets/lessons/meadow-colors-loop.mp4');
const meadowPoster = require('../../../assets/lessons/meadow-colors-loop-poster.jpg');
const playgroundVideo = require('../../../assets/lessons/playground-animals-loop.mp4');
const playgroundPoster = require('../../../assets/lessons/playground-animals-loop-poster.jpg');

const CURATED_DEFINITIONS: CuratedLessonDefinition[] = [
  {
    lessonId: BARN_SAY_IT_LESSON_ID,
    title: 'This Is a Barn',
    week: 1,
    day: 1,
    theme: 'Barn Farm Place Words',
    objective: 'Practice place words (barn, farm, hay) and final consonants for Vietnamese learners.',
    focusItems: ['barn', 'farm', 'hay'],
    vietnameseL1Target: 'final_consonants',
    practiceMethod: 'Listen, model mouth shape, repeat, then choose the barn word.',
    reviewItems: ['hello'],
    rewardEvent: { type: 'lesson_badge', badgeId: 'barn_star', message: 'You found the barn with TeeBot!' },
    parentSummary: {
      objective: 'Place words and final consonant awareness.',
      practiced: ['barn', 'farm', 'hay'],
      vietnameseSupport: 'Listen for the tiny finish sound at the end of the word.',
      nextReview: 'Ask "What is this?" while looking at farm picture books.',
    },
    sourceCardIds: ['oxford-phonics-world-sample'],
    media: { videoSource: barnVideo, posterSource: barnPoster, loop: true },
    steps: createStandardLessonSteps({
      reviewPrompt: 'Do you remember how to say hello? Wave and say "Hello, TeeBot!"',
      focusPrompt: 'Today we are visiting a barn! A barn is a big house for farm animals. We will also learn "farm" and "hay."',
      modelPrompt: 'This is a barn. Watch my mouth: "barn." Make a strong /b/ sound and keep the /n/ at the end!',
      listenPrompt: 'Listen to "barn" one more time. Hear the ending sound? b-a-r-n.',
      repeatPrompt: 'Now you say it: "barn."',
      repeatHelper: 'Short and strong: barn. Say the ending sound clearly!',
      fillBlank: {
        prompt: 'At the ___, I see animals.',
        choices: [
          { id: 'c1', label: 'barn', isCorrect: true },
          { id: 'c2', label: 'house', isCorrect: false },
          { id: 'c3', label: 'tree', isCorrect: false },
        ],
      },
      feedbackPrompt: 'Wonderful! Remember: in English, every word needs its ending sound. "Barn" has a strong /n/ at the end. You did it!',
      feedbackHelper: 'Final consonants make English clear.',
      celebratePrompt: 'You found the barn with TeeBot! Look how your garden is growing!',
    }),
  },
  {
    lessonId: HAPPY_SAD_LESSON_ID,
    title: 'Happy and Sad',
    week: 2,
    day: 1,
    theme: 'Feelings & Empathy',
    objective: 'Name feelings with happy, sad, and brave.',
    focusItems: ['happy', 'sad', 'brave'],
    vietnameseL1Target: 'copula_be',
    practiceMethod: 'Match a face, listen to the feeling word, then say it aloud.',
    reviewItems: ['hello', 'yes', 'no'],
    rewardEvent: { type: 'feelings_badge', badgeId: 'feeling_words_1', message: 'You named feelings in English.' },
    parentSummary: {
      objective: 'Emotional vocabulary and gentle check-ins.',
      practiced: ['happy', 'sad', 'brave'],
      vietnameseSupport: 'Vietnamese often drops "am/is/are" — practice "I am happy."',
      nextReview: 'Ask "How do you feel?" at bedtime.',
    },
    sourceCardIds: ['framework-004', 'book-017'],
    media: { videoSource: sunnyVideo, posterSource: sunnyPoster, loop: true },
    steps: createStandardLessonSteps({
      reviewPrompt: 'Wave and say "Hello, TeeBot!" one more time.',
      focusPrompt: 'Today we learn feelings! Happy means you smile inside. Sad means a gentle quiet feeling. Brave means you try even when it is new.',
      modelPrompt: 'This face is happy. Listen: "happy." H-a-p-p-y. Can you make a happy smile?',
      listenPrompt: 'Now listen to "sad." S-a-d. It is soft and gentle, never scary.',
      repeatPrompt: 'Your turn! Say "happy."',
      repeatHelper: 'Match your face to the word.',
      fillBlank: {
        prompt: 'When I smile big, I feel ___.',
        choices: [
          { id: 'c1', label: 'happy', isCorrect: true },
          { id: 'c2', label: 'sad', isCorrect: false },
          { id: 'c3', label: 'brave', isCorrect: false },
        ],
      },
      feedbackPrompt: 'Beautiful! You can say "I am happy" and "I am sad." English keeps the little word "am."',
      feedbackHelper: 'Try "I am brave" when you try something new.',
      celebratePrompt: 'You named feelings with TeeBot! Your heart words are growing!',
    }),
  },
  {
    lessonId: RED_BLUE_LESSON_ID,
    title: 'Red and Blue',
    week: 5,
    day: 1,
    theme: 'Color Adventure',
    objective: 'Name the colors red, blue, and yellow.',
    focusItems: ['red', 'blue', 'yellow'],
    vietnameseL1Target: 'final_consonants',
    practiceMethod: 'Point to the color TeeBot names, then say the color aloud.',
    reviewItems: ['one', 'two', 'three'],
    rewardEvent: { type: 'color_badge', badgeId: 'color_namer', message: 'You named colors in English today.' },
    parentSummary: {
      objective: 'Color words with clear ending sounds.',
      practiced: ['red', 'blue', 'yellow'],
      vietnameseSupport: 'Practice the /d/ at the end of "red" and the /l/ in "yellow."',
      nextReview: 'Play a color hunt around the house.',
    },
    sourceCardIds: ['framework-004', 'book-011'],
    media: { videoSource: meadowVideo, posterSource: meadowPoster, loop: true },
    steps: createStandardLessonSteps({
      reviewPrompt: 'Count with me: one, two, three!',
      focusPrompt: 'Color adventure time! Red like an apple, blue like the sky, yellow like a sunny banana.',
      modelPrompt: 'This is red. Say "red." Hear the /d/ at the end!',
      listenPrompt: 'Listen to "blue." Bl-ue. Round lips for the /b/ sound.',
      repeatPrompt: 'Say "red" with me!',
      repeatHelper: 'Point to something red while you say it.',
      fillBlank: {
        prompt: 'The sky is ___.',
        choices: [
          { id: 'c1', label: 'blue', isCorrect: true },
          { id: 'c2', label: 'red', isCorrect: false },
          { id: 'c3', label: 'yellow', isCorrect: false },
        ],
      },
      feedbackPrompt: 'Great color hunting! Red, blue, and yellow — you said them in English!',
      celebratePrompt: 'Color explorer star! TeeBot sees your bright words!',
    }),
  },
  {
    lessonId: CAT_DOG_LESSON_ID,
    title: 'Cat and Dog',
    week: 7,
    day: 1,
    theme: 'Animal Friends',
    objective: 'Name animals cat, dog, and bird by sound and picture.',
    focusItems: ['cat', 'dog', 'bird'],
    vietnameseL1Target: 'final_consonants',
    practiceMethod: 'Hear the animal sound, see the picture, then say cat or dog.',
    reviewItems: ['ball', 'car'],
    rewardEvent: { type: 'animal_badge', badgeId: 'animal_namer', message: 'You named animals in English today.' },
    parentSummary: {
      objective: 'Animal nouns with clear final sounds.',
      practiced: ['cat', 'dog', 'bird'],
      vietnameseSupport: 'Keep the /t/ at the end of "cat" and the /g/ in "dog."',
      nextReview: 'Name pets or toys using cat, dog, bird.',
    },
    sourceCardIds: ['framework-004', 'book-011'],
    media: { videoSource: playgroundVideo, posterSource: playgroundPoster, loop: true },
    steps: createStandardLessonSteps({
      reviewPrompt: 'Do you remember "ball"? Point and say "ball."',
      focusPrompt: 'Animal friends day! A cat says meow. A dog says woof. A bird says tweet.',
      modelPrompt: 'This is a cat. Say "cat." Keep the /t/ sound at the end!',
      listenPrompt: 'Listen to "dog." D-o-g. Strong /g/ at the end.',
      repeatPrompt: 'Say "cat" for TeeBot!',
      repeatHelper: 'Soft meow optional — but say "cat" clearly!',
      fillBlank: {
        prompt: 'I see a ___ on the playground.',
        choices: [
          { id: 'c1', label: 'cat', isCorrect: true },
          { id: 'c2', label: 'car', isCorrect: false },
          { id: 'c3', label: 'ball', isCorrect: false },
        ],
      },
      feedbackPrompt: 'Wonderful animal words! Cat, dog, bird — you said them all!',
      celebratePrompt: 'Animal friend star! The playground animals are proud of you!',
    }),
  },
];

const definitionById = new Map(CURATED_DEFINITIONS.map((definition) => [definition.lessonId, definition]));

export const CURATED_LESSON_IDS = CURATED_DEFINITIONS.map((definition) => definition.lessonId);

export function getCuratedLessonCatalog(ageBand: LessonAgeBand = '4-6'): LessonSession[] {
  return CURATED_DEFINITIONS.map((definition) => buildCuratedLesson(definition, ageBand));
}

export function getCuratedLessonById(lessonId: string, ageBand: LessonAgeBand = '4-6'): LessonSession | undefined {
  const definition = definitionById.get(lessonId);
  return definition ? buildCuratedLesson(definition, ageBand) : undefined;
}

export function getBarnSayItLesson(ageBand: LessonAgeBand = '4-6'): LessonSession {
  return getCuratedLessonById(BARN_SAY_IT_LESSON_ID, ageBand)!;
}