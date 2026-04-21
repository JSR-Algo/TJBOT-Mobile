import { getAnalyticsClient, initAnalytics, isAnalyticsEnabled, trackEvent } from '../../src/observability/analytics';

describe('analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops when PostHog key is undefined', () => {
    initAnalytics();

    expect(isAnalyticsEnabled()).toBe(false);
    expect(getAnalyticsClient()).toBeNull();
    trackEvent('mobile.login.success');
    // No crash, no network call
    expect(getAnalyticsClient()).toBeNull();
  });
});
