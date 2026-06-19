import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceRadii, referenceShadow } from '@/design-system/referenceTheme';

type Props = {
  label: string;
  icon: string;
  onPress?: () => void;
  badge?: number | null;
  dim?: boolean;
};

export default function HomeSecondaryButton({ label, icon, onPress, badge, dim }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={dim}
      style={[styles.btn, dim && { opacity: 0.55 }]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(dim) }}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text fontWeight="800" style={styles.label}>{label}</Text>
      {badge != null ? (
        <Box style={styles.badge} alignItems="center" justifyContent="center">
          <Text fontWeight="800" style={{ fontSize: 12, color: '#fff' }}>{badge}</Text>
        </Box>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    height: 82,
    borderRadius: referenceRadii.tile,
    backgroundColor: referenceColors.card,
    borderWidth: 1,
    borderColor: referenceColors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
    ...referenceShadow.card,
  },
  icon: { fontSize: 24, lineHeight: 28 },
  label: { fontSize: 12, color: referenceColors.ink },
  badge: {
    position: 'absolute', top: 8, right: 10,
    minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11,
    backgroundColor: referenceColors.primary,
  },
});
