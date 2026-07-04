import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { RobotImage, type RobotVariant } from '@/components/RobotImage';
import { gardenColors } from '@/design-system/referenceTheme';

/**
 * Avatar — Tee in a small circular/squircle badge (nav, profile rows, chat).
 *
 * Defaults to the `icon` asset: a pre-composed squircle with its own soft-blue
 * backdrop and padding, so the cat ears are never clipped and the white head
 * never disappears against a white circle (the bug behind the cut-off avatars).
 *
 * Use `variant="head"` only for larger spots where the bare head reads well; it
 * renders `contain` on the tinted background so ears stay fully visible.
 */
interface AvatarProps {
  size?: number;
  variant?: Extract<RobotVariant, 'icon' | 'head'>;
  shape?: 'circle' | 'squircle';
  /** Tint behind the mascot — guarantees contrast for the white head. */
  background?: string;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Avatar({
  size = 40,
  variant = 'icon',
  shape = 'circle',
  background = gardenColors.skySoft,
  bordered = true,
  style,
  accessibilityLabel = 'Tee the robot',
}: AvatarProps): React.JSX.Element {
  const borderRadius = shape === 'circle' ? size / 2 : size * 0.28;
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: background,
          borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      <RobotImage
        variant={variant}
        accessibilityLabel={accessibilityLabel}
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: gardenColors.line,
  },
});

export default Avatar;
