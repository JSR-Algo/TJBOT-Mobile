import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';

interface Props {
  idx: number;
}

const COUNT = 3;

export default function IntroDots({ idx }: Props) {
  return (
    <Box flexDirection="row" gap={8} justifyContent="center">
      {Array.from({ length: COUNT }, (_, i) => (
        <Box key={i} style={[styles.dot, i === idx ? styles.dotActive : styles.dotInactive]} />
      ))}
    </Box>
  );
}

const styles = StyleSheet.create({
  dot: { height: 10, borderRadius: 6 },
  dotActive: { width: 24, backgroundColor: '#FF6F61' },
  dotInactive: { width: 10, backgroundColor: 'rgba(0,0,0,0.12)' },
});
