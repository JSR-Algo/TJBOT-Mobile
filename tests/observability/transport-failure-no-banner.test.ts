import {
  clearDiagnosticLog,
  diagnosticLog,
  getDiagnosticEntries,
  logApiFailure,
  subscribeDiagnosticErrors,
} from '@/services/observability/diagnosticLog';

describe('transport failure honesty without error overlay', () => {
  beforeEach(() => {
    clearDiagnosticLog();
  });

  it('records transport_failure as info so error listeners (banner) do not fire', () => {
    const errors: string[] = [];
    const unsub = subscribeDiagnosticErrors((entry) => {
      errors.push(entry.event);
    });

    diagnosticLog({
      severity: 'info',
      category: 'api',
      event: 'transport_failure',
      message: 'ERR_NETWORK: Network Error → GET /households/x/children',
    });

    expect(getDiagnosticEntries().some((e) => e.event === 'transport_failure')).toBe(true);
    expect(errors).toEqual([]);
    unsub();
  });

  it('records no-status http_error as info, not error', () => {
    const errors: string[] = [];
    const unsub = subscribeDiagnosticErrors((entry) => {
      errors.push(entry.event);
    });

    logApiFailure('get', '/households/x/children', undefined, 'NETWORK_ERROR', 'Network Error');

    const entry = getDiagnosticEntries().find((e) => e.event === 'http_error');
    expect(entry?.severity).toBe('info');
    expect(errors).toEqual([]);
    unsub();
  });

  it('still records genuine 5xx as error for ring-buffer/telemetry listeners', () => {
    const errors: string[] = [];
    const unsub = subscribeDiagnosticErrors((entry) => {
      errors.push(entry.event);
    });

    logApiFailure(
      'get',
      '/learning/children/x/pronunciation-trend',
      500,
      'INTERNAL_ERROR',
      'Something went wrong on our end. Please try again.',
    );

    const entry = getDiagnosticEntries().find((e) => e.event === 'http_error');
    expect(entry?.severity).toBe('error');
    expect(errors).toEqual(['http_error']);
    unsub();
  });
});
