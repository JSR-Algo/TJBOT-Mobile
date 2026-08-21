# QA Evidence: T5.4 H1 Parent Reconciliation Physical Run

- **Date:** 2026-08-19
- **Branch:** `lesson-prod/t54-parent-realtime-physical-repro`
- **Status:** IN_PROGRESS
- **Release APK SHA-256:** `c47245b3924485c7653b911631e27390e62501802c192162654b5b951f696782`

## 1. Reproduction & Root Causes

1. **Stale HTTP Trashing Realtime Projections**:
   - `useParentLearningStatusQuery` previously replaced state with any HTTP query result regardless of revision, clobbering higher realtime sequence numbers when background refetches or slow HTTP responses resolved out of order.
   - **Fix**: Added `newestParentLearningStatus` arbitration helper comparing projection revisions with `compareProjectionRevisions`.

2. **Silent Healthy Realtime During Active Lessons**:
   - WebSocket connection could remain healthy and open while no frame arrived for active lesson progression. Polling was previously gated strictly on `socketExhausted`.
   - **Fix**: Added `reconcileWhileActive: isFocused` option in `ParentTodayScreen` to poll status every 10s when active and focused.

3. **Household Refresh Remounting Protected Root Navigator**:
   - Background household query refetches (`householdLoading`) caused `RootStackNavigator` to unmount `ModalNavigator` and show the loading spinner, destroying screen state and focus.
   - **Fix**: Added `protectedBranchMounted` ref to preserve the protected stack across post-boot household refreshes.

## 2. Gate Verification Summary

| Gate | Status | Command / Details |
|---|---|---|
| Focused Unit Tests | PASS (90/90) | `npx jest --selectProjects unit ...` (7 suites passed) |
| Strict Typecheck | PASS | `npx tsc --noEmit` (0 errors) |
| Linter | PASS | `npm run lint` (0 warnings/errors) |
| Full Unit Tests | PASS (2730/2730) | `npm test -- --runInBand` (229 suites passed) |
| Integration Tests | PASS (6/6) | `npm run test:integration -- --runInBand` (3 suites passed) |
| Flows Validate | PASS | `npm run flows:validate` |
| Sequences Fast | PASS | `npm run sequences:fast` |
| ERD Validate | PASS | `npm run erd:validate` |
| Use Cases Check | PASS | `npm run usecases:check` |
| Token Parity | PASS | `npm run check:token-parity` |
| Route Coverage | PASS | `npm run check:route-coverage` |
| Screen Prop Types | PASS | `npm run check:screen-prop-types` |
| Gradle Release APK | PASS | `c47245b3924485c7653b911631e27390e62501802c192162654b5b951f696782` |

## 3. Physical Run Evidence (Pending)
- Awaiting execution of physical lesson run according to Task 5 and Task 6.
