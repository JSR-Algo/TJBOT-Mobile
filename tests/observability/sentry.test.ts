describe('sentry observability', () => {
  it('captures sanitized error messages only', () => {
    jest.resetModules();

    const captureException = jest.fn();

    jest.doMock('../../src/__env__', () => ({
      ENV: { EXPO_PUBLIC_SENTRY_DSN: 'https://public@sentry.test/1' },
    }));
    jest.doMock('@sentry/react-native', () => ({
      init: jest.fn(),
      captureException,
      getCurrentScope: jest.fn(() => ({ setUser: jest.fn() })),
    }));

    const sentry = jest.requireActual('../../src/services/observability/sentry') as typeof import('../../src/services/observability/sentry');

    sentry.initSentry();
    sentry.captureError(new Error('token abc123 leaked for parent@example.com'));

    const captured = captureException.mock.calls[0][0] as Error;
    expect(captured.message).toBe('An unexpected error occurred. Please try again.');
  });
});
