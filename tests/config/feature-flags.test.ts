import {
  FEATURE_SUBSCRIPTION,
  FEATURE_AI_PROXY,
  FEATURE_LESSON_SESSION,
  FEATURE_HOME_HUB,
  FEATURE_DEVICE_MANAGEMENT,
  FeatureSubscriptionDisabledError,
  FeatureAiProxyDisabledError,
  FeatureLessonSessionDisabledError,
  FeatureHomeHubDisabledError,
  FeatureDeviceManagementDisabledError,
} from '@/config/feature-flags';

describe('feature flags', () => {
  it('exports all kill-switch flags as booleans', () => {
    expect(typeof FEATURE_SUBSCRIPTION).toBe('boolean');
    expect(typeof FEATURE_AI_PROXY).toBe('boolean');
    expect(typeof FEATURE_LESSON_SESSION).toBe('boolean');
    expect(typeof FEATURE_HOME_HUB).toBe('boolean');
    expect(typeof FEATURE_DEVICE_MANAGEMENT).toBe('boolean');
  });

  it('throws typed disabled errors with operation names', () => {
    expect(() => {
      throw new FeatureAiProxyDisabledError('transcribe');
    }).toThrow('FEATURE_AI_PROXY_DISABLED: transcribe is disabled in this build');

    expect(() => {
      throw new FeatureLessonSessionDisabledError('startSession');
    }).toThrow('FEATURE_LESSON_SESSION_DISABLED: startSession is disabled in this build');

    expect(() => {
      throw new FeatureHomeHubDisabledError('getHomeHub');
    }).toThrow('FEATURE_HOME_HUB_DISABLED: getHomeHub is disabled in this build');

    expect(() => {
      throw new FeatureDeviceManagementDisabledError('runMicTest');
    }).toThrow('FEATURE_DEVICE_MANAGEMENT_DISABLED: runMicTest is disabled in this build');

    expect(new FeatureSubscriptionDisabledError('buy').code).toBe('FEATURE_SUBSCRIPTION_DISABLED');
  });
});
