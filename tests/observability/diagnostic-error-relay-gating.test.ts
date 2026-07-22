import {
  clearDiagnosticLog,
  diagnosticLog,
} from '@/services/observability/diagnosticLog';
import {
  clearPendingDiagnosticError,
  getPendingDiagnosticError,
} from '@/services/observability/diagnosticErrorState';
import {
  __resetDiagnosticErrorRelayForTests,
  installDiagnosticErrorRelay,
} from '@/services/observability/installDiagnosticErrorRelay';

describe('diagnostic error relay UI gating', () => {
  const originalFlag = process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY;

  beforeEach(() => {
    __resetDiagnosticErrorRelayForTests();
    clearPendingDiagnosticError();
    clearDiagnosticLog();
  });

  afterEach(() => {
    __resetDiagnosticErrorRelayForTests();
    clearPendingDiagnosticError();
    process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY = originalFlag;
  });

  it('flag off: 5xx errors stay in the log but do not create pending banner state', () => {
    delete process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY;
    installDiagnosticErrorRelay();

    diagnosticLog({
      severity: 'error',
      category: 'api',
      event: 'http_error',
      message: 'Something went wrong on our end. Please try again.',
      detail: { status: 500, code: 'INTERNAL_ERROR' },
    });

    expect(getPendingDiagnosticError()).toBeNull();
  });

  it('flag on: error severity creates pending developer diagnostic state', () => {
    process.env.EXPO_PUBLIC_DIAGNOSTIC_OVERLAY = '1';
    installDiagnosticErrorRelay();

    diagnosticLog({
      severity: 'error',
      category: 'api',
      event: 'http_error',
      message: 'Something went wrong on our end. Please try again.',
      detail: { status: 500, code: 'INTERNAL_ERROR' },
    });

    const pending = getPendingDiagnosticError();
    expect(pending).not.toBeNull();
    expect(pending?.entry.severity).toBe('error');
    expect(pending?.entry.event).toBe('http_error');
  });
});
