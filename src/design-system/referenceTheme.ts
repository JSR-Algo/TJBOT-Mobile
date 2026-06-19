import type { ImageSourcePropType, ViewStyle } from 'react-native';

export const referenceColors = {
  bg: '#FBF4EA',
  bgWarm: '#FFF8EF',
  card: '#FFFFFF',
  cardSoft: 'rgba(255,255,255,0.86)',
  ink: '#3A3937',
  inkSoft: '#6F6861',
  inkMuted: '#9A928A',
  primary: '#FF6B6F',
  primaryDeep: '#F95F64',
  primarySoft: '#FFE1DD',
  ctaInk: '#2B2140',
  coralShadow: 'rgba(255,107,111,0.28)',
  line: 'rgba(83,67,53,0.09)',
  secondary: '#62C8D2',
  secondarySoft: '#DDF7F8',
  lavender: '#CFC2FF',
  lavenderSoft: '#F1ECFF',
  gold: '#F7C756',
  goldSoft: '#FFF1C7',
  success: '#60C995',
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
  robotHead: require('../assets/design-reference/robot-head.png') as ImageSourcePropType,
  courseFarm: require('../assets/design-reference/course-farm.png') as ImageSourcePropType,
  courseCoders: require('../assets/design-reference/course-coders.png') as ImageSourcePropType,
  courseSpace: require('../assets/design-reference/course-space.png') as ImageSourcePropType,
  adventureMap: require('../assets/design-reference/adventure-map.png') as ImageSourcePropType,
  mapRobot: require('../assets/design-reference/map-robot.png') as ImageSourcePropType,
} as const;
