# Wi-Fi Offline Recovery and Clock-Safe Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Wi-Fi reprovisioning recover automatically after sustained robot Wi-Fi loss and verify fresh exact-SSID heartbeats without trusting the phone clock.

**Architecture:** Firmware reuses its existing connection timeout as a non-sliding runtime disconnect watchdog. Mobile establishes freshness using ordered backend `lastSeenAt` observations after BLE handoff, then accepts only a later exact-SSID online observation.

**Tech Stack:** ESP-IDF C++/FreeRTOS timers, React Native/TypeScript, Jest, pytest firmware contract tests, Android ADB, ESP32-S3 USB flashing.

---

### Task 1: Firmware runtime disconnect watchdog

**Files:**
- Modify: `/Users/manhhodinh/Documents/TBOT/robot/TBOT-Firmware/main/boards/common/wifi_board.cc`
- Test: `/Users/manhhodinh/Documents/TBOT/robot/TBOT-Firmware/tests/test_wifi_board_provisioning.py`

- [ ] **Step 1: Write failing contract tests**

Add tests asserting that `NetworkEvent::Disconnected` starts `connect_timer_` only when inactive and outside config mode, repeated disconnects do not restart it, and `NetworkEvent::Connected` stops it.

- [ ] **Step 2: Verify RED**

Run: `python3 -m pytest -q tests/test_wifi_board_provisioning.py`

Expected: the new runtime-disconnect watchdog test fails because the disconnected branch only logs today.

- [ ] **Step 3: Implement minimal timer behavior**

In `WifiBoard::OnNetworkEvent`, arm the existing one-shot timer on the first runtime disconnect using `esp_timer_is_active(connect_timer_)`; keep the existing connected cancellation and timeout callback path.

- [ ] **Step 4: Verify GREEN and firmware regression suite**

Run:

```bash
python3 -m pytest -q tests/test_wifi_board_provisioning.py
python3 -m pytest -q tests
IDF_PATH=/Users/manhhodinh/esp/esp-idf /Users/manhhodinh/.espressif/python_env/idf5.5_py3.9_env/bin/python /Users/manhhodinh/esp/esp-idf/tools/idf.py build
```

Expected: all tests and the ESP-IDF build pass.

- [ ] **Step 5: Commit firmware change**

```bash
git add main/boards/common/wifi_board.cc tests/test_wifi_board_provisioning.py
git commit -m "fix(wifi): enter setup after sustained disconnect"
```

### Task 2: Mobile backend-clock freshness proof

**Files:**
- Modify: `/Users/manhhodinh/Documents/TBOT/tbot-mobile/src/features/device/pairing/screens/PairConnectingScreen.tsx`
- Modify: `/Users/manhhodinh/Documents/TBOT/tbot-mobile/src/features/device/pairing/screens/PairOfflineScreen.tsx`
- Test: `/Users/manhhodinh/Documents/TBOT/tbot-mobile/tests/features/device/pair-connecting-flow.test.tsx`
- Test: `/Users/manhhodinh/Documents/TBOT/tbot-mobile/tests/features/device/pair-static-screens.test.tsx`

- [ ] **Step 1: Write failing clock-skew test**

Add a credential-only test where the phone clock is ahead, the first post-handoff status establishes backend baseline `T`, and a later online exact-SSID status at `T+1` succeeds.

- [ ] **Step 2: Write failing stale-baseline test**

Add a test where every online exact-SSID response stays at `T`; verify the flow times out and never resets to DeviceHome.

- [ ] **Step 3: Verify RED**

Run: `npm test -- --runInBand tests/features/device/pair-connecting-flow.test.tsx`

Expected: the clock-skew case fails because current code compares server time with `Date.now()`.

- [ ] **Step 4: Implement backend timestamp baseline**

Capture the first valid post-handoff `lastSeenAt` as a baseline and require a strictly later parseable timestamp together with `online=true` and exact SSID. Preserve the absolute 60-second deadline and cancellation cleanup.

- [ ] **Step 5: Correct offline recovery copy**

State that automatic setup can take up to one minute after Wi-Fi loss and retain the five-second BOOT reset as last resort. Do not claim the phone can command an already unreachable robot.

- [ ] **Step 6: Verify GREEN and mobile regression suite**

Run:

```bash
npm test -- --runInBand tests/features/device/pair-connecting-flow.test.tsx tests/features/device/pair-static-screens.test.tsx
npm test -- --runInBand
npm run typecheck
npm run lint -- --quiet
```

Expected: 0 failures and 0 lint/type errors.

- [ ] **Step 7: Commit mobile change**

```bash
git add src/features/device/pairing/screens/PairConnectingScreen.tsx src/features/device/pairing/screens/PairOfflineScreen.tsx tests/features/device/pair-connecting-flow.test.tsx tests/features/device/pair-static-screens.test.tsx
git commit -m "fix(pairing): make offline wifi recovery clock-safe"
```

### Task 3: Flash and physical release verification

**Files:**
- Modify: `/Users/manhhodinh/Documents/TBOT/tbot-backend/docs/qa/ad-hoc/2026-09-05-wifi-reprovision-ssid-proof.md`

- [ ] **Step 1: Flash the verified firmware image**

Use the ESP32-S3 USB-JTAG reset sequence and `esptool --before no-reset`; verify the flashed MAC and application version. Never open the runtime serial port through ordinary pyserial after boot.

- [ ] **Step 2: Install the verified Android APK**

Build with JDK 17, install through ADB, and verify `com.TJBotmobile` is foreground.

- [ ] **Step 3: Start redacted raw logs**

Use `stty -hupcl` plus nonblocking `os.open` for serial and filter credential terms. Capture React Native BLE/pairing logs through ADB without credential values.

- [ ] **Step 4: Run at least four successful cycles**

For each cycle: Change Wi-Fi → automatic BLE discovery → robot AP scan → target SSID selection → hidden credential entry → BLE handoff → IP → WebSocket → HTTP 204 heartbeat → app DeviceHome. Do not press BOOT.

- [ ] **Step 5: Exercise cancellation and failure recovery**

Cancel/back out during search and retry; submit one invalid credential only if it can be done without exposing secrets; verify rollback and automatic BLE restoration, then recover successfully.

- [ ] **Step 6: Update QA evidence and push**

Record measured outcomes, versions, commits, and residual risks without credentials. Run `git diff --check`, commit the QA report, and push all clean `main` branches.
