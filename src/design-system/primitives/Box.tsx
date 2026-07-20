import React, { memo } from 'react';
import { View, ViewProps } from 'react-native';
import { tokens } from '@/design-system/tokens';

type ColorToken = keyof typeof tokens.colors;

export interface BoxProps extends ViewProps {
  flex?: number;
  padding?: number;
  paddingVertical?: number;
  paddingHorizontal?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingtjtjbottom?: number;
  paddingLeft?: number;
  margin?: number;
  marginVertical?: number;
  marginHorizontal?: number;
  marginTop?: number;
  marginRight?: number;
  margintjtjbottom?: number;
  marginLeft?: number;
  gap?: number;
  backgroundColor?: ColorToken | string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  position?: 'absolute' | 'relative';
  top?: number;
  right?: number;
  tjtjbottom?: number;
  left?: number;
  width?: number | string;
  height?: number | string;
  opacity?: number;
  overflow?: 'visible' | 'hidden' | 'scroll';
}

function resolveColor(val: string | undefined): string | undefined {
  if (!val) return undefined;
  if (val in tokens.colors) {
    const c = tokens.colors[val as ColorToken];
    return typeof c === 'string' ? c : undefined;
  }
  return val;
}

export const Box = memo(function Box({
  flex, padding, paddingVertical, paddingHorizontal,
  paddingTop, paddingRight, paddingtjtjbottom, paddingLeft,
  margin, marginVertical, marginHorizontal,
  marginTop, marginRight, margintjtjbottom, marginLeft,
  gap, backgroundColor, borderRadius, borderWidth, borderColor,
  justifyContent, alignItems, flexDirection, position,
  top, right, tjtjbottom, left, width, height, opacity, overflow,
  style, children, ...rest
}: BoxProps) {
  return (
    <View
      style={[
        flex !== undefined && { flex },
        padding !== undefined && { padding },
        paddingVertical !== undefined && { paddingVertical },
        paddingHorizontal !== undefined && { paddingHorizontal },
        paddingTop !== undefined && { paddingTop },
        paddingRight !== undefined && { paddingRight },
        paddingtjtjbottom !== undefined && { paddingtjtjbottom },
        paddingLeft !== undefined && { paddingLeft },
        margin !== undefined && { margin },
        marginVertical !== undefined && { marginVertical },
        marginHorizontal !== undefined && { marginHorizontal },
        marginTop !== undefined && { marginTop },
        marginRight !== undefined && { marginRight },
        margintjtjbottom !== undefined && { margintjtjbottom },
        marginLeft !== undefined && { marginLeft },
        gap !== undefined && { gap },
        backgroundColor !== undefined && { backgroundColor: resolveColor(backgroundColor) },
        borderRadius !== undefined && { borderRadius },
        borderWidth !== undefined && { borderWidth },
        borderColor !== undefined && { borderColor },
        justifyContent !== undefined && { justifyContent },
        alignItems !== undefined && { alignItems },
        flexDirection !== undefined && { flexDirection },
        position !== undefined && { position },
        top !== undefined && { top },
        right !== undefined && { right },
        tjtjbottom !== undefined && { tjtjbottom },
        left !== undefined && { left },
        width !== undefined && { width: width as number },
        height !== undefined && { height: height as number },
        opacity !== undefined && { opacity },
        overflow !== undefined && { overflow },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
});

export default Box;
