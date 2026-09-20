# Android Wi-Fi Connect, Cancel, Reconnect

Status: PASS. Three consecutive physical cycles completed on the final candidate.

## Candidate and scope

Android device: Xiaomi 2312DRA50C, ADB `efc5314f`.
Robot: ESP32-S3, USB `/dev/cu.usbmodem101`, MAC `14:c1:9f:d1:ac:20`.
The source and APK hashes are recorded in workspace artifact
`task-artifacts/wifi-cancel-reconnect-20260910/candidate.json`.
Firmware initially ran clean `f0ff680`. Physical testing reproduced a panic on
re-entering setup. The final candidate includes firmware cleanup ordering and
worker-memory fixes and a lightweight credential-fallback timer. App-only flash
at `0x20000` preserves NVS; the final flash passed with written data hash verified.

## Reproduced defects

- Cancelling provisioning during pending discovery still sent credentials.
  Regression observed `wifi_credentials_sent` instead of cancellation.
- Bluetooth-off failure dropped the selected owned-device reconnect context.
  Physical retry attempted new pairing and showed already-assigned instead of Wi-Fi setup.
- Cancelling native Wi-Fi prescan left its helper running; it opened GATT later.
- A delayed native connection-status result released a newer session.
- Cancelling during scan MTU left a rejected scan promise without an attached handler.
- Cancelling during pending pairing-context persistence navigated to Rename later.
- Robot setup re-entry could allocate Bluetooth while asynchronous chat cleanup
  still owned network resources. The observed 4864-byte internal allocation
  failure entered the SDK's `BTU_StartUp` -> `l2c_free` null cleanup panic.

## Changes

AbortSignal propagates through provisioning, native connection retries, and scan
MTU handling. Session ownership is checked before releasing a connection. Cancel
returns to DeviceHome; late persistence completion cannot navigate. Search errors
retain the original reconnect device context. Existing wire payloads, ownership,
authentication, password retention, and fresh-online proof remain unchanged.
Cancellation cannot retract credentials already delivered to firmware.
Firmware now waits for owned audio/protocol cleanup, preserves rollback context,
fences new wake/listen work during preparation, and rolls back cancelled automatic
recovery before reserving BLE. Heap snapshots identify the Bluetooth boundary.
Three claim/release workers now pair `xTaskCreateWithCaps` with
`vTaskDeleteWithCaps` and destroy local C++ values before self-deletion. This
fixes the repeated internal-stack leak observed across provisioning refreshes.
The 500 ms credential fallback uses an ESP timer instead of allocating a 3072-byte
sleeping task while BLE is active. The callback releases timer/context ownership
and schedules the existing generation/candidate/duplicate-guarded connection path.

## Automated verification

- Focused regression: 4 suites, 263 passed; `npx tsc --noEmit` and `npm run lint` pass.
- `npm test -- --runInBand`: 234 suites passed, 2845 tests passed, 19 skipped.
  Skipped canonical parity
  cases remain an evidence gap because their source points to missing
  `TJBot-infra/contracts`. The backend's vendored contracts are not silently
  substituted for that canonical revision.
- Integration suite: 5 passed, 1 failed. The same course-enrollment lifecycle
  failure reproduces in an isolated HEAD archive; it is outside Wi-Fi behavior.
- Flow, sequence, ERD, use-case, token-parity, route-coverage, screen-prop-types,
  and API-contract-sync checks return 0 with nonzero checked input counts.
- Android build uses JDK 17 from Homebrew and succeeds. The initial wrapper
  invocation could not locate Java; no success is inferred from that invocation.
- Firmware worker regression group: 182 passed; final BluFi/timer group: 240 passed.
- Firmware `idf.py build`: succeeds on ESP-IDF 5.5.4 / Python 3.9, LCDWiki ES3C35P.
- Firmware full suite: `CHAT_MAILBOX_TSAN=1 python3 -m pytest tests/ -q -rs`:
  final timer candidate: 1801 passed in 279.62 seconds, no skips.

Reproducible commands (run from the corresponding repository):

```sh
# Mobile
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run test:integration -- --runInBand
npm test -- --runInBand tests/ble/service.test.ts tests/features/device/pair-connecting-flow.test.tsx tests/features/device/pair-search-helpers.test.tsx tests/e2e/ux-redesign-accessibility.test.tsx
npm run flows:validate
npm run sequences:validate
npm run erd:validate
npm run usecases:check
npm run check:token-parity
npm run check:route-coverage
npm run check:screen-prop-types
npm run api:contract-sync:check
# From mobile/android, with JAVA_HOME set to the installed JDK 17:
./gradlew assembleDebug

# Firmware, using the installed ESP-IDF 5.5.4 environment for idf.py:
CHAT_MAILBOX_TSAN=1 python3 -m pytest tests/ -q -rs
python3 -m pytest tests/test_blufi_connect_fallback_timer.py tests/test_blufi_provisioning_stability.py tests/test_blufi_wifi_scan_contract.py tests/test_blufi_security_and_events.py -q
idf.py build
```

## Physical acceptance

Each accepted cycle records an online baseline, setup cancellation back to
DeviceHome, setup re-entry, encrypted BluFi handoff, a fresh robot IP and later
HTTP 204 heartbeat, and Android returning to DeviceHome with "Truc tuyen".
Three cycles ran continuously without resetting or power cycling the robot.
There were no reset, panic, allocation-failure, or serial-gap events during them.
Physical log timestamps below are UTC on 2026-09-10 (local time is UTC+7).

| Cycle | Start | Finish | Result | Internal free before BLE | Largest block |
| --- | --- | --- | --- | --- | --- |
| 1 | 07:47:04 | 07:49:38 | PASS | 27031 bytes | 9216 bytes |
| 2 | 07:49:38 | 07:52:09 | PASS | 26451 bytes | 9216 bytes |
| 3 | 07:52:10 | 07:54:43 | PASS | 26671 bytes | 8704 bytes |

The approximately 6 KB per-cycle leak no longer occurs in these three cycles.
This evidence covers cancellation of Wi-Fi setup and reprovisioning the owned
robot. Ownership unpair, factory reset, long-duration soak and general voice
readiness are not established by these cycles.

Final firmware ELF SHA256:
`8e450b5dd724670e7b0ff8228a69708d4042d91e4bbe51a8ffc8aa3690456a0b`.
Final Android APK SHA256:
`366003853c900533f9ffd7fc288df81f3cafb55fdc8adf94430bbfbfc87be6da`.
Per-file hashes include intended uncommitted changes; HEAD alone is not the
tested candidate. Earlier failed candidates are archived separately and excluded.

Evidence is under `task-artifacts/wifi-cancel-reconnect-20260910/` in the workspace.
Passwords and tokens are excluded from the report and captured robot events.

## Subsequent ownership-unpair acceptance

The later same-SSID AP selection and server ACK-routing corrections passed
three physical ownership-unpair/re-pair cycles on the final firmware
`94b0db3ee6206bd546bc3e0ff1a2018ac26a67be24c4f64f8f31fc278da43beb`.
All three unpair requests returned HTTP200, then cloud re-claim, fresh IP,
HTTP204 heartbeat and Android online state passed. Final firmware full suite:
1802 passed, no skips. This supplements the earlier cancellation evidence;
see workspace `task-artifacts/unpair-20260910/report.md` and `candidate.json`
for exact deployment identities, timestamps and the existing unrelated test gaps.

## Unpair immediately after reset: final recurrence fix

The user later reproduced409 on a half-open pre-reset robot socket. Server
PING/PONG preflight plus bounded restart readiness now precedes the single
unpair send. Final backend c25bea6/ESP5d188d6b passed3 consecutive physical
early-reset/unpair/re-pair cycles09:57:51-10:03:19UTC. All3 exercised failed
probes and recovery, then one command, ACK, HTTP200, cloud release/re-claim,
fresh IP/heartbeat and Android online. APK/firmware remain unchanged.
See workspace `task-artifacts/unpair-ready-20260910/report.md` for final
identities, timing chain, evidence and prior unrelated test gaps.
