import React from 'react';
import { StyleSheet } from 'react-native';
import LCDFace from '@/design-system/components/LCDFace';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from './CL';

type Props = {
  emotion?: string;
  accent?: string;
  size?: number;
  label?: string;
};

export default function LCDPreview({ emotion = 'idle', accent = '#FF6F61', size = 88, label }: Props) {
  return (
    <Box alignItems="center" gap={4}>
      <Box style={styles.screen}>
        <LCDFace emotion={emotion} size={size} accent={accent} />
      </Box>
      {label ? <Text fontWeight="700" style={styles.label}>{label}</Text> : null}
    </Box>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#0E1116', borderRadius: 8, padding: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2,
  },
  label: { fontSize: 9, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
});
