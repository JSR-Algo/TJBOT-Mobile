import React from 'react';
import { StyleSheet } from 'react-native';
import { Pressable } from '@/design-system/primitives/Pressable';
import { Box } from '@/design-system/primitives/Box';

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
        <MicSvg color={fg} />
      </Box>
    </Pressable>
  );
}

function MicSvg({ color }: { color: string }) {
  const { Svg, Rect, Path } = require('react-native-svg');
  return (
    <Svg width={40} height={48} viewBox="0 0 24 28" fill="none">
      <Rect x={8} y={2} width={8} height={14} rx={4} fill={color} />
      <Path
        d="M5 12 a7 7 0 0 0 14 0 M12 19 v5 M8 24 h8"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
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
