import React, { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { PARENT_MOTION, shouldRepeatMotion } from './parentMotion';
import { useReduceMotion } from './useReduceMotion';

export type SheenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Opacity of the light band (prototype default ~0.30). */
  intensity?: number;
  /** Delay before the first pass (seconds offset * 1000). */
  delayMs?: number;
  periodMs?: number;
  reduceMotion?: boolean;
  /** When false, no sheen runs (e.g. card not ready). */
  active?: boolean;
  testID?: string;
};

/**
 * Clipped narrow light sweep for accent surfaces only.
 * 7s cadence; reduced motion disables the loop entirely.
 */
export function Sheen({
  children,
  style,
  intensity = 0.3,
  delayMs = 0,
  periodMs = PARENT_MOTION.sheenPeriodMs,
  reduceMotion: reduceMotionOverride,
  active = true,
  testID,
}: SheenProps): React.JSX.Element {
  const reduceMotion = useReduceMotion(reduceMotionOverride);
  const canRun = shouldRepeatMotion(reduceMotion, active);
  // 0 → start (off-left), 1 → end of pass window (off-right); holds to period end.
  const phase = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(phase);
    if (!canRun) {
      phase.value = 0;
      return;
    }
    const passMs = Math.round(periodMs * PARENT_MOTION.sheenPassFraction);
    phase.value = 0;
    phase.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, {
          duration: periodMs,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
    // passMs reserved for documentation / future keyframe split
    void passMs;
    return () => {
      cancelAnimation(phase);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared value stable
  }, [canRun, delayMs, periodMs]);

  const bandStyle = useAnimatedStyle(() => {
    // Map full period: 0–30% of cycle travels -70%→150% left; rest holds off-screen.
    const p = phase.value;
    const travel = Math.min(1, p / PARENT_MOTION.sheenPassFraction);
    const leftPercent = -70 + travel * 220;
    return {
      left: `${leftPercent}%`,
      opacity: canRun ? 1 : 0,
    };
  });

  return (
    <Animated.View style={[styles.host, style]} testID={testID}>
      <Animated.View style={styles.content} pointerEvents="box-none">
        {children}
      </Animated.View>
      {canRun ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.band, { backgroundColor: `rgba(255,255,255,${intensity})` }, bandStyle]}
          testID={testID ? `${testID}-band` : undefined}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  band: {
    // Above content so the light pass is visible on solid accent fills.
    height: '220%',
    pointerEvents: 'none',
    position: 'absolute',
    top: '-60%',
    transform: [{ rotate: '16deg' }],
    width: '52%',
    zIndex: 2,
  },
});

export default Sheen;
