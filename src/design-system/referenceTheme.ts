import type { ImageSourcePropType, ViewStyle } from 'react-native';

// redesign-2026: child lane reskinned to Garden-Blue (kit.css .lane-child).
// Screen background is now the sky base (#CFEFF4) — ScreenShell paints it as a
// sky gradient. Hero/warm cards stay cream via bgWarm. Coral/sky/mint/sun
// refined to the approved kit values. Keys unchanged → 36 ScreenShell screens
// adopt the new palette with no per-screen edits.
export const referenceColors = {
  bg: '#CFEFF4',
  bgWarm: '#FBF4EA',
  card: '#FFFFFF',
  cardSoft: 'rgba(255,255,255,0.86)',
  ink: '#3A3937',
  inkSoft: '#6F6861',
  inkMuted: '#9A928A',
  primary: '#FF6F61',
  primaryDeep: '#F95F50',
  primarySoft: '#FFE1DD',
  ctaInk: '#2B2140',
  coralShadow: 'rgba(255,111,97,0.28)',
  line: 'rgba(83,67,53,0.10)',
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
  courseFarm: require('../assets/design-reference/course-farm.png') as ImageSourcePropType,
  courseCoders: require('../assets/design-reference/course-coders.png') as ImageSourcePropType,
  courseSpace: require('../assets/design-reference/course-space.png') as ImageSourcePropType,
  adventureMap: require('../assets/design-reference/adventure-map.png') as ImageSourcePropType,
  mapRobot: require('../assets/design-reference/map-robot.png') as ImageSourcePropType,
} as const;

/* =========================================================================
   redesign-2026 — TWO LANES (kit.css), additive.
   Screens opt into these during their redesign wave; the legacy
   `referenceColors` above stays until each screen is migrated + previewed,
   so the app keeps building while waves land one feature area at a time.
   Source of truth: docs/design-references/redesign-2026/preview/kit.css
   ========================================================================= */

// ---- Garden-Blue CHILD lane (.lane-child) — Nunito, sky gradient, cream cards.
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
  // status pill bg/fg (st-ok / st-warn / st-bad)
  okBg: '#DFF7EA',
  okFg: '#1B7A4F',
  warnBg: '#FCEFC9',
  warnFg: '#9A7D12',
  badBg: '#FFE1DD',
  badFg: '#C2410C',
} as const;

// Gradient stops for the child backdrop (top → bottom), for LinearGradient.
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

// ---- Wispr-Flow PARENT lane (.lane-parent) — DESIGN.md §8, off-white, charcoal
// pill CTA, purple accent. NOTE: Fraunces serif headings require font bundling
// (tracked in REDESIGN-PLAN.md, scheduled with the parent-area wave).
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
