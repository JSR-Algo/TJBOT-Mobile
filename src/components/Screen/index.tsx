import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/design-system/primitives/Box';

type Props = {
  header?: React.ReactNode;
  subheader?: React.ReactNode;
  scroll?: boolean;
  safeArea?: boolean;
  padding?: number;
  children: React.ReactNode;
};

export default function Screen({
  header,
  subheader,
  scroll = true,
  safeArea = true,
  padding = 16,
  children,
}: Props) {
  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ padding, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <Box flex={1} padding={padding}>
      {children}
    </Box>
  );

  if (!safeArea) {
    return (
      <Box flex={1}>
        {header}
        {subheader}
        {body}
      </Box>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {header}
      {subheader}
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
});
