import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps): React.JSX.Element {
  if (!message) return <></>;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>⚠️ {message}</Text>
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
  },
  text: {
    ...typography.body2,
    color: colors.error,
  },
});
