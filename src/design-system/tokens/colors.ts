export const colors = {
  cream: '#FBF4EA',
  cream2: '#FFF8EF',
  coral: '#FF6F61',
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

// redesign-2026: Garden-Blue CHILD lane (.lane-child) — kit.css source of truth
export const gardenColors = {
  bg: '#CFEFF4',
  bg2: '#BCE7F0',
  cream: '#FBF4EA',
  cream2: '#FFF8EF',
  paper: '#FFFFFF',
  ink: '#3A3937',
  inkSoft: '#6F6861',
  inkMuted: '#9A928A',
  coral: '#FF6F61',
  coralSoft: '#FFE1DD',
  sky: '#3FB6C4',
  skySoft: '#DDF7F8',
  mint: '#3FB37A',
  mintSoft: '#DFF7EA',
  sun: '#F7C047',
  sunSoft: '#FCEFC9',
  plum: '#8B7BE8',
  line: 'rgba(83,67,53,0.10)',
  // status pill backgrounds and text colors
  okBg: '#DFF7EA',
  okFg: '#1B7A4F',
  warnBg: '#FCEFC9',
  warnFg: '#9A7D12',
  badBg: '#FFE1DD',
  badFg: '#C2410C',
} as const;

// redesign-2026: Wispr-Flow PARENT lane (.lane-parent) — kit.css source of truth
export const parentColors = {
  bg: '#F5F5F0',
  card: '#FFFFFF',
  card2: '#F0F0F0',
  ink: '#1C1C1E',
  ink1: '#3A3A3C',
  ink2: '#8E8E93',
  line: 'rgba(28,28,30,0.08)',
  accent: '#6B4EFF',
  accentSoft: '#EAE6FF',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  blush: '#FCE8E6',
  cream: '#FFFBE6',
  // status pill backgrounds and text colors
  okBg: '#E6F9EC',
  okFg: '#1A7F3C',
  warnBg: '#FFF3E0',
  warnFg: '#B35900',
  badBg: '#FDECEC',
  badFg: '#B3261E',
} as const;

export type Color = keyof typeof colors;
export type GardenColor = keyof typeof gardenColors;
export type ParentColor = keyof typeof parentColors;

export default colors;
