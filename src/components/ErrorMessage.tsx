import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/design-system/tokens/legacy-semantic';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/icons';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps): React.JSX.Element | null {
  if (!message) return null;
  return (
    <View accessible accessibilityRole="alert" style={styles.container}>
      <Icon name="TriangleAlert" size={18} color={colors.error} accessibilityLabel="Warning" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    ...typography.body2,
    color: colors.error,
  },
});
