import {
  buildLessonSessionContext,
  DEFAULT_LESSON_SESSION_CONTEXT,
  getLessonResumeCopy,
} from '@/features/lesson-session/sessionContext';

describe('lesson session context', () => {
  it('keeps a stable default lesson context', () => {
    expect(DEFAULT_LESSON_SESSION_CONTEXT).toMatchObject({
      courseTitle: 'English with Robot',
      lessonTitle: 'Animal Friends',
      mode: 'lesson',
      activityIndex: 0,
      activityTotal: 5,
      beatIndex: 0,
      lastPrompt: 'Say: "cat"',
      lastAcceptedProgress: 0,
      resumeReason: 'normal',
    });
  });

  it('merges route params without losing defaults', () => {
    expect(buildLessonSessionContext({
      lessonId: 'lesson-3',
      lessonTitle: 'How are you?',
      mode: 'review',
      beatIndex: 2,
    })).toMatchObject({
      lessonId: 'lesson-3',
      lessonTitle: 'How are you?',
      mode: 'review',
      beatIndex: 2,
      courseTitle: 'English with Robot',
      activityIndex: 0,
      activityTotal: 5,
      lastAcceptedProgress: 0,
      resumeReason: 'normal',
    });
  });

  it('does not let undefined route params erase required defaults', () => {
    expect(buildLessonSessionContext({
      courseTitle: undefined,
      lessonTitle: undefined,
      mode: undefined,
      activityIndex: undefined,
      activityTotal: undefined,
      beatIndex: undefined,
      lastPrompt: undefined,
      lastAcceptedProgress: undefined,
      resumeReason: undefined,
    })).toMatchObject({
      courseTitle: 'English with Robot',
      lessonTitle: 'Animal Friends',
      mode: 'lesson',
      activityIndex: 0,
      activityTotal: 5,
      beatIndex: 0,
      lastPrompt: 'Say: "cat"',
      lastAcceptedProgress: 0,
      resumeReason: 'normal',
    });
  });

  it('returns resume copy for recovery reasons and default lesson title', () => {
    expect(getLessonResumeCopy(buildLessonSessionContext({
      lessonTitle: 'Ocean Animals',
      resumeReason: 'reconnecting',
    }))).toBe('Ocean Animals is still here.');

    expect(getLessonResumeCopy(buildLessonSessionContext({
      lessonTitle: 'Ocean Animals',
      resumeReason: 'audio_error',
    }))).toBe('We saved your place in Ocean Animals.');

    expect(getLessonResumeCopy(buildLessonSessionContext({
      lessonTitle: 'Ocean Animals',
      resumeReason: 'parent_stopped',
    }))).toBe("We'll keep your place in Ocean Animals.");

    expect(getLessonResumeCopy(buildLessonSessionContext({
      lessonTitle: 'Ocean Animals',
      resumeReason: 'normal',
    }))).toBe('Ocean Animals');
  });
});
