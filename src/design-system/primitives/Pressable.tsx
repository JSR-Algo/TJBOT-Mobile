import React, { memo } from 'react';
import { Pressable as RNPressable, PressableProps, Vibration } from 'react-native';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';

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
  const { language } = useAppLanguage();
  const accessibilityLabel = typeof rest.accessibilityLabel === 'string'
    ? translateCopy(rest.accessibilityLabel, { locale: language })
    : rest.accessibilityLabel;
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
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </RNPressable>
  );
});

export default Pressable;
