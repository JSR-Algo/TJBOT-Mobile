import React from 'react';
import * as Lucide from 'lucide-react-native';
import { tokens } from '@/design-system/tokens';

export type IconName = keyof typeof Lucide;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  accessibilityLabel?: string;
  testID?: string;
}

export function Icon({
  name,
  size = 24,
  color = tokens.colors.ink,
  strokeWidth = 2,
  accessibilityLabel,
  testID,
}: IconProps): React.JSX.Element {
  const LucideIcon = Lucide[name] as React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
    accessibilityLabel?: string;
    testID?: string;
  }>;

  return (
    <LucideIcon
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
}

export default Icon;
