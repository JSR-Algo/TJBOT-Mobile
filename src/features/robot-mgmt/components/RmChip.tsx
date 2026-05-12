import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from './RM';

type Props = {
  children?: React.ReactNode;
  color?: string;
  bg?: string;
};

export default function RmChip({ children, color = RM.good, bg = '#E6F4EE' }: Props) {
  return (
    <Box style={[styles.chip, { backgroundColor: bg }]} flexDirection="row" alignItems="center" gap={6}>
      <Text fontWeight="700" style={{ fontSize: 11, color, letterSpacing: 0.2 }}>{children}</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'flex-start' },
});
