import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { PARENT_MOTION, staggerDelayMs } from './parentMotion';
import { useReduceMotion } from './useReduceMotion';

export type RevealProps = {
  children: React.ReactNode;
  /** 0-based stagger index within a page sequence. */
  index?: number;
  durationMs?: number;
  staggerMs?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
  /** Test / story override for reduced motion. */
  reduceMotion?: boolean;
  testID?: string;
  /** When false, stays at the resting final state (no re-entrance). */
  active?: boolean;
};

/**
 * Finite page/section entrance: opacity 0→1 + translateY → 0.
 * Reduced motion jumps to the final state immediately.
 */
export function Reveal({
  children,
  index = 0,
  durationMs = PARENT_MOTION.slowMs,
  staggerMs = PARENT_MOTION.staggerMs,
  translateY = PARENT_MOTION.revealTranslateY,
  style,
  reduceMotion: reduceMotionOverride,
  testID,
  active = true,
}: RevealProps): React.JSX.Element {
  const reduceMotion = useReduceMotion(reduceMotionOverride);
  const progress = useSharedValue(reduceMotion || !active ? 1 : 0);

  useEffect(() => {
    if (reduceMotion || !active) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      staggerDelayMs(index, staggerMs),
      withTiming(1, {
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared value is stable
  }, [active, durationMs, index, reduceMotion, staggerMs]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * translateY }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[style, animStyle]}
      testID={testID}
      accessibilityState={{ busy: false }}
      accessibilityValue={{ max: 1, min: 0, now: 1, text: `stagger:${index}` }}
    >
      {children}
    </Animated.View>
  );
}

export default Reveal;
