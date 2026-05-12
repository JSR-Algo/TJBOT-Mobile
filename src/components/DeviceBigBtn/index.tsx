import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/design-system/primitives/Text';

const DV = {
  ink: '#1A1A1F',
  hair: 'rgba(0,0,0,0.07)',
  accent: '#2A6FDB',
} as const;

type Props = {
  children?: React.ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  danger?: boolean;
};

export default function DeviceBigBtn({ children, onClick, secondary, danger }: Props) {
  if (secondary) {
    return (
      <TouchableOpacity onPress={onClick} style={[styles.base, styles.secondary]} activeOpacity={0.7}>
        <Text fontWeight="500" style={{ fontSize: 16, color: DV.ink }}>
          {children}
        </Text>
      </TouchableOpacity>
    );
  }

  const bg = danger ? '#C0392B' : DV.accent;
  return (
    <TouchableOpacity onPress={onClick} style={[styles.base, { backgroundColor: bg }, styles.primary]} activeOpacity={0.7}>
      <Text fontWeight="600" style={{ fontSize: 16, color: '#fff' }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    minHeight: 50,
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
    shadowColor: '#2A6FDB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
});
