import {
  normalizeCourseCatalogPayload,
  normalizeCourseDetailPayload,
  normalizeLessonListPayload,
} from '../../src/services/api/course.api';
import {
  EMPTY_PROGRESS_SUMMARY,
  getProgressSummary,
  normalizeProgressSummaryPayload,
} from '../../src/services/api/progress.api';

describe('course/progress API payload normalization', () => {
  it('normalizes course catalog envelopes and missing fields', () => {
    const payload: unknown = {
      data: {
        courses: [
          {
            course_id: 'course-a',
            title: 'Hello Friends',
            language: 'en',
            level_count: 2,
            locked: false,
            lessons: 24,
            progress: 0.4,
          },
          {
            id: 'course-b',
            name: 'Story Time',
            locked: true,
          },
        ],
      },
    };

    expect(normalizeCourseCatalogPayload(payload)).toEqual([
      {
        id: 'course-a',
        title: 'Hello Friends',
        language: 'en',
        levelCount: 2,
        lessonCount: 24,
        locked: false,
        progress: 0.4,
      },
      {
        id: 'course-b',
        title: 'Story Time',
        language: 'en',
        levelCount: 0,
        lessonCount: 0,
        locked: true,
        progress: 0,
      },
    ]);
  });

  it('normalizes lesson lists from lesson_list payloads', () => {
    const payload: unknown = {
      lesson_list: [
        {
          lesson_id: 'lesson-1',
          unit_id: 'unit-1',
          name: 'Hello',
          duration_minutes: 5,
          words_count: 4,
          status: 'done',
          stars: 3,
        },
        {
          id: 'lesson-2',
          title: 'Goodbye',
          locked: true,
        },
      ],
    };

    expect(normalizeLessonListPayload(payload)).toEqual([
      {
        id: 'lesson-1',
        unitId: 'unit-1',
        title: 'Hello',
        durationMinutes: 5,
        wordsCount: 4,
        state: 'done',
        stars: 3,
      },
      {
        id: 'lesson-2',
        unitId: '',
        title: 'Goodbye',
        durationMinutes: 0,
        wordsCount: 0,
        state: 'locked',
        stars: 0,
      },
    ]);
  });

  it('normalizes course detail envelopes', () => {
    const payload: unknown = {
      data: {
        course: {
          course_id: 'course-a',
          name: 'Hello Friends',
          description: 'Warm daily play',
          level_count: 2,
          lesson_count: 24,
          preview_url: 'https://cdn.example/preview.mp3',
          owned: true,
        },
      },
    };

    expect(normalizeCourseDetailPayload(payload)).toEqual({
      courseId: 'course-a',
      title: 'Hello Friends',
      description: 'Warm daily play',
      levelCount: 2,
      lessonCount: 24,
      previewUrl: 'https://cdn.example/preview.mp3',
      owned: true,
      locked: false,
    });
  });

  it('normalizes progress summary with partial or missing data', () => {
    const payload: unknown = {
      data: {
        minutes_done: 12,
        words: ['hello'],
      },
    };

    expect(normalizeProgressSummaryPayload(payload)).toEqual({
      minutesDone: 12,
      minutesGoal: 0,
      lessonsCompleted: 0,
      speakingTurns: 0,
      starsToday: 0,
      streakDays: 0,
      words: ['hello'],
      reviewDueCount: 0,
      weeklyBars: [0, 0, 0, 0, 0, 0, 0],
    });

    expect(normalizeProgressSummaryPayload(undefined)).toEqual({
      minutesDone: 0,
      minutesGoal: 0,
      lessonsCompleted: 0,
      speakingTurns: 0,
      starsToday: 0,
      streakDays: 0,
      words: [],
      reviewDueCount: 0,
      weeklyBars: [0, 0, 0, 0, 0, 0, 0],
    });
  });

  it('returns empty progress while the progress summary backend is not designed', async () => {
    await expect(getProgressSummary()).resolves.toEqual(EMPTY_PROGRESS_SUMMARY);
  });
});
