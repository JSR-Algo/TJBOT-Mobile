export const shadows = {
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  pill: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  button: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
} as const;

// redesign-2026: Garden-Blue CHILD lane shadows — kit.css source of truth
export const gardenShadows = {
  card: {
    shadowColor: '#3A3937',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 4,
  },
  cta: {
    shadowColor: '#FF6F61',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 5,
  },
  nav: {
    shadowColor: '#3A3937',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// redesign-2026: Wispr-Flow PARENT lane shadows — kit.css source of truth
export const parentShadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
} as const;

export type ShadowKey = keyof typeof shadows;
export type GardenShadowKey = keyof typeof gardenShadows;
export type ParentShadowKey = keyof typeof parentShadows;

export default shadows;
