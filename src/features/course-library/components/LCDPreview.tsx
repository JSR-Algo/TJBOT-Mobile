import React from 'react';
import { StyleSheet } from 'react-native';
import RobotImage from '@/components/RobotImage';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import CL from './CL';

type Props = {
  emotion?: string;
  accent?: string;
  size?: number;
  label?: string;
};

export default function LCDPreview({ size = 88, label }: Props) {
  return (
    <Box alignItems="center" gap={4}>
      <Box style={styles.screen}>
        <RobotImage variant="head" size={size} />
      </Box>
      {label ? <Text fontWeight="700" style={styles.label}>{label}</Text> : null}
    </Box>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFF9F0',
    borderRadius: 999,
    padding: 6,
  },
  label: { fontSize: 9, color: CL.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
});
