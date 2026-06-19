export const radii = {
  card: 28,
  button: 999,
  chip: 18,
} as const;

export type RadiusKey = keyof typeof radii;

export default radii;
