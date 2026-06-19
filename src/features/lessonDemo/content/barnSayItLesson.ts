import type { LessonAgeBand, LessonSession, LessonStep, RobotReadyState } from '../types';

export const BARN_SAY_IT_LESSON_ID = 'w01-d01-barn-say-it';

const barnVideo = require('../../../assets/lessons/barn-round-field.mp4');
const barnPoster = require('../../../assets/lessons/barn-round-field-poster.jpg');

type LegacyRobotState = 'talking' | 'modeling' | 'listening' | 'thinking' | 'celebrating';

function mapRobotState(state: LegacyRobotState): RobotReadyState {
  if (state === 'talking') return 'modeling';
  return state;
}

function mapLegacyStepType(
  type: string,
): LessonStep['type'] {
  if (type === 'greeting' || type === 'focus') return 'warmup';
  if (type === 'model') return 'teach';
  if (type === 'fillBlank') return 'choice';
  if (type === 'feedback') return 'review';
  if (type === 'celebrate') return 'reward';
  if (type === 'listen' || type === 'repeat' || type === 'review') return type;
  return 'teach';
}

interface LegacyChoice {
  id: string;
  label: string;
  isCorrect?: boolean;
}

interface LegacyStep {
  id: string;
  type: string;
  title: string;
  prompt: string;
  robotState: LegacyRobotState;
  helperText?: string;
  l1TransferHint?: string;
  choices?: LegacyChoice[];
}

const legacySteps: LegacyStep[] = [
  {
    id: 's1',
    type: 'greeting',
    title: 'Hello from TeeBot',
    prompt: 'Hey there! TeeBot is so happy to see you today. Are you ready to explore?',
    robotState: 'talking',
  },
  {
    id: 's2',
    type: 'review',
    title: 'Warm-Up',
    prompt: 'Do you remember how to say hello? Wave and say "Hello, TeeBot!"',
    robotState: 'talking',
    helperText: 'Big smile and a wave!',
  },
  {
    id: 's3',
    type: 'focus',
    title: 'New Words',
    prompt: 'Today we are visiting a barn! A barn is a big house for farm animals. We will also learn "farm" and "hay."',
    robotState: 'talking',
    helperText: 'Look at the picture and listen.',
  },
  {
    id: 's4',
    type: 'model',
    title: 'TeeBot Shows You',
    prompt: 'This is a barn. Watch my mouth: "barn." Make a strong /b/ sound and keep the /n/ at the end!',
    robotState: 'modeling',
    helperText: 'Look at the barn and make a strong /b/ sound.',
  },
  {
    id: 's5',
    type: 'listen',
    title: 'Listen Carefully',
    prompt: 'Listen to "barn" one more time. Hear the ending sound? b-a-r-n.',
    robotState: 'listening',
    helperText: 'Listen for the last sound.',
  },
  {
    id: 's6',
    type: 'repeat',
    title: 'Your Barn Word',
    prompt: 'Now you say it: "barn."',
    robotState: 'listening',
    helperText: 'Short and strong: barn. Say the ending sound clearly!',
    l1TransferHint:
      'In Vietnamese we say "chuồng," but in English we must say the whole word "barn" - do not drop the ending /n/ sound!',
  },
  {
    id: 's7',
    type: 'fillBlank',
    title: 'What do you see?',
    prompt: 'At the ___, I see animals.',
    robotState: 'thinking',
    choices: [
      { id: 'c1', label: 'barn', isCorrect: true },
      { id: 'c2', label: 'house', isCorrect: false },
      { id: 'c3', label: 'tree', isCorrect: false },
    ],
  },
  {
    id: 's8',
    type: 'feedback',
    title: 'Great Listening!',
    prompt:
      'Wonderful! Remember: in English, every word needs its ending sound. "Barn" has a strong /n/ at the end. You did it!',
    robotState: 'talking',
    helperText: 'Final consonants make English clear.',
  },
  {
    id: 's9',
    type: 'celebrate',
    title: 'Barn Star!',
    prompt: 'You found the barn with TeeBot! Look how your garden is growing!',
    robotState: 'celebrating',
  },
];

function adaptSteps(ageBand: LessonAgeBand): LessonStep[] {
  return legacySteps.map((step) => ({
    id: `${BARN_SAY_IT_LESSON_ID}-${step.id}-${ageBand}`,
    type: mapLegacyStepType(step.type),
    title: step.title,
    prompt: step.prompt,
    helperText: step.l1TransferHint ?? step.helperText,
    robotState: mapRobotState(step.robotState),
    choices: step.choices?.map((choice) => ({
      id: choice.id,
      label: choice.label,
      isPreferred: choice.isCorrect,
    })),
  }));
}

export function getBarnSayItLesson(ageBand: LessonAgeBand = '4-6'): LessonSession {
  return {
    lessonId: BARN_SAY_IT_LESSON_ID,
    week: 1,
    day: 1,
    month: 1,
    theme: 'Barn Farm Place Words',
    ageBand,
    cefrLevel: 'Pre-A1',
    objective: 'Practice place words (barn, farm, hay) and final consonants for Vietnamese learners.',
    focusItems: ['barn', 'farm', 'hay'],
    vietnameseL1Target: 'final_consonants',
    practiceMethod: 'Listen, model mouth shape, repeat, then choose the barn word.',
    reviewItems: ['hello'],
    rewardEvent: {
      type: 'lesson_badge',
      badgeId: 'barn_star',
      message: 'You found the barn with TeeBot!',
    },
    parentSummary: {
      objective: 'Place words and final consonant awareness.',
      practiced: ['barn', 'farm', 'hay'],
      vietnameseSupport:
        'Listen for the tiny finish sound at the end of the word — a common challenge for Vietnamese learners.',
      nextReview: 'Ask "What is this?" while looking at farm picture books.',
    },
    steps: adaptSteps(ageBand),
    sourceCardIds: ['oxford-phonics-world-sample'],
    media: {
      videoSource: barnVideo,
      posterSource: barnPoster,
      loop: true,
    },
  };
}