import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';

type Props = {
  children?: React.ReactNode;
  bg?: string;
  onTap?: () => void;
};

export default function ScreenShell({ children, bg, onTap }: Props) {
  return (
    <Box
      flex={1}
      backgroundColor={bg}
      overflow="hidden"
      style={[styles.root, bg ? { backgroundColor: bg } : undefined]}
      onTouchEnd={onTap}
    >
      {children}
    </Box>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
});
