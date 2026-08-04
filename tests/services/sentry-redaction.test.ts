import {
  captureError,
  initSentry,
  isSentryEnabled,
  setSentryUserRole,
  type InitSentryOptions,
} from '../../src/services/observability/sentry';

describe('Kids Category crash-reporting policy', () => {
  it.each<InitSentryOptions>([
    { userRole: 'unknown', enableAutoSessionTracking: false },
    { userRole: 'child' },
    { userRole: 'teen' },
    { userRole: 'adult' },
  ])('keeps crash reporting disabled for %j', options => {
    expect(() => {
      initSentry(options);
      setSentryUserRole(options.userRole ?? 'unknown');
      captureError(new Error('private diagnostic detail'));
    }).not.toThrow();
    expect(isSentryEnabled()).toBe(false);
  });
});
