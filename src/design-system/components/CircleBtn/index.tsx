import React from 'react';
import { StyleSheet } from 'react-native';
import { Pressable } from '@/design-system/primitives/Pressable';
import { Box } from '@/design-system/primitives/Box';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';

interface CircleBtnProps {
  children?: React.ReactNode;
  bg?: string;
  onPress?: () => void;
  size?: number;
  ariaLabel?: string;
  accessibilityLabel?: string;
}

export default function CircleBtn({ children, bg = '#fff', onPress, size = 48, ariaLabel, accessibilityLabel }: CircleBtnProps) {
  const { language } = useAppLanguage();
  const touchSize = Math.max(size, 44);
  const labelSource = accessibilityLabel ?? ariaLabel;
  const label = labelSource ? translateCopy(labelSource, { locale: language }) : undefined;
  return (
    <Pressable haptic onPress={onPress} accessibilityLabel={label}>
      <Box style={[styles.base, { width: touchSize, height: touchSize, borderRadius: touchSize / 2, backgroundColor: bg }]}>
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
