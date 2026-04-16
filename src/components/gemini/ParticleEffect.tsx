import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const PARTICLE_COUNT = 6;
const COLORS = ['#F9A8D4', '#FDE68A', '#A78BFA', '#6EE7B7', '#93C5FD', '#FCA5A5'];

interface ParticleProps {
  active: boolean;
}

function Particle({ color, delay }: { color: string; delay: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const xTarget = (Math.random() - 0.5) * 80;
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -60, duration: 1200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: xTarget, duration: 1200, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay, opacity, scale, translateY, translateX]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    />
  );
}

export function ParticleEffect({ active }: ParticleProps) {
  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle
          key={i}
          color={COLORS[i % COLORS.length]}
          delay={i * 100}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  particle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
