# BluFi Memory-safe Wi-Fi Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Android-to-Robot Wi-Fi provisioning release BLE memory before station association, reject stale mobile success, and pass three physical remote-unpair/re-pair cycles without pressing BOOT.

**Architecture:** Firmware stages credentials and claim data, deinitializes BluFi without consuming the provisioning-session owner, then starts Wi-Fi with internal/DMA memory returned to the driver. Failure rolls back credentials and automatically starts a fresh BLE setup generation; success commits NVS and continues claim/WebSocket startup. Mobile treats BLE delivery as intermediate and requires a backend `lastSeenAt` newer than the current handoff before leaving the connecting flow.

**Tech Stack:** ESP-IDF/C++ firmware, React Native/TypeScript, Jest, Python/pytest contract tests, ADB, pyserial, Render backend, aiohttp ESP server.

---

## File Map

- Firmware `main/boards/common/blufi.h`: declare the BLE-release and retry helpers.
- Firmware `main/boards/common/blufi.cpp`: release BLE before station start, preserve the current transaction/session, and restore advertising after terminal failure.
- Firmware `tests/test_blufi_provisioning_stability.py`: source-contract coverage for ordering, rollback, retry, and generation fencing.
- Mobile `src/features/device/pairing/screens/PairConnectingScreen.tsx`: wait for a fresh Robot status after claim handoff.
- Mobile `tests/features/device/pair-connecting-flow.test.tsx`: reject stale status and accept a fresh heartbeat.
- Mobile `tests/ble/service.test.ts`: keep the BluFi timeout classified as delivery-unknown/intermediate rather than final success.
- Existing remote-unpair tests remain unchanged unless verification exposes a regression.

### Task 1: Prove the firmware memory handoff contract is missing

**Files:**
- Modify: `/Users/manhhodinh/Documents/TBOT/robot/TBOT-Firmware/.worktrees/remote-unpair-wifi-setup/tests/test_blufi_provisioning_stability.py`
- Inspect: `/Users/manhhodinh/Documents/TBOT/robot/TBOT-Firmware/.worktrees/remote-unpair-wifi-setup/main/boards/common/blufi.cpp`

- [ ] **Step 1: Add failing source-contract tests**

Add tests that extract `StartStationConnectFromCredentials` and require:

```python
def test_wifi_credentials_release_ble_before_station_association():
    blufi = read("main/boards/common/blufi.cpp")
    helper = _function_body(blufi, "void Blufi::StartStationConnectFromCredentials")
    release = helper.index("ReleaseBleForStationAssociation")
    station = helper.index("wifi_manager.StartStation()")
    assert release < station


def test_failed_station_association_rolls_back_then_restores_ble_without_boot():
    blufi = read("main/boards/common/blufi.cpp")
    helper = _function_body(blufi, "void Blufi::StartStationConnectFromCredentials")
    failure = helper[helper.index("if (!credentials_committed)") :]
    rollback = failure.index("RollbackSsidTransaction(ssid_transaction)")
    restore = failure.index("RestoreBleAfterStationFailure")
    assert rollback < restore


def test_ble_restore_is_scoped_to_the_originating_setup_generation():
    blufi = read("main/boards/common/blufi.cpp")
    restore = _function_body(blufi, "void Blufi::RestoreBleAfterStationFailure")
    assert "expected_generation != setup_generation_.load()" in restore
    assert "init()" in restore
    assert "StartBleSetupTimeout" in restore
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
python3 -m pytest tests/test_blufi_provisioning_stability.py -k 'release_ble_before_station or restores_ble_without_boot or restore_is_scoped' -q
```

Expected: all three new tests fail because the helpers and ordering do not exist.

- [ ] **Step 3: Commit only the failing tests after the RED output is recorded**

```bash
git add tests/test_blufi_provisioning_stability.py
git commit -m "test(blufi): require memory-safe wifi handoff"
```

### Task 2: Release BLE before Wi-Fi and restore setup mode on failure

**Files:**
- Modify: `/Users/manhhodinh/Documents/TBOT/robot/TBOT-Firmware/.worktrees/remote-unpair-wifi-setup/main/boards/common/blufi.h`
- Modify: `/Users/manhhodinh/Documents/TBOT/robot/TBOT-Firmware/.worktrees/remote-unpair-wifi-setup/main/boards/common/blufi.cpp`
- Test: `/Users/manhhodinh/Documents/TBOT/robot/TBOT-Firmware/.worktrees/remote-unpair-wifi-setup/tests/test_blufi_provisioning_stability.py`

- [ ] **Step 1: Declare narrowly-scoped helpers**

Add private methods:

```cpp
bool ReleaseBleForStationAssociation(uint32_t expected_generation);
void RestoreBleAfterStationFailure(uint32_t expected_generation);
```

They must not call `CompleteSuccessfulProvisioningTeardown`, because that consumes the provisioning-session owner and rearms normal audio before Wi-Fi has reached a terminal state.

- [ ] **Step 2: Implement BLE release without consuming claim/session state**

Implement `ReleaseBleForStationAssociation` to:

```cpp
bool Blufi::ReleaseBleForStationAssociation(uint32_t expected_generation) {
    if (expected_generation != setup_generation_.load()) return false;
    CancelBleSetupTimeout();
    esp_blufi_adv_stop();
    if (deinit() != ESP_OK) return false;
    vTaskDelay(pdMS_TO_TICKS(300));
    return expected_generation == setup_generation_.load() && IsBleStackFullyOff();
}
```

Keep `bootstrap_token_`, `provisioning_code_`, `claim_device_id`, the staged SSID transaction, and the current `ProvisioningToken` intact. Run this helper from the dedicated Wi-Fi worker, never directly from the BluFi event callback, because host teardown must not destroy the callback stack that is currently executing.

- [ ] **Step 3: Move station start after successful BLE release**

In the dedicated worker created by `StartStationConnectFromCredentials`, after staging credentials and before `wifi_manager.StartStation()`:

```cpp
if (!ReleaseBleForStationAssociation(generation)) {
    ssid_manager.RollbackSsidTransaction(ssid_transaction);
    uint32_t expected_transaction = ssid_transaction;
    ssid_transaction_id_.compare_exchange_strong(expected_transaction, 0);
    m_wifi_connect_task_started.store(false);
    m_sta_is_connecting.store(false);
    RestoreBleAfterStationFailure(generation);
    delete ctx;
    return;
}
wifi_manager.StartStation();
```

Do not attempt a BluFi success/failure notification after BLE is released. The fresh backend heartbeat is the terminal phone-side signal.

- [ ] **Step 4: Restore BLE automatically after terminal station/NVS failure**

Implement `RestoreBleAfterStationFailure` on the Application task. It must:

```cpp
void Blufi::RestoreBleAfterStationFailure(uint32_t expected_generation) {
    Application::GetInstance().Schedule([this, expected_generation]() {
        if (expected_generation != setup_generation_.load()) return;
        WifiManager::GetInstance().StopStation();
        m_wifi_connect_task_started.store(false);
        m_sta_is_connecting.store(false);
        if (init() == ESP_OK) {
    StartBleSetupTimeout(CONFIG_BLE_SETUP_TIMEOUT_SEC);
        }
    });
}
```

Use the existing configured timeout and signature, `StartBleSetupTimeout(CONFIG_BLE_SETUP_TIMEOUT_SEC)`, not a duplicate literal. If current `init()` state initialization clears required claim fields, preserve them around init or move those resets to explicit fresh-setup entry only.

- [ ] **Step 5: Remove the now-invalid post-success BLE report/second teardown**

In the success branch:

- Commit credentials before claim refresh.
- Skip `esp_blufi_send_wifi_conn_report` because BLE is already off.
- Do not call `CompleteSuccessfulProvisioningTeardown` a second time.
- Rearm the provisioning/audio session exactly once after committed Wi-Fi and before claim runtime starts, using the existing captured `ProvisioningToken` ownership contract.

- [ ] **Step 6: Run focused and neighboring firmware tests**

```bash
python3 -m pytest \
  tests/test_blufi_provisioning_stability.py \
  tests/test_provisioning_success_teardown_contract.py \
  tests/test_tbot_claim_runtime_contract.py \
  tests/test_tbot_repair_pairing_contract.py \
  tests/test_tbot_remote_unpair_contract.py -q
```

Expected: all tests pass with no collection errors.

- [ ] **Step 7: Commit the firmware behavior**

```bash
git add main/boards/common/blufi.h main/boards/common/blufi.cpp tests/test_blufi_provisioning_stability.py
git commit -m "fix(blufi): release ble before wifi association"
```

Do not stage unrelated firmware files.

### Task 3: Make fresh Robot connectivity authoritative on mobile

**Files:**
- Modify: `/Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/fix-pair-search-resume/tests/features/device/pair-connecting-flow.test.tsx`
- Modify: `/Users/manhhodinh/.config/superpowers/worktrees/tbot-mobile/fix-pair-search-resume/src/features/device/pairing/screens/PairConnectingScreen.tsx`

- [ ] **Step 1: Add RED tests for stale and fresh claim completion**

Add a code-based BLE claim test where the handoff starts at a fixed timestamp and the backend already reports `device_authenticated`, but `getDeviceStatus` returns `online: true` with an older `lastSeenAt`. Assert no navigation to rename/success.

```tsx
mockedGetProvisioningAttemptStatus.mockResolvedValue({
  provisioningAttemptId: 'claim-1', deviceId: 'device-1', status: 'device_authenticated',
});
mockedGetDeviceStatus.mockResolvedValue({
  id: 'device-1', name: SERIAL, online: true, batteryPercent: 90,
  lastSeenAt: '2026-08-29T05:59:59.999Z',
});
```

Add a paired test with `lastSeenAt` one second after the handoff and assert navigation proceeds.

- [ ] **Step 2: Run the two tests and verify RED**

```bash
npx jest tests/features/device/pair-connecting-flow.test.tsx \
  --runInBand -t 'fresh Robot connectivity|stale Robot connectivity'
```

Expected: the stale test fails because current code navigates immediately after BLE handoff/backend attempt status.

- [ ] **Step 3: Capture the handoff freshness boundary for all BLE transports**

Replace the reconnect-only timestamp with:

```ts
const handoffStartedAtMs = Date.now();
```

Pass it to the post-handoff status wait for `ble`, `ble_claim`, and `ble_reconnect`.

- [ ] **Step 4: Require a fresh heartbeat before success navigation**

For `device_authenticated` completion, call:

```ts
await waitForDeviceOnline(
  result.deviceId,
  poll,
  'PAIRING_DEVICE_OFFLINE_TIMEOUT',
  DEVICE_ONLINE_MAX_POLL_ATTEMPTS,
  handoffStartedAtMs,
);
```

Only after this resolves may the screen clear secrets, save pending context, or navigate to rename/success. Keep zero-code physical-confirm semantics, but require the same fresh online proof after claim confirmation.

- [ ] **Step 5: Preserve ambiguous-delivery recovery without accepting stale state**

Every `deliveryUnknown` recovery path must run the fresh `waitForDeviceOnline` gate after claim/attempt status reaches a terminal value. It must not navigate solely because `getProvisioningAttemptStatus` says `device_authenticated` from an earlier run.

- [ ] **Step 6: Run mobile pairing and BLE suites**

```bash
npx jest \
  tests/features/device/pair-connecting-flow.test.tsx \
  tests/ble/service.test.ts \
  tests/features/device/pair-wifi-flow.test.tsx \
  --runInBand
npx tsc --noEmit
```

Expected: all selected suites and typecheck pass.

- [ ] **Step 7: Commit the mobile freshness fix**

```bash
git add src/features/device/pairing/screens/PairConnectingScreen.tsx tests/features/device/pair-connecting-flow.test.tsx
git commit -m "fix(pairing): require fresh robot heartbeat"
```

Preserve the existing password-eye, search-resume, translation, and documentation changes.

### Task 4: Build, flash, and prove one complete hardware recovery

**Files:**
- Build artifact only: firmware `build/`
- Build artifact only: mobile Android APK
- Evidence only: `/tmp/tbot-blufi-memory-safe-*`

- [ ] **Step 1: Run pre-build regression suites**

```bash
python3 -m pytest tests/test_blufi_provisioning_stability.py tests/test_tbot_remote_unpair_contract.py -q
```

```bash
npx jest tests/features/device/pair-connecting-flow.test.tsx tests/ble/service.test.ts --runInBand
npx tsc --noEmit
```

- [ ] **Step 2: Build the LCDWiki production firmware**

```bash
PATH="/usr/bin:$PATH" ./build-lcdwiki.sh --no-flash
```

Expected: verified image build completes and board config remains `CONFIG_BOARD_TYPE_LCDWIKI_ES3C35P=y`.

- [ ] **Step 3: Flash without erasing NVS**

```bash
source /Users/manhhodinh/esp/esp-idf/export.sh
idf.py -p /dev/cu.usbmodem1101 flash
```

Expected: all written partitions verify and the Robot resets normally. Never run `erase-flash`.

- [ ] **Step 4: Build and install the Android APK**

Use the repository's existing Gradle command, then:

```bash
/Users/manhhodinh/Library/Android/sdk/platform-tools/adb install -r <built-apk>
```

Expected: install succeeds and app data/auth remain intact.

- [ ] **Step 5: Capture pairing with serial open before the attempt**

Record sanitized categories for BLE teardown, internal/DMA heap, station association, NVS commit, heartbeat, and WebSocket. Required evidence:

- BLE stack fully off before `StartStation`.
- No repeated `heap_alloc_failed` during association.
- Candidate SSID committed.
- Fresh backend `lastSeenAt` after handoff.
- ESP server reports one live connection.

- [ ] **Step 6: Normal-reset durability check**

Reset using RTS/EN only. Verify saved Wi-Fi reconnects and the WebSocket returns without BOOT and without re-entering `wifi_configuring`.

### Task 5: Run three remote-unpair/re-pair cycles and three Wi-Fi changes

**Files:**
- Evidence only: `/tmp/tbot-remote-unpair-cycle-*`
- No source changes unless a new reproducible failure is found; if found, return to RED first.

- [ ] **Step 1: Remote-unpair cycle 1**

From Android tap `Huỷ ghép nối Robot` once. Verify backend DELETE returns 200, ESP delivers the fixed command, Robot shows initializing, clears ownership/Wi-Fi, reboots, and advertises BLE without BOOT. Re-pair and require fresh online/WebSocket evidence.

- [ ] **Step 2: Remote-unpair cycles 2 and 3**

Repeat the exact cycle twice. Record per-cycle timestamps and only sanitized state transitions/counts.

- [ ] **Step 3: Wi-Fi change cycles 1 through 3**

Use the app's change-Wi-Fi entry without pressing BOOT. For each cycle, require BLE discovery, Robot Wi-Fi scan response, protected credential handoff, fresh heartbeat, and WebSocket reconnection.

- [ ] **Step 4: Exercise failure and concurrency cases**

Verify:

- Duplicate unpair taps issue one in-flight request.
- Robot-offline unpair returns a clear retryable error and preserves local pairing.
- Wrong password rolls back and restores BLE automatically.
- App background/foreground does not duplicate provisioning.
- Temporary phone network loss does not create false success.
- Temporary AP loss reconnects from saved credentials after recovery.

- [ ] **Step 5: Re-run full focused suites after hardware testing**

Run firmware contract suites, mobile pairing/BLE suites, backend remote-unpair suites, and ESP remote-unpair suites fresh. Expected: zero failures.

### Task 6: Final safety cleanup and delivery

**Files:**
- Delete secret temporary file referenced by `/tmp/tbot_remote_unpair_env_path`
- Delete pointer `/tmp/tbot_remote_unpair_env_path`
- Preserve unrelated dirty changes in all repositories.

- [ ] **Step 1: Review diffs and repository status**

Use `git status --short` and `git diff --check` separately in firmware, mobile, backend deployment, and ESP server worktrees. Confirm no unrelated files are staged.

- [ ] **Step 2: Remove the temporary production environment copy**

Resolve the exact file from the pointer, verify it is a regular file under `/tmp`, delete that exact file, then delete the pointer. Do not print its contents or path.

- [ ] **Step 3: Run final verification commands fresh**

Record exit codes and test totals for firmware, mobile, backend, ESP server, firmware build, APK build/install, and all six physical cycles.

- [ ] **Step 4: Report actual result and residual risks**

Only claim production readiness if every automated gate and physical cycle passed. If any cycle fails, report the exact failing boundary and keep the task open.
