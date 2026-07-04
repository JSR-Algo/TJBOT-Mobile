import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

const PARTICLE_COUNT = 6;
const COLORS = ['#F9A8D4', '#FDE68A', '#A78BFA', '#6EE7B7', '#93C5FD', '#FCA5A5'];

interface ParticleProps {
  active: boolean;
  reduceMotion?: boolean;
}

function Particle({ color, index }: { color: string; index: number }) {
  const xTarget = (index - (PARTICLE_COUNT - 1) / 2) * 14;
  const yTarget = -34 - index * 4;
  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          opacity: 0.85,
          transform: [{ translateX: xTarget }, { translateY: yTarget }, { scale: 1 }],
        },
      ]}
    />
  );
}

export function ParticleEffect({ active, reduceMotion = false }: ParticleProps) {
  if (!active || reduceMotion) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle
          key={i}
          color={COLORS[i % COLORS.length]}
          index={i}
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
