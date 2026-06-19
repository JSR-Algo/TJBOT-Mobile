import type { LessonAgeBand, LessonMedia, LessonSession, LessonStep, RobotReadyState } from '../types';

export type LegacyRobotState = 'talking' | 'modeling' | 'listening' | 'thinking' | 'celebrating';

export interface LegacyChoice {
  id: string;
  label: string;
  isCorrect?: boolean;
}

export interface LegacyStep {
  id: string;
  type: string;
  title: string;
  prompt: string;
  robotState: LegacyRobotState;
  helperText?: string;
  l1TransferHint?: string;
  choices?: LegacyChoice[];
}

export interface CuratedLessonDefinition {
  lessonId: string;
  title: string;
  week: number;
  day: number;
  theme: string;
  objective: string;
  focusItems: string[];
  vietnameseL1Target: string;
  practiceMethod: string;
  reviewItems: string[];
  rewardEvent: {
    type: string;
    badgeId: string;
    message: string;
  };
  parentSummary: {
    objective: string;
    practiced: string[];
    vietnameseSupport: string;
    nextReview: string;
  };
  sourceCardIds: string[];
  steps: LegacyStep[];
  media: LessonMedia;
}

function mapRobotState(state: LegacyRobotState): RobotReadyState {
  if (state === 'talking') return 'modeling';
  return state;
}

function mapLegacyStepType(type: string): LessonStep['type'] {
  if (type === 'greeting' || type === 'focus') return 'warmup';
  if (type === 'model') return 'teach';
  if (type === 'fillBlank') return 'choice';
  if (type === 'feedback') return 'review';
  if (type === 'celebrate') return 'reward';
  if (type === 'listen' || type === 'repeat' || type === 'review') return type;
  return 'teach';
}

function adaptSteps(lessonId: string, steps: LegacyStep[], ageBand: LessonAgeBand): LessonStep[] {
  return steps.map((step) => ({
    id: `${lessonId}-${step.id}-${ageBand}`,
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

export function buildCuratedLesson(definition: CuratedLessonDefinition, ageBand: LessonAgeBand = '4-6'): LessonSession {
  return {
    lessonId: definition.lessonId,
    title: definition.title,
    week: definition.week,
    day: definition.day,
    month: Math.ceil(definition.week / 4),
    theme: definition.theme,
    ageBand,
    cefrLevel: 'Pre-A1',
    objective: definition.objective,
    focusItems: definition.focusItems,
    vietnameseL1Target: definition.vietnameseL1Target,
    practiceMethod: definition.practiceMethod,
    reviewItems: definition.reviewItems,
    rewardEvent: {
      type: definition.rewardEvent.type,
      badgeId: definition.rewardEvent.badgeId,
      message: definition.rewardEvent.message,
    },
    parentSummary: definition.parentSummary,
    steps: adaptSteps(definition.lessonId, definition.steps, ageBand),
    sourceCardIds: definition.sourceCardIds,
    media: definition.media,
  };
}

export function createStandardLessonSteps(config: {
  greeting?: string;
  reviewPrompt: string;
  focusPrompt: string;
  modelPrompt: string;
  listenPrompt: string;
  repeatPrompt: string;
  fillBlank: { prompt: string; choices: LegacyChoice[] };
  feedbackPrompt: string;
  celebratePrompt: string;
  repeatHelper?: string;
  feedbackHelper?: string;
}): LegacyStep[] {
  return [
    {
      id: 's1',
      type: 'greeting',
      title: 'Hello from TeeBot',
      prompt: config.greeting ?? 'Hey there! TeeBot is so happy to see you today. Are you ready to explore?',
      robotState: 'talking',
    },
    {
      id: 's2',
      type: 'review',
      title: 'Warm-Up',
      prompt: config.reviewPrompt,
      robotState: 'talking',
      helperText: 'Big smile and a wave!',
    },
    {
      id: 's3',
      type: 'focus',
      title: 'New Words',
      prompt: config.focusPrompt,
      robotState: 'talking',
      helperText: 'Look at the picture and listen.',
    },
    {
      id: 's4',
      type: 'model',
      title: 'TeeBot Shows You',
      prompt: config.modelPrompt,
      robotState: 'modeling',
      helperText: 'Watch TeeBot and copy the sound.',
    },
    {
      id: 's5',
      type: 'listen',
      title: 'Listen Carefully',
      prompt: config.listenPrompt,
      robotState: 'listening',
      helperText: 'Listen for every sound in the word.',
    },
    {
      id: 's6',
      type: 'repeat',
      title: 'Your Turn',
      prompt: config.repeatPrompt,
      robotState: 'listening',
      helperText: config.repeatHelper ?? 'Say it short and strong!',
    },
    {
      id: 's7',
      type: 'fillBlank',
      title: 'What do you see?',
      prompt: config.fillBlank.prompt,
      robotState: 'thinking',
      choices: config.fillBlank.choices,
    },
    {
      id: 's8',
      type: 'feedback',
      title: 'Great Listening!',
      prompt: config.feedbackPrompt,
      robotState: 'talking',
      helperText: config.feedbackHelper,
    },
    {
      id: 's9',
      type: 'celebrate',
      title: 'Lesson Star!',
      prompt: config.celebratePrompt,
      robotState: 'celebrating',
    },
  ];
}