import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from './ThemeProvider';

type Props = { children: React.ReactNode };

// QueryProvider, I18nextProvider, and ErrorBoundary are restored after
// react-i18next plus @tanstack/react-query finish the dependency promotion.
export function AppProviders({ children }: Props) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
