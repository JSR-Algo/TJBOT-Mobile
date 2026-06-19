import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';

type Props = {
  children: React.ReactNode;
  color?: string;
};

export default function HomeStateChip({ children, color = '#FF6F61' }: Props) {
  return (
    <Box style={styles.chip} flexDirection="row" alignItems="center" gap={8}>
      <Box style={[styles.dot, { backgroundColor: color }]} />
      <Text fontWeight="700" style={styles.label}>{children}</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,107,111,0.16)',
    ...referenceShadow.card,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, color: referenceColors.inkSoft },
});
