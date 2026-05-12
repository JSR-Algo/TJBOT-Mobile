import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Pressable } from '@/design-system/primitives/Pressable';
import { tokens } from '@/design-system/tokens';

interface PrimaryCTAProps {
  children?: React.ReactNode;
  onPress?: () => void;
  color?: string;
  icon?: React.ReactNode;
}

export default function PrimaryCTA({ children, onPress, color = tokens.colors.coral, icon }: PrimaryCTAProps) {
  return (
    <Pressable haptic onPress={onPress}>
      <Box style={[styles.btn, { backgroundColor: color, ...tokens.shadows.button }]}>
        {icon}
        <Text style={styles.label}>{children}</Text>
      </Box>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    minHeight: 72,
    borderRadius: tokens.radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 22,
  },
  label: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 26,
    letterSpacing: 0.2,
  },
});
