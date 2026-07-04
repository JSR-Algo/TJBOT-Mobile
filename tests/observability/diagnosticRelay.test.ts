jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
  isAxiosError: () => false,
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.0.0', ios: { buildNumber: '1' } },
    nativeAppVersion: '1.0.0',
    nativeBuildVersion: '1',
  },
}));

import axios from 'axios';
import { clearDiagnosticLog, diagnosticLog } from '@/services/observability/diagnosticLog';
import { sendDiagnosticReport } from '@/services/observability/diagnosticRelay';

const postMock = axios.post as jest.Mock;

describe('diagnosticRelay', () => {
  beforeEach(() => {
    clearDiagnosticLog();
    postMock.mockReset();
    postMock.mockResolvedValue({ data: { ok: true, sent: true } });
  });

  it('posts formatted log to the VPS diagnostic endpoint', async () => {
    diagnosticLog({
      severity: 'error',
      category: 'api',
      event: 'http_error',
      message: 'server down',
    });

    const result = await sendDiagnosticReport({ trigger: 'test' });
    expect(result.ok).toBe(true);
    expect(postMock).toHaveBeenCalledTimes(1);
    const [url, body] = postMock.mock.calls[0] as [string, { log: string; trigger: string }];
    expect(url).toContain('/dev/diagnostic-report');
    expect(body.trigger).toBe('test');
    expect(body.log).toContain('server down');
  });
});