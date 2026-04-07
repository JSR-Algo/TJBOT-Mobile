import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';
import { HouseholdProvider } from './contexts/HouseholdContext';
import { InteractionProvider } from './contexts/InteractionContext';
import { RootNavigator } from './navigation/RootNavigator';
import { usePushNotifications } from './hooks/usePushNotifications';

function AppInner(): React.JSX.Element {
  usePushNotifications();
  return (
    <HouseholdProvider>
      <InteractionProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </InteractionProvider>
    </HouseholdProvider>
  );
}

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
