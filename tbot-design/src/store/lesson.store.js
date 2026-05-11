import { create } from 'zustand';

export const useLessonStore = create((set) => ({
  sessionId: null,
  activityIndex: 0,
  lastTurnState: 'idle',
  start: (sessionId) => set({ sessionId, activityIndex: 0, lastTurnState: 'idle' }),
  nextActivity: () => set((s) => ({ activityIndex: s.activityIndex + 1 })),
  setTurnState: (state) => set({ lastTurnState: state }),
  end: () => set({ sessionId: null, activityIndex: 0, lastTurnState: 'idle' }),
}));
