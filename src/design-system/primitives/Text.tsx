import React, { memo } from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { tokens } from '@/design-system/tokens';

type TypographyVariant = keyof typeof tokens.typography.fontSizes;

export interface StyledTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  fontWeight?: '400' | '500' | '600' | '700' | '800';
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
}

export const Text = memo(function Text({
  variant, color, fontWeight, textAlign, lineHeight, letterSpacing, style, children, ...rest
}: StyledTextProps) {
  const fontSize = variant ? tokens.typography.fontSizes[variant] : undefined;
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
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
});

export default Text;
