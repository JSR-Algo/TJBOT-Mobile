import { create } from 'zustand';
import { deleteSecureItem, getSecureJson, setSecureJson } from '@/services/http/tokens';
import type { LessonAgeBand, LessonAttempt, LessonProgressSnapshot, LessonSession } from '../types';

const LESSON_DEMO_PROGRESS_KEY = 'tbot_lesson_demo_progress';

const initialProgress: LessonProgressSnapshot = {
  completedLessonIds: [],
  currentWeek: 1,
  currentDay: 1,
  streakCount: 0,
  masteredFocusItems: [],
  weakVietnameseL1Targets: [],
  attempts: [],
};

interface LessonDemoProgressStore {
  progress: LessonProgressSnapshot;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  completeLesson: (lesson: LessonSession, ageBand: LessonAgeBand) => Promise<void>;
  resetProgress: () => Promise<void>;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function getInitialLessonDemoProgress(): LessonProgressSnapshot {
  return {
    ...initialProgress,
    completedLessonIds: [...initialProgress.completedLessonIds],
    masteredFocusItems: [...initialProgress.masteredFocusItems],
    weakVietnameseL1Targets: [...initialProgress.weakVietnameseL1Targets],
    attempts: [...initialProgress.attempts],
  };
}

export function nextLessonPosition(week: number, day: number): Pick<LessonProgressSnapshot, 'currentWeek' | 'currentDay'> {
  if (day < 5) {
    return { currentWeek: week, currentDay: day + 1 };
  }
  return { currentWeek: Math.min(week + 1, 24), currentDay: week >= 24 ? 5 : 1 };
}

export function applyLessonCompletion(
  current: LessonProgressSnapshot,
  lesson: LessonSession,
  ageBand: LessonAgeBand,
  completedAt: string,
): LessonProgressSnapshot {
  const attempt: LessonAttempt = {
    lessonId: lesson.lessonId,
    completedAt,
    ageBand,
    practiced: lesson.focusItems,
    vietnameseL1Target: lesson.vietnameseL1Target,
  };
  const nextPosition = nextLessonPosition(lesson.week, lesson.day);

  return {
    completedLessonIds: uniqueValues([...current.completedLessonIds, lesson.lessonId]),
    currentWeek: nextPosition.currentWeek,
    currentDay: nextPosition.currentDay,
    streakCount: current.completedLessonIds.includes(lesson.lessonId)
      ? current.streakCount
      : current.streakCount + 1,
    masteredFocusItems: uniqueValues([...current.masteredFocusItems, ...lesson.focusItems]),
    weakVietnameseL1Targets: uniqueValues([lesson.vietnameseL1Target, ...current.weakVietnameseL1Targets]).slice(0, 5),
    lastCompletedAt: completedAt,
    attempts: [...current.attempts, attempt].slice(-40),
  };
}

export const useLessonDemoProgressStore = create<LessonDemoProgressStore>((set, get) => ({
  progress: getInitialLessonDemoProgress(),
  hydrated: false,
  hydrate: async () => {
    const saved = await getSecureJson<LessonProgressSnapshot>(LESSON_DEMO_PROGRESS_KEY);
    set({
      progress: saved ?? getInitialLessonDemoProgress(),
      hydrated: true,
    });
  },
  completeLesson: async (lesson, ageBand) => {
    const completedAt = new Date().toISOString();
    const progress = applyLessonCompletion(get().progress, lesson, ageBand, completedAt);
    set({ progress });
    await setSecureJson(LESSON_DEMO_PROGRESS_KEY, progress);
  },
  resetProgress: async () => {
    const progress = getInitialLessonDemoProgress();
    set({ progress, hydrated: true });
    await deleteSecureItem(LESSON_DEMO_PROGRESS_KEY);
  },
}));

export function resetLessonDemoProgress(): void {
  useLessonDemoProgressStore.setState({
    progress: getInitialLessonDemoProgress(),
    hydrated: true,
  });
}

export const lessonDemoProgressStorageKey = LESSON_DEMO_PROGRESS_KEY;
