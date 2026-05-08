import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export function useBreathingAnimation() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.02,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scale]);

  return scale;
}

export function useMicPulseAnimation(active: boolean) {
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      ringScale.setValue(1);
      ringOpacity.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringScale, {
            toValue: 1.6,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0.7,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 700,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [active, ringScale, ringOpacity]);

  return { ringScale, ringOpacity };
}

export function useThinkingAnimation() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return rotate;
}

export function useShakeAnimation() {
  const translateX = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(translateX, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -5, duration: 60, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 5, duration: 60, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  return { translateX, shake };
}

export function useBlinkAnimation() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const scheduleNextBlink = () => {
      const delay = 2000 + Math.random() * 4000; // 2–6 s random interval
      // Robot blink animation; presentation-only, no FSM impact.
      // Plan v2 §11.7 ban targets FSM-affecting timers in shared layers.
      // eslint-disable-next-line tbot-voice/no-voice-timing-in-shared
      return setTimeout(() => {
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 80, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start(() => {
          timer = scheduleNextBlink();
        });
      }, delay);
    };

    let timer = scheduleNextBlink();
    return () => clearTimeout(timer);
  }, [opacity]);

  return opacity;
}

export function useGlowAnimation(active: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [active, opacity]);

  return opacity;
}
