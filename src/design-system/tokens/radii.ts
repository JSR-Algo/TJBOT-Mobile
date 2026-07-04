export const radii = {
  sm: 8,
  lg: 16,
  xl: 24,
  card: 28,
  button: 999,
  chip: 18,
} as const;

export type RadiusKey = keyof typeof radii;

export default radii;
