export const fonts = {
  kid: 'Nunito',
  display: 'Nunito',
  body: 'Nunito',
} as const;

export const fontSizes = {
  hero: 44,
  title: 32,
  body: 22,
  sm: 14,
  cap: 18,
  xs: 12,
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
};

export const lineHeights = {
  h1: 40,
  h2: 32,
  h3: 28,
  body1: 24,
  body2: 20,
  caption: 16,
  button: 24,
} as const;

export const typography = { fonts, fontSizes, fontWeights, lineHeights } as const;

export type TypographyVariant = keyof typeof fontSizes;

export default typography;
