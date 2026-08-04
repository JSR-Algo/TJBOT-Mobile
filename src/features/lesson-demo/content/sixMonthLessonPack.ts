import weeks0104 from './fixtures/lesson_objectives_weeks_01_04.json';
import weeks0508 from './fixtures/lesson_objectives_weeks_05_08.json';
import weeks0912 from './fixtures/lesson_objectives_weeks_09_12.json';
import weeks1316 from './fixtures/lesson_objectives_weeks_13_16.json';
import weeks1720 from './fixtures/lesson_objectives_weeks_17_20.json';
import weeks2124 from './fixtures/lesson_objectives_weeks_21_24.json';
import type {
  LessonAgeBand,
  LessonRoadmapWeek,
  LessonSession,
  LessonStep,
} from '../types';
import { getCurrentAppLanguage, translateTemplate } from '@/services/i18n/i18n';

export const AGE_BANDS: LessonAgeBand[] = ['4-6', '7-9', '10-11'];

interface RawLessonFixture {
  lesson_id: string;
  week: number;
  day: number;
  age_band: string;
  cefr_level: string;
  learning_objective: string;
  focus_items: string[];
  vietnamese_l1_target: string;
  practice_method: string;
  review_items: string[];
  reward_event: {
    type: string;
    badge_id: string;
    message: string;
  };
  fallback_lesson?: {
    reason: string;
  };
  source_card_ids: string[];
}

const rawFixtures = [
  ...(weeks0104 as RawLessonFixture[]),
  ...(weeks0508 as RawLessonFixture[]),
  ...(weeks0912 as RawLessonFixture[]),
  ...(weeks1316 as RawLessonFixture[]),
  ...(weeks1720 as RawLessonFixture[]),
  ...(weeks2124 as RawLessonFixture[]),
];

const weekThemes: Record<number, string> = {
  1: 'Hello and classroom comfort',
  2: 'Feelings and state check',
  3: 'Family words',
  4: 'Numbers 1-5',
  5: 'Colors',
  6: 'Toys and favorite things',
  7: 'Animals 1',
  8: 'Animals 2 and actions',
  9: 'Food 1',
  10: 'Food 2 and likes',
  11: 'Body and health',
  12: 'Home and location',
  13: 'Review month 1 and confidence',
  14: 'School and objects',
  15: 'Daily routines',
  16: 'Weather',
  17: 'Clothes',
  18: 'Places',
  19: 'People and jobs',
  20: 'Nature',
  21: 'Review month 2 and pronunciation',
  22: 'Questions and answers',
  23: 'Story building',
  24: 'Six-month showcase',
};

const vietnameseSupport: Record<string, string> = {
  final_consonants: 'Listen for the tiny finish sound at the end of the word.',
  consonant_clusters: 'Say the first sound slowly, then blend the sounds together.',
  theta: 'Use a soft tongue-air sound for th. Keep it playful and short.',
  eth: 'Use a gentle voiced th sound; parent can model once.',
  sh: 'Round the lips for sh and keep the sound calm.',
  stress_rhythm: 'Clap the strong word so English rhythm feels natural.',
  articles: 'Use a or the before the object when the sentence needs it.',
  be: 'Keep am, is, or are in the English sentence.',
  tense_aspect: 'Use the English action word shape from the model sentence.',
  pronoun_omission: 'Say the small subject word, like I, you, he, or she.',
};

function visibleFocusItems(raw: RawLessonFixture, ageBand: LessonAgeBand): string[] {
  const maxByAge: Record<LessonAgeBand, number> = {
    '4-6': 1,
    '7-9': 3,
    '10-11': 5,
  };
  const candidates = Array.from(new Set([...raw.focus_items, ...raw.review_items]));
  return candidates.slice(0, maxByAge[ageBand]);
}

function firstFocus(raw: RawLessonFixture, ageBand: LessonAgeBand): string {
  return visibleFocusItems(raw, ageBand)[0] ?? raw.review_items[0] ?? 'hello';
}

function visibleReviewItems(raw: RawLessonFixture, ageBand: LessonAgeBand): string[] {
  const maxByAge: Record<LessonAgeBand, number> = {
    '4-6': 1,
    '7-9': 3,
    '10-11': 5,
  };
  return raw.review_items.slice(0, maxByAge[ageBand]);
}

function ageHelper(ageBand: LessonAgeBand, raw: RawLessonFixture): string {
  if (ageBand === '4-6') {
    return `Tap, listen, and copy one word: ${firstFocus(raw, ageBand)}.`;
  }
  if (ageBand === '7-9') {
    return `Use ${visibleFocusItems(raw, ageBand).join(', ')} in one short sentence.`;
  }
  return `Try a short answer, then notice the pattern: ${raw.practice_method}`;
}

function createSteps(raw: RawLessonFixture, ageBand: LessonAgeBand): LessonStep[] {
  const focus = firstFocus(raw, ageBand);
  const visibleFocus = visibleFocusItems(raw, ageBand);
  const support = vietnameseSupport[raw.vietnamese_l1_target] ?? 'Listen first, then answer in English.';
  const review = raw.review_items[0] ?? focus;
  const locale = getCurrentAppLanguage();

  return [
    {
      id: `${raw.lesson_id}-${ageBand}-warmup`,
      type: 'warmup',
      title: 'Warm up',
      prompt: translateTemplate(
        'Say hello to TeeBot. Review: {{value1}}.',
        { value1: review },
        { locale, persona: 'child' },
      ),
      helperText: 'A calm start helps the child feel ready.',
      robotState: 'listening',
    },
    {
      id: `${raw.lesson_id}-${ageBand}-teach`,
      type: 'teach',
      title: 'Learn',
      prompt: translateTemplate(
        'Today we practice: {{value1}}.',
        { value1: visibleFocus.join(', ') },
        { locale, persona: 'child' },
      ),
      helperText: ageHelper(ageBand, raw),
      robotState: 'modeling',
    },
    {
      id: `${raw.lesson_id}-${ageBand}-listen`,
      type: 'listen',
      title: 'Listen',
      prompt: translateTemplate(
        'Listen to "{{value1}}". Then say it with TeeBot.',
        { value1: focus },
        { locale, persona: 'child' },
      ),
      helperText: support,
      robotState: 'modeling',
    },
    {
      id: `${raw.lesson_id}-${ageBand}-repeat`,
      type: 'repeat',
      title: 'Try it',
      prompt: translateTemplate(
        'Say "{{value1}}" one more time with a clear voice.',
        { value1: focus },
        { locale, persona: 'child' },
      ),
      helperText: support,
      robotState: 'listening',
    },
    {
      id: `${raw.lesson_id}-${ageBand}-choice`,
      type: 'choice',
      title: 'Choose',
      prompt: translateTemplate(
        'Which answer uses {{value1}}?',
        { value1: focus },
        { locale, persona: 'child' },
      ),
      helperText: 'Choose one, then say it out loud.',
      robotState: 'thinking',
      choices: [
        { id: 'choice-a', label: focus, isPreferred: true },
        { id: 'choice-b', label: review === focus ? 'try again' : review },
      ],
    },
    {
      id: `${raw.lesson_id}-${ageBand}-review`,
      type: 'review',
      title: 'Try once more',
      prompt: raw.practice_method,
      helperText: support,
      robotState: 'listening',
    },
    {
      id: `${raw.lesson_id}-${ageBand}-reward`,
      type: 'reward',
      title: 'Great effort',
      prompt: raw.reward_event.message,
      helperText: 'Parent can review what comes back next.',
      robotState: 'celebrating',
    },
  ];
}

function createParentSummary(raw: RawLessonFixture, ageBand: LessonAgeBand) {
  const practiced = visibleFocusItems(raw, ageBand);
  const support = vietnameseSupport[raw.vietnamese_l1_target] ?? 'Short English answer first, Vietnamese hint only if needed.';
  const nextReviewByAge: Record<LessonAgeBand, string> = {
    '4-6': 'Next review: listen, point, and say one word again.',
    '7-9': 'Next review: use the focus words in a sentence frame.',
    '10-11': 'Next review: short role-play with one parent grammar note.',
  };

  return {
    objective: raw.learning_objective,
    practiced,
    vietnameseSupport: support,
    nextReview: nextReviewByAge[ageBand],
  };
}

function adaptFixture(raw: RawLessonFixture, ageBand: LessonAgeBand): LessonSession {
  return {
    lessonId: raw.lesson_id,
    week: raw.week,
    day: raw.day,
    month: Math.ceil(raw.week / 4),
    theme: weekThemes[raw.week] ?? `Week ${raw.week}`,
    ageBand,
    cefrLevel: raw.cefr_level,
    objective: raw.learning_objective,
    focusItems: visibleFocusItems(raw, ageBand),
    vietnameseL1Target: raw.vietnamese_l1_target,
    practiceMethod: raw.practice_method,
    reviewItems: visibleReviewItems(raw, ageBand),
    rewardEvent: {
      type: raw.reward_event.type,
      badgeId: raw.reward_event.badge_id,
      message: raw.reward_event.message,
    },
    parentSummary: createParentSummary(raw, ageBand),
    steps: createSteps(raw, ageBand),
    sourceCardIds: raw.source_card_ids,
    fallbackLessonId: raw.fallback_lesson?.reason,
  };
}

export function getDemoLessons(ageBand: LessonAgeBand = '7-9'): LessonSession[] {
  return rawFixtures.map((fixture) => adaptFixture(fixture, ageBand));
}

export function getDemoLessonById(lessonId: string, ageBand: LessonAgeBand = '7-9'): LessonSession | undefined {
  const raw = rawFixtures.find((fixture) => fixture.lesson_id === lessonId);
  return raw ? adaptFixture(raw, ageBand) : undefined;
}

export function getDemoLessonByWeekDay(
  week: number,
  day: number,
  ageBand: LessonAgeBand = '7-9',
): LessonSession | undefined {
  const raw = rawFixtures.find((fixture) => fixture.week === week && fixture.day === day);
  return raw ? adaptFixture(raw, ageBand) : undefined;
}

export function getDemoRoadmap(
  ageBand: LessonAgeBand = '7-9',
  completedLessonIds: string[] = [],
): LessonRoadmapWeek[] {
  const completed = new Set(completedLessonIds);
  return Array.from({ length: 24 }, (_, index) => {
    const week = index + 1;
    const lessons = getDemoLessons(ageBand).filter((lesson) => lesson.week === week);
    return {
      week,
      month: Math.ceil(week / 4),
      theme: weekThemes[week] ?? `Week ${week}`,
      lessons,
      completedCount: lessons.filter((lesson) => completed.has(lesson.lessonId)).length,
    };
  });
}

export function getShowcaseDemoLessons(ageBand: LessonAgeBand = '7-9'): LessonSession[] {
  return [
    [1, 1],
    [4, 5],
    [13, 5],
    [21, 5],
    [24, 5],
  ].flatMap(([week, day]) => {
    const lesson = getDemoLessonByWeekDay(week, day, ageBand);
    return lesson ? [lesson] : [];
  });
}

export function childVisibleTextForLesson(lesson: LessonSession): string[] {
  return lesson.steps.flatMap((step) => [
    step.title,
    step.prompt,
    step.helperText ?? '',
    ...(step.choices?.map((choice) => choice.label) ?? []),
  ]);
}

export function containsUnsafeChildVisibleText(lesson: LessonSession): boolean {
  return childVisibleTextForLesson(lesson).some((text) => {
    const normalized = text.toLowerCase();
    return (
      normalized.includes('http://') ||
      normalized.includes('https://') ||
      normalized.includes('source-card') ||
      normalized.includes('source_card') ||
      normalized.includes('provider') ||
      normalized.includes('anthropic') ||
      normalized.includes('azure') ||
      normalized.includes('openai') ||
      normalized.includes('memori') ||
      normalized.includes('/v1/') ||
      normalized.includes('session_id') ||
      normalized.includes('child_id')
    );
  });
}

export const sixMonthLessonPack: LessonSession[] = getDemoLessons('7-9');

export function getLessonsForAgeBand(ageBand: LessonAgeBand): LessonSession[] {
  return getDemoLessons(ageBand);
}

export function getLessonByWeekDay(week: number, day: number): LessonSession | undefined {
  return getDemoLessonByWeekDay(week, day, '7-9');
}

export function getLessonById(lessonId: string): LessonSession | undefined {
  return getDemoLessonById(lessonId, '7-9');
}

export function adaptLessonForAgeBand(lesson: LessonSession, ageBand: LessonAgeBand): LessonSession {
  return getDemoLessonById(lesson.lessonId, ageBand) ?? lesson;
}
