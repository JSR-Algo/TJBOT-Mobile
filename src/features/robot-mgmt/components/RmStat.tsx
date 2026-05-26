import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { RM } from './RM';

type Status = 'ok' | 'warn' | 'bad';

type Props = {
  icon: string;
  label: string;
  value: string;
  status?: Status;
  onClick?: () => void;
};

const COLORS: Record<Status, string> = { ok: RM.good, warn: RM.warn, bad: RM.danger };
const BGS: Record<Status, string> = { ok: '#E6F4EE', warn: '#FFF4D9', bad: '#FBE6E2' };

export default function RmStat({ icon, label, value, status = 'ok', onClick }: Props) {
  return (
    <TouchableOpacity onPress={onClick} activeOpacity={0.8} style={styles.card}>
      <Box style={[styles.iconBox, { backgroundColor: BGS[status] }]} alignItems="center" justifyContent="center">
        <Text style={{ fontSize: 14 }}>{icon}</Text>
      </Box>
      <Text fontWeight="600" style={[styles.label, { color: RM.ink3 }]}>{label}</Text>
      <Text fontWeight="600" style={[styles.value, { color: COLORS[status] }]}>{value}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: RM.card, borderWidth: 1, borderColor: RM.hair, borderRadius: 12,
    padding: 12, gap: 6,
  },
  iconBox: { width: 30, height: 30, borderRadius: 8 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 14, letterSpacing: -0.2 },
});
