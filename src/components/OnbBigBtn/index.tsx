import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/design-system/primitives/Text';
import { OB } from '@/components/OnbShell';

type Props = {
  children?: React.ReactNode;
  onClick?: () => void;
  onPress?: () => void;
  color?: string;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

export default function OnbBigBtn({ children, onClick, onPress, color = OB.accent, secondary = false, danger = false, disabled = false, testID, accessibilityLabel }: Props) {
  const handler = onClick ?? onPress;
  const label = accessibilityLabel ?? (typeof children === 'string' ? children : undefined);
  if (secondary) {
    return (
      <TouchableOpacity
        onPress={handler}
        disabled={disabled}
        style={[styles.base, styles.secondary]}
        activeOpacity={0.7}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <Text fontWeight="500" style={{ fontSize: 16, color: OB.ink }}>
          {children}
        </Text>
      </TouchableOpacity>
    );
  }

  const bg = danger ? OB.danger : color;
  const shadowColor = danger ? '#C0392B' : '#2A6FDB';

  return (
    <TouchableOpacity
      onPress={handler}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.base, { backgroundColor: bg }, styles.primary, { shadowColor }]}
      activeOpacity={0.7}
    >
      <Text fontWeight="600" style={{ fontSize: 16, color: '#fff' }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  primary: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
});
