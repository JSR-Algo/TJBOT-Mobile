import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import { AUTH_INITIAL_ROUTE, AUTH_MOUNTED_STACK_SCREENS } from './featureRegistry';
import { AUTH_STACK_SCREEN_OPTIONS } from './options';

const Stack = createNativeStackNavigator<RootStackParamList>();
const FeatureScreen = Stack.Screen as React.ComponentType<{
  name: keyof RootStackParamList;
  component: React.ElementType;
}>;

export function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName={AUTH_INITIAL_ROUTE} screenOptions={AUTH_STACK_SCREEN_OPTIONS}>
      {AUTH_MOUNTED_STACK_SCREENS.map(screen => (
        <FeatureScreen key={screen.name} name={screen.name} component={screen.component} />
      ))}
    </Stack.Navigator>
  );
}
