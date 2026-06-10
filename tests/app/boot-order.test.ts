/**
 * Boot-order contract (AC26 / AC26.1-26.4):
 *   1. initSentry runs at module load with userRole='unknown' and
 *      enableAutoSessionTracking=false (privacy-by-default before age answer).
 *   2. SecureStore read for age_answer_completed kicks off in parallel —
 *      it does NOT block React import / initSentry.
 *   3. initAnalytics is gated: only called when role !== 'child' && role !== 'unknown'.
 *   4. setSentryUserRole is called on role resolution (any role).
 *   5. When age has not been answered, the boot promise resolves to 'unknown'
 *      and initAnalytics is NOT called.
 */

type BootHandles = {
  initSentry: jest.Mock;
  setSentryUserRole: jest.Mock;
  initAnalytics: jest.Mock;
  setAnalyticsUserRole: jest.Mock;
  getItemAsync: jest.Mock;
  loadApp: () => typeof import('../../src/App');
};

function bootWithAnswer(stored: string | null, options?: { fail?: boolean }): BootHandles {
  jest.resetModules();
  jest.useFakeTimers();

  const initSentry = jest.fn();
  const setSentryUserRole = jest.fn();
  const initAnalytics = jest.fn();
  const setAnalyticsUserRole = jest.fn();
  const getItemAsync = jest.fn(async () => {
    if (options?.fail) throw new Error('keychain locked');
    return stored;
  });

  jest.doMock('../../src/services/observability/sentry', () => ({
    initSentry,
    setSentryUserRole,
    captureError: jest.fn(),
    isSentryEnabled: () => false,
  }));

  jest.doMock('../../src/services/observability/analytics', () => ({
    initAnalytics,
    setAnalyticsUserRole,
    identifyAnalyticsUser: jest.fn(),
    resetAnalytics: jest.fn(),
    trackEvent: jest.fn(),
    isAnalyticsEnabled: () => false,
    getAnalyticsClient: () => null,
    SENSITIVE_PROPERTY_PATTERN: /a/,
  }));

  jest.doMock('expo-secure-store', () => ({
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
    getItemAsync,
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  }));

  jest.doMock('../../src/services/observability/voice-telemetry', () => ({
    startVoiceTelemetry: () => () => {},
  }));

  return {
    initSentry,
    setSentryUserRole,
    initAnalytics,
    setAnalyticsUserRole,
    getItemAsync,
    loadApp: () => jest.requireActual('../../src/App') as typeof import('../../src/App'),
  };
}

describe('App boot order (parallel-boot pattern)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls initSentry synchronously at module load before any SecureStore await', () => {
    const h = bootWithAnswer(null);
    expect(h.initSentry).not.toHaveBeenCalled();
    expect(h.getItemAsync).not.toHaveBeenCalled();
    h.loadApp();
    expect(h.initSentry).toHaveBeenCalledTimes(1);
    expect(h.initSentry).toHaveBeenCalledWith(
      expect.objectContaining({
        userRole: 'unknown',
        enableAutoSessionTracking: false,
      }),
    );
    expect(h.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it('does NOT call initAnalytics at module load (must be gated on role)', () => {
    const h = bootWithAnswer(null);
    h.loadApp();
    expect(h.initAnalytics).not.toHaveBeenCalled();
  });

  it('keeps initAnalytics un-called when no age answer is stored (role=unknown)', async () => {
    const h = bootWithAnswer(null);
    const mod = h.loadApp();
    await expect(mod.__ageGateBootPromise).resolves.toBe('unknown');
    expect(h.initAnalytics).not.toHaveBeenCalled();
    expect(h.setSentryUserRole).toHaveBeenCalledWith('unknown');
  });

  it('keeps initAnalytics un-called when the stored answer is child', async () => {
    const h = bootWithAnswer(
      JSON.stringify({ band: 'U13', role: 'child', answeredAt: 't' }),
    );
    const mod = h.loadApp();
    await expect(mod.__ageGateBootPromise).resolves.toBe('child');
    expect(h.initAnalytics).not.toHaveBeenCalled();
    expect(h.setSentryUserRole).toHaveBeenCalledWith('child');
    expect(h.setAnalyticsUserRole).toHaveBeenCalledWith('child');
  });

  it('calls initAnalytics(adult) when stored answer resolves to adult', async () => {
    const h = bootWithAnswer(
      JSON.stringify({ band: '18_PLUS', role: 'adult', answeredAt: 't' }),
    );
    const mod = h.loadApp();
    await expect(mod.__ageGateBootPromise).resolves.toBe('adult');
    expect(h.initAnalytics).toHaveBeenCalledWith('adult');
    expect(h.setSentryUserRole).toHaveBeenCalledWith('adult');
  });

  it('calls initAnalytics(teen) when stored answer resolves to teen', async () => {
    const h = bootWithAnswer(
      JSON.stringify({ band: '13_17', role: 'teen', answeredAt: 't' }),
    );
    const mod = h.loadApp();
    await expect(mod.__ageGateBootPromise).resolves.toBe('teen');
    expect(h.initAnalytics).toHaveBeenCalledWith('teen');
  });

  it('falls back to role=unknown when SecureStore rejects', async () => {
    const h = bootWithAnswer(null, { fail: true });
    const mod = h.loadApp();
    await expect(mod.__ageGateBootPromise).resolves.toBe('unknown');
    expect(h.initAnalytics).not.toHaveBeenCalled();
  });
});
