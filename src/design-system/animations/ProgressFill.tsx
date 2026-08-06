import React, { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PARENT_MOTION, clampPercent } from './parentMotion';
import { useReduceMotion } from './useReduceMotion';

export type ProgressFillProps = {
  /** Source percentage 0–100 (clamped). */
  percent: number;
  durationMs?: number;
  trackColor?: string;
  fillColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  reduceMotion?: boolean;
  testID?: string;
};

/**
 * Horizontal progress fill: 0 → clamped real percent over 1.6s.
 * Reduced motion shows the final width immediately.
 */
export function ProgressFill({
  percent,
  durationMs = PARENT_MOTION.fillMs,
  trackColor = '#E8EFF0',
  fillColor = '#4CB7A5',
  height = 12,
  style,
  reduceMotion: reduceMotionOverride,
  testID,
}: ProgressFillProps): React.JSX.Element {
  const reduceMotion = useReduceMotion(reduceMotionOverride);
  const target = clampPercent(percent);
  const width = useSharedValue(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      width.value = target;
      return;
    }
    width.value = 0;
    width.value = withTiming(target, {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared value stable
  }, [durationMs, reduceMotion, target]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <Animated.View
      style={[styles.track, { backgroundColor: trackColor, height }, style]}
      testID={testID}
      accessibilityValue={{ max: 100, min: 0, now: target }}
    >
      <Animated.View
        style={[styles.fill, { backgroundColor: fillColor }, fillStyle]}
        testID={testID ? `${testID}-fill` : undefined}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: 999,
    height: '100%',
  },
});

export default ProgressFill;
