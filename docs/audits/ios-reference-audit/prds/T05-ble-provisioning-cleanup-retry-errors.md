# T05: BLE provisioning cleanup, retry, and error mapping

## Status
Registry status: NOT_STARTED | Priority: P0 | Blast radius: HIGH

## Problem
The BLE/Wi-Fi provisioning flow leaves native sessions running when the user navigates away, retries nothing on transient failures, and surfaces generic recovery copy that does not match the XState machine's error model.

Specific findings from the audit:

- `src/features/device/pairing/screens/PairWifiScreen.tsx:31-75` — the `useEffect` cleanup only sets a local `cancelled` boolean. If `connectProvisionableDevice` succeeded, the connected `ESPDevice` keeps its BLE session open, and any in-flight `scanWifiNetworks` call is left running.
- `src/features/device/pairing/screens/PairConnectingScreen.tsx:34-107` — the same `cancelled`-only cleanup is used. After `connectProvisionableDevice` and `provisionWifi` are invoked, navigating back does not disconnect the robot or stop the provision search, which can leave the robot provisioned on the home network but not claimed by the account.
- `src/services/provisioning/espProvisioning.ts:61-83` and `src/services/provisioning/espProvisioning.ts:97-116` — `connectProvisionableDevice` and `provisionWifi` are single-attempt functions. Reference projects retry failed connections with backoff for transient BLE disconnects.
- `src/services/provisioning/espProvisioning.ts:26-34` — `ProvisioningError` only exposes four coarse codes (`NOT_FOUND`, `CONNECT_FAILED`, `SCAN_FAILED`, `PROVISION_FAILED`). The XState machine in `src/state/machines/devicePairing.types.ts:21-31` already defines richer codes (`E-PROV-001`..`E-PROV-005`), but the screens do not consume them.
- `src/features/device/pairing/screens/PairFailedScreen.tsx:21-26` — recovery reasons are hard-coded and generic. The screen ignores any error code and always shows the same four cards, so a BLE timeout and a Wi-Fi password failure receive identical recovery options.
- `src/features/device/pairing/screens/PairWifiScreen.tsx:22-75` — the Wi-Fi network list is scanned once on mount and never refreshed. There is no pull-to-refresh or manual "Scan again" action for transient empty lists.

Audit sources:
- `docs/audits/ios-reference-audit/reports/ble-provisioning.md#improvements`: "`src/features/device/pairing/screens/PairWifiScreen.tsx:31-75` and `src/features/device/pairing/screens/PairConnectingScreen.tsx:34-107` — effect cleanup only sets a `cancelled` boolean. Add cleanup that calls `device.disconnect()` and `stopProvisionSearch()`."
- `docs/audits/ios-reference-audit/reports/ble-provisioning.md#improvements`: "`src/services/provisioning/espProvisioning.ts:26-34` + `src/features/device/pairing/screens/PairFailedScreen.tsx:21-26` — `ProvisioningError` only exposes four coarse codes... Map native/ESP errors to the machine codes and render context-aware recovery actions."
- `docs/audits/ios-reference-audit/reports/ble-provisioning.md#improvements`: "`src/services/provisioning/espProvisioning.ts:61-83` — `connectProvisionableDevice` is a single attempt with no retry. Wrap connect and `provisionWifi` in a small retry helper."
- `docs/audits/ios-reference-audit/reports/ble-provisioning.md#improvements`: "`src/features/device/pairing/screens/PairWifiScreen.tsx:22-75` — the Wi-Fi network list is scanned once on mount and never refreshed. Add pull-to-refresh and a manual 'Scan again' action."
- `docs/audits/ios-reference-audit/reports/ble-provisioning.md#bottlenecks`: "`src/services/provisioning/espProvisioning.ts:97-116` + `src/features/device/pairing/screens/PairConnectingScreen.tsx:51-101` — provisioning is a single long native promise with no cancellation. At minimum, eagerly disconnect in cleanup."
- `docs/audits/ios-reference-audit/MASTER_AUDIT.md#cross-cutting-themes-5`: "Long-running native operations lack cancellation, cleanup, and timeouts... Umbrella fix: Add `useEffect` cleanup that disconnects/stops scans, wrap native provisioning in a cancelable contract."

## Scope

### In scope
- `src/features/device/pairing/screens/PairWifiScreen.tsx`
  - Add `useEffect` cleanup that disconnects the connected ESP device and calls `stopProvisionSearch()`.
  - Add a pull-to-refresh or "Scan again" action that re-runs `scanWifiNetworks`.
- `src/features/device/pairing/screens/PairConnectingScreen.tsx`
  - Add `useEffect` cleanup that disconnects the ESP device and calls `stopProvisionSearch()`.
  - Preserve existing navigation to `PairSuccessScreen` and `PairFailedScreen`.
- `src/services/provisioning/espProvisioning.ts`
  - Introduce a small retry helper for transient BLE disconnects and apply it to `connectProvisionableDevice` and `provisionWifi`.
  - Expand `ProvisioningError` to support the XState `E-PROV-001`..`E-PROV-005` codes (either by changing the code union or by adding a mapping export).
- `src/features/device/pairing/screens/PairFailedScreen.tsx`
  - Accept an `errorCode` route param (typed as `ProvisioningErrorCode`).
  - Render context-aware recovery actions based on the mapped error code instead of a static list.
- `src/state/machines/devicePairing.types.ts`
  - Export `ProvisioningErrorCode` so screens and services can share it without importing from the machine file internals.
- `tests/verification/T05-ble-provisioning-cleanup-retry-errors.test.ts`
  - New verification test that fails on the current codebase and passes after the fix.

### Out of scope
- `src/features/device/pairing/pairingSession.ts` and `src/features/device/pairing/pairingStore.ts` — moving mutable session state into a store is T06.
- `src/state/machines/devicePairing.machine.ts` — fully wiring the screens to the XState actor is a larger refactor tracked separately.
- `src/services/api/device.api.ts` — backend claim endpoint semantics are consulted but not changed here.
- `src/services/ble/*` — BLE scan readiness, RSSI capture, and timeout alignment are T04.
- Native-module cancellation beyond explicit disconnect/stop calls (no new Android/iOS native code).
- Pre-provisioning backend claim reordering (mentioned in the audit as a follow-up requiring a backend contract change).

## Proposed solution

1. **Expose the machine error-code type.**
   - In `src/state/machines/devicePairing.types.ts`, ensure `ProvisioningErrorCode` is exported for reuse.

2. **Expand `ProvisioningError` and add an error-code map.**
   - In `src/services/provisioning/espProvisioning.ts`, add a mapping from coarse native/ESP failures to the XState codes:
     - `CONNECT_FAILED` caused by a timeout or peripheral disconnect → `E-PROV-001`.
     - `PROVISION_FAILED` caused by Wi-Fi authentication failure → `E-PROV-002`.
     - `PROVISION_FAILED` caused by other provisioning errors → `E-PROV-003`.
     - Backend claim rejection because the device is already claimed → `E-PROV-004` (produced by `PairConnectingScreen` after `pairDevice` rejects).
     - Other backend claim rejection → `E-PROV-005`.
   - Keep the existing coarse codes if any caller still references them, or provide a `toProvisioningErrorCode` helper. Prefer replacing the union with the XState codes to close the gap.

3. **Add a small retry helper.**
   - Add `withProvisioningRetry<T>(operation: () => Promise<T>, options?)` in `src/services/provisioning/espProvisioning.ts`.
   - Retry only on errors that look transient (message includes "disconnected", "timed out", "BLE", etc.) up to 2 retries with ~500 ms backoff.
   - Wrap `device.connect(...)` inside `connectProvisionableDevice` and `device.provision(...)` inside `provisionWifi` with this helper.

4. **Clean up BLE sessions on unmount.**
   - In `PairWifiScreen`, capture the connected device in the effect and, in the cleanup function, call `device.disconnect()` (defensively wrapped in try/catch) and `stopProvisionSearch()`.
   - In `PairConnectingScreen`, do the same: read `getConnectedEspDevice()` in cleanup, disconnect if present, and stop search.
   - Both cleanups should be idempotent and should not throw if the device is already disconnected.

5. **Add Wi-Fi list refresh to `PairWifiScreen`.`**
   - Add a "Scan again" button below the network list (or a `RefreshControl` on the scroll surface) that re-runs the connect + scan flow with the same `espDeviceName`/`pairingCode`.
   - Reset `networks`, `loading`, and `error` while refreshing.

6. **Make `PairFailedScreen` context-aware.**
   - Add `errorCode?: ProvisioningErrorCode` to the route param type in `src/navigation/routes.ts` for `PairFailedScreen`.
   - In `PairFailedScreen`, derive the primary recovery action and copy from `errorCode`:
     - `E-PROV-001` / `E-PROV-003` → "Bring Robot closer" / "Try again from search".
     - `E-PROV-002` → "Re-enter Wi-Fi password" (navigates to `PairWifiPasswordScreen`).
     - `E-PROV-004` / `E-PROV-005` → "Contact support" or "Try with a different robot".
   - Keep a fallback generic list if `errorCode` is missing for backwards compatibility.

7. **Wire error codes through `PairConnectingScreen`.**
   - When catching a `ProvisioningError`, pass the mapped `errorCode` (and the raw message) to `PairFailedScreen`.
   - When `pairDevice` rejects, map the backend rejection to `E-PROV-004` or `E-PROV-005`.

## Acceptance criteria

1. `PairWifiScreen` `useEffect` cleanup calls `device.disconnect()` and `stopProvisionSearch()`.
2. `PairConnectingScreen` `useEffect` cleanup disconnects the ESP device and stops search.
3. `connectProvisionableDevice` and `provisionWifi` use a small retry helper for transient BLE disconnects.
4. `ProvisioningError` codes map to the XState machine's `E-PROV-001`..`E-PROV-005` codes.
5. `PairFailedScreen` renders context-aware recovery actions based on the mapped error code.
6. `PairWifiScreen` supports pull-to-refresh / "Scan again" for the Wi-Fi list.

## Dependencies

- **T04** — BLE scan readiness, RSSI capture, and timeout alignment. T05 builds on the same screens (`PairSearchScreen`, `PairWifiScreen`) and shares the BLE service. Land T04 first so the scan/list flow is stable before adding retry and cleanup.

## Exclusions / anti-overlap

- **T06** (`pairing-state-actor-store`) will move `activeCandidate`/`connectedDevice` into a Zustand store. T05 must keep the existing `pairingSession.ts` public API (`setPairingCandidate`, `getPairingCandidate`, `setConnectedEspDevice`, `getConnectedEspDevice`, `clearPairingSession`) stable so T06 can swap the backing store without invalidating these screen changes.
- **T07** (`ble-allowlist-hardening`) edits `src/services/ble/config.ts` and `src/services/ble/service.ts`; no overlap with T05 files.
- **T08** (`explicit-ws-url-contract`) is in the network layer; do not touch `src/services/ws/realtime.ts` here.
- **T09**/`T12` refactor the authenticated HTTP client and storage wrappers; do not change `src/services/http/client.ts` or `src/services/storage/secureStore.ts` in this task.

## Verification test plan

- **Test file:** `tests/verification/T05-ble-provisioning-cleanup-retry-errors.test.ts`
- **What it proves:**
  - `PairWifiScreen` and `PairConnectingScreen` disconnect the ESP device and stop provision search when unmounted.
  - `connectProvisionableDevice` retries transient BLE disconnects before surfacing a mapped `E-PROV-*` error.
  - `provisionWifi` maps Wi-Fi auth failures to `E-PROV-002`.
  - `PairWifiScreen` exposes a "Scan again" refresh action.
  - `PairFailedScreen` filters recovery actions based on the mapped `errorCode`.
- **How to run it:** `npx jest tests/verification/T05-ble-provisioning-cleanup-retry-errors.test.ts`
- **Expected state before fix:** FAIL — current cleanups only set `cancelled = true`, there is no retry, error codes are coarse, and `PairFailedScreen` uses a static generic list.
- **Expected state after fix:** PASS.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Cleanup `disconnect()` throws because the device is already disconnected. | Wrap every native call in try/catch and swallow expected "already disconnected" errors. |
| Retry helper retries non-transient errors (e.g., wrong password) and delays user feedback. | Restrict retries to a small allowlist of transient BLE/peripheral messages; do not retry `PROVISION_FAILED` caused by auth failure. |
| Changing `ProvisioningError.code` union breaks existing call sites. | If any other file imports the coarse codes, keep them as a secondary mapping or update the call sites in the same PR. Search the repo for `ProvisioningError` before merging. |
| `PairFailedScreen` backwards compatibility: older deep links pass only `error` string, no `errorCode`. | Render the new context-aware UI when `errorCode` is present; fall back to the current generic list when it is absent. |
| `stopProvisionSearch()` is called when no search is active and logs a warning. | It is safe to call repeatedly; document that it is a no-op if no search is running. |
| T06 later replaces `pairingSession.ts` backing store. | T05 only uses the public API; T06 must preserve that API. Add a note in T06's PRD referencing this constraint. |

## Coordination notes

Cross-role coordination required before implementation:

- **Backend role:** Confirm the backend `/devices/claim` endpoint semantics — specifically which HTTP status codes / response bodies indicate "device already claimed by another account" vs. other claim rejections. This determines whether `PairConnectingScreen` can map backend errors to `E-PROV-004` vs. `E-PROV-005` without guessing.
- **Mobile role (T04 owner):** Sequence T04 before T05 so RSSI/timeout changes in `PairSearchScreen` are not reverted or duplicated.
- **Mobile role (T06 owner):** Agree that the `pairingSession.ts` public API remains stable; T06 may change the backing implementation but must not remove `getConnectedEspDevice` / `clearPairingSession` until all callers are updated.

## Implementation hints

- Read `src/services/provisioning/espProvisioning.ts` first. The `connectProvisionableDevice` and `provisionWifi` functions are small and self-contained, making them the safest place to add retry and error-code mapping.
- Use the existing `pairingSession.ts` helpers (`setConnectedEspDevice`, `getConnectedEspDevice`, `clearPairingSession`) in screen cleanups rather than inventing new state accessors.
- `stopProvisionSearch()` is already exported from `espProvisioning.ts`; call it from both screen cleanups.
- For the retry helper, consider using a simple loop rather than adding a dependency; the reference projects use 2 retries with ~500 ms delay.
- When mapping errors, keep the original error message in `ProvisioningError.message` so `Sentry`/`PostHog` still sees the raw native failure.
- In `PairFailedScreen`, consider adding `testID="recovery-E-PROV-00x"` or similar stable markers to make future tests deterministic.
- The verification test mocks `@orbital-systems/react-native-esp-idf-provisioning` inline; if the real package's types conflict with the mock, cast to `unknown` in the test file.
