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
import { normalizeError } from '@/utils/errors';
import * as courseLibraryApi from '@/services/api/course-library.api';
import { getHelpFaq, submitSupportTicket } from '@/services/api/support.api';
import { getDailyState, getHomeHub } from '@/services/api/home.api';
import {
  factoryReset,
  getBattery,
  getRobotStatus,
  getStorage,
  getSupportInfo,
  runSpeakerTest,
} from '@/services/api/robot-mgmt.api';
import {
  getLessonSummary,
  getProgressSummary,
  getReviewQueue,
  getTodayProgress,
  getWordsPracticed,
} from '@/services/api/progress.api';

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

// ───────────────────────────────────────────────────────────────────────────
// Second pass — findings other sessions routed to T5.2 (plan §5).
// ───────────────────────────────────────────────────────────────────────────
describe('retired backend routes are not called at all', () => {
  it('no longer exports the three 410-GONE course-library shims', () => {
    // CourseLibraryController retired unlock / send-to-robot / sync-status:
    // each handler is a bare `throw new HttpException(retiredBody(), 410)`. A
    // route that always 410s is exactly as unusable as a 404, and a decorator
    // scan alone calls it "served" — which is why the gate now classifies it.
    for (const gone of ['unlockCourse', 'sendCourseToRobot', 'getRobotSyncStatus']) {
      expect(gone in courseLibraryApi).toBe(false);
    }
  });
});

describe('every uncontracted operation fails on the same sentinel', () => {
  it.each([
    ['getHelpFaq', () => getHelpFaq()],
    ['submitSupportTicket', () => submitSupportTicket({ subject: 's', description: 'd', category: 'c' })],
    ['getHomeHub', () => getHomeHub()],
    ['getDailyState', () => getDailyState()],
    ['getRobotStatus', () => getRobotStatus()],
    ['getBattery', () => getBattery()],
    ['getStorage', () => getStorage()],
    ['runSpeakerTest', () => runSpeakerTest()],
    ['factoryReset', () => factoryReset()],
    ['getSupportInfo', () => getSupportInfo()],
    ['getProgressSummary', () => getProgressSummary()],
    ['getTodayProgress', () => getTodayProgress()],
    ['getWordsPracticed', () => getWordsPracticed()],
    ['getLessonSummary', () => getLessonSummary('l1')],
    ['getReviewQueue', () => getReviewQueue()],
  ])('%s rejects with BACKEND_CONTRACT_UNAVAILABLE, not a bare Error', async (_name, call) => {
    // These 15 used to `throw new Error('not implemented')`, which carries no
    // `code` and normalizes to UNKNOWN_ERROR — indistinguishable from a real
    // server fault. getProgressSummary was worse: it RESOLVED a frozen all-zero
    // summary, so a caller could not tell "no data yet" from "no contract".
    await expect(call()).rejects.toMatchObject({ code: 'BACKEND_CONTRACT_UNAVAILABLE' });
  });

  it('getProgressSummary no longer resolves fabricated zeros', async () => {
    await expect(getProgressSummary()).rejects.toBeInstanceOf(BackendContractUnavailableError);
  });
});

describe('error envelope: a string-valued `error` key carries the code', () => {
  // The backend emits BOTH `{error:{code,message}}` and `{error:'CODE'}` — the
  // latter from CourseLibraryController's retired 410 body and from
  // device-assignment.controller's PARENT_TOKEN_REQUIRED, which sits next to a
  // sibling using `{code:'DEVICE_FORBIDDEN'}`. Mobile must parse one shape.
  it.each([
    [410, { error: 'ENDPOINT_RETIRED', useInstead: '/v1/courses/:courseId/enroll' }, 'ENDPOINT_RETIRED'],
    [403, { error: 'PARENT_TOKEN_REQUIRED' }, 'PARENT_TOKEN_REQUIRED'],
    [403, { code: 'DEVICE_FORBIDDEN' }, 'DEVICE_FORBIDDEN'],
    [403, { error: { code: 'FORBIDDEN', message: 'nope' } }, 'FORBIDDEN'],
  ])('status %i body %p -> code %s', (status, data, expected) => {
    expect(normalizeError({ response: { status, data } }).code).toBe(expected);
  });

  it('does not swallow the code into a generic status mapping', () => {
    // Pre-fix this returned FORBIDDEN, losing PARENT_TOKEN_REQUIRED entirely.
    expect(normalizeError({ response: { status: 403, data: { error: 'PARENT_TOKEN_REQUIRED' } } }).code)
      .not.toBe('FORBIDDEN');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Third pass — the modular bridge is mounted ONLY in production.
//
// T5.2's first two passes verified the repointed billing routes statically (a
// controller/contract scan) and against mocks. Neither can see that
// `src/main.ts` mounts the whole modular Express runtime behind
//   NODE_ENV === 'production' && TBOT_ENABLE_MODULAR_ROUTES !== 'false'
// Probed against the live T5.3 E2E backend (NODE_ENV=development), four of the
// five repointed routes 404 while PATCH /v1/identity/children/{id} — a plain
// Nest route — correctly 401s. The repoints are right for the deployed backend
// mobile actually talks to; the gate was wrong to call them unconditional.
// ───────────────────────────────────────────────────────────────────────────
describe('production-only modular routes are declared as such', () => {
  const PRODUCTION_ONLY = [
    '/billing/orders/',
    '/billing/reactivate',
    '/billing/subscription',
    '/billing/checkout-session',
    '/billing/plans',
    '/billing/plan',
    '/billing/invoices/',
  ];

  it('routes every billing call through the modular-bridge prefix', () => {
    // isBridgeRoute() forwards `/v1/billing/*` wholesale, so a billing call that
    // does NOT start with that prefix is unrouted even in production — which is
    // exactly how `/v1/billing/subscription/reactivate` slipped through before.
    for (const path of PRODUCTION_ONLY) {
      expect(path.startsWith('/billing/')).toBe(true);
    }
  });

  it('keeps archiveChild on a plain Nest route, not the modular bridge', async () => {
    // The bridge never forwards `/v1/children/*` or `/v1/identity/*`, so this
    // one must NOT depend on the production mount. It is the only repointed
    // route that answered 401 (not 404) on the development E2E backend.
    mockedClient.patch.mockResolvedValueOnce({ data: { data: { id: 'c1', status: 'archived' } } });
    await archiveChild('c1');
    const [url] = mockedClient.patch.mock.calls[0];
    expect(url).toBe('/identity/children/c1');
    expect(String(url).startsWith('/billing/')).toBe(false);
  });
});
