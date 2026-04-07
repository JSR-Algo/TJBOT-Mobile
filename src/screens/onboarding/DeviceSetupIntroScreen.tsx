import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from '../../components';
import theme from '../../theme';
import type { OnboardingScreenProps } from '../../navigation/types';
import { useHousehold } from '../../contexts/HouseholdContext';


const STEPS = [
  { icon: '🔌', text: 'Power on your TBOT device' },
  { icon: '📶', text: 'Connect TBOT to your Wi-Fi' },
  { icon: '🔗', text: 'Pair via the app — takes under a minute' },
  { icon: '🤖', text: "Start talking — your child's companion is ready" },
];

export function DeviceSetupIntroScreen({ navigation }: OnboardingScreenProps<'DeviceSetupIntro'>): React.JSX.Element {
  const { completeOnboarding } = useHousehold();

  const handleSkip = () => {
    completeOnboarding(false);
  };

  const handlePair = () => {
    completeOnboarding(true);
    navigation.navigate('VoiceTest');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>🤖</Text>
      <Text style={{ ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.sm }}>
        Step 4 of 5
      </Text>
      <Text style={styles.title}>Let's set up your TBOT</Text>
      <Text style={styles.subtitle}>
        Follow these steps and you'll be ready in under 2 minutes.
      </Text>

      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.step}>
            <Text style={styles.stepIcon}>{step.icon}</Text>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>

      <Button
        label="I'm ready, let's pair"
        onPress={handlePair}
      />
      <Button
        label="Skip for now"
        variant="ghost"
        onPress={handleSkip}
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
  emoji: {
    fontSize: 72,
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
  steps: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  stepIcon: {
    fontSize: 28,
    marginRight: theme.spacing.md,
  },
  stepText: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    flex: 1,
  },
});
