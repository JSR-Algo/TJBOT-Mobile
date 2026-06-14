/**
 * ScreenState — standardized loading / empty / error "signpost" for any screen.
 *
 * Part of the app-wide guidance system (alongside the toast layer): instead of
 * each screen inventing its own bare "Loading…" text or blank empty view, render
 * a consistent, accessible state with an optional retry so users always know
 * what's happening and what to do next.
 *
 *   <ScreenState variant="loading" message="Loading today's progress" />
 *   <ScreenState variant="empty" title="No lessons yet" message="Pair a robot to begin." />
 *   <ScreenState variant="error" message="Couldn't load history." onRetry={refetch} />
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/design-system/primitives/Text';
import { colors, spacing, radii } from '@/design-system/tokens';

export type ScreenStateVariant = 'loading' | 'empty' | 'error';

interface ScreenStateProps {
  variant: ScreenStateVariant;
  title?: string;
  message?: string;
  /** Emoji/glyph shown above the title for empty/error states. */
  icon?: string;
  onRetry?: () => void;
  retryLabel?: string;
  testID?: string;
}

const DEFAULTS: Record<ScreenStateVariant, { title: string; icon: string }> = {
  loading: { title: 'Loading…', icon: '' },
  empty: { title: 'Nothing here yet', icon: '🌱' },
  error: { title: 'Something went wrong', icon: '⚠️' },
};

export function ScreenState({
  variant,
  title,
  message,
  icon,
  onRetry,
  retryLabel = 'Try again',
  testID,
}: ScreenStateProps): React.JSX.Element {
  const defaults = DEFAULTS[variant];
  const heading = title ?? defaults.title;
  const glyph = icon ?? defaults.icon;

  return (
    <View
      testID={testID ?? `screen-state-${variant}`}
      style={styles.root}
      accessibilityRole={variant === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={variant === 'loading' ? 'polite' : undefined}
    >
      {variant === 'loading' ? (
        <ActivityIndicator size="large" color={colors.coral} accessibilityLabel="Loading" />
      ) : glyph ? (
        <Text style={styles.icon}>{glyph}</Text>
      ) : null}

      <Text fontWeight="700" style={styles.title}>
        {heading}
      </Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          style={styles.retry}
          activeOpacity={0.8}
        >
          <Text fontWeight="700" style={styles.retryLabel}>
            {retryLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  icon: { fontSize: 40 },
  title: { fontSize: 18, color: colors.ink, textAlign: 'center' },
  message: {
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  retry: {
    marginTop: spacing.sm,
    backgroundColor: colors.coral,
    borderRadius: radii.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: { fontSize: 15, color: colors.ink },
});
