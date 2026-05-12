import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/design-system/primitives/Text';

type State = 'installed' | 'not_installed' | 'locked' | 'ready' | 'completed' | 'needs_sync';

const STATE_MAP: Record<State, { bg: string; fg: string; dot: string; label: string }> = {
  installed:     { bg: '#E6F4EE', fg: '#1F8A5B', dot: '#1F8A5B', label: 'On Robot' },
  not_installed: { bg: '#EEF1F5', fg: '#5A5A66', dot: '#8B8B96', label: 'Not on Robot' },
  locked:        { bg: '#F2EEF6', fg: '#6E5A8A', dot: '#9B8FB8', label: 'Locked' },
  ready:         { bg: '#FFF4D9', fg: '#8A6A12', dot: '#E8A33C', label: 'Ready for today' },
  completed:     { bg: '#E6F4EE', fg: '#1F8A5B', dot: '#1F8A5B', label: 'Completed' },
  needs_sync:    { bg: '#FFE9DC', fg: '#A04A1F', dot: '#D97757', label: 'Needs sync' },
};

type Props = { state?: State };

export default function CLChip({ state }: Props) {
  const s = STATE_MAP[state ?? 'not_installed'] ?? STATE_MAP.not_installed;
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <Text fontWeight="700" style={[styles.label, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, letterSpacing: 0.2 },
});
