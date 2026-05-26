import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { DimensionValue } from 'react-native';

type Props = {
  value?: number;
  color?: string;
};

export default function MiniProgress({ value = 0, color = '#6CE2B6' }: Props) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${value * 100}%` as DimensionValue, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
});
