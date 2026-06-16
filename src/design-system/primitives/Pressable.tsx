import React, { memo } from 'react';
import { Pressable as RNPressable, PressableProps, Platform } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

import { useReduceMotion } from '@/design-system/animations/useReduceMotion';

export interface StyledPressableProps extends PressableProps {
  haptic?: boolean;
}

export const Pressable = memo(function Pressable({
  haptic = true,
  onPress,
  children,
  accessibilityRole,
  accessibilityState,
  disabled,
  ...rest
}: StyledPressableProps) {
  const reduceMotion = useReduceMotion();

  const handlePress: PressableProps['onPress'] = (e) => {
    if (haptic && Platform.OS !== 'web' && !reduceMotion) {
      impactAsync(ImpactFeedbackStyle.Light).catch(() => {
        // Swallow haptic errors so they cannot break the press action.
      });
    }
    onPress?.(e);
  };
  const resolvedAccessibilityState =
    disabled == null ? accessibilityState : { ...accessibilityState, disabled };
  return (
    <RNPressable
      onPress={handlePress}
      accessibilityRole={accessibilityRole ?? (onPress ? 'button' : undefined)}
      accessibilityState={resolvedAccessibilityState}
      disabled={disabled}
      {...rest}
    >
      {children}
    </RNPressable>
  );
});

export default Pressable;
