import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Bot, Power, Wifi, Link2, Mic } from 'lucide-react-native';
import { Button } from '../../components';
import theme from '../../theme';
import type { OnboardingScreenProps } from '../../navigation/types';
import { useHousehold } from '../../contexts/HouseholdContext';

type StepIcon = React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;

const STEPS: Array<{ Icon: StepIcon; text: string }> = [
  { Icon: Power, text: 'Power on your TBOT device' },
  { Icon: Wifi, text: 'Connect TBOT to your Wi-Fi' },
  { Icon: Link2, text: 'Pair via the app — takes under a minute' },
  { Icon: Mic, text: "Start talking — your child's companion is ready" },
];

export function DeviceSetupIntroScreen({ navigation }: OnboardingScreenProps<'DeviceSetupIntro'>): React.JSX.Element {
  const { completeOnboarding } = useHousehold();

  const handleSkip = () => { completeOnboarding(false); };
  const handlePair = () => { completeOnboarding(true); navigation.navigate('VoiceTest'); };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCircle}>
        <Bot size={52} color={theme.colors.primary} strokeWidth={2} />
      </View>
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
            <View style={styles.stepIconBg}>
              <step.Icon size={22} color={theme.colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>

      <Button label="I'm ready, let's pair" onPress={handlePair} />
      <Button label="Skip for now" variant="ghost" onPress={handleSkip} />
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
  stepIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  stepText: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    flex: 1,
  },
});
