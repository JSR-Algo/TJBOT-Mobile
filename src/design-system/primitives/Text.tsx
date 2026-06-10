import React, { memo } from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { tokens } from '@/design-system/tokens';
import { translateReactNode, useAppLanguage, type TranslationPersona } from '@/services/i18n/i18n';

type TypographyVariant = keyof typeof tokens.typography.fontSizes;

export interface StyledTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  fontWeight?: '400' | '500' | '600' | '700' | '800';
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  i18n?: boolean;
  i18nPersona?: TranslationPersona;
}

export const Text = memo(function Text({
  variant, color, fontWeight, textAlign, style, children, i18n = true, i18nPersona = 'parent', ...rest
}: StyledTextProps) {
  useAppLanguage();
  const fontSize = variant ? tokens.typography.fontSizes[variant] : undefined;
  const renderedChildren = i18n ? translateReactNode(children, { persona: i18nPersona }) : children;
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
      {renderedChildren}
    </RNText>
  );
});

export default Text;
