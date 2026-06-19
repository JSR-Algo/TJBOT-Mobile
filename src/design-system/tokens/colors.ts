export const colors = {
  cream: '#FBF4EA',
  cream2: '#FFF8EF',
  coral: '#FF6B6F',
  coralSoft: '#FFE1DD',
  sky: '#62C8D2',
  skySoft: '#DDF7F8',
  mint: '#60C995',
  mintSoft: '#DFF7EA',
  sun: '#F7C756',
  plum: '#CFC2FF',
  lavenderSoft: '#F1ECFF',
  ink: '#3A3937',
  inkSoft: '#6F6861',
  inkMuted: '#9A928A',
  paper: '#FFFFFF',
  paper2: '#FFF8EF',
  dangerSoft: '#FFE1DD',
  line: 'rgba(83,67,53,0.09)',
  bot: {
    body: '#F8F5EF',
    body2: '#D9D1C8',
    shadow: '#B7AFA6',
    eye: '#3A3937',
    cheek: '#FFACA8',
  },
} as const;

export type Color = keyof typeof colors;

export default colors;
