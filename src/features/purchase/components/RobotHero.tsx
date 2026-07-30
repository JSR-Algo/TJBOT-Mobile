import React from 'react';
import { StyleSheet, View } from 'react-native';
import Robot from '@/design-system/components/Robot';

type Props = {
  size?: number;
  accent?: string;
  tilt?: number;
  halo?: boolean;
};

export default function RobotHero({ size = 200, accent = '#FF6F61', tilt = 0, halo = true }: Props) {
  return (
    <View style={[styles.container, { width: size + 60, height: size + 40 }]}>
      {halo ? <View style={[styles.halo, StyleSheet.absoluteFillObject]} /> : null}
      <View style={[styles.shadow, { width: size * 0.85, bottom: 6 }]} />
      <View style={{ transform: [{ rotate: `${tilt}deg` }] }}>
        <Robot
          emotion="happy"
          size={size}
          accent={accent}
          accessibilityLabel="TeeBot English learning robot"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  halo: { borderRadius: 999, backgroundColor: 'rgba(255,210,170,0.35)' },
  shadow: {
    position: 'absolute', height: 14,
    backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 99,
  },
});
