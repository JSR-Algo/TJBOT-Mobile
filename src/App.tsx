import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';
import { HouseholdProvider } from './contexts/HouseholdContext';
import { InteractionProvider } from './contexts/InteractionContext';
import { RootNavigator } from './navigation/RootNavigator';
import { usePushNotifications } from './hooks/usePushNotifications';
import { ToastProvider } from './components/Toast';
import { RootErrorBoundary } from './observability/RootErrorBoundary';
import { initAnalytics } from './observability/analytics';
import { initSentry } from './observability/sentry';
import { startVoiceTelemetry } from './observability/voice-telemetry';

initSentry();
initAnalytics();

function AppInner(): React.JSX.Element {
  usePushNotifications();

  useEffect(() => {
    // Subscribe native voice-stack events to Sentry breadcrumbs (sys-16).
    // Safe in dev/sim where the native modules are absent — idempotent
    // and tears down its listeners on unmount.
    const stop = startVoiceTelemetry();
    return stop;
  }, []);

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
          <ToastProvider>
            <RootErrorBoundary>
              <AppInner />
            </RootErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
