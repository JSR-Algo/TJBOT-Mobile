import React, { memo } from 'react';
import { Platform, Pressable as RNPressable, PressableProps } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useReduceMotion } from '@/design-system/animations/useReduceMotion';
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
  const reduceMotion = useReduceMotion();
  const accessibilityLabel = typeof rest.accessibilityLabel === 'string'
    ? translateCopy(rest.accessibilityLabel, { locale: language })
    : rest.accessibilityLabel;
  const handlePress: PressableProps['onPress'] = (e) => {
    if (haptic && !reduceMotion && Platform.OS !== 'web') {
      void impactAsync(ImpactFeedbackStyle.Light).catch(() => undefined);
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
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </RNPressable>
  );
});

export default Pressable;
