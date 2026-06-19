/**
 * T17 verification test: Gemini Live voice UI is not currently wired.
 *
 * Current state (refactor not completed):
 *   - ROUTES.GeminiConversationScreen does not exist.
 *   - FEATURE_NAVIGATION_REGISTRY has no gemini owner regardless of the
 *     FEATURE_GEMINI_CONVERSATION flag.
 */

import { ROUTES } from '@/navigation/routes';

describe('T17: Gemini conversation screen is not wired', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('does not expose GeminiConversationScreen in ROUTES', () => {
    expect((ROUTES as any).GeminiConversationScreen).toBeUndefined();
  });

  it('does not include Gemini navigation even when FEATURE_GEMINI_CONVERSATION is enabled', () => {
    jest.isolateModules(() => {
      jest.doMock('@/config/feature-flags', () => ({
        __esModule: true,
        FEATURE_SUBSCRIPTION: false,
        isSubscriptionFeatureEnabled: () => false,
        FEATURE_SUBSCRIPTION_DISABLED_CODE: 'FEATURE_SUBSCRIPTION_DISABLED',
        FeatureSubscriptionDisabledError: class FeatureSubscriptionDisabledError extends Error {
          readonly code = 'FEATURE_SUBSCRIPTION_DISABLED';
          constructor(operation: string) {
            super(`FEATURE_SUBSCRIPTION_DISABLED: ${operation} is disabled in this build`);
            this.name = 'FeatureSubscriptionDisabledError';
          }
        },
        FEATURE_GEMINI_CONVERSATION: true,
        isGeminiConversationEnabled: () => true,
      }));

      const { FEATURE_NAVIGATION_REGISTRY } = require('@/navigation/featureRegistry');

      expect(FEATURE_NAVIGATION_REGISTRY.some((f: any) => f.owner === 'gemini')).toBe(false);
    });
  });

  it('does not include Gemini navigation when FEATURE_GEMINI_CONVERSATION is disabled', () => {
    jest.isolateModules(() => {
      jest.doMock('@/config/feature-flags', () => ({
        __esModule: true,
        FEATURE_SUBSCRIPTION: false,
        isSubscriptionFeatureEnabled: () => false,
        FEATURE_SUBSCRIPTION_DISABLED_CODE: 'FEATURE_SUBSCRIPTION_DISABLED',
        FeatureSubscriptionDisabledError: class FeatureSubscriptionDisabledError extends Error {
          readonly code = 'FEATURE_SUBSCRIPTION_DISABLED';
          constructor(operation: string) {
            super(`FEATURE_SUBSCRIPTION_DISABLED: ${operation} is disabled in this build`);
            this.name = 'FeatureSubscriptionDisabledError';
          }
        },
        FEATURE_GEMINI_CONVERSATION: false,
        isGeminiConversationEnabled: () => false,
      }));

      const { FEATURE_NAVIGATION_REGISTRY } = require('@/navigation/featureRegistry');

      expect(FEATURE_NAVIGATION_REGISTRY.some((f: any) => f.owner === 'gemini')).toBe(false);
    });
  });
});
