import client from '@/services/http/client';
import {
  createCheckoutSession,
  getInvoicePdf,
  listBillingPlans,
  mapCheckoutSessionResponse,
  pauseSubscription,
  subscribeToPlan,
} from '@/services/api/purchase.api';
import { refreshEntitlementsAfterPurchase } from '@/services/api/account';

jest.mock('@/config/feature-flags', () => ({
  __esModule: true,
  FEATURE_SUBSCRIPTION: true,
  isSubscriptionFeatureEnabled: () => true,
  FEATURE_SUBSCRIPTION_DISABLED_CODE: 'FEATURE_SUBSCRIPTION_DISABLED',
  FeatureSubscriptionDisabledError: class FeatureSubscriptionDisabledError extends Error {
    readonly code = 'FEATURE_SUBSCRIPTION_DISABLED';
    constructor(operation: string) {
      super(`FEATURE_SUBSCRIPTION_DISABLED: ${operation} is disabled in this build`);
      this.name = 'FeatureSubscriptionDisabledError';
    }
  },
}));

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

const mockedClient = client as jest.Mocked<typeof client>;
const mockedRefreshEntitlements = refreshEntitlementsAfterPurchase as jest.MockedFunction<typeof refreshEntitlementsAfterPurchase>;

describe('purchase billing API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps checkout sequence payload to typed client response', () => {
    const session = mapCheckoutSessionResponse({
      order_id: 'ord_123',
      stripe_checkout_url: 'https://checkout.stripe.test/session',
      expires_at: '2026-05-15T10:00:00Z',
    });

    expect(session).toEqual({
      orderId: 'ord_123',
      stripeCheckoutUrl: 'https://checkout.stripe.test/session',
      expiresAt: '2026-05-15T10:00:00Z',
      state: null,
    });
  });

  it('posts documented checkout payload with idempotency request id', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: {
        data: {
          order_id: 'ord_456',
          state: 'fraud_review',
        },
      },
    });

    const payload = {
      sku_id: 'robot-hello-friends-bundle',
      quantity: 1,
      billing_address: {
        name: 'Sarah Chen',
        line1: '247 Linden St',
        line2: 'Apt 3B',
        city: 'Brooklyn',
        region: 'NY',
        postal_code: '11215',
        country: 'US',
      },
    };

    await expect(createCheckoutSession(payload, 'req-checkout-1')).resolves.toEqual({
      orderId: 'ord_456',
      stripeCheckoutUrl: null,
      expiresAt: null,
      state: 'fraud_review',
    });

    expect(mockedClient.post).toHaveBeenCalledWith(
      '/billing/checkout-session',
      payload,
      { headers: { 'X-Request-Id': 'req-checkout-1' } },
    );
  });

  it('maps billing plans from documented plan list route', async () => {
    mockedClient.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'plan_all_courses_monthly',
            name: 'All Courses',
            amount_cents: 899,
            currency: 'usd',
            interval: 'month',
            trial_days: 7,
          },
        ],
      },
    });

    await expect(listBillingPlans()).resolves.toEqual([
      {
        id: 'plan_all_courses_monthly',
        name: 'All Courses',
        amountCents: 899,
        currency: 'usd',
        interval: 'month',
        trialDays: 7,
      },
    ]);
    expect(mockedClient.get).toHaveBeenCalledWith('/billing/plans');
  });

  it('treats invoice PDF 307 Location as a successful hosted URL response', async () => {
    mockedClient.get.mockResolvedValueOnce({
      status: 307,
      headers: { location: 'https://billing.stripe.test/inv_123.pdf' },
      data: null,
    });

    await expect(getInvoicePdf('inv_123')).resolves.toEqual({
      invoiceId: 'inv_123',
      url: 'https://billing.stripe.test/inv_123.pdf',
    });
    expect(mockedClient.get).toHaveBeenCalledWith('/billing/invoices/inv_123/pdf');
  });

  it('uses idempotency for subscription checkout without refreshing entitlements before payment completes', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: {
        data: {
          order_id: 'ord_sub_123',
          stripe_checkout_url: 'https://checkout.stripe.test/subscription',
          state: 'pending_payment',
        },
      },
    });
    await expect(subscribeToPlan('plan_all_courses_monthly', 'sub-req-1')).resolves.toEqual({
      orderId: 'ord_sub_123',
      stripeCheckoutUrl: 'https://checkout.stripe.test/subscription',
      expiresAt: null,
      state: 'pending_payment',
    });

    expect(mockedClient.post).toHaveBeenCalledWith(
      '/billing/subscription',
      { plan_id: 'plan_all_courses_monthly' },
      { headers: { 'X-Request-Id': 'sub-req-1' } },
    );
    expect(mockedRefreshEntitlements).not.toHaveBeenCalled();
  });

  it('marks documented 502 subscription provider outage as retryable', async () => {
    const retryableError = { message: 'provider unavailable', retryable: true };
    mockedClient.post.mockRejectedValueOnce(retryableError);

    await expect(pauseSubscription('pause-req-1')).rejects.toEqual(retryableError);
    expect(mockedClient.post).toHaveBeenCalledWith(
      '/billing/subscription/pause',
      {},
      { headers: { 'X-Request-Id': 'pause-req-1' } },
    );
    expect(mockedRefreshEntitlements).not.toHaveBeenCalled();
  });
});
