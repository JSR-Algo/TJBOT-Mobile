import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { colors } from '../theme';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { CoppaConsentScreen } from '../screens/onboarding/CoppaConsentScreen';
import { HouseholdCreateScreen } from '../screens/onboarding/HouseholdCreateScreen';
import { AddChildScreen } from '../screens/onboarding/AddChildScreen';
import { InterestSetupScreen } from '../screens/onboarding/InterestSetupScreen';
import { DeviceSetupIntroScreen } from '../screens/onboarding/DeviceSetupIntroScreen';
import { VoiceTestScreen } from '../screens/onboarding/VoiceTestScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CoppaConsent" component={CoppaConsentScreen} options={{ title: 'Parental Consent' }} />
      <Stack.Screen name="HouseholdCreate" component={HouseholdCreateScreen} options={{ title: 'Set Up Your Family' }} />
      <Stack.Screen name="AddChild" component={AddChildScreen} options={{ title: 'Add a Child' }} />
      <Stack.Screen name="InterestSetup" component={InterestSetupScreen} options={{ title: "What does your child love?" }} />
      <Stack.Screen name="DeviceSetupIntro" component={DeviceSetupIntroScreen} options={{ title: 'Connect TBOT' }} />
      <Stack.Screen name="VoiceTest" component={VoiceTestScreen} options={{ title: 'Voice Test' }} />
    </Stack.Navigator>
  );
}
