import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/design-system/primitives/Text';
import { referenceColors, referenceShadow } from '@/design-system/referenceTheme';
import { translateCopy, useAppLanguage } from '@/services/i18n/i18n';

type Props = {
  children?: React.ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export default function DeviceBigBtn({ children, onClick, secondary, danger, disabled = false, accessibilityLabel }: Props) {
  const { language } = useAppLanguage();
  const labelSource = accessibilityLabel ?? (typeof children === 'string' ? children : undefined);
  const label = labelSource ? translateCopy(labelSource, { locale: language }) : undefined;
  if (secondary) {
    return (
      <TouchableOpacity
        onPress={onClick}
        disabled={disabled}
        style={[styles.base, styles.secondary]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <Text fontWeight="800" style={styles.secondaryLabel}>
          {children}
        </Text>
      </TouchableOpacity>
    );
  }

  const bg = danger ? '#C0392B' : referenceColors.primary;
  return (
    <TouchableOpacity
      onPress={onClick}
      disabled={disabled}
      style={[styles.base, { backgroundColor: bg }, styles.primary]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Text fontWeight="800" style={styles.primaryLabel}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    minHeight: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondary: {
    backgroundColor: referenceColors.card,
    borderWidth: 1,
    borderColor: referenceColors.line,
  },
  primary: {
    ...referenceShadow.button,
  },
  primaryLabel: { fontSize: 17, color: referenceColors.ctaInk },
  secondaryLabel: { fontSize: 17, color: referenceColors.ink },
});
