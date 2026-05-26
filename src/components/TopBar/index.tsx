import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

type Props = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  title?: string;
  dark?: boolean;
  onBack?: () => void;
};

export default function TopBar({ left, right, title, dark, onBack }: Props) {
  const fg = dark ? '#fff' : '#1A1A1F';
  return (
    <Box style={styles.root}>
      <Box>
        {left}
        {!left && onBack ? (
          <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to home" style={styles.backBtn}>
            <Text fontWeight="800" style={{ fontSize: 24, color: fg }}>‹</Text>
          </TouchableOpacity>
        ) : null}
      </Box>
      {title ? (
        <Text fontWeight="700" style={{ fontSize: 18, color: fg }}>
          {title}
        </Text>
      ) : null}
      <Box>{right}</Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
