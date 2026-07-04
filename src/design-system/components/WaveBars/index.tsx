import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Box } from '@/design-system/primitives/Box';
import { tokens } from '@/design-system/tokens';

interface WaveBarsProps {
  count?: number;
  color?: string;
  active?: boolean;
  height?: number;
  reduceMotion?: boolean;
  accessibilityLabel?: string;
}

function Bar({ color, active, delay, barHeight }: { color: string; active: boolean; delay: number; barHeight: number }) {
  const scaleY = useSharedValue(0.3);

  useEffect(() => {
    if (active) {
      const cfg = tokens.motion.waveBar;
      scaleY.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: cfg.duration / 2, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.3, { duration: cfg.duration / 2, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );
    } else {
      scaleY.value = withTiming(0.3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scaleY is a stable reanimated shared-value ref; effect intentionally keys on active/delay only
  }, [active, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height: barHeight,
          backgroundColor: color,
          opacity: active ? 1 : 0.3,
        },
        animStyle,
      ]}
    />
  );
}

const MemoBar = React.memo(Bar);

export default function WaveBars({
  count = 14,
  color = tokens.colors.coral,
  active = true,
  height = 42,
  reduceMotion = false,
  accessibilityLabel,
}: WaveBarsProps) {
  const animateActive = active && !reduceMotion;
  const barDelays = useMemo(
    () => Array.from({ length: count }, (_, i) => Math.round((i * 0.07 % 1) * 1000)),
    [count],
  );
  return (
    <Box
      flexDirection="row"
      gap={5}
      alignItems="center"
      accessibilityLabel={accessibilityLabel}
      style={{ height }}
    >
      {barDelays.map((delay, i) => (
        <MemoBar
          key={i}
          color={color}
          active={animateActive}
          delay={delay}
          barHeight={height}
        />
      ))}
    </Box>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: 5,
    borderRadius: 6,
  },
});
