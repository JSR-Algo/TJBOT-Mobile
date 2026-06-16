import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { tokens } from '@/design-system/tokens';

interface PulseRingProps {
  size?: number;
  color?: string;
  reduceMotion?: boolean;
}

function Ring({ size, color, delay }: { size: number; color: string; delay: number }) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0.65);

  useEffect(() => {
    const cfg = tokens.motion.ringPulse;
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.5, { duration: cfg.duration, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, { duration: cfg.duration, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    // `scale` and `opacity` are Reanimated shared values (stable refs); only `delay` changes behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        },
        animStyle,
      ]}
    />
  );
}

export default function PulseRing({ size = 240, color = tokens.colors.coral, reduceMotion = false }: PulseRingProps) {
  if (reduceMotion) {
    return null;
  }
  return (
    <>
      {[0, 800, 1600].map((delay, i) => (
        <Ring key={i} size={size} color={color} delay={delay} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 3,
    pointerEvents: 'none',
  },
});
