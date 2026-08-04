import {
  captureError,
  initSentry,
  isSentryEnabled,
} from '../../src/services/observability/sentry';

describe('crash observability', () => {
  it('does not transmit captured errors', () => {
    initSentry();
    expect(() =>
      captureError(new Error('token abc123 leaked for parent@example.com')),
    ).not.toThrow();
    expect(isSentryEnabled()).toBe(false);
  });
});
