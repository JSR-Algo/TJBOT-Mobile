import React, { memo } from 'react';
import { StyleSheet, Text as RNText, TextProps } from 'react-native';
import { tokens } from '@/design-system/tokens';
import { translateReactNode, useAppLanguage, type TranslationPersona } from '@/services/i18n/i18n';
import { useAccessibilityPreferences } from '@/services/accessibility/preferences';

type TypographyVariant = keyof typeof tokens.typography.fontSizes;

export interface StyledTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  fontWeight?: '400' | '500' | '600' | '700' | '800';
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  i18n?: boolean;
  i18nPersona?: TranslationPersona;
}

export const Text = memo(function Text({
  variant, color, fontWeight, textAlign, lineHeight, letterSpacing, style, children, i18n = true, i18nPersona = 'parent', ...rest
}: StyledTextProps) {
  useAppLanguage();
  const { largeText } = useAccessibilityPreferences();
  const fontSize = variant ? tokens.typography.fontSizes[variant] : undefined;
  const flattenedStyle = StyleSheet.flatten(style);
  const scaledTextStyle = largeText
    ? {
        fontSize: Math.round((flattenedStyle?.fontSize ?? fontSize ?? 14) * 1.15),
        ...(flattenedStyle?.lineHeight !== undefined || lineHeight !== undefined
          ? { lineHeight: Math.round((flattenedStyle?.lineHeight ?? lineHeight ?? 0) * 1.15) }
          : {}),
      }
    : undefined;
  const renderedChildren = i18n ? translateReactNode(children, { persona: i18nPersona }) : children;
  return (
    <RNText
      style={[
        { fontFamily: tokens.typography.fonts.kid },
        fontSize !== undefined && { fontSize },
        color !== undefined && { color },
        fontWeight !== undefined && { fontWeight },
        textAlign !== undefined && { textAlign },
        lineHeight !== undefined && { lineHeight },
        letterSpacing !== undefined && { letterSpacing },
        style,
        scaledTextStyle,
      ]}
      {...rest}
    >
      {renderedChildren}
    </RNText>
  );
});

export default Text;
