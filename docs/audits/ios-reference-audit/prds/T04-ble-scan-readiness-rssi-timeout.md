# T04: BLE scan readiness, RSSI capture, and timeout alignment

## Status
Registry status: NOT_STARTED | Priority: P0 | Blast radius: HIGH

## Problem
The robot onboarding flow silently fails for users whose Bluetooth is off or denied on iOS, picks the wrong robot when several are nearby, and gives up scanning twice as fast as the pairing state machine expects.

Specific issues (from `reports/ble-provisioning.md`):

- **`src/services/ble/permissions.ts:5-7`** — `requestBlePermissions` returns `'granted'` unconditionally on iOS. It never checks the `CBCentralManager` state, so a user with Bluetooth turned off or with permission denied sees a silent scan failure rather than a clear prompt. Audit reference: `reports/ble-provisioning.md#improvements` (first bullet).
- **`src/services/ble/types.ts:3-8` + `src/services/ble/service.ts:34-41` + `src/features/device/pairing/screens/PairSearchScreen.tsx:45`** — `BleDeviceCandidate` omits RSSI, `toCandidate` discards it, and `PairSearchScreen` selects `bleScan.allowed[0]` regardless of signal strength. A distant robot can be chosen while a stronger one is next to the phone. Audit reference: `reports/ble-provisioning.md#improvements` (second bullet).
- **`src/services/ble/config.ts:4` vs `src/state/machines/devicePairing.machine.ts:52`** — `BLE_CONFIG.SCAN_TIMEOUT_MS` is `10000` ms, but the canonical XState machine defines `SCANNING_TIMEOUT_MS = 30_000`. In noisy environments ESP32 advertisements can take longer than 10 s to appear. Audit reference: `reports/ble-provisioning.md#improvements` (third bullet).

`reports/ble-provisioning.md#top-3-quick-wins` flags these three issues as the highest-value, lowest-effort fixes.

## Scope
### In scope
- `src/services/ble/permissions.ts` — check real iOS Bluetooth state and return `poweredOff` / `unauthorized` as appropriate.
- `src/services/ble/types.ts` — extend `BlePermissionState` and add `rssi` to `BleDeviceCandidate`.
- `src/services/ble/service.ts` — preserve RSSI in `toCandidate`; sort allow-listed candidates by descending RSSI; drop signals below a configurable threshold.
- `src/services/ble/config.ts` — set `SCAN_TIMEOUT_MS` to `30000`; add a configurable `MIN_RSSI_THRESHOLD` default (e.g. `-85`).
- `src/features/device/pairing/screens/PairSearchScreen.tsx` — surface a clear "Turn on Bluetooth" prompt when Bluetooth is not `poweredOn`.
- `tests/verification/T04-ble-scan-readiness-rssi-timeout.test.ts` — regression test.

### Out of scope
- `src/services/provisioning/espProvisioning.ts` — connection retry / cleanup is T05.
- `src/features/device/pairing/screens/PairWifiScreen.tsx` — Wi-Fi list refresh / cleanup is T05.
- `src/state/machines/devicePairing.machine.ts` — wiring the machine to the screens is a separate simplification task.
- Native iOS/Android permission dialogs or `Info.plist` strings.
- Throttling/de-duplication of high-frequency `didDiscover` callbacks (flagged in `reports/ble-provisioning.md#bottlenecks` but not required for T04).

## Proposed solution
1. **iOS Bluetooth state check**
   - Import `BleManager` from `react-native-ble-plx` in `permissions.ts` (avoid importing `getBleManager` from `service.ts` to prevent a circular dependency).
   - Add a small helper that subscribes to `manager.onStateChange(..., true)` once and resolves with the current state string.
   - Map the state to a permission result:
     - `PoweredOn` → `'granted'`
     - `PoweredOff` → `'poweredOff'`
     - `Unauthorized` → `'unauthorized'`
     - `Unsupported` / `Unknown` / `Resetting` → `'unavailable'`
   - Extend `BlePermissionState` to include `'poweredOff' | 'unauthorized'`.

2. **RSSI capture**
   - Add `rssi: number | null` to `BleDeviceCandidate`.
   - Update `toCandidate` in `service.ts` to copy `device.rssi ?? null`.

3. **RSSI-aware selection**
   - Add `MIN_RSSI_THRESHOLD` to `BLE_CONFIG` (default `-85`).
   - In `scanForTJBotDevices`, after splitting by allowlist, filter `allowed` to devices whose `rssi` is `>= MIN_RSSI_THRESHOLD`.
   - Sort the filtered `allowed` array by descending RSSI so the nearest robot is first.
   - Update `PairSearchScreen` to use `bleScan.allowed[0]` (now the strongest signal) — this line already exists, the behavior changes because the array is now sorted.

4. **Timeout alignment**
   - Change `BLE_CONFIG.SCAN_TIMEOUT_MS` from `10000` to `30000` to match `SCANNING_TIMEOUT_MS` in `src/state/machines/devicePairing.machine.ts:52`.

5. **UI prompt**
   - In `PairSearchScreen`, when `initializeBle()` returns `available: false` with `permission === 'poweredOff' | 'unauthorized'`, render a clear "Turn on Bluetooth" message instead of the generic "Bluetooth is unavailable" text.
   - Keep the existing failed-state styling and "Try again" action.

## Acceptance criteria
Registry criteria, refined:

1. iOS permission helper checks `CBCentralManager` state and returns `poweredOff`/`unauthorized` when appropriate.
2. `BleDeviceCandidate` includes `rssi` and `toCandidate` preserves it.
3. `scanForTJBotDevices` sorts allowed candidates by descending RSSI and rejects signals below a configurable threshold.
4. `BLE_CONFIG.SCAN_TIMEOUT_MS` is `30000` to match the XState machine spec.
5. `PairSearchScreen` surfaces a clear "Turn on Bluetooth" prompt when the state is not `poweredOn`.

## Dependencies
None.

## Exclusions / anti-overlap
- T05 (`ble-provisioning-cleanup-retry-errors`) owns `PairWifiScreen`, `PairConnectingScreen`, and `espProvisioning.ts` cleanup/retry work. Do not touch those files in T04.
- T07 (`ble-allowlist-hardening`) will harden `isAllowlistedDevice` with service UUID and manufacturer data. Do not add UUID/manufacturer validation here; only add RSSI handling to `toCandidate` / `scanForTJBotDevices`.

## Verification test plan
- Test file: `tests/verification/T04-ble-scan-readiness-rssi-timeout.test.ts`
- What it proves: the five acceptance criteria above hold (timeout constant, iOS state mapping, RSSI preservation, RSSI sort/threshold, and the "Turn on Bluetooth" UI prompt).
- How to run it: `npx jest tests/verification/T04-ble-scan-readiness-rssi-timeout.test.ts`
- Expected state before fix: FAIL
- Expected state after fix: PASS

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| iOS state subscription hangs if `onStateChange` never fires | Subscribe with `emitCurrentState = true` so the listener receives the current state immediately; add a short Promise race or timeout if the library behaves unexpectedly. |
| Sorting/filtering by RSSI drops a legitimate nearby robot because RSSI is `null` | Treat `null` RSSI as weaker than any numeric value but still include it; only filter out numeric values below the threshold. |
| 30 s scan feels slow to users | Keep the existing pulsing UI and "I don't see my Robot" escape hatch; the timeout change only affects the upper bound. |
| `poweredOff` / `unauthorized` values propagate to unrelated callers | Keep the type change additive; existing `'granted' \| 'denied' \| 'unavailable'` callers still compile. |
| Circular dependency if `permissions.ts` imports `service.ts` | Import `BleManager` directly from `react-native-ble-plx`, not through `service.ts`. |

## Coordination notes
No cross-role coordination required. This is a self-contained mobile change with no backend contract impact.

## Implementation hints
- Read `src/services/ble/permissions.ts`, `src/services/ble/service.ts`, `src/services/ble/types.ts`, `src/services/ble/config.ts`, and `src/features/device/pairing/screens/PairSearchScreen.tsx` before editing.
- Existing mock: `tests/__mocks__/react-native-ble-plx.ts` only stubs `startDeviceScan` / `stopDeviceScan` / `destroy` and lacks `rssi` and `onStateChange`. The verification test overrides this mock locally; after the fix, consider updating the shared mock so other BLE tests can use it.
- The XState timeout constant is at `src/state/machines/devicePairing.machine.ts:52` (`SCANNING_TIMEOUT_MS = 30_000`). Keep `BLE_CONFIG.SCAN_TIMEOUT_MS` in sync with it.
- When updating `PairSearchScreen`, avoid duplicating the reason text already produced by `initializeBle`; either have `initializeBle` return a precise powered-off reason or have the screen map the new permission states to the prompt text.
