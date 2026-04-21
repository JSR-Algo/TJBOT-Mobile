import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Bot, Mic, ShieldCheck, TrendingUp } from 'lucide-react-native';
import { Button } from '../../components';
import theme from '../../theme';
import type { OnboardingScreenProps } from '../../navigation/types';

const FEATURES: Array<{ Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>; text: string }> = [
  { Icon: Mic, text: 'Voice-first conversations built for kids' },
  { Icon: ShieldCheck, text: 'COPPA-compliant parental controls' },
  { Icon: TrendingUp, text: 'Learning progress you can track' },
];

export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCircle}>
        <Bot size={56} color={theme.colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.stepLabel}>Step 1 of 5</Text>
      <Text style={styles.title}>Welcome to TBOT</Text>
      <Text style={styles.subtitle}>
        Your child's friendly AI companion — designed to learn, grow, and have fun together.
      </Text>

      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={styles.featureIconBg}>
              <f.Icon size={22} color={theme.colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <Button label="Get Started" onPress={() => navigation.navigate('CoppaConsent')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primary + '18',
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
    marginBottom: theme.spacing.xl,
  },
  features: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  featureText: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    flex: 1,
  },
});
