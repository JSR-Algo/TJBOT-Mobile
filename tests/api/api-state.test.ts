import { describeApiFailure } from '../../src/utils/apiState';

describe('API state descriptions', () => {
  it('uses Retry-After seconds for rate limits', () => {
    expect(describeApiFailure({ status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'limited', retryAfterSeconds: 45 })).toEqual({
      state: 'rate_limited',
      title: 'Too many requests',
      body: 'Try again in 45 seconds.',
      retryable: true,
    });
  });

  it('separates gone, provider outage, offline, and timeout failures', () => {
    expect(describeApiFailure({ status: 410, code: 'TOKEN_ALREADY_USED', message: 'gone' }).state).toBe('gone');
    expect(describeApiFailure({ status: 502, code: 'INTERNAL_ERROR', message: 'bad gateway' }).state).toBe('provider_outage');
    expect(describeApiFailure({ code: 'NETWORK_ERROR', message: 'offline', retryable: true }).state).toBe('offline');
    expect(describeApiFailure({ code: 'NETWORK_ERROR', message: 'timeout of 30000ms exceeded', retryable: true }).state).toBe('timeout');
  });

  it('keeps backend details out of screen copy', () => {
    expect(describeApiFailure(new Error('token abc123 parent@example.com failed'))).toEqual({
      state: 'unknown',
      title: 'Something went wrong',
      body: 'Try again.',
      retryable: true,
    });
  });
});
