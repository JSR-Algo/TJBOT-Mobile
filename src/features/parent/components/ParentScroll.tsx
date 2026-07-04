import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';

// redesign-2026: parent lane aligned to Wispr-Flow (kit.css .lane-parent /
// DESIGN.md §8). Off-white surface, charcoal ink, purple accent. Single source
// for all 9 parent/ screens.
export const PA = {
  bg: '#F5F5F0',
  card: '#FFFFFF',
  ink: '#1C1C1E',
  ink2: '#5A5A66',
  ink3: '#8E8E93',
  hair: 'rgba(28,28,30,0.08)',
  accent: '#6B4EFF',
  good: '#34C759',
  warn: '#A06900',
} as const;

type Props = {
  children?: React.ReactNode;
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export default function ParentScroll({ children, title, onBack, right }: Props) {
  const { language } = useAppLanguage();
  return (
    <ScrollView style={[styles.root, { backgroundColor: PA.bg }]}>
      {title !== undefined ? (
        <Box
          style={[styles.header, { backgroundColor: PA.bg, borderBottomColor: PA.hair }]}
          flexDirection="row"
          alignItems="center"
          gap={12}
        >
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={translateCopy('Go back', { locale: language })}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={PA.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </TouchableOpacity>
          ) : null}
          <Text fontWeight="600" style={{ flex: 1, fontSize: 17, color: PA.ink, letterSpacing: -0.2 }}>{title}</Text>
          {right}
        </Box>
      ) : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, zIndex: 5,
  },
  backBtn: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
