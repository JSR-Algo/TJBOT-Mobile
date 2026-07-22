export const colors = {
  cream: '#FBF4EA',
  cream2: '#FFF8EF',
  coral: '#FF6B6B',
  coralSoft: '#FFE5E5',
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
  dangerSoft: '#FFE5E5',
  line: '#EBDCC7',
  bot: {
    body: '#F8F5EF',
    body2: '#D9D1C8',
    shadow: '#B7AFA6',
    eye: '#3A3937',
    cheek: '#FFACA8',
  },
} as const;

// Sleek warm CHILD lane — cream canvas, white cards, coral CTA.
export const gardenColors = {
  bg: '#FAF5EB',
  bg2: '#F5ECDD',
  cream: '#FBF4EA',
  cream2: '#FFF8EF',
  paper: '#FFFFFF',
  ink: '#3A3937',
  inkSoft: '#6F6861',
  inkMuted: '#9A928A',
  coral: '#FF6B6B',
  coralSoft: '#FFE5E5',
  sky: '#3FB6C4',
  skySoft: '#DDF7F8',
  mint: '#3FB37A',
  mintSoft: '#DFF7EA',
  sun: '#F7C047',
  sunSoft: '#FCEFC9',
  plum: '#8B7BE8',
  line: '#EBDCC7',
  // status pill backgrounds and text colors
  okBg: '#DFF7EA',
  okFg: '#1B7A4F',
  warnBg: '#FCEFC9',
  warnFg: '#9A7D12',
  badBg: '#FFE5E5',
  badFg: '#C2410C',
} as const;

// redesign-2026: Sleek warm PARENT lane — DESIGN.md source of truth
export const parentColors = {
  bg: '#FAF5EB',
  card: '#FFFFFF',
  card2: '#FFF9F0',
  ink: '#1C1C1E',
  ink1: '#3A3A3C',
  ink2: '#8E8E93',
  line: '#EBDCC7',
  accent: '#FF6B6B',
  accentSoft: '#FFE5E5',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  blush: '#FFE5E5',
  cream: '#FFF4D6',
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
