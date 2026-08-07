import {
  createCheckoutSession,
  getInvoicePdf,
  listBillingPlans,
  subscribeToPlan,
} from '@/services/api/purchase.api';

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


describe('purchase billing API', () => {
  // Rewritten by T5.2 pass 4 (F-T52-13). These used to assert live calls to
  // /v1/billing/checkout-session, /plans and /invoices/{id}/pdf. Both hosts for
  // that surface are switched off in production — the modular bridge
  // (TBOT_ENABLE_MODULAR_ROUTES=false) and BillingLocalController
  // (SIMULATION_MODE=false) — and all three routes were probed live returning
  // 404. The client now fails closed instead of issuing a dead request.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['createCheckoutSession', () => createCheckoutSession({ planId: 'plan_basic' } as never, 'req-1')],
    ['listBillingPlans', () => listBillingPlans()],
    ['getInvoicePdf', () => getInvoicePdf('inv-1')],
    ['subscribeToPlan', () => subscribeToPlan('plan_basic', 'req-1')],
  ])('%s rejects with BACKEND_CONTRACT_UNAVAILABLE and issues no request', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ code: 'BACKEND_CONTRACT_UNAVAILABLE' });
  });
});
