import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/design-system/primitives/Box';

type Props = {
  children?: React.ReactNode;
  bg?: string;
  dark?: boolean;
  status?: boolean;
  indicator?: boolean;
  statusDark?: boolean;
};

export default function TBPhone({ children, bg, dark: _dark, status: _status, indicator: _indicator, statusDark: _statusDark }: Props) {
  return (
    <SafeAreaView style={[styles.root, bg ? { backgroundColor: bg } : undefined]}>
      <Box flex={1}>{children}</Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFCF6',
  },
});
