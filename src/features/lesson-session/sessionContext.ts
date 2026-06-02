export type LessonSessionMode = 'lesson' | 'review' | 'mission';

export type LessonResumeReason =
  | 'normal'
  | 'reconnecting'
  | 'audio_error'
  | 'timed_out'
  | 'exit_confirm'
  | 'parent_stopped'
  | 'cost_capped'
  | 'abandoned_disconnect';

export type LessonSessionContext = {
  courseId?: string;
  courseTitle: string;
  unitId?: string;
  unitTitle?: string;
  lessonId?: string;
  lessonTitle: string;
  contentVersion?: string;
  mode: LessonSessionMode;
  activityIndex: number;
  activityTotal: number;
  beatIndex: number;
  lastPrompt: string;
  lastAcceptedProgress: number;
  voiceStateBeforeInterruption?: string;
  resumeReason: LessonResumeReason;
};

export const DEFAULT_LESSON_SESSION_CONTEXT: LessonSessionContext = {
  courseTitle: 'English with Robot',
  lessonTitle: 'Animal Friends',
  mode: 'lesson',
  activityIndex: 0,
  activityTotal: 5,
  beatIndex: 0,
  lastPrompt: 'Say: "cat"',
  lastAcceptedProgress: 0,
  resumeReason: 'normal',
};

export type LessonSessionRouteParams = Partial<LessonSessionContext>;

export function buildLessonSessionContext(params?: LessonSessionRouteParams): LessonSessionContext {
  return {
    courseId: params?.courseId,
    courseTitle: params?.courseTitle ?? DEFAULT_LESSON_SESSION_CONTEXT.courseTitle,
    unitId: params?.unitId,
    unitTitle: params?.unitTitle,
    lessonId: params?.lessonId,
    lessonTitle: params?.lessonTitle ?? DEFAULT_LESSON_SESSION_CONTEXT.lessonTitle,
    contentVersion: params?.contentVersion,
    mode: params?.mode ?? DEFAULT_LESSON_SESSION_CONTEXT.mode,
    activityIndex: params?.activityIndex ?? DEFAULT_LESSON_SESSION_CONTEXT.activityIndex,
    activityTotal: params?.activityTotal ?? DEFAULT_LESSON_SESSION_CONTEXT.activityTotal,
    beatIndex: params?.beatIndex ?? DEFAULT_LESSON_SESSION_CONTEXT.beatIndex,
    lastPrompt: params?.lastPrompt ?? DEFAULT_LESSON_SESSION_CONTEXT.lastPrompt,
    lastAcceptedProgress: params?.lastAcceptedProgress ?? DEFAULT_LESSON_SESSION_CONTEXT.lastAcceptedProgress,
    voiceStateBeforeInterruption: params?.voiceStateBeforeInterruption,
    resumeReason: params?.resumeReason ?? DEFAULT_LESSON_SESSION_CONTEXT.resumeReason,
  };
}

export function getLessonResumeCopy(context: LessonSessionContext): string {
  if (context.resumeReason === 'reconnecting') {
    return `${context.lessonTitle} is still here.`;
  }

  if (context.resumeReason === 'audio_error') {
    return `We saved your place in ${context.lessonTitle}.`;
  }

  if (context.resumeReason === 'parent_stopped') {
    return `We'll keep your place in ${context.lessonTitle}.`;
  }

  return context.lessonTitle;
}
