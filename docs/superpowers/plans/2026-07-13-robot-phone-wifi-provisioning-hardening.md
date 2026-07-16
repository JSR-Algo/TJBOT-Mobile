# Robot-Phone Wi-Fi Provisioning Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make robot Wi-Fi setup and reconnection use one reliable end-to-end path: encrypted BluFi from the phone to firmware, followed by firmware-authenticated claim/status confirmation through `tbot-backend`, with `esp32-server` entering the flow only after the robot is online.

**Architecture:** `tbot-mobile` owns BLE discovery, secure BluFi negotiation, Wi-Fi credential delivery, and user-visible retry state. `TBOT-Firmware` is the only authority for whether the robot joined Wi-Fi, and it confirms claim/authentication directly with `tbot-backend`. `tbot-backend` owns device registry, ownership, bootstrap tokens, claim state, and heartbeat status; it must not receive or forward home Wi-Fi credentials. `esp32-server` remains responsible for OTA/config/runtime WebSocket services after connectivity exists and is removed from the provisioning critical path.

**Tech Stack:** React Native 0.83, TypeScript, Jest, `react-native-ble-plx`, Espressif BluFi, ESP-IDF C++, NestJS, PostgreSQL, Vitest, Python/pytest contract tests, Java Spring manager API, Android ADB, iOS Simulator/device tooling, ESP32 serial logging.

---

## Execution Constraint

Work only in the four isolated `robot-wifi-hardening` worktrees. Do not create commits, amend history, push, or open a PR unless the user explicitly requests it after reviewing the final diffs. Task checkpoints therefore use `git diff --check` and `git status --short`.

## Non-Negotiable Contracts

1. Home Wi-Fi SSID/password travel only over the encrypted phone-to-firmware BluFi session.
2. A successful GATT write is not provisioning success.
3. Firmware reports `STA_CONN_SUCCESS` only after `WifiManager::IsConnected()` is true and the station has usable connectivity.
4. First pairing succeeds only after the backend claim reaches `device_authenticated`/`CLAIM_CONFIRMED`.
5. Reconnect/change-Wi-Fi succeeds after firmware Wi-Fi confirmation plus a bounded online check for the already-owned device.
6. `esp32-server` is not required to make an offline robot join Wi-Fi.
7. Production logs never contain Wi-Fi credentials, bootstrap tokens, pairing codes, full robot serials, or raw MAC addresses.
8. Cancellation, timeout, and retry paths release BLE scans, monitor subscriptions, timers, and GATT connections exactly once.
9. Unit tests are necessary but do not replace physical Android/iOS plus robot validation.

## Repository Map

### `tbot-mobile`

- `src/services/ble/service.ts`: BLE scan, GATT ownership, BluFi notify subscription, provisioning lifecycle, timeout/error normalization, and sanitized diagnostics.
- `src/services/ble/blufiProtocol.ts`: BluFi security negotiation, encryption/checksum, fragmentation, and connection-report parsing.
- `src/services/ble/config.ts`: robot advertisement allowlist and UUID normalization.
- `src/features/device/pairing/screens/PairConnectingScreen.tsx`: provisioning orchestration and backend/claim polling.
- `src/features/device/pairing/screens/PairFailedScreen.tsx`: retry actions; currently exposes the broken `legacy_backend` fallback.
- `src/features/device/pairing/routeParams.ts`: pairing route context propagation.
- `src/navigation/routes.ts`: transport union currently includes `hotspot` and `legacy_backend`.
- `src/services/api/device.api.ts`: currently exposes `pairDevice()` → `/devices/provision/connect`.
- `src/services/i18n/locales/{en,vi}.json`: remove setup-hotspot copy and retain safe BluFi recovery copy.
- `tests/ble/{service,blufiProtocol}.test.ts`: BLE lifecycle and protocol regression coverage.
- `tests/features/device/{pair-connecting-flow,pair-failed-screen}.test.tsx`: orchestration and recovery UI coverage.
- `tests/api/device-api.test.ts`: API surface coverage.
- `tests/e2e/ux-redesign-accessibility.test.tsx`: remove the legacy setup-hotspot navigation contract.
- `migrate-ui-ux-to-mobile-app-docs/state-machines/device-pairing.state.mmd`: canonical mobile pairing state machine.
- `migrate-ui-ux-to-mobile-app-docs/sequences/16-mobile/ble-provisioning.sequence.mmd`: cross-system provisioning sequence.
- `migrate-ui-ux-to-mobile-app-docs/flows/domains/device/flow.md`: user-visible recovery paths.
- `docs/qa/ad-hoc/2026-07-13-robot-phone-wifi-provisioning-hardening.md`: combined validation record.

### `tbot-backend`

- `src/devices/consumer-provisioning.controller.ts`: remove/deprecate `POST /v1/devices/provision/connect` as a Wi-Fi credential endpoint.
- `src/devices/consumer-provisioning.dto.ts`: remove `ProvisionConnectDto` and response DTOs after consumer removal.
- `src/devices/consumer-provisioning.service.ts`: remove ESP-bridge credential forwarding and preserve valid attempt state on infrastructure failures.
- `src/devices/device-provisioning-esp-bridge.service.ts`: delete after all callers/tests are removed.
- `src/robot/esp-device.adapter.ts`: remove `device.provisionWifi` mapping.
- `src/robot/robot-esp.client.ts`: remove the nonexistent `/tbot/device/provision/{agentId}` call.
- `src/robot/robot-esp.types.ts`: remove the provisioning command and endpoint mapping.
- `src/devices/devices.module.ts`: remove bridge provider wiring.
- `openapi.json`: remove the credential-forwarding operation and schemas; retain start, local-BLE-paired, status, complete, bootstrap, claim, and firmware status operations.
- `tests/{consumer-provisioning.controller,consumer-provisioning.service,device-provisioning-esp-bridge,esp-device-adapter}.spec.ts`: replace bridge tests with absence/security contracts.
- `tests/devices.consumer-provisioning.integration.spec.ts`: remove skipped ESP bridge assumptions and add live route-absence/state-preservation coverage.

### `robot/TBOT-Firmware`

- `main/boards/common/blufi.cpp`: expected to remain behaviorally unchanged unless physical QA disproves its connection-report timing.
- `main/boards/common/blufi.h`: expected unchanged.
- `main/boards/common/wifi_board.cc`: expected unchanged; verify BLE release and claim refresh ownership.
- `main/provisioning/claim_confirmation_reporter.cc`: verify backend claim confirmation remains direct and secret-safe.
- `main/provisioning/provisioning_status_reporter.cc`: verify legacy status reporting cannot consume a claim bootstrap token first.
- `tests/test_blufi_provisioning_stability.py`: extend lifecycle ordering assertions if needed.
- `tests/test_blufi_security_and_events.py`: lock encrypted credential/report behavior.
- `tests/test_tbot_claim_confirmation_contract.py`: lock firmware-to-backend claim confirmation.
- `tests/test_tbot_claim_runtime_contract.py`: lock retry/expiry/token clearing behavior.

### `robot/esp32-server`

- `main/manager-api/src/main/java/{tbot,xiaozhi}/modules/device/controller/DeviceController.java`: explicitly remain free of Wi-Fi provisioning endpoints.
- `main/tbot-server/core/connection.py`: runtime connection only; no provisioning changes expected.
- `main/tbot-server/tests/test_config_from_api_template.py`: confirm backend/OTA URLs are runtime bootstrap inputs, not Wi-Fi provisioning.
- Add a repository contract test proving `/device/provision` and Wi-Fi credential field names are absent from production controllers.

## Confirmed Baseline Findings

- `tbot-mobile/src/services/ble/service.ts`: Wi-Fi scan snapshots `bleGattSessionEpoch` before `connectDevice()` increments it, so normal scan cleanup skips `cancelConnection()` and leaks the GATT session.
- `tbot-mobile/src/features/device/pairing/screens/PairConnectingScreen.tsx`: offline backend registration wait was shortened from 20 polls to 4 polls, causing false `OFFLINE_DEVICE_NOT_REGISTERED` failures.
- `tbot-mobile/src/features/device/pairing/screens/PairFailedScreen.tsx`: the visible `Use setup hotspot` action routes to `provisioningTransport: 'legacy_backend'`.
- `tbot-backend/src/robot/robot-esp.client.ts`: the backend calls `POST /tbot/device/provision/{agentId}`.
- `robot/esp32-server`: no matching production endpoint exists.
- Backend bridge unit tests mock the adapter; the relevant provisioning integration suite is skipped, so green unit tests do not prove the route exists.
- Mobile release logging currently emits robot identifiers and BLE scan details directly through `console.info`.
- Final uncommitted review found that `ble_offline` sends credentials in credential-only mode and then polls for a backend device that cannot exist yet; unknown robots must receive a bootstrap token/claim context before registration polling starts.
- Final uncommitted review found `src/__env__.ts` contains production Render endpoints; this generated fallback must remain local/default so ordinary Metro/test builds cannot accidentally send development traffic to production.

### Task 1: Lock the desired cross-system contract with failing tests

**Files:**
- Modify: `tbot-mobile/tests/features/device/pair-failed-screen.test.tsx`
- Modify: `tbot-mobile/tests/features/device/pair-connecting-flow.test.tsx`
- Modify: `tbot-mobile/tests/api/device-api.test.ts`
- Modify: `tbot-mobile/tests/e2e/ux-redesign-accessibility.test.tsx`
- Create: `tbot-backend/tests/wifi-provisioning-boundary.spec.ts`
- Create: `robot/esp32-server/main/tbot-server/tests/test_wifi_provisioning_boundary.py`

- [ ] **Step 1: Replace the mobile legacy-fallback expectation with a BluFi-only recovery contract**

In `pair-failed-screen.test.tsx`, replace assertions that expect `Use setup hotspot` with:

```ts
expect(screen.queryByText('Use setup hotspot')).toBeNull();
expect(screen.getByText('Try Bluetooth setup again')).toBeTruthy();
```

Press the replacement action and assert:

```ts
expect(navigation.navigate).toHaveBeenCalledWith(
  ROUTES.PairSearchScreen,
  expect.objectContaining({ reconnectMode: false }),
);
```

- [ ] **Step 2: Assert route transports no longer accept legacy backends**

Add a type-level source contract test that reads `src/navigation/routes.ts` and rejects these literals:

```ts
expect(source).not.toContain("'legacy_backend'");
expect(source).not.toContain("'hotspot'");
```

- [ ] **Step 3: Assert the mobile device API no longer sends Wi-Fi credentials to backend**

Replace the `pairDevice()` request test with:

```ts
expect(deviceApiSource).not.toContain('/devices/provision/connect');
expect(deviceApiSource).not.toContain('wifiPassword');
expect(deviceApiSource).not.toContain('wifiSsid');
```

Do not forbid `wifiPassword` globally: it remains valid in the local pairing secret handoff and BluFi service.

- [ ] **Step 4: Add a backend boundary test**

Create `tbot-backend/tests/wifi-provisioning-boundary.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

describe('Wi-Fi provisioning ownership boundary', () => {
  it('does not expose a backend credential-forwarding route', () => {
    const controller = read('src/devices/consumer-provisioning.controller.ts');
    expect(controller).not.toContain("@Post('provision/connect')");
  });

  it('does not forward home Wi-Fi credentials to ESP server', () => {
    const adapter = read('src/robot/esp-device.adapter.ts');
    const client = read('src/robot/robot-esp.client.ts');
    expect(adapter).not.toContain('device.provisionWifi');
    expect(client).not.toContain('/device/provision/');
  });
});
```

- [ ] **Step 5: Add an ESP server absence contract**

Create `test_wifi_provisioning_boundary.py`:

```python
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_esp_server_has_no_home_wifi_credential_endpoint():
    production = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore")
        for path in (ROOT / "manager-api" / "src" / "main" / "java").rglob("*.java")
    )
    assert "/device/provision" not in production
    assert "wifiPassword" not in production
    assert "wifiSsid" not in production
```

- [ ] **Step 6: Run tests and verify RED**

Run:

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/robot-wifi-hardening
npx jest --selectProjects unit \
  tests/features/device/pair-failed-screen.test.tsx \
  tests/features/device/pair-connecting-flow.test.tsx \
  tests/api/device-api.test.ts \
  tests/e2e/ux-redesign-accessibility.test.tsx \
  --runInBand

cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-backend/robot-wifi-hardening
npx vitest run tests/wifi-provisioning-boundary.spec.ts
```

Expected: mobile and backend boundary tests fail on `legacy_backend`, `/devices/provision/connect`, and `device.provisionWifi`. The ESP server absence test should already pass, proving the backend client targets a nonexistent endpoint.

- [ ] **Step 7: Checkpoint the RED contract diffs separately in each repository**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/robot-wifi-hardening
git diff --check
git status --short

cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-backend/robot-wifi-hardening
git diff --check
git status --short

cd /Users/manhhodinh/.config/superpowers/worktrees/esp32-server/robot-wifi-hardening
git diff --check
git status --short
```

### Task 2: Fix mobile GATT ownership and deterministic cleanup

**Files:**
- Modify: `tbot-mobile/src/services/ble/service.ts`
- Modify: `tbot-mobile/tests/ble/service.test.ts`

- [ ] **Step 1: Add failing tests for normal and stale-session cleanup**

Add two public-path tests around `scanRobotWifiNetworks()`:

```ts
it('cancels its own Wi-Fi-list GATT connection after a normal scan', async () => {
  await scanRobotWifiNetworks(candidate);
  expect(cancelConnection).toHaveBeenCalledTimes(1);
});

it('does not let an older scan cancel a newer provisioning connection', async () => {
  const scanPromise = scanRobotWifiNetworks(candidate);
  await waitUntilScanConnectionIsOpen();
  const provisionPromise = provisionWifiViaLocalBle(provisionParams);
  releaseWifiListResponse();
  await scanPromise;
  expect(oldConnectionCancel).not.toHaveBeenCalledAfter(newConnectionStartedAt);
  await provisionPromise;
});
```

Use deferred promises already consistent with the test suite; do not add sleeps to unit tests.

- [ ] **Step 2: Run the focused service test and verify RED**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/robot-wifi-hardening
npx jest --selectProjects unit tests/ble/service.test.ts --runInBand
```

Expected: the normal cleanup test fails because the epoch is captured before `connectDevice()` increments it.

- [ ] **Step 3: Move ownership capture after the connection opens**

Change the scan lifecycle to:

```ts
let connected: LocalProvisioningDevice | undefined;
let ownedSessionEpoch: number | undefined;
try {
  connected = await withBleOperationTimeout(/* existing connect */);
  ownedSessionEpoch = bleGattSessionEpoch;
  // existing discovery, monitor, request, and parse steps
} finally {
  if (ownedSessionEpoch !== undefined && ownedSessionEpoch === bleGattSessionEpoch) {
    await connected?.cancelConnection?.().catch(() => undefined);
  } else if (ownedSessionEpoch !== undefined) {
    logBleWifiScan('skip_cancel_stale_session', {
      ownedSessionEpoch,
      currentEpoch: bleGattSessionEpoch,
    });
  }
}
```

Do not use a module-global boolean lock. Epoch ownership is necessary because older async `finally` blocks can run after a newer connection begins.

- [ ] **Step 4: Ensure scan and notify resources close exactly once**

Add assertions for:

```ts
expect(stopDeviceScan).toHaveBeenCalled();
expect(subscription.remove).toHaveBeenCalledTimes(1);
expect(cancelConnection).toHaveBeenCalledTimes(1);
```

Cover success, monitor error, timeout, and component cancellation.

- [ ] **Step 5: Run focused BLE tests and verify GREEN**

```bash
npx jest --selectProjects unit \
  tests/ble/service.test.ts \
  tests/ble/blufiProtocol.test.ts \
  --runInBand
```

Expected: all tests pass with no Jest open-handle warning.

- [ ] **Step 6: Checkpoint the diff without committing**

```bash
git diff --check
git status --short
```

### Task 3: Restore correct Wi-Fi/registration confirmation semantics

**Files:**
- Modify: `tbot-mobile/src/features/device/pairing/screens/PairConnectingScreen.tsx`
- Modify: `tbot-mobile/tests/features/device/pair-connecting-flow.test.tsx`

- [ ] **Step 1: Add a failing delayed-registration test**

Model a robot that has already returned BluFi success while backend status responds with retryable 404/`DEVICE_NOT_FOUND` for several polls and then returns online:

```ts
getDeviceStatusMock
  .mockRejectedValueOnce(deviceNotFound())
  .mockRejectedValueOnce(deviceNotFound())
  .mockRejectedValueOnce(networkError())
  .mockRejectedValueOnce(deviceNotFound())
  .mockResolvedValueOnce({
    id: 'registered-device-id',
    name: 'Robot',
    online: true,
    batteryPercent: 100,
  });

expect(navigation.navigate).toHaveBeenCalledWith(
  ROUTES.PairSuccessScreen,
  expect.objectContaining({ deviceId: 'registered-device-id' }),
);
```

- [ ] **Step 2: Verify RED with the four-poll implementation**

```bash
npx jest --selectProjects unit tests/features/device/pair-connecting-flow.test.tsx --runInBand
```

Expected: navigation reaches `OFFLINE_DEVICE_NOT_REGISTERED` before the fifth response.

- [ ] **Step 3: Use one bounded online wait policy**

Remove `OFFLINE_ONLINE_MAX_POLL_ATTEMPTS = 4`. Call the existing `waitForDeviceOnline()` with the normal 20-attempt budget for both reconnect and offline registration, while keeping retryable 404/network errors non-terminal:

```ts
const onlineDevice = await waitForDeviceOnline(
  result.deviceId,
  poll,
  'OFFLINE_BACKEND_CONFIRMATION_TIMEOUT',
  DEVICE_ONLINE_MAX_POLL_ATTEMPTS,
);
```

On final timeout, use `OFFLINE_DEVICE_NOT_REGISTERED` only when the backend never resolves a registered device. Do not claim success with the synthetic serial/offline id.

- [ ] **Step 4: Keep credential-only BluFi semantics explicit**

In `provisionWifiViaLocalBle()`:

- `STA_CONN_FAIL` must immediately produce `WIFI_CONNECT_FAILED`.
- `STA_CONN_SUCCESS` is authoritative Wi-Fi join evidence.
- Monitor disconnect before the full report may continue to bounded online polling because firmware intentionally tears BLE down after success.
- A missing report plus no backend online confirmation must end in a timeout/not-registered state, never success.

- [ ] **Step 5: Run the pairing flow tests**

```bash
npx jest --selectProjects unit \
  tests/features/device/pair-connecting-flow.test.tsx \
  tests/features/device/pair-failed-screen.test.tsx \
  --runInBand
```

Expected: delayed retryable backend responses succeed within the 20-poll budget; exhausted budgets fail deterministically.

- [ ] **Step 6: Checkpoint the diff without committing**

```bash
git diff --check
git status --short
```

### Task 4: Remove the broken mobile legacy provisioning path

**Files:**
- Modify: `tbot-mobile/src/features/device/pairing/screens/PairConnectingScreen.tsx`
- Modify: `tbot-mobile/src/features/device/pairing/screens/PairFailedScreen.tsx`
- Modify: `tbot-mobile/src/features/device/pairing/routeParams.ts`
- Modify: `tbot-mobile/src/navigation/routes.ts`
- Modify: `tbot-mobile/src/services/api/device.api.ts`
- Modify: `tbot-mobile/src/services/i18n/locales/en.json`
- Modify: `tbot-mobile/src/services/i18n/locales/vi.json`
- Modify: `tbot-mobile/tests/features/device/pair-failed-screen.test.tsx`
- Modify: `tbot-mobile/tests/features/device/pair-connecting-flow.test.tsx`
- Modify: `tbot-mobile/tests/api/device-api.test.ts`
- Modify: `tbot-mobile/tests/e2e/ux-redesign-accessibility.test.tsx`

- [ ] **Step 1: Remove fallback backend execution from PairConnecting**

Replace the transport branch with an explicit supported-transport guard:

```ts
const supportedBleTransport =
  transport === 'ble' || transport === 'ble_reconnect' || transport === 'ble_offline';

if (!supportedBleTransport || !bleDeviceId) {
  setStatus('failed');
  navigation.navigate(ROUTES.PairFailedScreen, {
    ...failureContext(params),
    errorCode: 'BLE_PROVISIONING_CONTEXT_MISSING',
  });
  return;
}

const run = runLocalBleProvisioning({
  // existing parameters
});
```

Delete `runBackendProvisioning()` and the `pairDevice` import.

- [ ] **Step 2: Replace setup-hotspot recovery with retry BLE**

Delete `canUseSetupHotspot()` and `setupHotspotParams()`. Render one retry action:

```tsx
<DeviceBigBtn secondary onClick={navigateToSearch}>
  Try Bluetooth setup again
</DeviceBigBtn>
```

Error copy for BLE unsupported/GATT/timeout must say to check Bluetooth permissions, double-click BOOT, move within 1–2 m, and retry. It must not claim an unavailable hotspot fallback exists.

- [ ] **Step 3: Narrow route transport types**

Create a shared type rather than repeating unions:

```ts
export type PairingProvisioningTransport = 'ble' | 'ble_reconnect' | 'ble_offline';
```

Use it across pairing route params and delete `'hotspot' | 'legacy_backend'`.

- [ ] **Step 4: Remove the backend credential API client**

Delete:

```ts
export async function pairDevice(params: PairDeviceParams): Promise<PairDeviceResult> {
  return client.post('/devices/provision/connect', /* credentials */);
}
```

Delete unused `PairDeviceParams`/`PairDeviceResult` types. Retain `confirmLocalBlePaired()`, `mintBootstrapToken()`, provisioning status APIs, claim APIs, and completion APIs.

- [ ] **Step 5: Remove stale translations and tests**

Remove keys containing:

```text
Use setup hotspot
use setup hotspot if Robot already showed a code
use setup hotspot with the same Robot code
```

Update tests to assert these strings and `legacy_backend` are absent.

- [ ] **Step 6: Run mobile validation**

```bash
npx tsc --noEmit
npm run lint
npx jest --selectProjects unit \
  tests/api/device-api.test.ts \
  tests/features/device/pair-connecting-flow.test.tsx \
  tests/features/device/pair-failed-screen.test.tsx \
  tests/e2e/ux-redesign-accessibility.test.tsx \
  --runInBand
npm run i18n:check
```

Expected: all commands pass and `rg -n "legacy_backend|Use setup hotspot|/devices/provision/connect" src tests` returns no matches.

- [ ] **Step 7: Checkpoint the diff without committing**

```bash
git diff --check
git status --short
```

### Task 5: Remove Wi-Fi credential forwarding from backend

**Files:**
- Modify: `tbot-backend/src/devices/consumer-provisioning.controller.ts`
- Modify: `tbot-backend/src/devices/consumer-provisioning.dto.ts`
- Modify: `tbot-backend/src/devices/consumer-provisioning.service.ts`
- Delete: `tbot-backend/src/devices/device-provisioning-esp-bridge.service.ts`
- Modify: `tbot-backend/src/devices/devices.module.ts`
- Modify: `tbot-backend/src/robot/esp-device.adapter.ts`
- Modify: `tbot-backend/src/robot/robot-esp.client.ts`
- Modify: `tbot-backend/src/robot/robot-esp.types.ts`
- Modify: backend tests listed in the repository map.

- [ ] **Step 1: Remove the public connect controller action**

Delete the controller method bound to:

```ts
@Post('provision/connect')
```

Do not replace it with another credential endpoint. Mobile provisioning now consists of:

```text
POST /v1/devices/provision/start
POST /v1/devices/provision/local-ble-paired
POST /v1/device/bootstrap-token
GET  /v1/devices/provision/:attemptId/status
POST /v1/device/provisioning/status
POST /v1/devices/provision/complete
```

- [ ] **Step 2: Remove credential DTOs and service method**

Delete `ProvisionConnectDto`, `ProvisionConnectResponseDto`, `ConsumerProvisioningService.connect()`, `MissingEspBridge`, and optional bridge injection.

Preserve `start()`, `markLocalBlePaired()`, `getStatus()`, and `complete()` unchanged except for imports/constructor cleanup.

- [ ] **Step 3: Remove ESP provisioning bridge code**

Delete `DeviceProvisioningEspBridgeService` and remove it from `DevicesModule` providers/exports.

Remove these adapter/client/type elements:

```ts
'device.provisionWifi'
POST /tbot/device/provision/{agentId}
provisionDeviceWifi()
```

Do not remove other ESP commands used for OTA, runtime device binding, tools, lessons, or SD fanout.

- [ ] **Step 4: Replace mocked bridge tests with security/absence tests**

Delete `device-provisioning-esp-bridge.spec.ts`. Update adapter/client tests so supported command lists no longer include `device.provisionWifi`.

Add an application integration assertion:

```ts
await request(app.getHttpServer())
  .post('/v1/devices/provision/connect')
  .send({ wifiSsid: 'private', wifiPassword: 'secret' })
  .expect(404);
```

Also assert a failed/unknown request cannot mutate an existing provisioning attempt to `failed`.

- [ ] **Step 5: Regenerate and validate OpenAPI**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-backend/robot-wifi-hardening
npm run openapi:generate
npm run openapi:validate
npm run openapi:lint
```

Expected: `/v1/devices/provision/connect`, `ProvisionConnectDto`, `wifiSsid`, and `wifiPassword` are absent from provisioning schemas. Other unrelated APIs may still legitimately contain similarly named fields; inspect matches rather than globally deleting them.

- [ ] **Step 6: Run backend verification**

```bash
npm run typecheck
npm run lint
npx vitest run \
  tests/wifi-provisioning-boundary.spec.ts \
  tests/consumer-provisioning.controller.spec.ts \
  tests/consumer-provisioning.service.spec.ts \
  tests/esp-device-adapter.spec.ts \
  tests/devices.bootstrap-token.integration.spec.ts \
  tests/devices.firmware-provisioning-status.integration.spec.ts
npm run build
```

Expected: all selected tests pass with no skipped provisioning test in the executed list.

- [ ] **Step 7: Checkpoint the diff without committing**

```bash
git diff --check
git status --short
```

### Task 6: Lock firmware as the sole Wi-Fi join authority

**Files:**
- Modify only if tests expose a gap: `robot/TBOT-Firmware/main/boards/common/blufi.cpp`
- Modify: firmware tests listed in the repository map.

- [ ] **Step 1: Add source-contract assertions for event ordering**

In `test_blufi_provisioning_stability.py`, assert the success branch orders operations as:

```text
wifi.IsConnected()
→ m_provisioned = true
→ esp_blufi_send_wifi_conn_report(...STA_CONN_SUCCESS...)
→ esp_blufi_disconnect()
→ BLE deinit
→ claim refresh/confirm
```

Assert the failure branch sends `STA_CONN_FAIL`, does not mark `m_provisioned`, and keeps BLE available for retry.

- [ ] **Step 2: Lock claim-token ownership**

Add/retain assertions that when `claim_device_id` exists:

- the bootstrap token is preserved for `/claim/confirm`;
- legacy `/device/provisioning/status` does not consume it first;
- the token is cleared only on terminal success, terminal auth rejection, expiry, or explicit reset.

- [ ] **Step 3: Run firmware host tests**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/TBOT-Firmware/robot-wifi-hardening
python3 -m pytest -q \
  tests/test_blufi_security_and_events.py \
  tests/test_blufi_provisioning_stability.py \
  tests/test_blufi_wifi_scan_contract.py \
  tests/test_wifi_board_provisioning.py \
  tests/test_tbot_claim_confirmation_contract.py \
  tests/test_tbot_claim_runtime_contract.py \
  tests/test_provisioning_status_reporter.py
```

Expected: all tests pass. If source behavior already satisfies the contract, commit tests only and do not refactor firmware.

- [ ] **Step 4: Build the actual target firmware**

Use the project’s configured ESP-IDF environment and board target:

```bash
idf.py set-target esp32s3
idf.py build
```

Expected: successful build with no BluFi, mbedTLS, Wi-Fi, or partition-size errors. Record exact ESP-IDF version and binary sizes in QA evidence.

- [ ] **Step 5: Checkpoint the diff without committing**

```bash
git diff --check
git status --short
```

### Task 7: Document and enforce ESP server’s post-connect role

**Files:**
- Modify: `robot/esp32-server/main/tbot-server/tests/test_wifi_provisioning_boundary.py`
- Modify if needed: `robot/esp32-server/main/tbot-server/tests/test_config_from_api_template.py`
- Modify if needed: `robot/esp32-server/main/tbot-server/tests/test_ota_websocket_url.py`

- [ ] **Step 1: Expand the absence contract across Python and Java production code**

Scan only production directories and reject:

```text
/device/provision
device.provisionWifi
wifiPassword
wifiSsid
```

Allow Wi-Fi labels in manager UI only if they are local UI copy and not an API accepting credentials for an offline robot. Document any intentional exception in the test with a narrow path allowlist.

- [ ] **Step 2: Assert runtime responsibilities remain available**

Keep tests proving the server still supports:

- device config retrieval after the robot has network access;
- OTA WebSocket URL construction;
- authenticated runtime WebSocket/device token handling;
- existing bind/list/tool/lesson surfaces unrelated to home Wi-Fi provisioning.

- [ ] **Step 3: Run focused ESP server tests**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/esp32-server/robot-wifi-hardening/main/tbot-server
python3 -m pytest -q \
  tests/test_wifi_provisioning_boundary.py \
  tests/test_config_from_api_template.py \
  tests/test_device_token_client.py \
  tests/test_ota_websocket_url.py
```

Expected: all tests pass and demonstrate that ESP server is usable after connectivity without being part of Wi-Fi credential delivery.

- [ ] **Step 4: Checkpoint the diff without committing**

```bash
git diff --check
git status --short
```

### Task 8: Remove production identifier logging and add safe diagnostics

**Files:**
- Modify: `tbot-mobile/src/services/ble/service.ts`
- Modify: `tbot-mobile/src/features/device/pairing/screens/PairSearchScreen.tsx`
- Modify: `tbot-mobile/src/services/observability/logger.ts` if it already provides the correct structured API.
- Modify: `tbot-mobile/tests/ble/service.test.ts`
- Modify: `tbot-mobile/tests/features/device/pair-search-helpers.test.tsx`

- [ ] **Step 1: Add failing redaction tests**

Spy on production diagnostics and assert serialized output excludes:

```ts
expect(serialized).not.toContain('TBOT-14C19FD1AC20');
expect(serialized).not.toContain('AA:BB:CC:DD:EE:FF');
expect(serialized).not.toContain('home-password');
expect(serialized).not.toContain('bootstrap-token');
```

- [ ] **Step 2: Replace unconditional raw logs**

Production diagnostics may include only aggregate/non-persistent fields:

```ts
logBleEvent('scan_complete', {
  seenCount: seen.size,
  allowedCount: result.allowed.length,
  blockedCount: result.blocked.length,
  platform: Platform.OS,
});
```

For a per-device correlation key, hash the identifier with an installation-scoped salt and truncate it; never log the raw serial/MAC. Keep raw detail behind `__DEV__` only if repository policy permits it.

- [ ] **Step 3: Run logging tests and lint**

```bash
npx jest --selectProjects unit \
  tests/ble/service.test.ts \
  tests/features/device/pair-search-helpers.test.tsx \
  --runInBand
npm run lint
```

Expected: no sensitive identifiers in captured logs and no direct unguarded `console.info` added by this task.

- [ ] **Step 4: Checkpoint the diff without committing**

```bash
git diff --check
git status --short
```

### Task 9: Synchronize state machines, sequence diagrams, and API documentation

**Files:**
- Modify: `tbot-mobile/migrate-ui-ux-to-mobile-app-docs/state-machines/device-pairing.state.mmd`
- Modify: `tbot-mobile/migrate-ui-ux-to-mobile-app-docs/sequences/16-mobile/ble-provisioning.sequence.mmd`
- Modify: `tbot-mobile/migrate-ui-ux-to-mobile-app-docs/flows/domains/device/flow.md`
- Modify: `tbot-mobile/migrate-ui-ux-to-mobile-app-docs/usecases/domains/device/edge-cases.md` if present.
- Create: `tbot-mobile/docs/qa/ad-hoc/2026-07-13-robot-phone-wifi-provisioning-hardening.md`
- Modify: `tbot-backend/openapi.json` through generation only.

- [ ] **Step 1: Update the sequence to the single supported flow**

Document this exact sequence:

```text
Mobile → Backend: start/request claim
Backend → Mobile: attempt/claim id + one-time bootstrap token
Mobile → Firmware over BLE: encrypted token + backend device id + SSID/password
Firmware → Router: join 2.4 GHz Wi-Fi
Firmware → Mobile over BLE: STA_CONN_SUCCESS (best effort before BLE teardown)
Firmware → Backend: device config/claim confirm or provisioning status
Backend → Mobile: device_authenticated/CLAIM_CONFIRMED
Firmware → Backend: heartbeat
Firmware → ESP server: runtime WebSocket after bootstrap
```

Delete the `POST /v1/devices/provision/connect` and ESP credential-forwarding leg.

- [ ] **Step 2: Update recovery states**

Remove `setup hotspot`/`legacy_backend` transitions. Keep:

- retry scan;
- retry password over BluFi;
- reopen Bluetooth/app settings;
- safe reconnect via BOOT double-click;
- deliberate destructive repair pairing via five-second hold;
- final support/give-up state.

- [ ] **Step 3: Run documentation validators**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/robot-wifi-hardening
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:route-coverage
npm run check:screen-prop-types
```

Expected: every validator exits 0 and reports non-zero files checked.

- [ ] **Step 4: Checkpoint documentation diffs without committing**

```bash
git diff --check
git status --short
```

### Task 9A: Close final mobile review blockers

This task is a mandatory post-review correction and must finish before the full verification matrix. It does not restore a backend Wi-Fi fallback: credentials still travel only through encrypted BluFi.

**Execution resolution (2026-07-13):** The repository already implements authenticated `POST /devices/provision/start` lazy creation for valid TBOT-family serials. Therefore the safe branch below was selected: remove `ble_offline` completely and fail closed when provisioning-start cannot create a real backend attempt. Credential-only BluFi remains available only for `ble_reconnect` on an already-owned robot. This is stricter than retrying the impossible synthetic-offline state and satisfies the same claim-authority boundary.

**Files:**
- Modify: `tbot-mobile/src/features/device/pairing/screens/PairConnectingScreen.tsx`
- Modify: `tbot-mobile/src/__env__.ts`
- Modify: `tbot-mobile/tests/features/device/pair-connecting-flow.test.tsx`
- Create: `tbot-mobile/tests/config/env.test.ts` (no environment-generation contract test currently exists)
- Modify: `tbot-mobile/docs/qa/ad-hoc/2026-07-13-robot-phone-wifi-provisioning-hardening.md`

- [ ] **Step 1: Add a failing test for an unknown offline robot**

Model the exact `DEVICE_NOT_FOUND` path. Assert that the mobile app obtains a backend bootstrap/claim context, includes that context in the encrypted BluFi custom-data frames, waits for `STA_CONN_SUCCESS`, and only then polls the household device list by `serial_number` until the generated backend UUID appears.

The test must reject the current false flow:

```ts
expect(provisionWifiViaLocalBle).not.toHaveBeenCalledWith(
  expect.objectContaining({
    allowCredentialOnly: true,
    token: undefined,
  }),
);
```

The successful call must carry claim identity without exposing Wi-Fi credentials to the backend:

```ts
expect(provisionWifiViaLocalBle).toHaveBeenCalledWith(
  expect.objectContaining({
    allowCredentialOnly: false,
    token: expect.any(String),
    code: expect.any(String),
  }),
);
expect(pairDevice).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run the unknown-offline test and verify RED**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/robot-wifi-hardening
npx jest --selectProjects unit \
  tests/features/device/pair-connecting-flow.test.tsx \
  --runInBand -t "unknown offline robot"
```

Expected: FAIL because the current `ble_offline` branch uses credential-only provisioning without bootstrap/claim data.

- [ ] **Step 3: Route unknown robots through the claim/bootstrap orchestration**

In `PairConnectingScreen.tsx`, separate these cases explicitly:

```ts
const isKnownReconnect = provisioningTransport === 'ble_reconnect';
const isUnknownOfflineRobot = provisioningTransport === 'ble_offline' && !resolvedBackendDeviceId;
```

For `isUnknownOfflineRobot`, use the same backend start/bootstrap primitives as first pairing, then pass `token`, `code`, and the backend attempt/device identity into `provisionWifiViaLocalBle()`. Do not call `/devices/provision/connect`, do not send SSID/password to backend, and do not mark success from an old backend `online` value. The order must remain:

```text
start/bootstrap claim context
→ encrypted BluFi token/code/device identity + Wi-Fi credentials
→ firmware STA_CONN_SUCCESS
→ BLE teardown
→ firmware backend registration/claim confirmation
→ household lookup resolves generated UUID by serial_number
→ bounded online/claim confirmation
→ success
```

If the product contract intentionally forbids claiming from `ble_offline`, remove this transport and route the user back through the normal first-pair flow instead; never retain the impossible state “unknown device + credential-only + wait for registration.”

- [ ] **Step 4: Add delayed registration and negative authority assertions**

Keep the existing delayed-registration case with four retryable misses and success on the fifth response. Add assertions that:

```ts
expect(deviceApi.pairDevice).toBeUndefined();
expect(mockHttpPost).not.toHaveBeenCalledWith(
  expect.stringContaining('/devices/provision/connect'),
  expect.anything(),
);
expect(navigation.replace).not.toHaveBeenCalledWith(
  ROUTES.PairSuccessScreen,
  expect.anything(),
);
```

before firmware/backend confirmation is observed.

- [ ] **Step 5: Restore safe generated environment defaults**

Reset `src/__env__.ts` to the repository's generated empty/default values. `src/config.ts` already owns development fallback selection; production endpoints must enter through `.env`/process environment consumed by `metro.config.js`, not through a checked-in generated artifact. Preserve the exact generated `ENV` object shape:

```ts
// AUTO-GENERATED by metro.config.js — do not edit manually
export const ENV = {
  TBOT_API_URL: '',
  TBOT_AI_URL: '',
  EXPO_PUBLIC_GEMINI_LIVE_MODEL: '',
  EXPO_PUBLIC_SENTRY_DSN: '',
  EXPO_PUBLIC_POSTHOG_API_KEY: '',
  EXPO_PUBLIC_POSTHOG_HOST: '',
  EXPO_PUBLIC_VOICE_BARGE_IN_BUDGET_MS: '',
  EXPO_PUBLIC_VOICE_TEST_HARNESS: '',
  EXPO_PUBLIC_VOICE_CANCEL_UNACK_RECOVERY: '',
};
```

- [ ] **Step 6: Add an environment safety contract test**

Read `src/__env__.ts` and assert that checked-in defaults do not contain production hostnames or Render URLs:

```ts
expect(source).not.toMatch(/\.onrender\.com/i);
expect(source).not.toMatch(/https:\/\/[^'\"]*prod/i);
expect(source).toContain("TBOT_API_URL: ''");
expect(source).toContain("TBOT_AI_URL: ''");
```

Also test the generator/Metro configuration separately with injected environment values so release builds can still select production intentionally.

- [ ] **Step 7: Run focused verification**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/robot-wifi-hardening
npx tsc --noEmit
npm run lint
npx jest --selectProjects unit --runTestsByPath \
  tests/ble/config-allowlist.test.ts \
  tests/ble/service.test.ts \
  tests/ble/blufiProtocol.test.ts \
  tests/api/device-api.test.ts \
  tests/features/device/pair-connecting-flow.test.tsx \
  tests/features/device/pair-failed-screen.test.tsx \
  tests/config/env.test.ts \
  --runInBand --silent
git diff --check
```

Expected: typecheck, lint, all selected suites, and diff check pass. If the environment test lives at another established path, substitute that exact path and record it in QA.

- [ ] **Step 8: Re-run final review once**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/robot-wifi-hardening
codex review --uncommitted
```

Accept the result only if neither the unknown-device bootstrap gap nor production-default endpoint risk remains. Record the verdict and exact focused test count in the QA document.

### Task 10: Run complete software verification in all four repositories

**Files:**
- Modify: `tbot-mobile/docs/qa/ad-hoc/2026-07-13-robot-phone-wifi-provisioning-hardening.md`

- [ ] **Step 1: Verify mobile**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/robot-wifi-hardening
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run test:integration
npm run i18n:check
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:token-parity
npm run check:route-coverage
npm run check:screen-prop-types
git diff --check
```

- [ ] **Step 2: Verify backend**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/tbot-backend/robot-wifi-hardening
npm run typecheck
npm run lint
npm test
npm run build
npm run openapi:validate
npm run openapi:lint
git diff --check
```

- [ ] **Step 3: Verify firmware**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/TBOT-Firmware/robot-wifi-hardening
python3 -m pytest -q
idf.py build
git diff --check
```

- [ ] **Step 4: Verify ESP server**

```bash
cd /Users/manhhodinh/.config/superpowers/worktrees/esp32-server/robot-wifi-hardening/main/tbot-server
python3 -m pytest -q \
  tests/test_wifi_provisioning_boundary.py \
  tests/test_config_from_api_template.py \
  tests/test_device_token_client.py \
  tests/test_ota_websocket_url.py

cd /Users/manhhodinh/.config/superpowers/worktrees/esp32-server/robot-wifi-hardening
git diff --check
```

- [ ] **Step 5: Run negative source scans**

```bash
rg -n "legacy_backend|Use setup hotspot|/devices/provision/connect" \
  /Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/robot-wifi-hardening/src \
  /Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/robot-wifi-hardening/tests

rg -n "device\.provisionWifi|/device/provision/|ProvisionConnectDto" \
  /Users/manhhodinh/.config/superpowers/worktrees/tbot-backend/robot-wifi-hardening/src \
  /Users/manhhodinh/.config/superpowers/worktrees/tbot-backend/robot-wifi-hardening/tests
```

Expected: no matches except explicit historical migration notes, if retained and clearly labelled deprecated.

- [ ] **Step 6: Record exact evidence**

For every command, record command, exit code, non-zero suite/file count, sanitized summary, and PASS/FAIL/PARTIAL in the QA document. Do not describe skipped integration suites as passing.

### Task 11: Run physical phone-to-robot Wi-Fi QA

**Files:**
- Modify: `tbot-mobile/docs/qa/ad-hoc/2026-07-13-robot-phone-wifi-provisioning-hardening.md`

- [ ] **Step 1: Prepare a controlled test matrix**

Use at least:

| Dimension | Required values |
|---|---|
| Phone | Android 12+ Xiaomi/Pixel; iPhone on supported iOS |
| Router | WPA2 2.4 GHz; mixed 2.4/5 GHz with distinct test SSID if possible |
| Robot state | factory new; claimed and online; claimed but offline |
| Action | first pair; change Wi-Fi; same-Wi-Fi reconnect; wrong password; cancel mid-flow |
| BLE condition | normal; move out of range after credential write; reconnect after Wi-Fi-list scan |
| Backend condition | normal; delayed registration; temporary 404/5xx; unavailable during retry window |

- [ ] **Step 2: Validate first pairing**

Expected timeline:

```text
BLE discovery
→ one GATT connection for Wi-Fi list, cleanly released
→ provisioning GATT connection
→ secure negotiation
→ encrypted credentials/token/device-id writes
→ firmware STA_CONN_SUCCESS
→ BLE teardown
→ firmware claim confirm
→ mobile CLAIM_CONFIRMED
→ rename/assign/success
→ heartbeat marks device online
→ runtime WebSocket connects to ESP server
```

Fail if mobile reaches success before backend claim confirmation.

- [ ] **Step 3: Validate Wi-Fi change without unpairing**

Double-click BOOT, change Wi-Fi, and verify:

- existing household ownership remains;
- no new backend device row is created;
- no bootstrap/device secret is reset;
- the robot reconnects and resumes heartbeat/runtime WebSocket;
- mobile does not show `OFFLINE_DEVICE_NOT_REGISTERED` during normal delayed check-in.

- [ ] **Step 4: Validate wrong password and retry**

Expected:

- firmware reports `STA_CONN_FAIL`;
- mobile shows password correction, not backend/ESP failure;
- BLE remains available or can be re-entered safely;
- retry with the correct password succeeds without factory reset.

- [ ] **Step 5: Validate GATT race regression**

Run Wi-Fi list scan immediately followed by provisioning on Xiaomi/Android. Repeat at least 10 times.

Pass criteria:

```text
0 stale GATT sessions
0 "Operation was cancelled" caused by an older scan cleanup
0 duplicate notify subscriptions
0 hung scan timers
10/10 successful clean connection ownership transitions
```

- [ ] **Step 6: Validate delayed backend registration**

Inject or simulate at least four retryable status failures before online success. Mobile must continue polling within the normal bounded window and must not fail after only four attempts.

- [ ] **Step 7: Capture sanitized evidence**

Record:

- phone model/OS/app build;
- firmware commit and binary hash;
- backend and ESP deployment revisions;
- timestamps for BLE start, credential write, STA result, claim confirmation, heartbeat, and runtime WebSocket;
- screenshots of each terminal UI state;
- logs with credentials/tokens/full identifiers removed.

### Task 12: Final review and release gate

**Files:**
- Modify: `tbot-mobile/docs/qa/ad-hoc/2026-07-13-robot-phone-wifi-provisioning-hardening.md`

- [ ] **Step 1: Review each repository diff independently**

```bash
git -C /Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/robot-wifi-hardening status --short
git -C /Users/manhhodinh/.config/superpowers/worktrees/tbot-backend/robot-wifi-hardening status --short
git -C /Users/manhhodinh/.config/superpowers/worktrees/TBOT-Firmware/robot-wifi-hardening status --short
git -C /Users/manhhodinh/.config/superpowers/worktrees/esp32-server/robot-wifi-hardening status --short
```

Confirm no unrelated user changes were reverted or included in commits.

- [ ] **Step 2: Run Codex review on each changed repository**

```bash
codex review --uncommitted
```

Run from each dirty repository before its final commit, or use the actual base/commit target when changes have already been committed. Verify every accepted finding against the real cross-system path.

- [ ] **Step 3: Apply the release decision**

Release is allowed only when:

- mobile/backend/firmware/ESP focused and required tests pass;
- firmware target build passes;
- no provisioning integration tests required by this plan are skipped;
- negative scans show legacy credential forwarding is gone;
- Android and iOS physical first-pair/reconnect scenarios pass;
- wrong-password and delayed-backend scenarios pass;
- GATT race repetition passes 10/10;
- QA evidence contains no secrets or persistent raw identifiers.

If hardware evidence is unavailable, mark the result `PARTIAL — software verified, physical provisioning unverified`. Never claim “100% no lỗi” from unit tests alone.

## Plan Self-Review

- **Spec coverage:** Covers mobile BLE lifecycle/UI/API, backend ownership/state/API, firmware Wi-Fi/claim authority, ESP server boundary, documentation, software verification, and physical QA.
- **Boundary consistency:** Wi-Fi credentials exist only in mobile secret handoff/BluFi and firmware RAM/config handling; backend and ESP server no longer accept them.
- **State consistency:** First pair terminates on backend claim confirmation; reconnect terminates on firmware Wi-Fi evidence plus existing-device online confirmation.
- **Failure consistency:** Radio/password failures remain local; claim/auth failures remain backend-owned; ESP runtime failures cannot prevent Wi-Fi joining.
- **Residual risk:** Physical BLE stacks and router behavior require real-device evidence and cannot be proven solely by source or mocked tests.
