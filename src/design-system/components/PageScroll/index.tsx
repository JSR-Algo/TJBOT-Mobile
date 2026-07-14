import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { tokens } from '@/design-system/tokens';

interface PageScrollProps {
  children?: React.ReactNode;
  bg?: string;
  testID?: string;
}

export default function PageScroll({ children, bg, testID }: PageScrollProps) {
  return (
    <ScrollView
      testID={testID}
      style={[styles.scroll, { backgroundColor: bg ?? tokens.colors.cream }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
  },
  content: {
    flexGrow: 1,
  },
});
