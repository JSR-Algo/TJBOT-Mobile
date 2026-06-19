import type { TextStyle } from 'react-native';
import { colors as palette } from './colors';
import { spacing as dsSpacing } from './spacing';
import { radii as dsRadii } from './radii';
import { shadows as dsShadows } from './shadows';

export const colors = {
  primary: palette.coral,
  primaryLight: palette.coralSoft,
  primaryDark: palette.ink,
  secondary: palette.sky,
  success: palette.mint,
  warning: palette.sun,
  error: palette.coral,
  background: palette.cream,
  surface: palette.paper,
  textPrimary: palette.ink,
  textSecondary: palette.inkSoft,
  textMuted: palette.inkMuted,
  border: palette.line,
  divider: palette.line,
} as const;

export const typography: Record<string, TextStyle> = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body1: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
};

export const spacing = {
  xs: dsSpacing.xs,
  sm: dsSpacing.sm,
  md: dsSpacing.md,
  lg: dsSpacing.lg,
  xl: dsSpacing.xl,
  xxl: dsSpacing.xxl,
} as const;

export const radius = {
  sm: 8,
  md: dsRadii.chip,
  lg: 16,
  xl: 24,
  full: dsRadii.button,
} as const;

export const shadows = {
  sm: dsShadows.button,
  md: dsShadows.card,
} as const;

const theme = { colors, typography, spacing, radius, shadows };
export default theme;
