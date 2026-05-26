import React, { memo } from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { tokens } from '@/design-system/tokens';

type TypographyVariant = keyof typeof tokens.typography.fontSizes;

export interface StyledTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  fontWeight?: '400' | '500' | '600' | '700' | '800';
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const Text = memo(function Text({
  variant, color, fontWeight, textAlign, style, children, ...rest
}: StyledTextProps) {
  const fontSize = variant ? tokens.typography.fontSizes[variant] : undefined;
  return (
    <RNText
      style={[
        { fontFamily: 'Nunito' },
        fontSize !== undefined && { fontSize },
        color !== undefined && { color },
        fontWeight !== undefined && { fontWeight },
        textAlign !== undefined && { textAlign },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
});

export default Text;
