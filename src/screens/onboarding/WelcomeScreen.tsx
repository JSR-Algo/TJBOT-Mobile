import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Bot, Mic, ShieldCheck, TrendingUp } from 'lucide-react-native';
import { Button, OnboardingHeader } from '../../components';
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
      <OnboardingHeader
        currentStep={1}
        totalSteps={7}
        hero={<Bot size={56} color={theme.colors.primary} strokeWidth={2} />}
        title="Welcome to TBOT"
        subtitle="Your child's friendly AI companion — designed to feel safe, calm, and easy for parents to set up."
      />

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
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
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
