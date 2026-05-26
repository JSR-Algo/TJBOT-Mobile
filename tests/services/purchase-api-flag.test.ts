/**
 * AC-IAP — API-layer defense-in-depth.
 *
 * Verifies that all six billing functions in `src/services/api/purchase.api.ts`
 * throw `FEATURE_SUBSCRIPTION_DISABLED` (via FeatureSubscriptionDisabledError)
 * before any HTTP call when `FEATURE_SUBSCRIPTION` is off — regardless of UI
 * flag state. Protects against accidental call sites bypassing the screen
 * gates added in WS-IAP.
 */
jest.mock('@/config/feature-flags', () => {
  const FEATURE_SUBSCRIPTION_DISABLED_CODE = 'FEATURE_SUBSCRIPTION_DISABLED';
  class FeatureSubscriptionDisabledError extends Error {
    readonly code = FEATURE_SUBSCRIPTION_DISABLED_CODE;
    constructor(operation: string) {
      super(`FEATURE_SUBSCRIPTION_DISABLED: ${operation} is disabled in this build`);
      this.name = 'FeatureSubscriptionDisabledError';
    }
  }
  return {
    __esModule: true,
    FEATURE_SUBSCRIPTION: false,
    isSubscriptionFeatureEnabled: () => false,
    FEATURE_SUBSCRIPTION_DISABLED_CODE,
    FeatureSubscriptionDisabledError,
  };
});

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('@/services/api/account', () => ({
  refreshEntitlementsAfterPurchase: jest.fn(),
}));

import client from '@/services/http/client';
import { refreshEntitlementsAfterPurchase } from '@/services/api/account';
import {
  cancelSubscription,
  createCheckoutSession,
  pauseSubscription,
  reactivateSubscription,
  resumeSubscription,
  subscribeToPlan,
} from '@/services/api/purchase.api';

const mockedClient = client as jest.Mocked<typeof client>;
const mockedRefresh = refreshEntitlementsAfterPurchase as jest.MockedFunction<
  typeof refreshEntitlementsAfterPurchase
>;

describe('purchase API guard (FEATURE_SUBSCRIPTION=false)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const billingAddress = {
    name: 'Parent',
    line1: '1 Test Way',
    city: 'Testville',
    region: 'TS',
    postal_code: '00000',
    country: 'US',
  };

  const cases: ReadonlyArray<readonly [string, () => Promise<unknown>]> = [
    ['createCheckoutSession', () => createCheckoutSession({ sku_id: 'sku', quantity: 1, billing_address: billingAddress }, 'req-1')],
    ['subscribeToPlan', () => subscribeToPlan('plan_basic', 'req-2')],
    ['cancelSubscription', () => cancelSubscription('req-3')],
    ['pauseSubscription', () => pauseSubscription('req-4')],
    ['resumeSubscription', () => resumeSubscription('req-5')],
    ['reactivateSubscription', () => reactivateSubscription('req-6')],
  ];

  it.each(cases)('%s throws FEATURE_SUBSCRIPTION_DISABLED before any HTTP call', async (operation, invoke) => {
    await expect(invoke()).rejects.toMatchObject({
      code: 'FEATURE_SUBSCRIPTION_DISABLED',
      name: 'FeatureSubscriptionDisabledError',
    });
    await expect(invoke()).rejects.toThrow(operation);

    expect(mockedClient.post).not.toHaveBeenCalled();
    expect(mockedClient.get).not.toHaveBeenCalled();
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it('rejects synchronously before HTTP for createCheckoutSession (no leaked network)', async () => {
    try {
      await createCheckoutSession({ sku_id: 'sku', quantity: 1, billing_address: billingAddress });
      throw new Error('expected createCheckoutSession to throw');
    } catch (err) {
      const error = err as { code?: string };
      expect(error.code).toBe('FEATURE_SUBSCRIPTION_DISABLED');
    }
    expect(mockedClient.post).not.toHaveBeenCalled();
  });
});
