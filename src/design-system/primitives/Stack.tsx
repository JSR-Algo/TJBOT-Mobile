import React, { memo } from 'react';
import { Box, BoxProps } from './Box';

export interface StackProps extends Omit<BoxProps, 'flexDirection'> {
  direction?: 'row' | 'column';
  gap?: number;
}

export const Stack = memo(function Stack({
  direction = 'column',
  gap,
  children,
  ...rest
}: StackProps) {
  return (
    <Box flexDirection={direction} gap={gap} {...rest}>
      {children}
    </Box>
  );
});

export default Stack;
