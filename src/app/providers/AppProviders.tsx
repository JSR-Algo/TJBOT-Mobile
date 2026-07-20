import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from './ThemeProvider';

type Props = { children: React.ReactNode };

// TODO(PR2-deps): restore QueryProvider, I18nextProvider, ErrorBoundary once
// react-i18next + @tanstack/react-query are merged from tjbot-design package.json
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
