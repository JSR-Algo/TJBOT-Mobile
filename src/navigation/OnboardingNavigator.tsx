import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import { ONBOARDING_INITIAL_ROUTE, ONBOARDING_MOUNTED_STACK_SCREENS } from './featureRegistry';
import { ONBOARDING_STACK_SCREEN_OPTIONS } from './options';

const Stack = createNativeStackNavigator<RootStackParamList>();
const FeatureScreen = Stack.Screen as React.ComponentType<{
  name: keyof RootStackParamList;
  component: React.ElementType;
}>;

export function OnboardingNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName={ONBOARDING_INITIAL_ROUTE} screenOptions={ONBOARDING_STACK_SCREEN_OPTIONS}>
      {ONBOARDING_MOUNTED_STACK_SCREENS.map(screen => (
        <FeatureScreen key={screen.name} name={screen.name} component={screen.component} />
      ))}
    </Stack.Navigator>
  );
}
