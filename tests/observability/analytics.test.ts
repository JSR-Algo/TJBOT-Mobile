import { getAnalyticsClient, initAnalytics, isAnalyticsEnabled, trackEvent } from '../../src/services/observability/analytics';

describe('analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('always no-ops because third-party analytics is disabled', () => {
    initAnalytics();

    expect(isAnalyticsEnabled()).toBe(false);
    expect(getAnalyticsClient()).toBeNull();
    trackEvent('mobile.login.success');
    // No crash, no network call
    expect(getAnalyticsClient()).toBeNull();
  });
});
