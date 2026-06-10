# Stable Zero-Code Pairing QA

Date: 2026-06-08
Task: `adhoc-2026-06-08-stable-zero-code-pairing`

## Scope

Mobile device discovery must not require the phone to be on Wi-Fi before the
zero-code claim path can discover a nearby robot. Any online phone connection
may scan BLE. Backend claimable-device listing can label or diagnose candidates,
but it cannot create a zero-code claim candidate without a matching BLE device
because the fresh bootstrap token must be delivered locally over BluFi.

## Evidence

| Check | Command | Result |
| --- | --- | --- |
| Pairing/claim regression slice | `npm test -- --runTestsByPath tests/features/device/claim-flow.test.ts tests/features/device/pair-found-zero-code.test.tsx tests/features/device/pair-search-multi-device.test.tsx tests/ble/service.test.ts tests/api/claim-api.test.ts tests/api/device-api.test.ts` | PASS, 6 suites / 71 tests; includes guards that `online: true` heartbeat is not treated as claim confirmation, missing BLE identity cannot create a cloud claim, and native coded BLE connect failure retries token delivery |
| Full unit suite | `npm test -- --runInBand` | PASS, 143 suites passed, 1 skipped; 1146 tests passed, 19 skipped |
| TypeScript | `npm run typecheck` | PASS, exit 0 |
| Integration tests | `npm run test:integration` | PASS, 1 suite / 3 tests |
| Lint | `npm run lint` | PASS, exit 0; 58 existing repo warnings |
| Backend claim/bootstrap unit contract | `npx vitest run tests/bootstrap-token.service.spec.ts tests/claim.setup-signal.spec.ts` from `tbot-backend` | PASS, 13 tests; awaiting physical-confirm attempts can mint bootstrap tokens and `/device/config` exposes pending claims |
| Flow validator | `npm run flows:validate` | PASS, generated SHA checked for 15 files |
| Sequence validator | `npm run sequences:fast` | PASS, 102 sequence files parsed |
| ERD validator | `npm run erd:validate` | PASS, 109 DBML files checked |
| Use-case validator | `npm run usecases:check` | PASS, checked 154 use cases, failures 0 |
| Token parity | `npm run check:token-parity` | PASS, 7 token files verified |
| Route coverage | `npm run check:route-coverage` | PASS, 131 screen files / 123 routes |
| Screen prop types | `npm run check:screen-prop-types` | PASS, 131 screen files checked |
| Firmware BOOT/claim runtime contract | `python3 -m pytest tests/test_tbot_ota_apply_hardening.py tests/test_tbot_claim_runtime_contract.py tests/test_tbot_connect_review_fixes.py tests/test_tbot_claim_confirmation_contract.py tests/test_lcdwiki_es3c35p_board.py -q` from `robot/TBOT-Firmware` | PASS, 58 tests; includes guards that unclaimed standby does not expire BLE advertising after the 5-minute pending-claim window, successful confirm clears the consumed bootstrap token before reboot, and manual BOOT confirm failure clears stale attempt auth while reopening BLE for retry |
| Firmware build | `. "$HOME/esp/esp-idf-v5.5.2/export.sh" && idf.py -B build-es3c35p build` | PASS, app version `2.2.28`; `xiaozhi.bin` size `0x335c80`, smallest app partition `0x3f0000`, 18% free |
| ESP OTA/WebSocket URL contract | `python3 -m pytest main/tbot-server/tests/test_ota_websocket_url.py -q` from `robot/esp32-server` | PASS, 17 tests |
| Live endpoint contract | `python3 scripts/tbot_connect_live_probe.py --timeout 12` from `robot` | PASS, backend health/bootstrap/device config and OTA probe OK; WS URL matches current tunnel |
| Render deploy status | Render API service `srv-d7isfqvaqgkc73a4hp00` | PASS, live deploy `dep-d8jcgu3ik45s73bcg4i0` on backend commit `53fcb40c78c5468b772b340afa22124499fe80c3`; redeployed to add redacted `tbot_connect` acceptance audit logs for claim request, claim confirm, and heartbeat |
| ESP OTA deploy | `scp build-es3c35p/lcdwiki-es3c35p_2.2.28.bin root@160.187.240.56:/opt/tbot/data/bin/`; remote/container `sha256sum`; OTA POST probe | PASS, remote/container hash `7db46187b07157f24c90fa2192e09ab10b7c2259436cbd472e90300a783c5cb6`; OTA now offers `2.2.28` to `2.2.27` devices and reports latest for `2.2.28` |
| ESP OTA public download | `curl .../download/lcdwiki-es3c35p_2.2.28.bin -o /tmp/... && shasum -a 256` | PASS, Cloudflare download hash `7db46187b07157f24c90fa2192e09ab10b7c2259436cbd472e90300a783c5cb6`, content-length `3366016` |
| Real robot OTA status from ESP logs | `docker logs --since 20m tbot-esp32-server` filtered for `14:c1:9f:d1:a8:48` | PARTIAL, server offers `2.2.28`; no real robot download or post-reboot `2.2.28` report observed yet after upload |
| Local hardware access | `python3 -m serial.tools.list_ports -v`; `adb devices -l` | BLOCKED, no ESP USB serial identified; `adb` unavailable in current shell |

## Remaining Hardware Gate

Real phone + robot acceptance is not fully proven in the current environment.
Remaining required proof: robot boots firmware `2.2.28`, BOOT/setup starts BLE
advertising, phone scan reaches PairFound with a BLE id, claim token is sent over
BluFi, robot auto-confirms, backend claim status becomes confirmed, WebSocket
comes online, and a robot reboot reconnects without re-claiming.
