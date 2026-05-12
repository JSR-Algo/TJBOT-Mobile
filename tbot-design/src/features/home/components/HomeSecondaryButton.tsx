import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';

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
      style={[styles.btn, dim && { opacity: 0.55 }]}
      activeOpacity={0.8}
    >
      <Text style={{ fontSize: 26, lineHeight: 30 }}>{icon}</Text>
      <Text fontWeight="700" style={{ fontSize: 14, color: '#2B2140' }}>{label}</Text>
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
    flex: 1, height: 84, borderRadius: 22, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 14,
    elevation: 2, position: 'relative',
  },
  badge: {
    position: 'absolute', top: 8, right: 10,
    minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11,
    backgroundColor: '#FF6F61',
  },
});
