import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/icons';

export const OB = {
  bg: '#F5F5F2',
  card: '#FFFFFF',
  ink: '#1A1A1F',
  ink2: '#5A5A66',
  ink3: '#8B8B96',
  hair: 'rgba(0,0,0,0.07)',
  accent: '#2A6FDB',
  good: '#1F8A5B',
  danger: '#C0392B',
  dangerSoft: '#FBE7E2',
} as const;

type Props = {
  children?: React.ReactNode;
  step?: number;
  total?: number;
  onBack?: () => void;
  title?: string;
};

export default function OnbShell({ children, step, total, onBack, title }: Props) {
  return (
    <ScrollView style={[styles.root, { backgroundColor: OB.bg }]}>
      <Box
        style={[styles.header, { backgroundColor: OB.bg, borderBottomColor: OB.hair }]}
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
            accessibilityLabel="Go back"
          >
            <Icon name="ChevronLeft" size={18} color={OB.ink2} accessibilityLabel="Go back" />
          </TouchableOpacity>
        ) : null}
        <Text fontWeight="600" style={{ flex: 1, fontSize: 17, color: OB.ink, letterSpacing: -0.2 }}>
          {title}
        </Text>
        {step != null && total != null ? (
          <Text fontWeight="500" style={{ fontSize: 13, color: OB.ink3 }}>
            {step} of {total}
          </Text>
        ) : null}
      </Box>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    zIndex: 5,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
