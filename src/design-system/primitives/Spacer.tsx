import React, { memo } from 'react';
import { View } from 'react-native';

export interface SpacerProps {
  size?: number;
}

export const Spacer = memo(function Spacer({ size }: SpacerProps) {
  return (
    <View style={size !== undefined ? { width: size, height: size } : { flex: 1 }} />
  );
});

export default Spacer;
