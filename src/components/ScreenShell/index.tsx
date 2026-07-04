import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Box } from '@/design-system/primitives/Box';
import { referenceColors, gardenColors } from '@/design-system/referenceTheme';

type Props = {
  children?: React.ReactNode;
  bg?: string;
  /** Force the Garden-Blue sky gradient on/off. Defaults to on when the
   * background is the child-lane default (so custom solid backgrounds win). */
  gradient?: boolean;
  onTap?: () => void;
  testID?: string;
};

export default function ScreenShell({ children, bg, gradient, onTap, testID }: Props) {
  const backgroundColor = bg ?? referenceColors.bg;
  const useGradient = gradient ?? backgroundColor === gardenColors.bg;
  return (
    <Box
      flex={1}
      backgroundColor={backgroundColor}
      overflow="hidden"
      style={[styles.root, { backgroundColor }]}
      onTouchEnd={onTap}
      testID={testID}
    >
      {useGradient ? (
        <LinearGradient
          colors={[gardenColors.bg, gardenColors.bg2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
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
