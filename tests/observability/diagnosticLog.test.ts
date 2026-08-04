jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.0.0', ios: { buildNumber: '1' } },
    nativeAppVersion: '1.0.0',
    nativeBuildVersion: '1',
  },
}));

import {
  clearDiagnosticLog,
  diagnosticLog,
  formatDiagnosticExport,
  getDiagnosticEntries,
  redactDiagnosticText,
} from '@/services/observability/diagnosticLog';
import {
  isLeakedGeminiKeyError,
  mapGeminiProviderError,
  resolveGeminiUserError,
} from '@/services/observability/geminiErrorMessages';

describe('diagnosticLog', () => {
  beforeEach(() => {
    clearDiagnosticLog();
  });

  it('redacts API keys and bearer tokens from text', () => {
    const raw = 'Bearer abc.def.ghi key=AIzaSyLeakedKeyMaterialHere12345';
    expect(redactDiagnosticText(raw)).not.toContain('AIzaSyLeaked');
    expect(redactDiagnosticText(raw)).toContain('[REDACTED]');
  });

  it('stores entries in a ring buffer and exports them', () => {
    diagnosticLog({
      severity: 'error',
      category: 'gemini',
      event: 'token_fetch_failed',
      message: 'test failure',
      detail: { status: 500 },
    });

    expect(getDiagnosticEntries()).toHaveLength(1);
    const exported = formatDiagnosticExport();
    expect(exported).toContain('TJBot Diagnostic Log');
    expect(exported).toContain('gemini.token_fetch_failed');
    expect(exported).toContain('test failure');
  });

  it('keeps captured errors out of React Native LogBox', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    diagnosticLog({
      severity: 'error',
      category: 'api',
      event: 'http_error',
      message: 'Handled backend failure',
      detail: { status: 500 },
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      '%s %s %o',
      '[diag:api] http_error',
      'Handled backend failure',
      { status: 500 },
    );

    errorSpy.mockRestore();
    infoSpy.mockRestore();
  });
});

describe('geminiErrorMessages', () => {
  it('detects leaked key errors from Google', () => {
    expect(isLeakedGeminiKeyError('API key was reported as leaked')).toBe(true);
    expect(mapGeminiProviderError('API key was reported as leaked')).toMatch(/Google blocked/);
  });

  it('resolveGeminiUserError prefers mapped copy over raw provider text', () => {
    const msg = resolveGeminiUserError('API key was reported as leaked', 'fallback');
    expect(msg).toMatch(/Google blocked/);
    expect(msg).not.toBe('fallback');
  });

  it('resolveGeminiUserError never exposes an unmapped provider string to the UI', () => {
    expect(resolveGeminiUserError('provider-specific English detail', 'Safe fallback')).toBe('Safe fallback');
  });
});
