import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox, StyleSheet } from 'react-native';
import { AuthProvider } from './contexts/AuthContext';
import { HouseholdProvider } from './contexts/HouseholdContext';
import { InteractionProvider } from './contexts/InteractionContext';
import { AppNavigator } from './navigation/AppNavigator';
import { usePushNotifications } from './hooks/usePushNotifications';
import { ToastProvider } from './components/Toast';
import { RootErrorBoundary } from './services/observability/RootErrorBoundary';
import { QueryProvider } from './app/providers/QueryProvider';
import { ParentSessionProvider } from './features/parent/context/ParentSessionContext';
import * as SecureStore from 'expo-secure-store';
import { initAnalytics, setAnalyticsUserRole } from './services/observability/analytics';
import { initSentry, setSentryUserRole } from './services/observability/sentry';
import { startVoiceTelemetry } from './services/observability/voice-telemetry';
import { installDiagnosticHooks } from './services/observability/installDiagnosticHooks';
import { installDiagnosticErrorRelay } from './services/observability/installDiagnosticErrorRelay';
import { DiagnosticCaptureRoot } from './components/DiagnosticCaptureRoot';
import { DiagnosticErrorBanner } from './components/DiagnosticErrorBanner';
import { DiagnosticOverlayButton } from './components/DiagnosticOverlayButton';
import { LessonSessionHost } from './features/lesson-session/LessonSessionHost';
import { useLoadAppLanguagePreference } from './services/i18n/i18n';

type ResolvedRole = 'child' | 'teen' | 'adult' | 'unknown';

initSentry({ userRole: 'unknown', enableAutoSessionTracking: false });

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  // Benign dev warnings that must not raise the LogBox pill over the tab bar:
  'The global process.env.EXPO_OS is not defined',
  'Require cycle: src/features/lesson-demo',
  'Require cycle: src/navigation/featureRegistry',
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
  setSentryUserRole(role);
  if (role === 'child') {
    setAnalyticsUserRole('child');
  } else if (role !== 'unknown') {
    initAnalytics(role);
  }
  return role;
})();

function AppInner(): React.JSX.Element {
  useLoadAppLanguagePreference();
  usePushNotifications();

  useEffect(() => {
    const stopDiagnostics = installDiagnosticHooks();
    const stopErrorRelay = installDiagnosticErrorRelay();
    // Subscribe native voice-stack events to Sentry breadcrumbs (sys-16).
    // Safe in dev/sim where the native modules are absent — idempotent
    // and tears down its listeners on unmount.
    const stopVoice = startVoiceTelemetry();
    return () => {
      stopVoice();
      stopErrorRelay();
      stopDiagnostics();
    };
  }, []);

  return (
    <DiagnosticCaptureRoot>
      <LessonSessionHost>
        <HouseholdProvider>
          <ParentSessionProvider>
            <InteractionProvider>
              <AppNavigator />
              <DiagnosticErrorBanner />
              <DiagnosticOverlayButton />
            </InteractionProvider>
          </ParentSessionProvider>
        </HouseholdProvider>
      </LessonSessionHost>
    </DiagnosticCaptureRoot>
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
