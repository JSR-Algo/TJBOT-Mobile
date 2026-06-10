export { colors, default as colorsDefault } from './colors';
export { spacing, default as spacingDefault } from './spacing';
export { typography, fonts, fontSizes, fontWeights, default as typographyDefault } from './typography';
export { radii, default as radiiDefault } from './radii';
export { shadows, default as shadowsDefault } from './shadows';
export { motion, default as motionDefault } from './motion';

export type { Color } from './colors';
export type { SpacingKey } from './spacing';
export type { TypographyVariant } from './typography';
export type { RadiusKey } from './radii';
export type { ShadowKey } from './shadows';
export type { MotionKey } from './motion';

import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { radii } from './radii';
import { shadows } from './shadows';
import { motion } from './motion';

export const tokens = { colors, spacing, typography, radii, shadows, motion } as const;

export default tokens;
