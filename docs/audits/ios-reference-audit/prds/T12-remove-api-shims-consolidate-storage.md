# T12: Remove API shims and consolidate secure-storage wrappers

## Status
Registry status: `NOT_STARTED` | Priority: `P1` | Blast radius: `MEDIUM`

## Problem
The mobile codebase has two kinds of avoidable indirection in its networking/storage layer:

1. **`src/api/*` are shallow re-export shims.**
   - `src/api/client.ts:1` is `export { BASE_URL, default } from '@/services/http/client';`
   - `src/api/tokens.ts:1` is `export * from '@/services/http/tokens';`
   - `src/api/learning.ts:1` is `export * from '@/services/api/learning';`

   These files create a second, non-canonical import path for the same symbols and fragment code discovery. The audit explicitly recommends removing them:
   - `docs/audits/ios-reference-audit/reports/network-auth-ws.md#simplifications` lines 114–116.
   - `docs/audits/ios-reference-audit/reports/state-architecture.md#simplifications` lines 92.

2. **Secure-storage wrappers are duplicated.**
   - `src/services/http/tokens.ts:1–48` wraps `expo-secure-store` with token helpers (`getAccessToken`, `setTokens`, `clearTokens`, `getSecureJson`, etc.) and defines `SECURE_STORE_OPTIONS`.
   - `src/services/storage/secureStore.ts:1–36` already wraps `expo-secure-store` with typed `StorageError`s but only exposes generic `getItem` / `setItem` / `removeItem`.

   `AuthContext.tsx:6–13` currently imports all token helpers from `../services/http/tokens`, while `HouseholdContext.tsx:2` imports `expo-secure-store` directly for onboarding persistence. Consolidating on `src/services/storage/secureStore.ts` gives the app one secure-storage surface.

No production file currently imports from `@/api/*` (verified by grep), so the cleanup is safe once the shims are deleted and callers are re-pointed.

## Scope
### In scope
- Delete `src/api/client.ts`, `src/api/tokens.ts`, and `src/api/learning.ts`.
- Move token helper exports from `src/services/http/tokens.ts` into `src/services/storage/secureStore.ts`.
- Delete `src/services/http/tokens.ts` after its consumers are migrated.
- Update `src/contexts/AuthContext.tsx` to import token helpers from `src/services/storage/secureStore.ts`.
- Update `src/contexts/HouseholdContext.tsx` to import secure-storage helpers from `src/services/storage/secureStore.ts` instead of `expo-secure-store` directly.
- Add/update the verification test at `tests/verification/T12-remove-api-shims-consolidate-storage.test.ts`.

### Out of scope
- `src/services/http/client.ts` (owned by T09 — client unification).
- `src/services/api/ai.ts` (owned by T09).
- `src/services/http/refresh-queue.ts` (owned by T09).
- `src/services/api/learning.ts` implementation (only the shim is removed; actual endpoint work is a product decision tracked separately).
- `src/services/storage/asyncStorage.ts`.
- Any package-level changes to `package.json`, `eas.json`, or Jest config.

## Proposed solution
1. **Remove the shim directory.** Delete `src/api/client.ts`, `src/api/tokens.ts`, and `src/api/learning.ts`. No source file imports from `@/api/*` today, so no import updates are required beyond deleting the files.
2. **Consolidate secure-storage helpers.** Move the following from `src/services/http/tokens.ts` into `src/services/storage/secureStore.ts`:
   - `getAccessToken()`
   - `getRefreshToken()`
   - `setTokens(accessToken, refreshToken)`
   - `clearTokens()`
   - `getSecureJson<T>(key)`
   - `setSecureJson(key, value)`
   - `deleteSecureItem(key)`
   - `SECURE_STORE_KEYS`
   Use the existing `OPTIONS` object in `secureStore.ts` (it is identical to `SECURE_STORE_OPTIONS` in `tokens.ts`). Keep `keychainAccessible: SecureStore.WHEN_UNLOCKED` unchanged.
3. **Delete the old wrapper.** Remove `src/services/http/tokens.ts` once the move is complete.
4. **Update `AuthContext.tsx`.** Replace `../services/http/tokens` imports with `../services/storage/secureStore`. The helper names and signatures stay the same, so the rest of the file is unchanged.
5. **Update `HouseholdContext.tsx`.** Replace the direct `expo-secure-store` import and raw `getItemAsync`/`setItemAsync`/`deleteItemAsync` calls with the typed helpers from `../services/storage/secureStore` (`getItem`, `setItem`, `removeItem`). This keeps onboarding persistence on the same module as token storage.
6. **Verify.** Run `npx jest tests/verification/T12-remove-api-shims-consolidate-storage.test.ts`, then `npm run typecheck` and `npm test -- --selectProjects unit --testPathPattern='tests/(contexts|verification)'`.

## Acceptance criteria
1. `src/api/*` files are deleted and all imports point to `src/services/*` directly.
2. Token helpers in `src/services/http/tokens.ts` are moved into `src/services/storage/secureStore.ts` or use its typed helpers.
3. `AuthContext` and `HouseholdContext` import storage helpers from the consolidated module.
4. No source file imports from `@/api/*`.

## Dependencies
- **T09 — Unify authenticated axios client, auth invalidation, and retry/idempotency.** `AuthContext.tsx` is already touched by T09 for the shared client/auth handler. Doing T12 before or in parallel would create merge conflicts on the same context file.
- **T11 — Parallelize household fetches and replace arbitrary timeouts.** `HouseholdContext.tsx` is already touched by T11 for parallel fetch, cancellation, and caching. T12 should land after T11 to avoid conflicting imports in `HouseholdContext.tsx`.

## Exclusions / anti-overlap
- **T13 — Delete dead providers and unused hooks/components.** T13 deletes `AppProviders.tsx`, `ThemeProvider.tsx`, and several hooks. It does not touch `src/api/*` or secure storage; safe to run in parallel as long as the same files are not edited.
- **T01 / T02 — Project-health tasks.** These may touch `package.json` and Jest config. Do not modify `src/api/*` or `src/services/http/tokens.ts` as part of those tasks.
- **T15 — React Query household migration.** T15 will refactor `HouseholdContext.tsx` further. Coordinate so that T12’s import changes to `secureStore.ts` are preserved when T15 lands.

## Verification test plan
- **Test file:** `tests/verification/T12-remove-api-shims-consolidate-storage.test.ts`
- **What it proves:**
  - The `src/api/*` shim files no longer exist.
  - The duplicate `src/services/http/tokens.ts` wrapper no longer exists.
  - `src/services/storage/secureStore.ts` exposes the token helpers previously in `http/tokens.ts`.
  - No source file imports from `@/api/*`.
  - `AuthContext.tsx` and `HouseholdContext.tsx` import secure-storage helpers from the consolidated module and no longer import from `services/http/tokens` or `expo-secure-store` directly.
- **How to run it:** `npx jest tests/verification/T12-remove-api-shims-consolidate-storage.test.ts`
- **Expected state before fix:** FAIL
- **Expected state after fix:** PASS

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Import path churn conflicts with T09/T11 | Land T09 and T11 first, then rebase T12. Run the verification test after each rebase. |
| Token helper behavior subtly changes when moved to `secureStore.ts` | Keep function names, signatures, and `WHEN_UNLOCKED` option identical. Add unit tests for `getSecureJson` / `setSecureJson` if they do not already exist. |
| HouseholdContext onboarding persistence breaks if `getItem` returns `null` vs throws | `secureStore.ts` already returns `string \| null`; update call sites to handle `null` the same way the current raw SecureStore calls do. |
| Something still imports a deleted `@/api/*` symbol | The verification test scans every `src/**/*.ts{,x}` file for `@/api/` imports; CI will catch regressions. |
| TypeScript path alias `@/api/*` becomes a phantom import | After deletion, the `@/api/*` directory is gone; any future import will fail at build time. |

## Coordination notes
- No cross-repo coordination is required for this task.
- Coordinate **within the mobile audit fleet**: T12 must not start implementation until T09 and T11 are merged, because all three tasks edit `AuthContext.tsx` and/or `HouseholdContext.tsx`.
- If T15 begins before T12 lands, the assignees should agree on the final import line for `HouseholdContext.tsx` so only one PR changes it.

## Implementation hints
- Read before editing:
  - `src/api/client.ts:1`, `src/api/tokens.ts:1`, `src/api/learning.ts:1`
  - `src/services/http/tokens.ts:1–48`
  - `src/services/storage/secureStore.ts:1–36`
  - `src/contexts/AuthContext.tsx:6–13`
  - `src/contexts/HouseholdContext.tsx:1–26`
- The `StorageError` class in `secureStore.ts` is a better error type than the raw `expo-secure-store` errors `HouseholdContext.tsx` currently ignores; consider surfacing it in telemetry instead of swallowing silently.
- After moving helpers, delete `src/services/http/tokens.ts`. If any other file still imports it, the verification test (and TypeScript) will fail.
- A quick one-liner to confirm no `@/api/*` imports remain:
  ```bash
  grep -R "@/api/" src/ --include="*.ts" --include="*.tsx" || echo "clean"
  ```
