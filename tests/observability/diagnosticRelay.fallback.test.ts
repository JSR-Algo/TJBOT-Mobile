/**
 * TEMPORARY DIAGNOSTICS LAYER test — remove with the layer (docs/TEMP-DIAGNOSTICS-REMOVAL.md).
 *
 * Proves the manual "Send diagnostic" path still delivers when the backend relay
 * endpoint (/dev/diagnostic-report) is unreachable: sendDiagnosticReport must fall
 * back to a DIRECT Telegram post, and must stay inert in production (flag off).
 *
 * The Telegram env flags are read at module-load time in directTelegramRelay.ts, so
 * each case sets process.env BEFORE requiring the modules inside isolateModulesAsync.
 */
const mockBackendPost = jest.fn();

jest.mock('axios', () => {
  const isAxiosError = () => true;
  return {
    __esModule: true,
    default: { post: (...args: unknown[]) => mockBackendPost(...args), isAxiosError },
    isAxiosError,
  };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.0.0', ios: { buildNumber: '1' } },
    nativeAppVersion: '1.0.0',
    nativeBuildVersion: '1',
  },
}));

type FetchInit = { method: string; headers: Record<string, string>; body: string };

describe('diagnosticRelay direct-Telegram fallback (TEMPORARY layer)', () => {
  const OLD_ENV = process.env;
  const OLD_FETCH = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      EXPO_PUBLIC_DIAG_DIRECT_TO_TELEGRAM: '1',
      EXPO_PUBLIC_DIAG_TELEGRAM_BOT_TOKEN: 'test-bot-token',
      EXPO_PUBLIC_DIAG_TELEGRAM_CHAT_ID: '12345',
    };
    mockBackendPost.mockReset();
    // Backend endpoint is not deployed → 404 (matches the real Render response).
    mockBackendPost.mockRejectedValue({
      isAxiosError: true,
      code: undefined,
      response: { status: 404, data: { message: 'Cannot POST /v1/dev/diagnostic-report' } },
      message: 'Request failed with status code 404',
    });
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    global.fetch = OLD_FETCH;
  });

  it('relays the diagnostic export to Telegram when the backend returns 404', async () => {
    await jest.isolateModulesAsync(async () => {
      const {
        diagnosticLog,
        clearDiagnosticLog,
      } = require('@/services/observability/diagnosticLog');
      const { sendDiagnosticReport } = require('@/services/observability/diagnosticRelay');

      clearDiagnosticLog();
      diagnosticLog({
        severity: 'error',
        category: 'api',
        event: 'http_error',
        message: 'backend exploded',
      });

      const result = await sendDiagnosticReport({ trigger: 'parent_manual' });

      expect(result.ok).toBe(true);
      expect(result.sent).toBe(true);
      expect(result.skipped).toContain('direct_telegram');

      // Backend attempted exactly once, then the Telegram fallback fired.
      expect(mockBackendPost).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalled();

      const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [string, FetchInit];
      expect(calledUrl).toContain('api.telegram.org/bottest-bot-token/sendMessage');
      const body = JSON.parse(calledInit.body) as { chat_id: string; text: string };
      expect(body.chat_id).toBe('12345');
      expect(body.text).toContain('backend exploded');
      expect(body.text).toContain('direct fallback');
    });
  });

  it('returns the backend error and never touches Telegram when disabled (production)', async () => {
    process.env.EXPO_PUBLIC_DIAG_DIRECT_TO_TELEGRAM = '0';
    await jest.isolateModulesAsync(async () => {
      const {
        diagnosticLog,
        clearDiagnosticLog,
      } = require('@/services/observability/diagnosticLog');
      const { sendDiagnosticReport } = require('@/services/observability/diagnosticRelay');

      clearDiagnosticLog();
      diagnosticLog({
        severity: 'error',
        category: 'api',
        event: 'http_error',
        message: 'backend exploded',
      });

      const result = await sendDiagnosticReport({ trigger: 'parent_manual' });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Cannot POST');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
