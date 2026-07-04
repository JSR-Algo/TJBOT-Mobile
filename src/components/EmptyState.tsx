import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/design-system/tokens/legacy-semantic';
import { Button } from './Button';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/icons';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ title, subtitle, ctaLabel, onCta }: EmptyStateProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Icon name="Bot" size={64} color={colors.primary} accessibilityLabel="TeeBot" />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {ctaLabel && onCta ? (
        <Button label={ctaLabel} onPress={onCta} style={styles.cta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  cta: {
    marginTop: spacing.md,
    minWidth: 200,
  },
});
