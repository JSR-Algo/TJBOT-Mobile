import React, { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PARENT_MOTION, shouldRepeatMotion } from './parentMotion';
import { useReduceMotion } from './useReduceMotion';

export type StatusPulseProps = {
  /** Only pulse when the status is genuinely live/online. */
  active: boolean;
  size?: number;
  color?: string;
  periodMs?: number;
  style?: StyleProp<ViewStyle>;
  reduceMotion?: boolean;
  testID?: string;
};

/**
 * Restrained online/current-state pulse. Offline/inactive is a static dot.
 */
export function StatusPulse({
  active,
  size = 9,
  color = '#35AE70',
  periodMs = PARENT_MOTION.onlinePulseMs,
  style,
  reduceMotion: reduceMotionOverride,
  testID,
}: StatusPulseProps): React.JSX.Element {
  const reduceMotion = useReduceMotion(reduceMotionOverride);
  const canPulse = shouldRepeatMotion(reduceMotion, active);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(opacity);
    if (!canPulse) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    const half = Math.round(periodMs / 2);
    scale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: half, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: half, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: half, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: half, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values stable
  }, [canPulse, periodMs]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: color,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
        style,
        canPulse ? animStyle : null,
      ]}
      testID={testID}
      accessibilityState={{ selected: active }}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});

export default StatusPulse;
