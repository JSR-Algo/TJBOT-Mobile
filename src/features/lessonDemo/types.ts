export type LessonAgeBand = '4-6' | '7-9' | '10-11';

export type LessonStepType =
  | 'warmup'
  | 'teach'
  | 'listen'
  | 'repeat'
  | 'choice'
  | 'review'
  | 'reward';

export type RobotReadyState = 'idle' | 'listening' | 'modeling' | 'thinking' | 'celebrating';

export interface LessonMedia {
  videoSource: number;
  posterSource?: number;
  loop?: boolean;
}

export interface LessonChoice {
  id: string;
  label: string;
  isPreferred?: boolean;
}

export interface LessonStep {
  id: string;
  type: LessonStepType;
  title: string;
  prompt: string;
  helperText?: string;
  robotState: RobotReadyState;
  choices?: LessonChoice[];
}

export interface LessonRewardEvent {
  type: string;
  badgeId: string;
  message: string;
}

export interface ParentLessonSummary {
  objective: string;
  practiced: string[];
  vietnameseSupport: string;
  nextReview: string;
}

export interface LessonSession {
  lessonId: string;
  week: number;
  day: number;
  month: number;
  theme: string;
  ageBand: LessonAgeBand;
  cefrLevel: string;
  objective: string;
  focusItems: string[];
  vietnameseL1Target: string;
  practiceMethod: string;
  reviewItems: string[];
  rewardEvent: LessonRewardEvent;
  parentSummary: ParentLessonSummary;
  steps: LessonStep[];
  sourceCardIds: string[];
  fallbackLessonId?: string;
  media?: LessonMedia;
}

export interface LessonAttempt {
  lessonId: string;
  completedAt: string;
  ageBand: LessonAgeBand;
  practiced: string[];
  vietnameseL1Target: string;
}

export interface LessonProgressSnapshot {
  completedLessonIds: string[];
  currentWeek: number;
  currentDay: number;
  streakCount: number;
  masteredFocusItems: string[];
  weakVietnameseL1Targets: string[];
  lastCompletedAt?: string;
  attempts: LessonAttempt[];
}

export interface LessonRoadmapWeek {
  week: number;
  month: number;
  theme: string;
  lessons: LessonSession[];
  completedCount: number;
}

export interface LessonContentProvider {
  getTodaySession(ageBand: LessonAgeBand): LessonSession;
  getLessonById(lessonId: string, ageBand?: LessonAgeBand): LessonSession | undefined;
  getLessonByWeekDay(week: number, day: number, ageBand: LessonAgeBand): LessonSession | undefined;
  getRoadmap(ageBand: LessonAgeBand, completedLessonIds?: string[]): LessonRoadmapWeek[];
  getShowcaseLessons(ageBand: LessonAgeBand): LessonSession[];
}

export const LESSON_AGE_BANDS: LessonAgeBand[] = ['4-6', '7-9', '10-11'];
