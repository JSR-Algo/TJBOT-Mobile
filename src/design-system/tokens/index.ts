export { colors, gardenColors, parentColors, default as colorsDefault } from './colors';
export { spacing, default as spacingDefault } from './spacing';
export { typography, fonts, fontSizes, fontWeights, default as typographyDefault } from './typography';
export { radii, gardenRadii, parentRadii, default as radiiDefault } from './radii';
export { shadows, gardenShadows, parentShadows, default as shadowsDefault } from './shadows';
export { motion, default as motionDefault } from './motion';

export type { Color, GardenColor, ParentColor } from './colors';
export type { SpacingKey } from './spacing';
export type { TypographyVariant } from './typography';
export type { RadiusKey, GardenRadiusKey, ParentRadiusKey } from './radii';
export type { ShadowKey, GardenShadowKey, ParentShadowKey } from './shadows';
export type { MotionKey } from './motion';

import { colors, gardenColors, parentColors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { radii, gardenRadii, parentRadii } from './radii';
import { shadows, gardenShadows, parentShadows } from './shadows';
import { motion } from './motion';

export const tokens = { colors, spacing, typography, radii, shadows, motion } as const;

// redesign-2026: north-star kit tokens organized by lane
export const northStarTokens = {
  garden: {
    colors: gardenColors,
    radii: gardenRadii,
    shadows: gardenShadows,
  },
  parent: {
    colors: parentColors,
    radii: parentRadii,
    shadows: parentShadows,
  },
} as const;

export default tokens;
