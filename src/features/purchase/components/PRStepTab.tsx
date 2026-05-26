import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PR } from '../purchase.local-tokens';

type Props = {
  step: number;
  total: number;
};

export default function PRStepTab({ step, total }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i <= step ? PR.accent : 'rgba(0,0,0,0.08)' }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, paddingHorizontal: 6 },
  dot: { flex: 1, height: 3, borderRadius: 2 },
});
