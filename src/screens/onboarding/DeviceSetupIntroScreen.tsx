import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Bot, Power, Wifi, Link2, Mic } from 'lucide-react-native';
import { Button, OnboardingHeader } from '../../components';
import theme from '@/design-system/tokens/legacy-semantic';
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
  const handlePair = () => { navigation.navigate('VoiceTest'); };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <OnboardingHeader
        currentStep={6}
        totalSteps={7}
        hero={<Bot size={52} color={theme.colors.primary} strokeWidth={2} />}
        title="Before we pair your TBOT"
        subtitle="One quick voice check comes next, then we’ll take you straight into device registration."
      />

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

      <Button label="Continue to voice check" onPress={handlePair} />
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
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
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
