export const fonts = {
  kid: 'Nunito',
  display: 'Nunito',
  body: 'Nunito',
} as const;

export const fontSizes = {
  hero: 44,
  title: 32,
  body: 22,
  cap: 18,
} as const;

export const fontWeights = {
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
};

export const typography = { fonts, fontSizes, fontWeights } as const;

export type TypographyVariant = keyof typeof fontSizes;

export default typography;
