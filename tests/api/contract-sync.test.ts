// ───────────────────────────────────────────────────────────────────────────
// T5.2 — backend <-> mobile API contract sync regressions.
//
// One test per drift this task fixed, each written so it fails against the
// pre-fix code. `npm run api:contract-sync:check` is the gate; this file keeps
// the same guarantees inside `npm test`, plus the sample-decode fixtures the
// static gate cannot express (deep-dive box 3: a field mobile types as required
// must actually arrive).
// ───────────────────────────────────────────────────────────────────────────
import client from '@/services/http/client';
import {
  BackendContractUnavailableError,
  UNDOCUMENTED_API_ROUTES,
  findUndocumentedRoute,
} from '@/services/api/undocumented-api-routes';
import {
  BackendContractUnavailableError as PurchaseContractError,
  activateRobot,
  cancelOrder,
  getOrder,
  getShippingStatus,
  reactivateSubscription,
  requestReturn,
} from '@/services/api/purchase.api';
import {
  BackendContractUnavailableError as ParentContractError,
  getParentHistory,
  getParentToday,
  getSafetyConfig,
  getSettings,
  updateSafetyConfig,
  updateSettings,
} from '@/services/api/parent.api';
import { refreshEntitlementsAfterPurchase } from '@/services/api/account';
import { archiveChild } from '@/services/api/households';

jest.mock('@/services/http/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('@/config/feature-flags', () => ({
  __esModule: true,
  isSubscriptionFeatureEnabled: () => true,
  FeatureSubscriptionDisabledError: class extends Error {},
}));

const mockedClient = client as jest.Mocked<typeof client>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── routes repointed onto the documented contract ─────────────────────────
describe('routes repointed onto the backend contract', () => {
  it('reads an order from the modular billing orders route', async () => {
    mockedClient.get.mockResolvedValueOnce({ data: { data: { orderId: 'ord-1', state: 'paid', stateVersion: 3 } } });

    await getOrder('ord-1');

    // Pre-fix this was `/orders/ord-1`, which no controller serves.
    expect(mockedClient.get).toHaveBeenCalledWith('/billing/orders/ord-1');
  });

  it('cancels an order on the billing-scoped cancel route', async () => {
    mockedClient.post.mockResolvedValueOnce({ data: { data: { orderId: 'ord-1', state: 'cancelled' } } });

    await cancelOrder('ord-1', 'req-1');

    expect(mockedClient.post).toHaveBeenCalledWith('/billing/orders/ord-1/cancel', {}, expect.anything());
  });

  it('requests a return on `return-request`, the name the contract uses', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: { request_id: 'rr-1', state: 'pending_admin_review', expected_decision_by: '2026-08-10T00:00:00.000Z' },
    });

    await requestReturn('ord-1', 'damaged', 'cracked shell', 'req-1');

    expect(mockedClient.post).toHaveBeenCalledWith(
      '/billing/orders/ord-1/return-request',
      { reason: 'damaged', notes: 'cracked shell' },
      expect.anything(),
    );
  });

  it('reactivates a subscription on /billing/reactivate, not /billing/subscription/reactivate', async () => {
    mockedClient.post.mockResolvedValueOnce({ data: { data: { id: 'sub-1', plan_id: 'p1', status: 'active' } } });

    await reactivateSubscription('req-1');

    expect(mockedClient.post).toHaveBeenCalledWith('/billing/reactivate', {}, expect.anything());
  });

  it('archives a child through the ADR-0011 status route', async () => {
    mockedClient.patch.mockResolvedValueOnce({ data: { data: { id: 'child-1', status: 'archived' } } });

    await archiveChild('child-1');

    // `POST /v1/children/{id}/archive` is declared in the modular contract but
    // `isBridgeRoute()` never forwards it, so the old call could only 404.
    expect(mockedClient.patch).toHaveBeenCalledWith('/identity/children/child-1', { status: 'archived' });
    expect(mockedClient.post).not.toHaveBeenCalled();
  });
});

// ── sample-decode fixtures (deep-dive box 3) ──────────────────────────────
describe('sample-decode: fields mobile types as required actually arrive', () => {
  // Byte-shape of GET /v1/billing/orders/{orderId} as OrdersService.orderResponse
  // builds it. The mapper used to read `id`/`status`, which are not in it.
  const ORDER_RESPONSE = { data: { data: { orderId: 'ord-1', state: 'paid', stateVersion: 3 } } };

  it('populates Order.id and Order.status from orderId/state', async () => {
    mockedClient.get.mockResolvedValueOnce(ORDER_RESPONSE);

    const order = await getOrder('ord-1');

    expect(order.id).toBe('ord-1');
    expect(order.status).toBe('paid');
  });

  it('leaves no required Order field undefined', async () => {
    mockedClient.get.mockResolvedValueOnce(ORDER_RESPONSE);

    const order = await getOrder('ord-1');

    for (const field of ['id', 'status', 'productId', 'totalCents'] as const) {
      expect(order[field]).toBeDefined();
    }
  });

  it('translates backend order states rather than passing them through', async () => {
    // `fulfilling`, `arrived`, `created` and `cancel_pending` are real backend
    // states with no name in the mobile union; none may leak through raw.
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['created', 'pending'],
      ['paid', 'paid'],
      ['fulfilling', 'confirmed'],
      ['shipped', 'shipped'],
      ['arrived', 'delivered'],
      ['activated', 'delivered'],
      ['cancel_pending', 'pending'],
      ['cancelled', 'cancelled'],
      ['refunded', 'refunded'],
    ];

    for (const [wire, expected] of cases) {
      mockedClient.get.mockResolvedValueOnce({ data: { data: { orderId: 'ord-1', state: wire, stateVersion: 1 } } });
      const order = await getOrder('ord-1');
      expect(order.status).toBe(expected);
    }
  });

  it('decodes the return-request body without dropping requestId or state', async () => {
    mockedClient.post.mockResolvedValueOnce({
      data: { request_id: 'rr-1', state: 'pending_admin_review', expected_decision_by: '2026-08-10T00:00:00.000Z' },
    });

    const result = await requestReturn('ord-1', 'damaged', '', 'req-1');

    expect(result.requestId).toBe('rr-1');
    expect(result.state).toBe('pending_admin_review');
    expect(result.expectedDecisionBy).toBe('2026-08-10T00:00:00.000Z');
  });
});

// ── uncontracted operations fail closed ───────────────────────────────────
describe('operations with no backend contract fail closed', () => {
  it.each([
    ['getShippingStatus', () => getShippingStatus('ord-1')],
    ['activateRobot', () => activateRobot('CODE-1')],
    ['refreshEntitlementsAfterPurchase', () => refreshEntitlementsAfterPurchase()],
    ['getParentToday', () => getParentToday()],
    ['getParentHistory', () => getParentHistory()],
    ['getSafetyConfig', () => getSafetyConfig()],
    ['updateSafetyConfig', () => updateSafetyConfig({})],
    ['getSettings', () => getSettings()],
    ['updateSettings', () => updateSettings({})],
  ])('%s rejects with the sentinel and issues no request', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ code: 'BACKEND_CONTRACT_UNAVAILABLE' });
    expect(mockedClient.get).not.toHaveBeenCalled();
    expect(mockedClient.post).not.toHaveBeenCalled();
    expect(mockedClient.put).not.toHaveBeenCalled();
    expect(mockedClient.patch).not.toHaveBeenCalled();
  });

  it('reports the operation name so a caller can identify what is missing', async () => {
    await expect(getParentToday()).rejects.toThrow(/getParentToday/);
  });
});

// ── one error envelope (deep-dive box 4) ──────────────────────────────────
describe('contract-unavailable errors share one class', () => {
  it('purchase.api and parent.api re-export the canonical class, not copies', () => {
    expect(PurchaseContractError).toBe(BackendContractUnavailableError);
    expect(ParentContractError).toBe(BackendContractUnavailableError);
  });

  it('satisfies instanceof across module boundaries', async () => {
    // Pre-fix, purchase.api.ts and parent.api.ts each declared their own class,
    // so a `BackendContractUnavailableError` thrown by one module was not an
    // instance of another module's class despite carrying the same `code`.
    await expect(getShippingStatus('ord-1')).rejects.toBeInstanceOf(BackendContractUnavailableError);
    await expect(getParentToday()).rejects.toBeInstanceOf(PurchaseContractError);
  });

  it('never rejects an unimplemented parent operation with a bare Error', async () => {
    // These four used to `throw new Error('not implemented')`, which normalizes
    // to UNKNOWN_ERROR — indistinguishable from a real server fault.
    for (const call of [getSafetyConfig, getSettings]) {
      await expect(call()).rejects.toBeInstanceOf(BackendContractUnavailableError);
    }
  });
});

// ── registry integrity ────────────────────────────────────────────────────
describe('UNDOCUMENTED_API_ROUTES registry', () => {
  it('justifies every route with a reason', () => {
    for (const route of UNDOCUMENTED_API_ROUTES) {
      expect(route.reason.trim().length).toBeGreaterThan(20);
    }
  });

  it('names an owning task for every route the backend already serves', () => {
    for (const route of UNDOCUMENTED_API_ROUTES) {
      if (route.status === 'backend-route-exists') {
        expect(route.owner).toBeTruthy();
      }
    }
  });

  it('declares each operation exactly once', () => {
    const operations = UNDOCUMENTED_API_ROUTES.map((route) => route.operation);
    expect(new Set(operations).size).toBe(operations.length);
  });

  it('resolves a known operation and rejects an unknown one', () => {
    expect(findUndocumentedRoute('getParentToday')?.status).toBe('no-backend-contract');
    expect(findUndocumentedRoute('controlsApi.getControls')?.status).toBe('backend-route-exists');
    expect(findUndocumentedRoute('nope')).toBeUndefined();
  });
});
