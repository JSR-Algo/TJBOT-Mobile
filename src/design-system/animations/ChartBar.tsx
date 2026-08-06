import React, { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  PARENT_MOTION,
  barDelayMs,
  barHeightPx,
} from './parentMotion';
import { useReduceMotion } from './useReduceMotion';

export type ChartBarProps = {
  count: number;
  maxCount: number;
  trackHeight?: number;
  index?: number;
  isToday?: boolean;
  color?: string;
  todayColor?: string;
  style?: StyleProp<ViewStyle>;
  reduceMotion?: boolean;
  testID?: string;
};

/**
 * Weekly chart bar: grows from min stub to source-backed height.
 * 1.1s growth, 80ms stagger. Reduced motion snaps to final height.
 */
export function ChartBar({
  count,
  maxCount,
  trackHeight = 118,
  index = 0,
  isToday = false,
  color = '#EDE3D3',
  todayColor = '#FF7478',
  style,
  reduceMotion: reduceMotionOverride,
  testID,
}: ChartBarProps): React.JSX.Element {
  const reduceMotion = useReduceMotion(reduceMotionOverride);
  const targetH = barHeightPx(count, maxCount, trackHeight);
  const height = useSharedValue(reduceMotion ? targetH : 8);

  useEffect(() => {
    if (reduceMotion) {
      height.value = targetH;
      return;
    }
    height.value = 8;
    height.value = withDelay(
      barDelayMs(index),
      withTiming(targetH, {
        duration: PARENT_MOTION.barGrowthMs,
        easing: Easing.out(Easing.cubic),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared value stable
  }, [index, reduceMotion, targetH]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: isToday ? todayColor : color },
        style,
        animStyle,
      ]}
      testID={testID}
      // Final height exposed for unit tests under the reanimated mock.
      accessibilityValue={{ max: trackHeight, min: 0, now: targetH }}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 8,
    minHeight: 8,
    width: 26,
  },
});

export default ChartBar;
