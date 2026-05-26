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
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

export default function PrimaryCTA({ children, onPress, color = tokens.colors.coral, icon, disabled = false, testID, accessibilityLabel }: PrimaryCTAProps) {
  const label = accessibilityLabel ?? (typeof children === 'string' ? children : undefined);
  return (
    <Pressable haptic onPress={onPress} disabled={disabled} testID={testID} accessibilityLabel={label} style={styles.pressable}>
      <Box style={[styles.btn, { backgroundColor: color, ...tokens.shadows.button }]}>
        {icon}
        <Text style={styles.label}>{children}</Text>
      </Box>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
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
    color: '#2B2140',
    fontWeight: '700',
    fontSize: 26,
    letterSpacing: 0,
    textAlign: 'center',
    flexShrink: 1,
  },
});
