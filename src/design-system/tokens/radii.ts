export const radii = {
  sm: 8,
  lg: 16,
  xl: 24,
  card: 28,
  button: 999,
  chip: 18,
} as const;

// redesign-2026: Garden-Blue CHILD lane component radii — kit.css source of truth
export const gardenRadii = {
  hero: 24,
  card: 18,
  cta: 16,
  chip: 999,
  streak: 18,
  navpill: 22,
  iconbtn: 999,
} as const;

// redesign-2026: Wispr-Flow PARENT lane component radii — kit.css source of truth
export const parentRadii = {
  hero: 24,
  card: 20,
  pill: 999,
  nav: 20,
  navItem: 13,
  chip: 12,
} as const;

export type RadiusKey = keyof typeof radii;
export type GardenRadiusKey = keyof typeof gardenRadii;
export type ParentRadiusKey = keyof typeof parentRadii;

export default radii;
