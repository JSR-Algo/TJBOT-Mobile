# T07: Harden BLE allowlist with service UUID and manufacturer data

## Status
Registry status: NOT_STARTED | Priority: P1 | Blast radius: MEDIUM

## Problem
The current robot discovery filter trusts only device name and identifier prefixes. A peripheral that has been maliciously or accidentally renamed to start with `TJBot` or `TBT` will be accepted as a candidate, even if it does not advertise the TJBot provisioning service.

Source: `src/services/ble/config.ts:7-15` — `isAllowlistedDevice` only checks `ALLOWLIST_PREFIXES` against the normalized `deviceId` and `name`:

```typescript
export function isAllowlistedDevice(deviceId: string, name?: string | null): boolean {
  const normalizedId = deviceId.trim().toUpperCase();
  const normalizedName = (name ?? '').trim().toUpperCase();

  return BLE_CONFIG.ALLOWLIST_PREFIXES.some((prefix) => {
    const normalizedPrefix = prefix.trim().toUpperCase();
    return normalizedId.startsWith(normalizedPrefix) || normalizedName.startsWith(normalizedPrefix);
  });
}
```

Source: `src/services/ble/service.ts:34-41` + `:46` — `toCandidate` already captures `serviceUUIDs` from `react-native-ble-plx`, but `splitDevicesByAllowlist` calls `isAllowlistedDevice(device.id, device.name ?? device.localName)` and discards that signal information.

Source: `docs/audits/ios-reference-audit/reports/ble-provisioning.md:98` — Bottlenecks section explicitly notes: “allowlist matching relies only on device name and id prefixes. There is no check of manufacturer data or the provisioning service UUID, so a maliciously renamed peripheral could pass the filter. Harden matching by validating the advertised service UUID and/or firmware-provided manufacturer data.”

## Scope
### In scope
- `src/services/ble/config.ts`
  - Add an optional `MANUFACTURER_ID` constant (default `null` until firmware confirms the value).
  - Introduce an `AllowlistCandidate` type.
  - Harden `isAllowlistedDevice` to validate `serviceUUIDs` and, when configured, `manufacturerData`.
  - Preserve the existing `(deviceId, name?)` call signature for backwards compatibility.
- `src/services/ble/service.ts`
  - Update the `splitDevicesByAllowlist` call site to pass the full candidate object, including `serviceUUIDs`.
- `tests/verification/T07-ble-allowlist-hardening.test.ts`
  - Unit tests proving renamed peripherals without the provisioning service UUID are rejected.

### Out of scope
- `src/features/device/pairing/screens/*` (screen UX is owned by T04/T05).
- `src/services/provisioning/espProvisioning.ts` (provisioning retry/cleanup is owned by T05).
- Native iOS/Android BLE stack changes.
- Adding RSSI sorting or scan-timeout changes (owned by T04).
- Deleting or refactoring the dual-scan discovery mechanism (owned by a later simplification task).

## Proposed solution
1. **Extend the candidate type in `src/services/ble/config.ts`.**
   Add an `AllowlistCandidate` shape so callers can optionally pass advertising metadata:
   ```typescript
   export type AllowlistCandidate = {
     deviceId: string;
     name?: string | null;
     localName?: string | null;
     serviceUUIDs?: string[] | null;
     manufacturerData?: string | null;
   };
   ```
2. **Backwards-compatible `isAllowlistedDevice` overload.**
   Support both the old string signature and the new object signature:
   ```typescript
   export function isAllowlistedDevice(deviceId: string, name?: string | null): boolean;
   export function isAllowlistedDevice(candidate: AllowlistCandidate): boolean;
   export function isAllowlistedDevice(
     candidateOrId: AllowlistCandidate | string,
     maybeName?: string | null,
   ): boolean { ... }
   ```
3. **Add service-UUID validation.**
   - Normalize candidate `serviceUUIDs` to upper-case.
   - If the candidate provides a non-empty `serviceUUIDs` array, require that it contains `BLE_CONFIG.SERVICE_UUID` (case-insensitive).
   - If `serviceUUIDs` is empty, `null`, or `undefined`, fall back to prefix-only matching to preserve backwards compatibility for platforms/advertisement payloads that do not expose UUIDs.
4. **Add manufacturer-data validation (conditional).**
   - Add `MANUFACTURER_ID: string | null` to `BLE_CONFIG`. Default to `null`.
   - When `BLE_CONFIG.MANUFACTURER_ID` is non-null and the candidate provides `manufacturerData`, require an exact match after trimming/upper-casing.
   - When `MANUFACTURER_ID` is null, skip the manufacturer-data gate entirely so the task can ship before firmware finalizes the value.
5. **Update `src/services/ble/service.ts`.**
   Change `splitDevicesByAllowlist` to pass the full candidate:
   ```typescript
   if (
     isAllowlistedDevice({
       deviceId: device.id,
       name: device.name,
       localName: device.localName,
       serviceUUIDs: device.serviceUUIDs,
     })
   ) { ... }
   ```
6. **Verify with unit tests.**
   Cover:
   - renamed peripheral with matching prefix but wrong/missing service UUID → rejected,
   - legitimate device with matching prefix + correct service UUID → allowed,
   - backwards-compatible prefix-only match → allowed,
   - conditional manufacturer-data gate when `MANUFACTURER_ID` is configured.

## Acceptance criteria
- `isAllowlistedDevice` also validates that the candidate advertises the configured `SERVICE_UUID`.
- Manufacturer-data check is added if firmware exposes a TJBot manufacturer ID.
- Existing allowlist prefixes remain supported for backwards compatibility.
- Unit tests reject renamed peripherals that do not expose the expected service UUID.

## Dependencies
- **T04** — BLE scan readiness, RSSI capture, and timeout alignment. T04 already touches `src/services/ble/service.ts` and `BleDeviceCandidate`. T07 should land after T04 so the candidate shape and scan loop are stable.
- **T05** — BLE provisioning cleanup, retry, and error mapping. T05 does not directly change the allowlist, but it runs immediately before/after T07 in the pairing flow; sequencing reduces rebase risk in `service.ts`.

## Exclusions / anti-overlap
- **T04** must own RSSI, timeout, and iOS Bluetooth-state changes. Do not duplicate that work here.
- **T05** must own disconnect/stop cleanup and provisioning error mapping. Do not modify `src/services/provisioning/espProvisioning.ts` or pairing screens in this task.
- Do not change the set of `ALLOWLIST_PREFIXES`; that is a product decision outside this security hardening task.

## Verification test plan
- **Test file:** `tests/verification/T07-ble-allowlist-hardening.test.ts`
- **What it proves:**
  1. A peripheral with a TJBot/TBT prefix but no provisioning service UUID is blocked.
  2. A peripheral with a TJBot/TBT prefix and the correct service UUID is allowed.
  3. A peripheral with a TJBot/TBT prefix and an unrelated service UUID is blocked.
  4. Prefix-only matching still works when no service UUID metadata is supplied.
  5. `splitDevicesByAllowlist` respects the hardened filter.
  6. When `MANUFACTURER_ID` is configured, manufacturer data is also validated.
- **How to run it:** `npx jest tests/verification/T07-ble-allowlist-hardening.test.ts`
- **Expected state before fix:** FAIL
- **Expected state after fix:** PASS

## Risks & mitigations
| Risk | Mitigation |
|------|------------|
| Existing legitimate devices are rejected because their advertisement payload does not include `serviceUUIDs`. | Only enforce the service-UUID gate when `serviceUUIDs` is non-empty/non-null; keep prefix-only fallback. |
| Manufacturer-data format is wrong because firmware has not confirmed the layout. | Default `MANUFACTURER_ID` to `null` and make the gate conditional; ship service-UUID hardening first. |
| Type signature change breaks other callers. | Provide an overloaded/union signature that preserves `isAllowlistedDevice(id, name)`. |
| Renamed peripheral still passes because it happens to advertise the Nordic UART UUID. | Use the exact `BLE_CONFIG.SERVICE_UUID` value and require a case-insensitive match. |
| T04 changes `BleDeviceCandidate` after this task lands. | Coordinate with T04 owner and re-run the verification test before merging. |

## Coordination notes
- **Who must be consulted:** Firmware engineering lead.
- **What contract must be confirmed:**
  1. The exact provisioning service UUID advertised by the robot firmware (already recorded in `BLE_CONFIG.SERVICE_UUID`, but confirm it is actually present in the advertisement packet).
  2. Whether the firmware exposes a TJBot-specific manufacturer-data field, and if so:
     - The exact byte/string value or company identifier.
     - Whether it appears in the scan response, the advertisement packet, or both.
     - Encoding (hex string, base64, raw bytes).
  3. Confirm that enforcing the service-UUID check will not break factory-flashed devices that may still advertise only a name prefix.

## Implementation hints
- Files to read before editing:
  - `src/services/ble/config.ts` (the allowlist function).
  - `src/services/ble/service.ts` (the call site and `toCandidate`).
  - `src/services/ble/types.ts` (candidate type shape).
  - `tests/__mocks__/react-native-ble-plx.ts` (mock `Device` shape for tests).
  - `tests/ble/service.test.ts` (existing allowlist test patterns).
- Keep normalization simple: `trim().toUpperCase()` for UUIDs and manufacturer data.
- Consider adding a small helper `normalizeUuidArray(uuid[])` to avoid repeated `map()` calls.
- If `serviceUUIDs` is provided as a `Set` or contains duplicate entries, deduplicate before checking.
- The test file should import from `@/services/ble/config` and `@/services/ble/service` using the existing path alias.
