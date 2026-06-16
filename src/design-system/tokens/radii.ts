export const radii = {
  sm: 8,
  chip: 18,
  card: 28,
  lg: 16,
  xl: 24,
  button: 999,
} as const;

export type RadiusKey = keyof typeof radii;

export default radii;
