import React from 'react';
import { StyleSheet } from 'react-native';
import { Pressable } from '@/design-system/primitives/Pressable';
import { Box } from '@/design-system/primitives/Box';
import { Icon } from '@/design-system/icons';

type Props = {
  on?: boolean;
  onClick?: () => void;
  label?: string;
};

export default function MicButton({ on, onClick, label }: Props) {
  const bg = on ? '#E87C5A' : '#fff';
  const fg = on ? '#fff' : '#E87C5A';

  return (
    <Pressable
      haptic
      onPress={onClick}
      accessibilityLabel={label ?? (on ? 'Stop microphone' : 'Start microphone')}
      accessibilityState={{ selected: Boolean(on) }}
    >
      <Box style={[styles.btn, { backgroundColor: bg }]}>
        <Icon name="Mic" size={32} color={fg} accessibilityLabel={label ?? (on ? 'Stop microphone' : 'Start microphone')} />
      </Box>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E87C5A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 8,
  },
});
