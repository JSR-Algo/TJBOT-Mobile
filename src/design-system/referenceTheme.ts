import type { ImageSourcePropType, ViewStyle } from 'react-native';

// Sleek warm child lane. Keys stay stable so ScreenShell consumers inherit the
// cream canvas, coral action color, and softly bordered white cards together.
export const referenceColors = {
  bg: '#FAF5EB',
  bgWarm: '#FFF9F0',
  card: '#FFFFFF',
  cardSoft: 'rgba(255,255,255,0.86)',
  ink: '#3A3937',
  inkSoft: '#6F6861',
  inkMuted: '#9A928A',
  primary: '#FF6B6B',
  primaryDeep: '#F45757',
  primarySoft: '#FFE5E5',
  ctaInk: '#FFFFFF',
  coralShadow: 'rgba(255,107,107,0.28)',
  line: '#EBDCC7',
  secondary: '#3FB6C4',
  secondarySoft: '#DDF7F8',
  lavender: '#8B7BE8',
  lavenderSoft: '#F1ECFF',
  gold: '#F7C047',
  goldSoft: '#FCEFC9',
  success: '#3FB37A',
  disabled: '#A79F97',
} as const;

export const referenceRadii = {
  chip: 999,
  card: 24,
  cardLarge: 34,
  nav: 30,
  tile: 22,
} as const;

export const referenceShadow = {
  card: {
    shadowColor: '#3A3937',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  button: {
    shadowColor: referenceColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 5,
  },
  nav: {
    shadowColor: '#3A3937',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
} as const satisfies Record<string, ViewStyle>;

export const referenceImages = {
  tjbotLogo: require('../assets/brand/tjbot-logo.png') as ImageSourcePropType,
  robotHead: require('../assets/mascot/tee-head.png') as ImageSourcePropType,
  robotBody: require('../assets/mascot/tee-body.png') as ImageSourcePropType,
  courseFarm: require('../assets/design-reference/course-farm.png') as ImageSourcePropType,
  courseCoders: require('../assets/design-reference/course-coders.png') as ImageSourcePropType,
  courseSpace: require('../assets/design-reference/course-space.png') as ImageSourcePropType,
  adventureMap: require('../assets/design-reference/adventure-map.png') as ImageSourcePropType,
  mapRobot: require('../assets/design-reference/map-robot.png') as ImageSourcePropType,
} as const;

/* =========================================================================
   Sleek warm shared lanes. Screens retain their semantic token names while
   inheriting one cream, charcoal, coral, and white-card visual language.
   ========================================================================= */

// ---- Sleek warm CHILD lane — Nunito, cream canvas, white cards, coral CTA.
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
  // status pill bg/fg (st-ok / st-warn / st-bad)
  okBg: '#DFF7EA',
  okFg: '#1B7A4F',
  warnBg: '#FCEFC9',
  warnFg: '#9A7D12',
  badBg: '#FFE5E5',
  badFg: '#C2410C',
} as const;

// Subtle cream backdrop stops (top → bottom), for LinearGradient.
export const gardenGradient = [gardenColors.bg, gardenColors.bg2] as const;

export const gardenShadow = {
  card: {
    shadowColor: '#3A3937',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 4,
  },
  cta: {
    shadowColor: gardenColors.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 5,
  },
  nav: {
    shadowColor: '#3A3937',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
} as const satisfies Record<string, ViewStyle>;

export const gardenRadii = {
  hero: 24,
  card: 18,
  cta: 16,
  chip: 999,
  streak: 18,
  navpill: 22,
  iconbtn: 999,
} as const;

// ---- Sleek warm PARENT lane — DESIGN.md §8, cream, charcoal, coral CTA.
// NOTE: Fraunces serif headings require font bundling
// (tracked in REDESIGN-PLAN.md, scheduled with the parent-area wave).
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
  // status pill bg/fg (p-ok / p-warn / p-bad)
  okBg: '#E6F9EC',
  okFg: '#1A7F3C',
  warnBg: '#FFF3E0',
  warnFg: '#B35900',
  badBg: '#FDECEC',
  badFg: '#B3261E',
} as const;

export const parentRadii = {
  hero: 24,
  card: 20,
  pill: 999,
  nav: 20,
  navItem: 13,
  chip: 12,
} as const;

export const parentShadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
} as const satisfies Record<string, ViewStyle>;

export type GardenColor = keyof typeof gardenColors;
export type ParentColor = keyof typeof parentColors;
