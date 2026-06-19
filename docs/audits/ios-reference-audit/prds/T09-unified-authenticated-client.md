# T09: Unify authenticated axios client, auth invalidation, and retry/idempotency

## Status
Registry status: NOT_STARTED | Priority: P0 | Blast radius: HIGH

## Problem
The mobile codebase maintains two near-identical axios instances for authenticated traffic:

- `src/services/http/client.ts` (default `client`) handles REST traffic to `Config.API_BASE_URL`.
- `src/services/api/ai.ts` (`_aiClient`) handles AI traffic to `Config.AI_BASE_URL`.

Both files duplicate Bearer-token injection, 401 refresh-queue orchestration, token clearing, and auth-invalidation callback logic (compare `client.ts:44-116` with `ai.ts:28-75`). The duplication has already drifted: `client.ts` normalizes errors via `withRetryMetadata`/`normalizeError` while `ai.ts` rejects raw axios errors at line 73.

Worse, `setAiAuthInvalidatedHandler` is exported by `ai.ts:18` but **never registered** by `AuthContext.tsx` or any other caller (confirmed by codebase search). When an AI endpoint rejects the refresh token, tokens are silently cleared but the UI stays on the authenticated stack, stranding the user.

Other gaps in the same surface:

- `client.ts:52` mints request IDs with `mobile-${Date.now()}-${Math.random()}`, while `src/services/http/idempotency.js:13` provides a separate `newRequestId()` generator using `crypto.randomUUID()`.
- `client.ts:61-66` and `utils/errors.ts:168-170` tag 429/503/504 errors as `retryable: true` but never actually retry them.
- `ai.ts:77-133` stubs `transcribe`, `chat`, and `synthesize` throw `backendContractUnavailable` instead of using a shared authenticated client.

Audit sources:

- `reports/network-auth-ws.md#improvements` (duplicate clients, unregistered AI handler, missing retry, divergent request IDs)
- `reports/state-architecture.md#improvements` (duplicate token-refresh interceptor, unregistered `setAiAuthInvalidatedHandler`)
- `MASTER_AUDIT.md#cross-cutting-themes-3` (auth/network duplication and coverage gaps)

## Scope

### In scope

- `src/services/http/client.ts`
  - Extract a `createAuthenticatedClient({ baseURL, timeout, normalizeErrors })` factory.
  - Keep the existing default `client` export as `createAuthenticatedClient({ baseURL: Config.API_BASE_URL })`.
  - Add automatic retry for `retryable` errors on idempotent HTTP methods.
  - Use `newRequestId()` from `idempotency.js` for mutating requests.
- `src/services/api/ai.ts`
  - Replace the private `_aiClient` and duplicated interceptors with a single call to `createAuthenticatedClient({ baseURL: Config.AI_BASE_URL, timeout: 15000 })`.
  - Delete `setAiAuthInvalidatedHandler`.
  - Wire `transcribe`, `chat`, and `synthesize` to the shared client (comments may be removed or kept behind the same client call).
- `src/services/http/refresh-queue.ts`
  - Keep the queue/refresh primitives; the factory will import them.
  - Optionally cap queue length and de-duplicate identical in-flight GETs (registry notes this as a bottleneck but it is secondary to unification).
- `src/services/http/idempotency.js`
  - Keep `newRequestId()` as the single generator; ensure it is used by the factory.
- `src/contexts/AuthContext.tsx`
  - Continue registering one auth-invalidated handler from `client.ts`.
  - Do **not** import or register `setAiAuthInvalidatedHandler` from `ai.ts`.
  - (Optional but recommended) Replace raw axios error shape inspection at lines 95-97 with the normalized `AppError.status` field or an `isAuthError` predicate from `utils/errors.ts`.
- `src/utils/errors.ts`
  - Ensure `AppError` shape and `isAuthError`/retry predicates are stable for the factory to consume.
- `tests/verification/T09-unified-authenticated-client.test.ts`
  - New verification test that fails before the fix and passes after.

### Out of scope

- `src/services/storage/secureStore.ts` — token read/write helpers stay as-is (consolidation with `tokens.ts` is T12).
- `src/api/*` — re-export shim removal is T12.
- `src/services/ws/realtime.ts` — WebSocket URL contract is T08.
- `src/contexts/HouseholdContext.tsx` — parallel fetch/cancellation is T11.
- `src/hooks/useOfflineSync.ts` — offline replay through axios is a separate follow-up.
- Changing backend auth contracts (refresh response shape, idempotency-key semantics). Those must be confirmed, not changed.

## Proposed solution

1. **Introduce `createAuthenticatedClient`** in `src/services/http/client.ts`.
   - Signature: `createAuthenticatedClient(options: { baseURL: string; timeout?: number; normalizeErrors?: boolean }): AxiosInstance`.
   - Default `timeout` should be 30000 to preserve current REST behavior; AI callers pass 15000.
   - Move the existing request interceptor (Bearer token, request-id), 401 response interceptor, and `onAuthInvalidated` registration surface into the factory.
   - Export the factory, keep `export default client` as the canonical REST client.

2. **Centralize retry logic inside the factory**.
   - Wrap the axios instance with a lightweight retry helper (inline or via `axios-retry`) that:
     - Retries only idempotent methods (`GET`, `HEAD`, `OPTIONS`, `PUT` with idempotency key, etc.).
     - Retries only when the error is tagged `retryable: true` or status is 429/503/504.
     - Uses exponential backoff with jitter (e.g., `delay = Math.min(2 ** attempt * 1000, 30000) * (0.5 + Math.random())`).
     - Honors `retryAfterSeconds` when present.
   - Keep the existing `validateStatus` behavior so 307 responses still pass through.

3. **Consolidate request-id generation**.
   - In the request interceptor, replace the `mobile-${Date.now()}-${Math.random()}` fallback with `newRequestId()` from `src/services/http/idempotency.js`.
   - For mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`), attach `X-Request-Id` if the caller did not already supply one or an `Idempotency-Key`.
   - Preserve the existing precedence: explicit `X-Request-Id` > explicit `Idempotency-Key` > generated id.

4. **Refactor `src/services/api/ai.ts`**.
   - Remove `_aiClient`, its duplicated interceptors, and `setAiAuthInvalidatedHandler`.
   - Create `const aiClient = createAuthenticatedClient({ baseURL: Config.AI_BASE_URL, timeout: 15000 });`.
   - Update `transcribe`, `chat`, and `synthesize` to call `aiClient`.
   - If backend endpoints remain undeployed, the functions may still throw `BackendContractUnavailableError`, but they must do so **after** attempting the shared-client call or via an explicit feature-flag gate, not as a synchronous stub.

5. **Clean up `AuthContext.tsx`**.
   - Keep the existing `setAuthInvalidatedHandler` registration (lines 61-68).
   - Remove any import/registration of `setAiAuthInvalidatedHandler` (there is currently none; keep it that way).
   - Refactor lines 95-97 to use the normalized `AppError.status` or a new `isAuthError(error)` predicate from `utils/errors.ts`.

6. **Stabilize `src/utils/errors.ts`**.
   - Keep `AppError.status` populated for 401/403/etc.
   - Consider adding `isAuthError(error): boolean` and `isRetryableError(error): boolean` helpers so the factory does not need axios internals.

7. **Update `src/services/http/refresh-queue.ts`** only if needed.
   - The factory imports `isRefreshing`, `setRefreshing`, `enqueue`, `processQueue`, `refreshAuthTokens`, `clearAuthTokens`.
   - Optionally add a `MAX_QUEUE_LENGTH` guard to mitigate the thundering herd noted in the audit.

## Acceptance criteria

1. A single `createAuthenticatedClient({ baseURL, timeout, normalizeErrors })` factory serves both REST and AI traffic.
2. `AuthContext` registers one auth-invalidated handler that covers all authenticated clients; no separate AI handler exists or is required.
3. Retryable 429/503/504 responses are retried with exponential backoff for idempotent methods.
4. Request-id generation is consolidated with `idempotency.js` and attached to mutating requests.
5. AI stub functions (`transcribe`, `chat`, `synthesize`) use the shared client.

## Dependencies

None. This task is a prerequisite for T11 (HouseholdContext perf/cancellation) and T12 (remove API shims/consolidate storage), which touch the same auth/network surface.

## Exclusions / anti-overlap

- **T08 (explicit WS URL contract)** owns `src/services/ws/realtime.ts`; do not change WebSocket derivation here.
- **T11 (household context perf/cancellation)** owns `HouseholdContext.tsx` refresh behavior; do not expand scope into HouseholdContext beyond the auth-invalidation handler.
- **T12 (remove API shims/consolidate storage)** owns deleting `src/api/*` and consolidating `tokens.ts` into `secureStore.ts`; do not delete `tokens.ts` or `src/api/*` in this task.
- Do not refactor `useOfflineSync.ts` replay logic.

## Verification test plan

- **Test file:** `tests/verification/T09-unified-authenticated-client.test.ts`
- **What it proves:**
  - `createAuthenticatedClient` exists and produces configured axios instances.
  - Bearer tokens are injected by the factory.
  - 503 responses on `GET` are retried until success.
  - Mutating requests use `newRequestId()` for `X-Request-Id`.
  - `AuthContext.tsx` does not import a separate `setAiAuthInvalidatedHandler`.
  - `src/services/api/ai.ts` uses `createAuthenticatedClient` and removes `setAiAuthInvalidatedHandler` / `backendContractUnavailable` stubs.
- **How to run it:** `npx jest tests/verification/T09-unified-authenticated-client.test.ts`
- **Expected state before fix:** FAIL
- **Expected state after fix:** PASS

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Unified factory breaks existing REST call behavior | Keep the default `client` export with identical base URL and timeout; run existing auth/context tests. |
| Retry loop causes request storms | Retry only idempotent methods; cap total delay; add jitter; honor `retryAfterSeconds`. |
| AI client loses its 15 s timeout | Pass `timeout: 15000` explicitly when creating the AI client. |
| Auth-invalidation handler no longer fires for AI calls | The shared factory uses the same handler for all instances; add a regression test. |
| `newRequestId()` throws in environments without `crypto.randomUUID` | The fallback in `idempotency.js` already handles this; keep it. |
| Request-id change breaks server correlation | Maintain the same `X-Request-Id` header name and precedence rules. |

## Coordination notes

- **Backend:** Confirm the refresh-token response shape (`{ access_token, refresh_token }` vs `{ data: { access_token, refresh_token } }`). `refresh-queue.ts:58` already consumes both shapes, but the contract should be documented.
- **Backend:** Confirm whether mutating endpoints expect `Idempotency-Key`, `X-Request-Id`, or both, and whether the server correlates them.
- **Mobile/QA:** Regression-test login, logout, token refresh, and AI-lesson flows on a fresh install after the change.

## Implementation hints

- Read `src/services/http/client.ts:34-116` carefully; that is the reference implementation to extract into the factory.
- `src/services/api/ai.ts:28-75` is the duplicate to delete.
- `src/services/http/idempotency.js` is the source of truth for request IDs.
- Existing test `tests/contexts/auth-invalidation.test.tsx` mocks `setAuthInvalidatedHandler`; after the refactor, that mock path must continue to work (the export name stays the same).
- If using `axios-retry`, ensure it is added to `transformIgnorePatterns` in Jest config (T02 covers broader Jest hygiene).
- Use a custom axios `adapter` in unit tests to simulate 503/429 responses without real network calls.
