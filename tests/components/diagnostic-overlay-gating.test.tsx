import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DiagnosticErrorBanner } from '@/components/DiagnosticErrorBanner';
import { DiagnosticOverlayButton } from '@/components/DiagnosticOverlayButton';
import {
  clearPendingDiagnosticError,
  setPendingDiagnosticError,
} from '@/services/observability/diagnosticErrorState';

function wrap(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 59, left: 0, right: 0, bottom: 34 },
      }}
    >
      {ui}
    </SafeAreaProvider>,
  );
}

const sampleError = {
  id: 'e1',
  at: new Date().toISOString(),
  severity: 'error' as const,
  category: 'api' as const,
  event: 'http_error',
  message: 'Something went wrong on our end. Please try again.',
};

describe('DiagnosticOverlayButton gating', () => {
  const originalFlag = process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY = originalFlag;
    clearPendingDiagnosticError();
  });

  it('hides DIAG by default without flag or pending error', () => {
    delete process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY;
    clearPendingDiagnosticError();
    const screen = wrap(<DiagnosticOverlayButton />);
    expect(screen.queryByTestId('diagnostic-overlay-button')).toBeNull();
  });

  it('shows DIAG when a pending severity error exists', () => {
    delete process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY;
    setPendingDiagnosticError(sampleError, 'idle');
    const screen = wrap(<DiagnosticOverlayButton />);
    expect(screen.getByTestId('diagnostic-overlay-button')).toBeTruthy();
  });
});

describe('DiagnosticErrorBanner gating (ordinary product use)', () => {
  const originalFlag = process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY = originalFlag;
    clearPendingDiagnosticError();
  });

  it('never shows the global banner without EXPO_PUBLIC_DIAGNOSTIC_OVERLAY=1', () => {
    delete process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY;
    setPendingDiagnosticError(sampleError, 'failed', 'diagnostic_report_relay_disabled');
    const screen = wrap(<DiagnosticErrorBanner />);
    expect(screen.queryByTestId('diagnostic-error-banner')).toBeNull();
    expect(screen.queryByText('Something went wrong')).toBeNull();
    expect(screen.queryByText(/diagnostic_report_relay_disabled/)).toBeNull();
  });

  it('shows the banner only when the explicit overlay flag is on', () => {
    process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY = '1';
    setPendingDiagnosticError(sampleError, 'idle');
    const screen = wrap(<DiagnosticErrorBanner />);
    expect(screen.getByTestId('diagnostic-error-banner')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });
});
