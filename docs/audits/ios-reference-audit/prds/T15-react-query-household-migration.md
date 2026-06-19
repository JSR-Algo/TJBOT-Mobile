# T15: Migrate household server state to React Query with defaults

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: MEDIUM

## Problem
Server state for households and children currently lives inside `HouseholdContext` as manual `useState` + `useEffect` fetches. The context:

- Calls `householdsApi.list()` and then `householdsApi.listChildren(active.id)` sequentially (`src/contexts/HouseholdContext.tsx:78-84`), which blocks cold start.
- Maintains its own `isLoading`/`error` state and has no automatic caching, background refetch, stale-while-revalidate, or optimistic updates.
- Appends newly created households and children to local arrays imperatively (`src/contexts/HouseholdContext.tsx:143-148, 163`) instead of invalidating server query keys, so concurrent writers or stale server data can drift from the UI.
- Has a 12 s fallback timeout (`src/contexts/HouseholdContext.tsx:73-75`) that masks slow API responses rather than surfacing them through a shared data-fetching layer.

In addition, the project already depends on `@tanstack/react-query` (see `package.json:68`) and `useHomeState` already demonstrates a working pattern (`src/features/home/hooks/useHomeState.ts:231-238`), but `QueryClient` is created with no defaults (`src/app/providers/QueryProvider.tsx:6`), so every new query will silently inherit React Query's built-in retry=3 and no global stale-time/refetch policy. The audit calls this out in `reports/state-architecture.md#improvements` (lines 78-82 and 104).

## Scope

### In scope
- `src/app/providers/QueryProvider.tsx` — configure default `QueryClient` options.
- `src/contexts/HouseholdContext.tsx` — migrate `households`, `children`, `isLoading`, and `error` server state to React Query; keep mutations for `createHousehold` and `addChild`.
- `src/services/api/households.ts` — add/export stable React Query keys for household list, children list, and child creation.
- `src/features/home/hooks/useHomeState.ts` — align its `useQuery` options with the new provider defaults (remove redundant settings or explicitly override where the home hub needs different behavior).
- `tests/verification/T15-react-query-household-migration.test.tsx` — new verification test.

### Out of scope
- `src/services/api/auth.ts`, `src/services/api/account.ts` — other server-state surfaces stay as-is.
- `src/features/device/**` — device/pairing state is untouched.
- Onboarding persistence (`onboardingComplete`, `protectedInitialRoute`, `pendingDeviceSetup`) remains in `HouseholdContext` local state; this task only migrates server-fetched household/child data.
- Splitting `HouseholdContext` into smaller contexts (that is a separate simplification item in the audit; see `reports/state-architecture.md#simplifications` lines 96-98).

## Proposed solution

1. **Configure `QueryClient` defaults in `QueryProvider.tsx`.**
   - `defaultOptions.queries.retry: 1` — one retry for transient failures; do not silently retry indefinitely.
   - `defaultOptions.queries.networkMode: 'online'` — explicit, even though it matches the React Query default, so the contract is visible.
   - `defaultOptions.queries.refetchOnReconnect: true` — refresh server state when the app comes back online.
   - `defaultOptions.queries.staleTime: 30_000` — a reasonable baseline; individual queries may override.
   - Export the configured `queryClient` so tests and any imperative invalidation helpers can access it.

2. **Define query keys in `src/services/api/households.ts`.**
   Add a small key factory, e.g.:
   ```ts
   export const householdKeys = {
     all: ['households'] as const,
     list: () => [...householdKeys.all, 'list'] as const,
     detail: (id: string) => [...householdKeys.all, 'detail', id] as const,
     children: (householdId: string) => [...householdKeys.all, 'children', householdId] as const,
   };
   ```

3. **Refactor `HouseholdContext.tsx`.**
   - Keep local `useState` only for `onboardingComplete`, `pendingDeviceSetup`, `protectedInitialRoute`, and `activeHousehold` selection.
   - Replace manual `refresh()` fetch with:
     - `useQuery({ queryKey: householdKeys.list(), queryFn: householdsApi.list })`.
     - Derive `activeHousehold` from the query result (`households[0] ?? null`) unless the user has explicitly selected one.
     - `useQuery({ queryKey: householdKeys.children(activeHousehold.id), queryFn: () => householdsApi.listChildren(activeHousehold.id), enabled: !!activeHousehold })`.
   - Expose an explicit `refresh()` that calls `queryClient.invalidateQueries({ queryKey: householdKeys.all })`.
   - Convert `createHousehold` and `addChild` to `useMutation`:
     - `createHousehold` mutation invalidates `householdKeys.list()` on success.
     - `addChild` mutation invalidates `householdKeys.children(householdId)` on success.
   - Preserve the cold-start loading contract: while the first household query is loading, `isLoading` exposed by the context must be `true`.
   - Preserve error normalization: surface `normalizeError(query.error)` as the context `error` string.
   - Keep the auth-loading guard (`authLoading` early-return) and the logout cleanup effect that clears account-scoped data.
   - Memoize the context value object to avoid re-render cascades (audit line 84).

4. **Align `useHomeState.ts`.**
   - Remove the inline `staleTime: 30_000` if the provider default is now `30_000`, or keep it if the home hub truly needs its own value. The goal is one obvious place for defaults.
   - Consider adding a `homeKeys` factory next to `householdKeys` for consistency.

5. **Verification.**
   - The new Jest test mounts `HouseholdProvider` inside `QueryProvider`, asserts the configured defaults, asserts that the initial render shows `isLoading=true`, and asserts that `createHousehold` triggers a refetch of the household list via query-key invalidation.

## Acceptance criteria

1. `QueryProvider` configures sensible defaults: `retry: 1`, `networkMode: 'online'`, `refetchOnReconnect: true`, and a non-zero `staleTime` baseline.
2. `HouseholdContext` uses `useQuery` for the household list and active-household children list.
3. `createHousehold` and `addChild` are implemented as `useMutation` hooks that invalidate the relevant query keys on success.
4. The cold-start loading state is preserved while server state hydrates (`isLoading` is `true` on first fetch).
5. `useHomeState` no longer duplicates the global `staleTime` default unless it needs a feature-specific override.
6. The context value object is memoized to prevent re-render cascades.
7. Existing behavior is preserved: onboarding persistence, logout cleanup, active-household selection, and protected initial route handling continue to work.

## Dependencies

- **T11** — Parallelize household fetches and replace arbitrary timeouts. T15 builds on T11's cancellation/parallel fetch work; do not duplicate it.
- **T12** — Remove API shims and consolidate secure-storage wrappers. T12 may move imports used by `HouseholdContext`; merge T12 before T15 or rebase T15 on top of it.

## Exclusions / anti-overlap

- No other task should rewrite `HouseholdContext` server-state fetching in parallel; coordinate with T11/T12 owners if they touch `HouseholdContext`.
- T18/T19 (Gemini removal) are unrelated to household state.

## Verification test plan

- Test file: `tests/verification/T15-react-query-household-migration.test.tsx`
- What it proves:
  1. `QueryProvider` exports a `QueryClient` whose `defaultOptions.queries` match the required defaults.
  2. `HouseholdProvider` preserves the cold-start loading state while the household/children queries hydrate.
  3. `createHousehold` invalidates the household list query key, causing the list to refetch.
- How to run it: `npx jest tests/verification/T15-react-query-household-migration.test.tsx`
- Expected state before fix: FAIL (defaults missing, initial `isLoading` is `false`, `createHousehold` does not trigger list refetch).
- Expected state after fix: PASS.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Stale household/children data is served from cache after a long background period. | Set a sensible `staleTime` (30 s baseline) and enable `refetchOnReconnect`/`refetchOnWindowFocus` where appropriate. |
| Active household selection is lost on remount because it is derived from `households[0]`. | Keep explicit `activeHousehold` in local state; only fall back to `households[0]` when no explicit selection exists. |
| Mutation invalidation races with optimistic UI updates. | Do not implement optimistic updates in this task; invalidate on success only. |
| Provider value object recreated each render causes re-render cascades. | Wrap the context value in `React.useMemo` with stable callbacks. |
| Query keys collide with other features. | Namespace keys under `'households'` and use a small factory. |
| Existing tests rely on the imperative `refresh()` timing. | Keep `refresh()` as a public method that invalidates queries; existing callers should still work. |

## Coordination notes

No cross-role coordination required for T15 itself. However, because T15 edits `HouseholdContext` and `src/services/api/households.ts`, merge order with T11 and T12 should be agreed with the owners of those tasks to avoid rebase conflicts.

## Implementation hints

- Read `src/features/home/hooks/useHomeState.ts` for the existing React Query pattern already in production.
- Read `src/contexts/ParentSessionContext.tsx` for the memoization pattern the audit recommends (audit line 84).
- Export `queryClient` from `QueryProvider.tsx` so the verification test can clear caches between cases.
- Keep `onboardingComplete`, `protectedInitialRoute`, and `pendingDeviceSetup` as local `useState`; do not move them into React Query.
- If `householdsApi.listChildren` is called with an undefined `householdId`, keep the query `enabled: false` rather than adding a guard inside `queryFn`.
- When invalidating, prefer `queryClient.invalidateQueries({ queryKey: householdKeys.all })` for broad refreshes and targeted keys for mutations.
