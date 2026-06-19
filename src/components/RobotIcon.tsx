import React from 'react';
import { Image, type ImageProps, type ImageStyle, type StyleProp } from 'react-native';
import { referenceImages } from '@/design-system/referenceTheme';

/**
 * RobotIcon — the single source of truth for the TeeBot robot picture.
 *
 * Every robot avatar/icon in the app renders through this component, which is
 * backed by one asset: `referenceImages.robotHead` (src/assets/design-reference/
 * robot-head.png). To change the robot everywhere, swap that PNG (or the require
 * in referenceTheme.ts) — nothing else needs to change.
 */
export type RobotIconProps = Omit<ImageProps, 'source' | 'style'> & {
  /** Convenience square sizing; ignored if width/height are set via `style`. */
  size?: number;
  /** Render as a circle (borderRadius = size / 2). */
  rounded?: boolean;
  style?: StyleProp<ImageStyle>;
};

export function RobotIcon({
  size,
  rounded = false,
  style,
  resizeMode = 'contain',
  accessibilityIgnoresInvertColors = true,
  ...rest
}: RobotIconProps): React.JSX.Element {
  return (
    <Image
      source={referenceImages.robotHead}
      resizeMode={resizeMode}
      accessibilityIgnoresInvertColors={accessibilityIgnoresInvertColors}
      style={[
        size != null ? { width: size, height: size } : null,
        rounded && size != null ? { borderRadius: size / 2 } : null,
        style,
      ]}
      {...rest}
    />
  );
}

export default RobotIcon;
