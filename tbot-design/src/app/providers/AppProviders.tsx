import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from '@/components/ErrorBoundary';
import i18n from '@/services/i18n/i18n';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';

type Props = { children: React.ReactNode };

export function AppProviders({ children }: Props) {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryProvider>
          <I18nextProvider i18n={i18n}>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </I18nextProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
