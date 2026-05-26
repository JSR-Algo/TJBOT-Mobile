import React, { memo } from 'react';
import { Pressable as RNPressable, PressableProps, Vibration } from 'react-native';

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
  const handlePress: PressableProps['onPress'] = (e) => {
    if (haptic) Vibration.vibrate(10);
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
