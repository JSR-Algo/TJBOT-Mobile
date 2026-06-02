type SentryInitCall = {
  beforeBreadcrumb?: (bc: Record<string, unknown>) => Record<string, unknown> | null;
  beforeSend?: (ev: Record<string, unknown>) => Record<string, unknown> | null;
  enableAutoSessionTracking?: boolean;
  sendDefaultPii?: boolean;
};

describe('sentry PII redaction + role-aware session', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  function setup() {
    const init = jest.fn();
    const setUser = jest.fn();
    const captureException = jest.fn();
    const getCurrentScope = jest.fn(() => ({ setUser }));

    jest.doMock('../../src/__env__', () => ({
      ENV: { EXPO_PUBLIC_SENTRY_DSN: 'https://public@sentry.test/1' },
    }));
    jest.doMock('@sentry/react-native', () => ({
      init,
      captureException,
      getCurrentScope,
    }));

    const sentry = jest.requireActual(
      '../../src/services/observability/sentry',
    ) as typeof import('../../src/services/observability/sentry');

    return { sentry, init, setUser, getCurrentScope, captureException };
  }

  function getInitArg(init: jest.Mock): SentryInitCall {
    return init.mock.calls[0][0] as SentryInitCall;
  }

  it('disables auto session tracking when explicitly requested', () => {
    const { sentry, init } = setup();
    sentry.initSentry({ userRole: 'unknown', enableAutoSessionTracking: false });
    expect(getInitArg(init).enableAutoSessionTracking).toBe(false);
  });

  it('keeps auto session tracking off for child role by default', () => {
    const { sentry, init } = setup();
    sentry.initSentry({ userRole: 'child' });
    expect(getInitArg(init).enableAutoSessionTracking).toBe(false);
  });

  it('enables auto session tracking for adult role by default', () => {
    const { sentry, init } = setup();
    sentry.initSentry({ userRole: 'adult' });
    expect(getInitArg(init).enableAutoSessionTracking).toBe(true);
  });

  it('sets sendDefaultPii=false', () => {
    const { sentry, init } = setup();
    sentry.initSentry();
    expect(getInitArg(init).sendDefaultPii).toBe(false);
  });

  it('beforeBreadcrumb strips PII keys from data', () => {
    const { sentry, init } = setup();
    sentry.initSentry();
    const beforeBreadcrumb = getInitArg(init).beforeBreadcrumb!;
    const cleaned = beforeBreadcrumb({
      category: 'navigation',
      data: {
        email: 'parent@example.com',
        accessToken: 'secret',
        childName: 'Ava',
        parent_name: 'Lee',
        displayName: 'bot',
        first_name: 'A',
        last_name: 'B',
        dob: '2020-01-01',
        birthdate: '2020-01-01',
        address: '1 Main St',
        phone: '+15555550100',
        route: '/home',
        latency_ms: 42,
      },
    }) as { data: Record<string, unknown> };
    expect(cleaned.data).toEqual({ route: '/home', latency_ms: 42 });
  });

  it('beforeSend strips PII recursively from extra/contexts/tags/user/breadcrumbs', () => {
    const { sentry, init } = setup();
    sentry.initSentry();
    const beforeSend = getInitArg(init).beforeSend!;
    const cleaned = beforeSend({
      extra: { email: 'a@b.com', okay: 1, nested: { token: 't', kept: 2 } },
      contexts: { app: { name: 'TJBot', secret: 's' } },
      tags: { feature: 'home', password: 'p' },
      user: { id: 'u1', role: 'adult', email: 'a@b.com', ip_address: '1.2.3.4' },
      breadcrumbs: [
        { category: 'nav', data: { transcript: 'hi', route: '/x' } },
      ],
    }) as Record<string, unknown>;
    expect(cleaned.extra).toEqual({ okay: 1, nested: { kept: 2 } });
    expect(cleaned.contexts).toEqual({ app: { name: 'TJBot' } });
    expect(cleaned.tags).toEqual({ feature: 'home' });
    expect(cleaned.user).toEqual({ id: 'u1', role: 'adult' });
    expect(cleaned.breadcrumbs).toEqual([
      { category: 'nav', data: { route: '/x' } },
    ]);
  });

  it('sets user role on Sentry scope at init and on subsequent setSentryUserRole', () => {
    const { sentry, setUser } = setup();
    sentry.initSentry({ userRole: 'unknown' });
    expect(setUser).toHaveBeenLastCalledWith({ role: 'unknown' });
    sentry.setSentryUserRole('adult');
    expect(setUser).toHaveBeenLastCalledWith({ role: 'adult' });
  });

  it('does no-op setSentryUserRole when Sentry was never initialized (no DSN)', () => {
    jest.resetModules();
    const setUser = jest.fn();
    jest.doMock('../../src/__env__', () => ({
      ENV: { EXPO_PUBLIC_SENTRY_DSN: '' },
    }));
    jest.doMock('@sentry/react-native', () => ({
      init: jest.fn(),
      captureException: jest.fn(),
      getCurrentScope: () => ({ setUser }),
    }));
    const sentry = jest.requireActual(
      '../../src/services/observability/sentry',
    ) as typeof import('../../src/services/observability/sentry');
    sentry.initSentry();
    sentry.setSentryUserRole('adult');
    expect(setUser).not.toHaveBeenCalled();
    expect(sentry.isSentryEnabled()).toBe(false);
  });
});
