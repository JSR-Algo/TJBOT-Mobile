import React from 'react';
import { StyleSheet } from 'react-native';
import { Pressable } from '@/design-system/primitives/Pressable';
import { Box } from '@/design-system/primitives/Box';
import { tokens } from '@/design-system/tokens';

interface CircleBtnProps {
  children?: React.ReactNode;
  bg?: string;
  onPress?: () => void;
  size?: number;
  ariaLabel?: string;
}

export default function CircleBtn({ children, bg = '#fff', onPress, size = 48, ariaLabel }: CircleBtnProps) {
  return (
    <Pressable haptic onPress={onPress} accessibilityLabel={ariaLabel}>
      <Box style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
        {children}
      </Box>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
});
