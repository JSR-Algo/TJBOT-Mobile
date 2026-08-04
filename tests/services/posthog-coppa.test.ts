import {
  getAnalyticsClient,
  identifyAnalyticsUser,
  initAnalytics,
  isAnalyticsEnabled,
  resetAnalytics,
  setAnalyticsCollectionEnabled,
  setAnalyticsUserRole,
  trackEvent,
  type UserRole,
} from '../../src/services/observability/analytics';

describe('Kids Category analytics policy', () => {
  it.each<UserRole>(['child', 'teen', 'adult'])(
    'keeps analytics disabled for the %s role',
    role => {
      initAnalytics(role);
      setAnalyticsUserRole(role);
      setAnalyticsCollectionEnabled(true);
      identifyAnalyticsUser('user-1', 'parent@example.com');
      trackEvent('mobile.lesson.completed', { duration_ms: 12 });
      resetAnalytics();

      expect(isAnalyticsEnabled()).toBe(false);
      expect(getAnalyticsClient()).toBeNull();
    },
  );
});
