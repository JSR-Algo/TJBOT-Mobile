import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox, StyleSheet } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';
import { HouseholdProvider } from './contexts/HouseholdContext';
import { InteractionProvider } from './contexts/InteractionContext';
import { AppNavigator } from './navigation/AppNavigator';
import ParentNotificationCoordinator from './features/parent/notifications/ParentNotificationCoordinator';
import { ToastProvider } from './components/Toast';
import { RootErrorBoundary } from './services/observability/RootErrorBoundary';
import { QueryProvider } from './app/providers/QueryProvider';
import { ParentSessionProvider } from './features/parent/context/ParentSessionContext';
import * as SecureStore from 'expo-secure-store';
import { useLoadAppLanguagePreference } from './services/i18n/i18n';

type ResolvedRole = 'child' | 'teen' | 'adult' | 'unknown';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export const __ageGateBootPromise: Promise<ResolvedRole> = (async () => {
  let role: ResolvedRole = 'unknown';
  try {
    const stored = await SecureStore.getItemAsync('age_answer_completed');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { role?: ResolvedRole };
        if (parsed.role === 'child' || parsed.role === 'teen' || parsed.role === 'adult') {
          role = parsed.role;
        }
      } catch { /* malformed — keep unknown */ }
    }
  } catch { /* keychain failure — keep unknown */ }
  return role;
})();

function AppInner(): React.JSX.Element {
  useLoadAppLanguagePreference();

  return (
    <HouseholdProvider>
      <ParentNotificationCoordinator />
      <ParentSessionProvider>
        <InteractionProvider>
          <AppNavigator />
        </InteractionProvider>
      </ParentSessionProvider>
    </HouseholdProvider>
  );
}

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root} testID="appRoot">
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <QueryProvider>
              <RootErrorBoundary>
                <AppInner />
              </RootErrorBoundary>
            </QueryProvider>
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
