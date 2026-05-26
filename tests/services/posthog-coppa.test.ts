describe('analytics COPPA gate (PostHog)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  function setup() {
    const capture = jest.fn();
    const identify = jest.fn();
    const optIn = jest.fn();
    const optOut = jest.fn();
    const reset = jest.fn();
    const PostHogCtor = jest.fn(() => ({ capture, identify, optIn, optOut, reset }));

    jest.doMock('../../src/__env__', () => ({
      ENV: {
        EXPO_PUBLIC_POSTHOG_API_KEY: 'test-key',
        EXPO_PUBLIC_POSTHOG_HOST: 'https://posthog.test',
      },
    }));
    jest.doMock('posthog-react-native', () => ({
      __esModule: true,
      default: PostHogCtor,
    }));

    const analytics = jest.requireActual(
      '../../src/services/observability/analytics',
    ) as typeof import('../../src/services/observability/analytics');

    return { analytics, PostHogCtor, capture, identify, optIn, optOut, reset };
  }

  it('initializes PostHog with disabled=true for child role', () => {
    const { analytics, PostHogCtor } = setup();
    analytics.initAnalytics('child');
    expect(PostHogCtor).toHaveBeenCalledWith(
      'test-key',
      expect.objectContaining({ disabled: true }),
    );
    expect(analytics.isAnalyticsEnabled()).toBe(false);
  });

  it('initializes PostHog with disabled=false for adult/teen role', () => {
    const { analytics, PostHogCtor } = setup();
    analytics.initAnalytics('adult');
    expect(PostHogCtor).toHaveBeenCalledWith(
      'test-key',
      expect.objectContaining({ disabled: false }),
    );
    expect(analytics.isAnalyticsEnabled()).toBe(true);
  });

  it('drops trackEvent calls when role is child even if client exists', () => {
    const { analytics, capture } = setup();
    analytics.initAnalytics('adult');
    analytics.setAnalyticsUserRole('child');
    analytics.trackEvent('mobile.lesson.completed', { duration_ms: 12 });
    expect(capture).not.toHaveBeenCalled();
  });

  it('opts the client out when role transitions to child', () => {
    const { analytics, optOut, optIn } = setup();
    analytics.initAnalytics('adult');
    expect(optIn).not.toHaveBeenCalled();
    analytics.setAnalyticsUserRole('child');
    expect(optOut).toHaveBeenCalledTimes(1);
    expect(analytics.isAnalyticsEnabled()).toBe(false);
  });

  it('opts the client back in when role transitions from child to adult', () => {
    const { analytics, optIn } = setup();
    analytics.initAnalytics('child');
    analytics.setAnalyticsUserRole('adult');
    expect(optIn).toHaveBeenCalledTimes(1);
    expect(analytics.isAnalyticsEnabled()).toBe(true);
  });

  it('emits zero capture calls across full child-session lifecycle', () => {
    const { analytics, capture } = setup();
    analytics.initAnalytics('child');
    analytics.identifyAnalyticsUser('user-1', 'parent@example.com');
    analytics.trackEvent('mobile.lesson.started');
    analytics.trackEvent('mobile.lesson.completed', { duration_ms: 100 });
    analytics.resetAnalytics();
    expect(capture).not.toHaveBeenCalled();
  });
});
