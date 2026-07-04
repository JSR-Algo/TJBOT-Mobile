import { useEffect } from 'react';
import {
  Easing,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export function useBreathingAnimation() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [scale]);
  return scale;
}

export function useMicPulseAnimation(active: boolean) {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  useEffect(() => {
    ringScale.value = active
      ? withRepeat(withTiming(1.6, { duration: 800, easing: Easing.out(Easing.ease) }), -1, false)
      : withTiming(1);
    ringOpacity.value = active
      ? withRepeat(withTiming(0.7, { duration: 800, easing: Easing.out(Easing.ease) }), -1, true)
      : withTiming(0);
  }, [active, ringOpacity, ringScale]);
  return { ringScale, ringOpacity };
}

export function useThinkingAnimation() {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 1500, easing: Easing.linear }), -1, false);
  }, [rotation]);
  return rotation;
}

export function useShakeAnimation() {
  const translateX = useSharedValue(0);
  const shake = () => {
    translateX.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  };
  return { translateX, shake };
}

export function useBlinkAnimation() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 80 }),
        withTiming(1, { duration: 120 }),
      ),
      -1,
      true,
    );
  }, [opacity]);
  return opacity;
}

export function useGlowAnimation(active: boolean) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = active
      ? withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true)
      : withTiming(0, { duration: 300 });
  }, [active, opacity]);
  return opacity;
}
