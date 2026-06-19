import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { referenceColors } from '@/design-system/referenceTheme';

type Props = {
  children?: React.ReactNode;
  bg?: string;
  onTap?: () => void;
  testID?: string;
};

export default function ScreenShell({ children, bg, onTap, testID }: Props) {
  const backgroundColor = bg ?? referenceColors.bg;
  return (
    <Box
      flex={1}
      backgroundColor={backgroundColor}
      overflow="hidden"
      style={[styles.root, { backgroundColor }]}
      onTouchEnd={onTap}
      testID={testID}
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
