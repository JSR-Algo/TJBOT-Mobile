# T11: Parallelize household fetches and replace arbitrary timeouts

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: MEDIUM

## Problem
`HouseholdContext.refresh()` is a cold-start bottleneck. It currently:

1. Awaits `householdsApi.list()`.
2. After that resolves, picks `households[0]` as the active household.
3. Then awaits `householdsApi.listChildren(active.id)`.

Because the two network calls run sequentially, the user stares at the loading spinner for the *sum* of both latencies. On Render free-tier cold starts this frequently exceeds the 12 s fallback timeout that was added specifically to mask the problem (`src/contexts/HouseholdContext.tsx:73-75`). That timeout silently clears `isLoading`, which can leave the app in a half-hydrated state.

There is also no request cancellation when the provider unmounts, no offline cache of the last known household list, and the provider value object is recreated on every render, causing re-render cascades in the authenticated subtree.

Audit sources:

- `docs/audits/ios-reference-audit/reports/network-auth-ws.md#bottlenecks` (lines 154-157): `HouseholdContext.refresh()` blocks cold start on sequential API calls.
- `docs/audits/ios-reference-audit/reports/network-auth-ws.md#improvements` (lines 94-97): arbitrary `setTimeout` fallbacks mask real performance issues and should be replaced with cancellation/deadline telemetry.
- `docs/audits/ios-reference-audit/reports/state-architecture.md#improvements` (lines 84): `AuthContext` and `HouseholdContext` values are not memoized, causing consumer re-renders.
- `docs/audits/ios-reference-audit/reports/state-architecture.md#bottlenecks` (lines 104-105): `refresh()` awaits list then children with a 12 s timeout and no abort/cache.

## Scope

### In scope
- `src/contexts/HouseholdContext.tsx`
  - `refresh()` parallelization, cancellation, and cache integration.
  - Provider value memoization.
  - AsyncStorage read/write for instantaneous hydration.

### Out of scope
- `src/services/api/households.ts` — per the registry this wrapper is not owned by T11. Cancellation signals will be consumed through it only if T09 (or a minimal follow-up) propagates them.
- `src/app/providers/QueryProvider.tsx` — a later React Query migration is T15.
- `src/contexts/AuthContext.tsx` — memoization work there is tracked separately; T11 only touches `HouseholdContext`.
- Any backend endpoint or contract changes.

## Proposed solution

1. **Cache last-known household state in AsyncStorage**
   - On every successful refresh, persist:
     - `@tbot/household-context:households` → `JSON.stringify(households)`
     - `@tbot/household-context:active-household-id` → `activeHousehold?.id ?? ''`
   - On provider mount, read the cache *before* the API call and seed `households`/`activeHousehold` so the UI is never empty while the network warms up.
   - Keep `onboarding_complete_v1` in `SecureStore`; do not move it.

2. **Parallelize the network calls**
   - `refresh()` should still call `householdsApi.list()`.
   - When an active household ID is already known (from current React state or from the cache), also start `householdsApi.listChildren(activeId)` immediately.
   - Use `Promise.all` (or `Promise.allSettled` if we want to surface partial errors) and update state once after both settle.
   - If `list()` returns a different active household than expected, fetch its children in a small follow-up call and update state again. This keeps the common case (cached active id is still valid) fast while remaining correct.

3. **Add request cancellation on unmount**
   - Create one `AbortController` inside the `refresh` effect.
   - Pass its `signal` to the API calls. The exact shape depends on the T09 shared-client contract:
     - Preferred: `householdsApi.list({ signal })` / `householdsApi.listChildren(activeId, { signal })`.
     - Acceptable: call the shared axios client directly with `{ signal }` if the wrappers cannot be changed.
   - Return a cleanup function that calls `controller.abort()` when the provider unmounts or before a subsequent refresh starts.
   - Guard `setState` calls with `if (!signal.aborted)` to avoid React warnings about state updates on unmounted components.

4. **Remove the arbitrary 12 s fallback timeout**
   - Delete the `setTimeout(..., 12000)` in `refresh()`.
   - The operation-specific deadline should be the axios-level timeout configured by T09 (e.g., 30 s for cold-start endpoints). If telemetry is needed, log when a refresh exceeds a budget (e.g., 5 s) instead of mutating state.

5. **Memoize the provider value**
   - Use `React.useMemo` for the object passed to `<HouseholdContext.Provider value={...}>`.
   - Key it on `state` and stable callback references (`useCallback` for `refresh`, `createHousehold`, `selectHousehold`, `addChild`, `completeOnboarding`, `clearPendingDeviceSetup`).
   - This directly addresses the re-render cascade noted in the state-architecture audit.

6. **Keep the public API stable**
   - `HouseholdProvider`, `useHousehold`, `useOptionalHousehold`, `clearOnboardingCompleteStore`, and all context methods keep their existing signatures.
   - No changes to screens or navigation callers.

## Acceptance criteria

1. `refresh()` fetches households and active-household children in parallel with `Promise.all`.
2. An `AbortController` or axios cancel token aborts in-flight requests on unmount.
3. The 12 s arbitrary timeout is removed or replaced by an operation-specific deadline with telemetry.
4. The last known household list is cached in AsyncStorage for instantaneous hydration.
5. Provider value object is memoized to avoid re-render cascades.

## Dependencies

- **T09 — Unified authenticated axios client, auth invalidation, and retry/idempotency**
  - T11 relies on T09 to provide per-request cancellation support through the shared client or API wrappers.
  - If T09 does not expose a signal/cancel-token interface to `src/services/api/households.ts`, T11 will need a minimal, reviewable extension to those wrappers and must coordinate with the T09 owner.

## Exclusions / anti-overlap

- **T12 — Remove API shims and consolidate secure-storage wrappers**
  - T12 will change imports in `HouseholdContext.tsx`. T11 should not refactor imports beyond what is strictly required for AsyncStorage/SecureStore usage, and T12 must rebase after T11 lands.
- **T15 — Migrate household server state to React Query**
  - T15 is a larger migration that will eventually replace much of `HouseholdContext`. T11 is a tactical fix; do not rewrite the context in React Query here.
- **T09 — Shared client**
  - Do not duplicate T09's retry/idempotency/auth-invalidation work inside `HouseholdContext`.

## Verification test plan

- Test file: `tests/verification/T11-household-context-perf-cancellation.test.tsx`
- What it proves:
  - `refresh()` starts both `householdsApi.list()` and `householdsApi.listChildren(activeId)` when an active household is known.
  - An `AbortController` is created and aborted on unmount.
  - The legacy 12 s fallback timeout no longer flips `isLoading` to false.
  - The last known household list is read from AsyncStorage for instantaneous hydration and written back after a successful refresh.
  - The provider value is memoized so parent re-renders do not cascade into context consumers.
- How to run it: `npx jest tests/verification/T11-household-context-perf-cancellation.test.tsx`
- Expected state before fix: FAIL
- Expected state after fix: PASS

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| T09 does not expose a request `signal` to the household wrappers. | Land a minimal wrapper signature change as part of T09, or call the shared axios client directly inside `refresh()` with the exact same endpoints/unwrap logic and document the temporary duplication. |
| Cached active household id becomes stale (e.g., household deleted on another device). | Always call `list()`; only use the cached id to parallelize `listChildren()`. After `list()` resolves, reconcile: if the cached id is missing, fetch children for `households[0]`. |
| Removing the 12 s timeout makes Render cold starts feel slower. | The axios-level timeout remains generous (30 s). Add telemetry for budget violations rather than silently clearing loading state. |
| AsyncStorage errors break refresh. | Wrap cache reads/writes in `try/catch` and treat them as best-effort; never throw into the user-facing flow. |
| Memoizing the value object accidentally breaks consumers that depended on referential instability. | There should be none; the test suite and typecheck will catch any consumer that was relying on a new object identity. |

## Coordination notes

- Consult the **T09 owner** to confirm how per-request `AbortSignal` or cancel tokens will be passed through the shared authenticated client and the `src/services/api/households.ts` wrappers.
- No backend contract change is required; the same endpoints and response shapes are used.

## Implementation hints

- Read `src/contexts/HouseholdContext.tsx` lines 64-103 carefully; that is the entire `refresh()` function to replace.
- Use the existing AsyncStorage mock at `tests/__mocks__/@react-native-async-storage/async-storage.ts` in the verification test.
- Keep `SecureStore` usage for `onboarding_complete_v1` unchanged; T12 will consolidate secure-storage wrappers later.
- When writing the cache, also persist `activeHousehold?.id` so the next cold start can parallelize children fetch immediately.
- To test parallel fetch, the test primes an active household from a first successful refresh and then triggers a second refresh while both API mocks are deferred.
