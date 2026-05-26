import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { tokens } from '@/design-system/tokens';

interface SpeechBubbleProps {
  children?: React.ReactNode;
  dark?: boolean;
  color?: string;
}

export default function SpeechBubble({ children, dark, color }: SpeechBubbleProps) {
  const bg = color ?? (dark ? 'rgba(255,255,255,0.95)' : '#fff');
  return (
    <Box style={[styles.bubble, { backgroundColor: bg, ...tokens.shadows.card }]}>
      <Text style={styles.text}>{children}</Text>
    </Box>
  );
}

const styles = StyleSheet.create({
  bubble: {
    padding: 18,
    paddingHorizontal: 24,
    borderRadius: 24,
    maxWidth: '88%',
    alignItems: 'center',
  },
  text: {
    fontWeight: '700',
    fontSize: tokens.typography.fontSizes.body,
    lineHeight: tokens.typography.fontSizes.body * 1.25,
    color: tokens.colors.ink,
    textAlign: 'center',
  },
});
