import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppProviders } from '@/app/providers/AppProviders';
import RootNavigator from '@/app/RootNavigator';

export default function App() {
  return (
    <AppProviders>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}
