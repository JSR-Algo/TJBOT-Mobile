# Robot-Phone Wi-Fi Provisioning Hardening QA

Date: 2026-07-13

Status: **PARTIAL — software gates verified and latest firmware flashed/read back; fresh physical proof of BluFi success delivery and claim confirmation remains required**

## Architecture Evidence

- Home Wi-Fi credentials travel only from `tbot-mobile` to `TBOT-Firmware` over encrypted BluFi.
- `tbot-backend` retains start/local-BLE-paired/status/complete/bootstrap/claim/heartbeat responsibilities and no longer exposes the credential-forwarding connect route.
- `esp32-server` has no production Wi-Fi credential endpoint and remains a post-connect runtime service.
- Firmware remains the Wi-Fi join authority and reports BluFi success only from the connected branch before BLE teardown and claim refresh.

## Mobile Evidence

| Check | Result | Evidence |
|---|---|---|
| TypeScript | PASS | `npx tsc --noEmit` exited 0 |
| Unit tests | PASS | latest post-review run: 195 suites passed, 1 skipped; 2,115 tests passed, 19 skipped baseline tests |
| Integration tests | PASS | 1 suite, 3 tests passed |
| Lint | PASS | `eslint src/ tests/ --max-warnings=0` |
| i18n | PASS | 1,792 EN keys, 1,792 VI keys, zero delta, zero hardcoded strings |
| Flow validation | PASS | all navigation graph/domain checks passed |
| Sequence validation | PASS | 102 sequence files parsed |
| ERD validation | PASS | 109 DBML files and 107 entity docs checked |
| Use-case validation | PASS | 154 use cases checked |
| Route/prop validation | PASS | 125 routes and 133 screen files checked |
| Legacy source scan | PASS | no production `legacy_backend`, setup-hotspot action, or `/devices/provision/connect` call |
| Android embedded build | PASS | Android 16/API 36 test device; debug APK installed and launched without a native/JS crash |
| Android build resource contract | PASS | regression test verifies the manifest's `@xml/network_security_config` reference resolves; cleartext remains denied by default with loopback-only dev exceptions |
| Android network-security lint | PASS | every configured domain explicitly declares `includeSubdomains`; focused regression tests passed 2/2 and release assembly succeeded |
| Android embedded runtime contract | PASS | `build:android` now exports with `--dev false`, preventing the fatal DevTools WebSocket attempt in an embedded APK |
| Native crypto packaging | PASS | `react-native-get-random-values` loads before Expo Crypto/app code, iOS pods/lockfile include both native crypto dependencies, and clean-source contracts prevent a `Math.random` DH fallback |
| BluFi inbound AES-CFB | PASS | behavioral TDD: RED `1 failed / 45 passed`, then GREEN `46/46`; encrypted fragments longer than one AES block now use the CFB decrypt transform rather than the outbound encrypt transform |
| Latest Android artifact | PASS | final settled-tree build and release assembly completed successfully; the latest 111 MB QA APK has SHA-256 `7ca8941ca16f2a3a03430eeade5f0f278e1bc4b7408946217f9c8f493c3c69ec` and was installed on the authorized test device |
| QA-local Android artifact | PASS | rebuilt for the QA-local backend, installed successfully, and connected through the local ADB transport; artifact identity matches the latest Android artifact above |
| Effective-SSID password ownership | PASS | password state is atomically scoped to the effective SSID; route-driven or manual SSID changes clear or block stale-password reuse; focused tests passed 25/25, specification and quality reviews approved, and TypeScript, ESLint, and diff-check gates passed |

Focused regression coverage includes:

- normal Wi-Fi-list GATT cleanup and stale-session ownership;
- encrypted BluFi password/token framing;
- native error redaction when a driver echoes a password;
- fail-closed handling when backend cannot create a provisioning/claim attempt;
- no synthetic `ble_offline` device id or credential-only first-pair path;
- Bluetooth-only retry UX with no credential fallback through backend.
- reconnect/change-Wi-Fi preserves the exact backend device ID and serial through retry, rejects a mismatched scanned robot, and fails closed when target identity is incomplete;
- credential-only reconnect cannot succeed without `STA_CONN_SUCCESS`, preventing stale backend online state from masking a rejected Wi-Fi change;
- generated `src/__env__.ts` defaults contain no production hostnames, preventing local/test bundles from silently targeting production.
- password state cannot cross an effective-SSID change: both route-provided and manually entered network changes clear or reject reuse before provisioning.

Latest final verification: TypeScript and lint passed; 195 unit suites passed with one skipped suite, 2,115 tests passed with 19 baseline skips, and all three integration tests passed. The focused BLE/pairing matrix passed 259/259 after the multi-block AES-CFB correction. The newer effective-SSID/password regression passed 25/25 with specification and quality approval, and its TypeScript, ESLint, and diff-check gates passed. Android network-security lint coverage passed 2/2 and release assembly succeeded. i18n, documentation, token, route, prop, flow, sequence, ERD, and use-case validators passed with nonzero coverage. Production legacy scans found zero matches and diagnostic allowlist tests passed.

## Backend Evidence

| Check | Result | Evidence |
|---|---|---|
| TypeScript | PASS | `npm run typecheck` exited 0 |
| Focused provisioning tests | PASS | latest review run: 211 tests passed; 41 DB-gated tests skipped in the non-live run |
| Latest review-fix regression | PASS | restored 24/24 independent `FirmwareProvisioningStatusService` security/state tests; typecheck, lint, build, and focused contract tests passed |
| Lint | PASS | `eslint "{src,tests}/**/*.ts"` exited 0 after legacy fixture cleanup |
| OpenAPI generation | PASS | OpenAPI 3.1.0 generated with 92 paths |
| OpenAPI validation/lint | PASS | validator exited 0; Spectral reported no warning-or-higher results |
| OpenAPI portal sync | PASS | portal copy byte-identical to generated backend spec; SHA-256 `285b3daab8f94f4159207a573dd5fbfa0c8c6bc3230f623cd5c90929f179675b` |
| Boundary scan | PASS | no production connect route, `ProvisionConnectDto`, ESP provisioning command, or ESP provisioning URL |
| Provisioning integration | PASS | disposable PostgreSQL 16: 3 files, 53 tests passed, 0 skipped |
| Full suite | PASS | disposable migrated PostgreSQL: 387 files and 2,972 tests passed; 51 files and 461 tests skipped by suite configuration |
| QA-local runtime | PASS | latest hardening worktree built and started; health and bootstrap checks returned 200. The bootstrap response initially carried the hosted default rather than the QA origin; session configuration now preserves the firmware QA API origin for the next run |

The live consumer-provisioning suite now proves that the removed `/v1/devices/provision/connect` route returns 404 while the provisioning attempt remains `started`, `failure_code` remains null, device status remains `provisioning`, and the submitted password is absent from persisted attempt data.

Final review confirmed that removing the obsolete ESP bridge spec had also removed an unrelated firmware-status service suite. Those 24 bootstrap-token race/scoping, pairing-code, rollback, transition, and secret-redaction tests now live in a dedicated spec without restoring any legacy credential-forwarding symbols. A disposable PostgreSQL 16 rerun passed 41/41 live tests after 100 migrations.

## Firmware Evidence

| Check | Result | Evidence |
|---|---|---|
| Transactional Wi-Fi credential focused suite | PASS | candidate credentials remain staged in RAM and commit only after the exact candidate connects; rollback, stale-worker, single-flight, 32-byte SSID, and teardown-poison protections passed 168 focused tests and 154 selected regression tests |
| BluFi finalization race focused suite | PASS | async success delivery retries up to 3 times at 100 ms intervals, then applies an exact 750 ms success-only disconnect grace; finalization is mutex-protected with an atomic guard, and all fetch/confirm/legacy-report work is generation-bound |
| Final combined focused verification | PASS | specification and quality reviews APPROVED; combined firmware regression run passed 239 tests and `git diff --check` was clean |
| Full project pytest | PARTIAL | 768 passed, 1 skipped, with 11 unrelated baseline/environment failures |
| ESP-IDF target build and flash | PASS | ESP-IDF v5.5.4 produced a 3,578,448-byte binary with 13% free and SHA-256 `f6033d4e0169ce4db7e429da1bdc2a9c25857cefa983cc30ae3d29a94806f4f5`; NVS was erased, five regions were flashed and hash-verified, and the board was hard-reset |
| App-partition readback | PASS | source and physical readback SHA-256 both equal `f6033d4e0169ce4db7e429da1bdc2a9c25857cefa983cc30ae3d29a94806f4f5`; the readback is byte-identical to the source binary |

The focused suite locks `WifiManager::IsConnected()` gating, `m_provisioned`, `STA_CONN_SUCCESS`, BLE disconnect/deinit, claim-token ownership, and post-BLE claim refresh ordering. Wi-Fi credential replacement is now transactional: the incoming candidate stays in RAM, persistent credentials are committed only after the exact candidate is confirmed connected, and failure restores the prior known-good state. Generation ownership rejects stale workers, single-flight guards prevent overlapping attempts, the full 32-byte SSID boundary is covered, and teardown poisoning cannot mutate a later attempt. The physical race fix makes BluFi finalization single-owner: a finalization mutex and atomic guard serialize completion, fetch/confirm/legacy-report work is bound to the active generation, and BLE session state uses an encoded compare-and-swap transition. Success enqueue retries up to three times at 100 ms intervals and receives an exact 750 ms success-only grace before disconnect; failure paths do not inherit that delay. Secure Bluetooth-controller context handling is nonblocking so the callback path cannot deadlock while preserving teardown safety. Claim confirmation now has typed confirmed/retryable/terminal/ambiguous outcomes: retryable transport/408/425/429/5xx responses preserve the token for bounded polling; non-retryable 4xx or missing required local claim state produce terminal failure and securely clear attempt secrets; confirmed responses consume and clear the bootstrap secret; and malformed/truncated 2xx responses enter a persistent support/reset state instead of destructively retrying. Local token copies use scope-based secure clearing on every exit. Final review also fixed claim-fetch dispatch rollback, duplicate audio-worker startup after re-claim, low-memory allocation handling, capture of the setup generation before the 500 ms station-start yield, and immutable generation binding when the BLE setup timeout is armed. A physical boot-log audit additionally found and removed raw UUID, network identifiers, advertised-name, activation/attestation payload, runtime identity, and signed/device-id-bearing URL output across current and dormant provisioning paths; ESP-IDF Wi-Fi, netif, and BLE-controller INFO tags that expose identifiers are suppressed while warnings remain. Generated config confirms `CONFIG_IDF_TARGET="esp32s3"`, `CONFIG_USE_ESP_BLUFI_WIFI_PROVISIONING=y`, and `CONFIG_BLE_SETUP_TIMEOUT_SEC=300`.

Intentional provisioning limitation: an unclaimed robot defers the three persistent audio workers to preserve the internal-SRAM budget proven necessary for BluFi and TLS claim work. While those workers are stopped, BOOT/manual-listen input does not enter the legacy `AudioTesting` state, and local setup sounds are dropped immediately rather than queued for stale playback after claim. Claimed/runtime audio behavior is unchanged; audio workers start on successful claim and remain idempotent.

## ESP Server Evidence

| Check | Result | Evidence |
|---|---|---|
| Provisioning boundary/runtime suite | PASS | boundary 11/11 and focused runtime suite 34/34 passed; scanner covers Java named/multi-path routes plus Python/FastAPI/aiohttp decorators, keyword paths, bound handlers, JSON-body credentials, and snake_case fields |
| Production source scan | PASS | no `/device/provision`, `device.provisionWifi`, `wifiPassword`, or `wifiSsid` in Java/Python production paths |
| Full relevant pytest | PASS | 34 tests passed; Ruff check/format and Python compilation passed |

## Latest Physical Android Evidence

- A real authorized Android 16 device and the ESP32-S3 robot were used. Device serials and hardware identifiers are intentionally omitted.
- Firmware AP-list memory regression: PASS. A dense physical scan returned four capped unique networks to the phone without the prior AP-list allocation failure.
- Heap snapshots now surround DH public-key generation/return, and the allocation failure hook logs only numeric size/capability/function diagnostics without allocating or exposing secrets.
- A physical wrong-network run exposed the mobile stale-password ownership defect and drove the effective-SSID fix. QA evidence contained no credential leakage: no network names, passwords, tokens, pairing codes, or complete device identifiers were retained.
- The final transactional-credential and BluFi finalization-race firmware was rebuilt with ESP-IDF v5.5.4. The 3,578,448-byte binary has 13% free and SHA-256 `f6033d4e0169ce4db7e429da1bdc2a9c25857cefa983cc30ae3d29a94806f4f5`.
- Post-flash boot smoke test passed after the NVS erase: the robot booted normally, entered Wi-Fi setup, initialized claimable BLE standby, and remained stable without a boot loop. The observed log contained no raw robot UUID, MAC/BSSID, SSID, advertised name, or device-id-bearing claim URL.
- No runtime DH allocation-failure sample was captured after instrumentation because the flow did not proceed past password entry.
- Physical incident evidence: Android reported GATT status 19 after credential delivery, while the robot reached backend bootstrap HTTP 200 approximately 371 ms later. The asynchronous BluFi success indication was not observed by Android before BLE disconnected; this identifies a success-delivery race but does not by itself explain the later claim-confirmation result.
- The exact displayed Vietnamese message, `Xác nhận kết nối thất bại. Thử lại.`, is firmware-owned and is emitted only for `ClaimConfirmationResult::TerminalFailure`. The QA-local backend observed no fresh claim-confirm request for that incident, so the terminal cause is not yet physically resolved.
- Bootstrap configuration finding: the QA bootstrap response had returned the hosted default. The current session is now configured to preserve the firmware QA API origin without recording endpoint details; a fresh physical run must verify that the robot confirms against the intended QA backend.
- The BluFi delivery race is fixed with three 100 ms enqueue retries, an exact 750 ms success-only grace before disconnect, serialized single-owner finalization, generation-bound asynchronous work, nonblocking secure Bluetooth-controller context, and encoded compare-and-swap BLE session state. Specification and quality reviews both APPROVED the fix, and the final combined focused run passed 239 tests.
- Final physical flash/readback PASS: NVS was erased, all five required regions were written and hash-verified, the board was hard-reset, and the app partition was read back. Source and readback SHA-256 are both `f6033d4e0169ce4db7e429da1bdc2a9c25857cefa983cc30ae3d29a94806f4f5`, with byte-identical content.
- Current physical checkpoint: the latest QA APK is installed, the final firmware is flashed and readback-verified, and the QA-local backend session preserves the intended firmware API origin. A fresh sanitized physical run is required to prove both Android success delivery and backend claim confirmation.
- The QA-local topology keeps backend, Android transport, and firmware provisioning in the same controlled session without recording endpoint hostnames or addresses.
- Sanitized boot smoke confirmed the expected provisioning state, BluFi advertising, a 300-second timer, and deferred audio workers with empty queues.

No credentials, bootstrap tokens, complete hardware identifiers, or account data are included in this QA record.

## Physical QA Still Required

Hardware and all three QA-local runtimes have been exercised, but end-to-end provisioning is not yet complete:

- Robot flash PASS: the ESP32-S3 application and assets were written, every flashed region passed hash verification, and the board hard-reset successfully.
- Robot boot PASS: the verified build booted on the expected LCDWiki ESP32-S3 profile, entered `wifi_configuring`, initialized BluFi, armed the 300-second setup timer, and remained stable for more than 11 minutes without a boot loop.
- Android USB detection PASS: the authorized Android test device is detected.
- Android app build PASS after fixing a release-blocking missing `@xml/network_security_config` resource; a regression test now verifies that the manifest reference resolves. The debug APK was produced successfully.
- Android ADB/install PASS: the test device is authorized, the current APK installs successfully, and the app reaches the authentication UI.
- Android runtime defect FIXED: the first installed APK stopped at a React Native RedBox because the embedded bundle enabled Metro DevTools. A test reproduced the incorrect `--dev true` build contract; the build now uses `--dev false`, the regression passes, and the rebuilt APK reaches normal UI.
- Physical provisioning INCOMPLETE: the latest run exposed both a BluFi success-delivery race and a firmware terminal claim-confirmation alert. The reviewed race fix is flashed/readback-verified and the session now preserves the intended QA API origin, but a fresh run must prove phone-visible success and a fresh backend confirm request; retry and reconnect scenarios also remain incomplete.

Do not release as “100% no lỗi” until all of these pass with sanitized evidence:

1. First pairing on Android and iOS through encrypted BluFi to backend claim confirmation.
2. Change Wi-Fi and same-Wi-Fi reconnect without unpairing or creating a duplicate backend device.
3. Wrong-password failure followed by successful retry without factory reset.
4. At least four delayed backend status failures followed by success within the 20-poll window.
5. Wi-Fi scan immediately followed by provisioning, repeated 10 times with zero stale GATT cancellation.
6. Flash the verified ESP32-S3 binary to the real robot and capture sanitized serial evidence during the physical scenarios.

The live PostgreSQL route/state gate, final firmware flash/readback/boot gate, and Android APK install/runtime gate are complete. Remaining gates require fresh physical proof of phone-visible BluFi success and claim confirmation against the intended QA backend, followed by the Android provisioning matrix. iOS is unavailable in this QA environment and remains a separate cross-platform release gate.

## Release Decision

**NO-GO for a 100% reliability claim.** The success-delivery race is review-approved and covered by 239 passing focused tests, the final firmware is flash/readback-verified, and the QA API origin is session-configured. However, the firmware terminal claim-confirmation incident is not yet reproduced against the corrected QA session, phone-visible Android success remains unproven with the fix, and the remaining Android matrix plus unavailable iOS gate remain outstanding.
