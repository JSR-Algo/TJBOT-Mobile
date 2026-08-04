import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/design-system/primitives';
import theme from '@/design-system/tokens/legacy-semantic';
import { translateTemplate, useAppLanguage } from '@/services/i18n/i18n';

interface OnboardingHeaderProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  hero: React.ReactNode;
}

export function OnboardingHeader({
  currentStep,
  totalSteps,
  title,
  subtitle,
  hero,
}: OnboardingHeaderProps): React.JSX.Element {
  const { language } = useAppLanguage();
  const progressRatio = Math.min(Math.max(currentStep / totalSteps, 0), 1);

  return (
    <View style={styles.container}>
      <View style={styles.heroCircle}>{hero}</View>
      <Text style={styles.stepLabel} i18n={false}>
        {translateTemplate(
          'Step {{current}} of {{total}}',
          { current: currentStep, total: totalSteps },
          { locale: language },
        )}
      </Text>
      <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: totalSteps, now: currentStep }}>
        <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  heroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primary + '14',
    borderWidth: 1,
    borderColor: theme.colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  stepLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.divider,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 360,
  },
});
