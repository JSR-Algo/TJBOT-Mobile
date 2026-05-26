import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/design-system/primitives/Text';
import { PR } from '../purchase.local-tokens';

type Props = {
  children?: React.ReactNode;
  color?: string;
  bg?: string;
};

export default function PRChip({ children, color = PR.accent, bg = '#E8F0FE' }: Props) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text fontWeight="700" style={[styles.label, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  label: { fontSize: 11, letterSpacing: 0.2 },
});
