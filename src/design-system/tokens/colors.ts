export const colors = {
  cream: '#FFF5E6',
  cream2: '#FFEAC9',
  coral: '#FF6F61',
  coralSoft: '#FFB3A8',
  sky: '#6FC1FF',
  skySoft: '#BFE2FF',
  mint: '#6CE2B6',
  mintSoft: '#C5F1DD',
  sun: '#FFC857',
  plum: '#6B4A9B',
  ink: '#2B2140',
  inkSoft: '#5C4F77',
  paper: '#FFFCF6',
  paper2: '#FFF1DA',
  dangerSoft: '#FFD2B8',
  tjtjbot: {
    body: '#E8F4FF',
    body2: '#C5E0FA',
    shadow: '#8FB6E0',
    eye: '#2B2140',
    cheek: '#FFB6A8',
  },
} as const;

export type Color = keyof typeof colors;

export default colors;
