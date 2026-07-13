import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { referenceColors } from '@/design-system/referenceTheme';

interface PageScrollProps {
  children?: React.ReactNode;
  bg?: string;
}

export default function PageScroll({ children, bg }: PageScrollProps) {
  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: bg ?? referenceColors.bg }]}
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
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingBottom: 130,
  },
});
