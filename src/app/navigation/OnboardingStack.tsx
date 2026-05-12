import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import SplashScreen from '@/features/onboarding/screens/SplashScreen';
import WelcomeScreen from '@/features/onboarding/screens/WelcomeScreen';
import MicAskScreen from '@/features/onboarding/screens/MicAskScreen';
import TrustScreen from '@/features/onboarding/screens/TrustScreen';
import IntroListenScreen from '@/features/onboarding/screens/IntroListenScreen';
import IntroSpeakScreen from '@/features/onboarding/screens/IntroSpeakScreen';
import IntroRetryScreen from '@/features/onboarding/screens/IntroRetryScreen';
import IntroCelebrateScreen from '@/features/onboarding/screens/IntroCelebrateScreen';
import FirstLessonEntryScreen from '@/features/onboarding/screens/FirstLessonEntryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function OnboardingStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SplashScreen" component={SplashScreen} />
      <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
      <Stack.Screen name="MicAskScreen" component={MicAskScreen} />
      <Stack.Screen name="TrustScreen" component={TrustScreen} />
      <Stack.Screen name="IntroListenScreen" component={IntroListenScreen} />
      <Stack.Screen name="IntroSpeakScreen" component={IntroSpeakScreen} />
      <Stack.Screen name="IntroRetryScreen" component={IntroRetryScreen} />
      <Stack.Screen name="IntroCelebrateScreen" component={IntroCelebrateScreen} />
      <Stack.Screen name="FirstLessonEntryScreen" component={FirstLessonEntryScreen} />
    </Stack.Navigator>
  );
}
