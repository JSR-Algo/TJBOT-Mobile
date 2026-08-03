import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@/design-system/primitives/Box';
import { Text } from '@/design-system/primitives/Text';
import { Pressable } from '@/design-system/primitives/Pressable';
import { tokens } from '@/design-system/tokens';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';

interface PrimaryCTAProps {
  children?: React.ReactNode;
  onPress?: () => void;
  color?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

const DARK_CTA_INK = '#2B2140';

function relativeLuminance(hex: string): number | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) return null;
  const channels = match[1].match(/.{2}/g)?.map(value => Number.parseInt(value, 16) / 255);
  if (!channels || channels.length !== 3) return null;
  const [red, green, blue] = channels.map(value =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(background: string, foreground: string): number {
  const bg = relativeLuminance(background);
  const fg = relativeLuminance(foreground);
  if (bg === null || fg === null) return 0;
  return (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05);
}

function ctaForeground(background: string): string {
  return contrastRatio(background, DARK_CTA_INK) >= contrastRatio(background, referenceColors.ctaInk)
    ? DARK_CTA_INK
    : referenceColors.ctaInk;
}

export default function PrimaryCTA({ children, onPress, color = tokens.colors.coral, icon, disabled = false, testID, accessibilityLabel }: PrimaryCTAProps) {
  const { language } = useAppLanguage();
  const labelSource = accessibilityLabel ?? (typeof children === 'string' ? children : undefined);
  const label = labelSource ? translateCopy(labelSource, { locale: language }) : undefined;
  return (
    <Pressable haptic onPress={onPress} disabled={disabled} testID={testID} accessibilityLabel={label} style={styles.pressable}>
      <Box style={[styles.btn, { backgroundColor: color, ...referenceShadow.button }]}>
        {icon}
        <Text style={[styles.label, { color: ctaForeground(color) }]}>{children}</Text>
      </Box>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  btn: {
    width: '100%',
    minHeight: 72,
    borderRadius: tokens.radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 22,
  },
  label: {
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: 0,
    textAlign: 'center',
    flexShrink: 1,
  },
});
