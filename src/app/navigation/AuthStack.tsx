import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './routes';
import LoginScreen from '@/features/auth/screens/LoginScreen';
import LoginErrorScreen from '@/features/auth/screens/LoginErrorScreen';
import ChildProfileScreen from '@/features/auth/screens/ChildProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AuthStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="LoginErrorScreen" component={LoginErrorScreen} />
      <Stack.Screen name="ChildProfileScreen" component={ChildProfileScreen} />
    </Stack.Navigator>
  );
}
