import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';

// redesign-2026: parent lane aligned to the Sleek warm visual system in
// DESIGN.md §8. Cream surface, charcoal ink, coral accent. Single source
// for all 9 parent/ screens.
export const PA = {
  bg: '#FAF5EB',
  card: '#FFFFFF',
  ink: '#2D3436',
  ink2: '#636E72',
  ink3: '#9A928A',
  hair: '#EBDCC7',
  accent: '#FF6B6B',
  good: '#34C759',
  warn: '#A06900',
} as const;

// Bottom inset so the last CTA on every parent/ screen clears the floating
// tab bar (~96px) with margin. Test contract: parent-scroll-tab-clearance.
export const PARENT_SCROLL_TAB_CLEARANCE = 120;

type Props = {
  children?: React.ReactNode;
  title?: string;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  right?: React.ReactNode;
};

export default function ParentScroll({ children, title, onBack, backAccessibilityLabel, right }: Props) {
  const { language } = useAppLanguage();
  return (
    <ScrollView
      testID="parentScroll"
      style={[styles.root, { backgroundColor: PA.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
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
              accessibilityLabel={translateCopy(backAccessibilityLabel ?? 'Go back', { locale: language })}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={PA.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </TouchableOpacity>
          ) : null}
          <Text fontWeight="800" style={{ flex: 1, fontSize: 29, color: PA.ink, letterSpacing: -0.2 }}>{title}</Text>
          {right}
        </Box>
      ) : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingBottom: PARENT_SCROLL_TAB_CLEARANCE,
  },
  header: {
    paddingTop: 56, paddingBottom: 18, paddingHorizontal: 24,
    borderBottomWidth: 0, zIndex: 5,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PA.card,
    borderWidth: 1,
    borderColor: PA.hair,
  },
});
