import { create } from 'zustand';

export const useCourseStore = create((set) => ({
  currentCourseId: null,
  currentLevel: null,
  currentUnit: null,
  lessonProgress: {},
  setCourse: (id) => set({ currentCourseId: id }),
  setLevel: (lvl) => set({ currentLevel: lvl }),
  setUnit: (u) => set({ currentUnit: u }),
  recordProgress: (lessonId, status) =>
    set((s) => ({ lessonProgress: { ...s.lessonProgress, [lessonId]: status } })),
  reset: () => set({ currentCourseId: null, currentLevel: null, currentUnit: null }),
}));
