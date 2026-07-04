import React from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import { mascot } from '@/assets/mascot';

/**
 * RobotImage — the single way to render Tee the mascot anywhere in the app.
 *
 *   variant="body"  → full-body hero / character (home hero, onboarding,
 *                     lesson companion, celebration, pairing success, My Robot)
 *   variant="head"  → small avatar / chat bubble / speaker chip
 *   variant="icon"  → rounded badge avatar (profile rows, tiny spots)
 *
 * To restyle Tee everywhere, swap the PNGs in src/assets/mascot/ — see
 * src/assets/mascot/index.ts. This component never hardcodes a source.
 */
export type RobotVariant = 'head' | 'body' | 'icon';
export type RobotResizeMode = 'contain' | 'cover';

interface RobotImageProps {
  variant?: RobotVariant;
  /** Square box size in px. For non-square fits, pass width/height via `style`. */
  size?: number;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
  /** Override the per-variant default fit. */
  resizeMode?: RobotResizeMode;
}

const SOURCES = {
  head: mascot.head,
  body: mascot.body,
  icon: mascot.icon,
} as const;

// `icon` is a pre-composed squircle (own bg + padding) → fill its box with cover.
// `head`/`body` are transparent cutouts → contain so cat ears never clip.
const DEFAULT_RESIZE: Record<RobotVariant, RobotResizeMode> = {
  icon: 'cover',
  head: 'contain',
  body: 'contain',
};

export function RobotImage({
  variant = 'body',
  size,
  style,
  accessibilityLabel = 'Tee the robot',
  resizeMode,
}: RobotImageProps): React.JSX.Element {
  const dimension = size != null ? { width: size, height: size } : undefined;
  return (
    <Image
      source={SOURCES[variant]}
      resizeMode={resizeMode ?? DEFAULT_RESIZE[variant]}
      style={[styles.base, dimension, style]}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  base: {},
});

export default RobotImage;
