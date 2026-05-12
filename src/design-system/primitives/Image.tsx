import React, { memo } from 'react';
import { Image as RNImage, ImageProps, ImageStyle, StyleProp } from 'react-native';

export interface StyledImageProps extends ImageProps {
  width?: number;
  height?: number;
  resizeMode?: ImageStyle['resizeMode'];
}

export const Image = memo(function Image({
  width, height, resizeMode = 'cover', style, ...rest
}: StyledImageProps) {
  return (
    <RNImage
      style={[
        width !== undefined && { width },
        height !== undefined && { height },
        { resizeMode },
        style as StyleProp<ImageStyle>,
      ]}
      {...rest}
    />
  );
});

export default Image;
