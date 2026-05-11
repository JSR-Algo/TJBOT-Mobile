import { create } from 'zustand';

export const useCartStore = create((set) => ({
  items: [],
  pendingCourseId: null,
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
  setPendingCourse: (id) => set({ pendingCourseId: id }),
  clear: () => set({ items: [], pendingCourseId: null }),
}));
