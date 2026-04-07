import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from '../../components';
import theme from '../../theme';
import type { OnboardingScreenProps } from '../../navigation/types';

export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.hero}>🤖</Text>
      <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.sm }}>
        Step 1 of 5
      </Text>
      <Text style={styles.title}>Welcome to TBOT</Text>
      <Text style={styles.subtitle}>
        Your child's friendly AI companion — designed to learn, grow, and have fun together.
      </Text>

      <View style={styles.features}>
        {[
          { icon: '🎤', text: 'Voice-first conversations built for kids' },
          { icon: '🔒', text: 'COPPA-compliant parental controls' },
          { icon: '📈', text: 'Learning progress you can track' },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <Button
        label="Get Started"
        onPress={() => navigation.navigate('CoppaConsent')}
      />
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
  hero: {
    fontSize: 80,
    marginBottom: theme.spacing.md,
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
  featureIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  featureText: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    flex: 1,
  },
});
