// ───────────────────────────────────────────────────────────────────────────
// Undocumented backend routes — the mobile side of the T5.2 contract sync.
//
// A mobile API function may only call a route the backend contract actually
// serves. That contract has two artifacts, both emitted by
// `tbot-backend/scripts/generate-openapi.mjs`:
//
//   1. `openapi.json` -> `paths` — the Nest app under the `/v1` global prefix.
//      NOTE: the generator filters this to `IN_SCOPE_TAGS`, so a *served* Nest
//      route can legitimately be absent here. Absence from `paths` means
//      "undocumented", never "not served".
//   2. `openapi.json` -> `x-tbot-modular-route-contract.routes` — the modular
//      Express runtime. Only the subset matched by `isBridgeRoute()` in
//      `src/modules/app/modular-route-bridge.ts` is actually reachable; the
//      rest are declared but unrouted, and therefore 404.
//
// Anything mobile wants that neither artifact serves is declared below instead
// of being shipped as a request that can only ever 404. Callers get an
// immediate typed rejection (`BACKEND_CONTRACT_UNAVAILABLE`) rather than a
// round-trip to a dead URL — the convention `progress.api.ts::getChildProgress`
// established and this file now generalizes.
//
// `npm run api:contract-sync:check` enforces the whole thing and fails on:
//   - a `client.*` call whose route no backend artifact serves;
//   - a `backendContractUnavailable(op)` whose `op` is missing here;
//   - a registry row whose `status` no longer matches backend reality.
//
// That last rule is what stops this file rotting: when the backend ships a
// contract for one of these, the gate goes red and forces the row to be retired
// instead of quietly outliving its reason.
// ───────────────────────────────────────────────────────────────────────────

export const BACKEND_CONTRACT_UNAVAILABLE_CODE = 'BACKEND_CONTRACT_UNAVAILABLE' as const;

export class BackendContractUnavailableError extends Error {
  readonly code = BACKEND_CONTRACT_UNAVAILABLE_CODE;

  constructor(operation: string) {
    super(`BACKEND_CONTRACT_UNAVAILABLE: ${operation} has no documented backend contract`);
    this.name = 'BackendContractUnavailableError';
  }
}

export function backendContractUnavailable(operation: string): never {
  throw new BackendContractUnavailableError(operation);
}

/**
 * Why a mobile operation has no live backend call.
 *
 * - `no-backend-contract` — nothing in either backend artifact serves this. The
 *   checker asserts the route really is absent, so the row goes red the day the
 *   backend ships one.
 * - `backend-route-exists` — the backend serves it, but wiring mobile up is
 *   feature work owned by another task. `owner` is mandatory and names the row
 *   in `LESSON_PRODUCTION_PLAN.md` §5 that tracks it. The checker asserts the
 *   route is still present, so the row goes red if the backend drops it.
 */
export type UndocumentedRouteStatus = 'no-backend-contract' | 'backend-route-exists';

export type UndocumentedRoute = {
  /** Operation name exactly as passed to `backendContractUnavailable(...)`, before any `:arg` suffix. */
  readonly operation: string;
  /** Mobile module that owns the stub, relative to `src/services/api/`. */
  readonly module: string;
  /** Route the operation would call, `/v1`-prefixed, in OpenAPI path syntax. */
  readonly attemptedRoute: string;
  readonly status: UndocumentedRouteStatus;
  /** Why it is not wired. One sentence, stating the backend-side fact. */
  readonly reason: string;
  /** Required when status is `backend-route-exists`: the owning task. */
  readonly owner?: string;
};

export const UNDOCUMENTED_API_ROUTES = [
  // ── ai.ts — separate AI service, not the `/v1` control plane ──────────────
  {
    operation: 'transcribe',
    module: 'ai.ts',
    attemptedRoute: 'POST /v1/ai/transcribe',
    status: 'no-backend-contract',
    reason: 'The AI service sits behind Config.AI_BASE_URL (/api/ai), a different origin from the /v1 control plane, and publishes no OpenAPI artifact.',
  },
  {
    operation: 'chat',
    module: 'ai.ts',
    attemptedRoute: 'POST /v1/ai/chat',
    status: 'no-backend-contract',
    reason: 'Same AI service as transcribe: no /v1 contract, no published schema.',
  },
  {
    operation: 'synthesize',
    module: 'ai.ts',
    attemptedRoute: 'POST /v1/ai/synthesize',
    status: 'no-backend-contract',
    reason: 'Same AI service as transcribe: no /v1 contract, no published schema.',
  },

  // ── lesson-session.api.ts — the lesson runtime is robot-owned ─────────────
  // Mobile observes a lesson; it does not drive one. The robot talks to the ESP
  // server over `lesson_*` WebSocket frames and the ESP server posts progress to
  // the backend. There is deliberately no mobile-facing session API.
  {
    operation: 'startSession',
    module: 'lesson-session.api.ts',
    attemptedRoute: 'POST /v1/lesson-sessions',
    status: 'no-backend-contract',
    reason: 'Lesson sessions start on the robot via lesson_prepare/lesson_start; mobile assigns a lesson with POST /v1/devices/{deviceId}/assignments instead.',
  },
  {
    operation: 'endSession',
    module: 'lesson-session.api.ts',
    attemptedRoute: 'DELETE /v1/lesson-sessions/{sessionId}',
    status: 'no-backend-contract',
    reason: 'Termination is robot- or admin-driven; the admin path is POST /v1/admin/lesson-assignment-operations/{assignmentId}/cancel, which is not parent-callable.',
  },
  {
    operation: 'sendUtterance',
    module: 'lesson-session.api.ts',
    attemptedRoute: 'POST /v1/lesson-sessions/{sessionId}/utterances',
    status: 'no-backend-contract',
    reason: 'Child audio never traverses the phone — the robot captures it and streams it to the ESP voice pipeline.',
  },
  {
    operation: 'getActivityList',
    module: 'lesson-session.api.ts',
    attemptedRoute: 'GET /v1/lesson-sessions/{sessionId}/activities',
    status: 'no-backend-contract',
    reason: 'Step/activity content ships to the robot inside the SD pack manifest; no per-session activity read model is exposed to mobile.',
  },
  {
    operation: 'reportSafetyEvent',
    module: 'lesson-session.api.ts',
    attemptedRoute: 'POST /v1/lesson-sessions/{sessionId}/safety-events',
    status: 'no-backend-contract',
    reason: 'Safety events are ingested from the robot through the lesson event pipeline, not reported by the phone.',
  },

  // ── course.api.ts — no per-entity catalog read models ─────────────────────
  // The published catalog exposes only the list plus the per-course lesson list.
  // There is no course/level/unit/lesson detail route, and no level or unit
  // entity at all (see the T1.1 grouping finding in the plan's §5).
  {
    operation: 'getCourse',
    module: 'course.api.ts',
    attemptedRoute: 'GET /v1/courses/{courseId}',
    status: 'no-backend-contract',
    reason: 'The consumer catalog serves GET /v1/courses and GET /v1/courses/{courseId}/lessons only; no per-course detail route exists.',
  },
  {
    operation: 'getLevel',
    module: 'course.api.ts',
    attemptedRoute: 'GET /v1/levels/{levelId}',
    status: 'no-backend-contract',
    reason: 'No level entity exists in the backend schema or migrations.',
  },
  {
    operation: 'getUnit',
    module: 'course.api.ts',
    attemptedRoute: 'GET /v1/units/{unitId}',
    status: 'no-backend-contract',
    reason: 'No unit entity exists in the backend schema or migrations.',
  },
  {
    operation: 'getLessonDetail',
    module: 'course.api.ts',
    attemptedRoute: 'GET /v1/lessons/{lessonId}',
    status: 'no-backend-contract',
    reason: 'Only GET /v1/lessons/{lessonId}/manifest is published, and it serves the robot render manifest rather than a parent-facing lesson detail.',
  },
  {
    operation: 'getReviewQueue',
    module: 'course.api.ts',
    attemptedRoute: 'GET /v1/review-queue',
    status: 'no-backend-contract',
    reason: 'The spaced-repetition review queue was never implemented backend-side; the nearest live surface is GET /v1/learning/children/{childId}/vocab/due.',
  },
  {
    operation: 'getDailyMission',
    module: 'course.api.ts',
    attemptedRoute: 'GET /v1/daily-mission',
    status: 'no-backend-contract',
    reason: 'No daily-mission entity or route exists backend-side.',
  },

  // ── progress.api.ts ──────────────────────────────────────────────────────
  {
    operation: 'getChildProgress',
    module: 'progress.api.ts',
    attemptedRoute: 'GET /v1/learning/children/{childId}/progress',
    status: 'no-backend-contract',
    reason: "@Controller('learning/children/:childId') exposes profile/session/interactions/kpis/vocab/difficulty/pronunciation-trend and no progress route; the parent dashboard reads parentLearning.api.ts and getChildLessonProgress instead.",
  },

  // ── parent.api.ts ────────────────────────────────────────────────────────
  {
    operation: 'getParentToday',
    module: 'parent.api.ts',
    attemptedRoute: 'GET /v1/parent/today',
    status: 'no-backend-contract',
    reason: "@Controller('parent') serves only auth and lockout/clear; today/history were never implemented. The live parent surface is GET /v1/mobile/children/{childId}/learning-status.",
  },
  {
    operation: 'getParentHistory',
    module: 'parent.api.ts',
    attemptedRoute: 'GET /v1/parent/history',
    status: 'no-backend-contract',
    reason: 'Same controller as getParentToday: no history route exists. History is served per child by getChildLessonProgress.',
  },
  {
    operation: 'getSafetyConfig',
    module: 'parent.api.ts',
    attemptedRoute: 'GET /v1/parent/safety-config',
    status: 'no-backend-contract',
    reason: 'No safety-config route exists; robot-side controls live under /v1/controls/{deviceId}.',
  },
  {
    operation: 'updateSafetyConfig',
    module: 'parent.api.ts',
    attemptedRoute: 'PUT /v1/parent/safety-config',
    status: 'no-backend-contract',
    reason: 'No safety-config route exists; robot-side controls live under /v1/controls/{deviceId}.',
  },
  {
    operation: 'getSettings',
    module: 'parent.api.ts',
    attemptedRoute: 'GET /v1/parent/settings',
    status: 'no-backend-contract',
    reason: 'No parent-settings route exists; notification preferences are the only live settings surface (GET /v1/notifications/preferences).',
  },
  {
    operation: 'updateSettings',
    module: 'parent.api.ts',
    attemptedRoute: 'PUT /v1/parent/settings',
    status: 'no-backend-contract',
    reason: 'No parent-settings route exists; notification preferences are the only live settings surface (PUT /v1/notifications/preferences).',
  },

  // ── account.ts ───────────────────────────────────────────────────────────
  {
    operation: 'refreshEntitlementsAfterPurchase',
    module: 'account.ts',
    attemptedRoute: 'GET /v1/account/entitlements',
    status: 'no-backend-contract',
    reason: "@Controller('account') serves only DELETE / and GET /export. The entitlement read model is server-to-server only (GET /internal/v1/entitlements/{householdId}) and is not parent-callable.",
  },

  // ── purchase.api.ts ──────────────────────────────────────────────────────
  {
    operation: 'processPayment',
    module: 'purchase.api.ts',
    attemptedRoute: 'POST /v1/orders/{orderId}/pay',
    status: 'no-backend-contract',
    reason: 'Payment completes in Stripe checkout and is confirmed through POST /webhooks/stripe; the client never posts a payment.',
  },
  {
    operation: 'getBillingProviderStatus',
    module: 'purchase.api.ts',
    attemptedRoute: 'GET /v1/billing/provider-status',
    status: 'no-backend-contract',
    reason: 'No provider-status route exists in the modular billing or payments modules.',
  },
  {
    operation: 'getShippingStatus',
    module: 'purchase.api.ts',
    attemptedRoute: 'GET /v1/billing/orders/{orderId}/shipping',
    status: 'no-backend-contract',
    reason: 'The orders module exposes create/get/cancel/return-request only; no shipping or fulfilment read model exists.',
  },
  {
    operation: 'activateRobot',
    module: 'purchase.api.ts',
    attemptedRoute: 'POST /v1/devices/activate',
    status: 'no-backend-contract',
    reason: 'POST /v1/device/activate exists but is the OTA device alias — it authenticates by device-id/client-id headers and takes no activation code, so it cannot serve a consumer activation flow.',
  },
  {
    operation: 'createOrder',
    module: 'purchase.api.ts',
    attemptedRoute: 'POST /v1/billing/orders',
    status: 'backend-route-exists',
    reason: 'The modular billing orders route is live and bridged, but wiring the client needs the skuId/amountCents/shippingAddress request contract and a checkout screen — purchase-feature work, not contract sync.',
    owner: 'LESSON_PRODUCTION_PLAN.md §5 — F-T52-01 (purchase feature)',
  },

  // ── course-library.api.ts ────────────────────────────────────────────────
  {
    operation: 'purchaseCourse',
    module: 'course-library.api.ts',
    attemptedRoute: 'POST /v1/course-library/{courseId}/purchase',
    status: 'no-backend-contract',
    reason: 'There is no purchase route; entitlement is granted by POST /v1/course-library/{courseId}/unlock, which unlockCourse already calls.',
  },

  // ── controls.ts ─────────────────────────────────────────────────────────
  {
    operation: 'controlsApi.getControls',
    module: 'controls.ts',
    attemptedRoute: 'GET /v1/controls/{deviceId}',
    status: 'backend-route-exists',
    reason: 'ControlsController serves this today; mobile has no response contract or consuming screen for it yet.',
    owner: 'LESSON_PRODUCTION_PLAN.md §5 — F-T52-02 (device controls feature)',
  },
  {
    operation: 'controlsApi.updateControls',
    module: 'controls.ts',
    attemptedRoute: 'PUT /v1/controls/{deviceId}',
    status: 'backend-route-exists',
    reason: 'ControlsController serves this today; mobile has no request contract or consuming screen for it yet.',
    owner: 'LESSON_PRODUCTION_PLAN.md §5 — F-T52-02 (device controls feature)',
  },

  // ── dashboard.ts — the live read models are the /v1/summaries family ─────
  {
    operation: 'getSessionHistory',
    module: 'dashboard.ts',
    attemptedRoute: 'GET /v1/summaries/sessions/{deviceId}',
    status: 'backend-route-exists',
    reason: 'SummariesController serves this; the mobile dashboard reads the lesson-progress projection instead and has no mapper for the summaries payload.',
    owner: 'LESSON_PRODUCTION_PLAN.md §5 — F-T52-03 (dashboard feature)',
  },
  {
    operation: 'getSafetyEvents',
    module: 'dashboard.ts',
    attemptedRoute: 'GET /v1/summaries/safety/{deviceId}',
    status: 'backend-route-exists',
    reason: 'SummariesController serves this; no mobile mapper or consuming screen exists yet.',
    owner: 'LESSON_PRODUCTION_PLAN.md §5 — F-T52-03 (dashboard feature)',
  },
  {
    operation: 'getWeeklySummary',
    module: 'dashboard.ts',
    attemptedRoute: 'GET /v1/summaries/weekly/{deviceId}',
    status: 'backend-route-exists',
    reason: 'SummariesController serves this; no mobile mapper or consuming screen exists yet.',
    owner: 'LESSON_PRODUCTION_PLAN.md §5 — F-T52-03 (dashboard feature)',
  },
  {
    operation: 'getSessionCost',
    module: 'dashboard.ts',
    attemptedRoute: 'GET /v1/summaries/cost/{deviceId}',
    status: 'backend-route-exists',
    reason: 'SummariesController serves this; no mobile mapper or consuming screen exists yet.',
    owner: 'LESSON_PRODUCTION_PLAN.md §5 — F-T52-03 (dashboard feature)',
  },

  // ── device.api.ts ───────────────────────────────────────────────────────
  {
    operation: 'getFirmwareVersion',
    module: 'device.api.ts',
    attemptedRoute: 'GET /v1/robots/{deviceId}/ota/status',
    status: 'backend-route-exists',
    reason: 'RobotsController serves OTA status; mobile has no mapper for it and the pairing flow reads firmware from the device record instead.',
    owner: 'LESSON_PRODUCTION_PLAN.md §5 — F-T52-04 (device management feature)',
  },
  {
    operation: 'runFirmwareUpdate',
    module: 'device.api.ts',
    attemptedRoute: 'POST /v1/robots/{deviceId}/ota',
    status: 'backend-route-exists',
    reason: 'RobotsController serves the OTA trigger; exposing it to parents is a product decision that has not been made.',
    owner: 'LESSON_PRODUCTION_PLAN.md §5 — F-T52-04 (device management feature)',
  },
  {
    operation: 'setDeviceWifi',
    module: 'device.api.ts',
    attemptedRoute: 'PUT /v1/devices/{deviceId}/wifi',
    status: 'no-backend-contract',
    reason: 'Wi-Fi credentials are provisioned over BLE during pairing, never over HTTP; no such route exists.',
  },
  {
    operation: 'pushCourseToDevice',
    module: 'device.api.ts',
    attemptedRoute: 'POST /v1/devices/{deviceId}/courses',
    status: 'no-backend-contract',
    reason: 'Push is course-scoped, not device-scoped: POST /v1/course-library/{courseId}/send-to-robot is the live route and sendCourseToRobot already calls it.',
  },
] as const satisfies readonly UndocumentedRoute[];

export function findUndocumentedRoute(operation: string): UndocumentedRoute | undefined {
  return UNDOCUMENTED_API_ROUTES.find((route) => route.operation === operation);
}
