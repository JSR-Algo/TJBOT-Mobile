import React, { memo } from 'react';
import { Pressable as RNPressable, PressableProps, Vibration } from 'react-native';

export interface StyledPressableProps extends PressableProps {
  haptic?: boolean;
}

export const Pressable = memo(function Pressable({
  haptic = true,
  onPress,
  children,
  ...rest
}: StyledPressableProps) {
  const handlePress: PressableProps['onPress'] = (e) => {
    if (haptic) Vibration.vibrate(10);
    onPress?.(e);
  };
  return (
    <RNPressable onPress={handlePress} {...rest}>
      {children}
    </RNPressable>
  );
});

export default Pressable;
