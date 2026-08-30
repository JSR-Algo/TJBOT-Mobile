# Android BluFi Discovery Settle Delay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delay Android BluFi service discovery by 600 ms after connection so Xiaomi finishes connection setup before receiving the GATT database request.

**Architecture:** Add one shared Android-aware discovery helper in the existing BLE service module. Route Wi-Fi scanning, local provisioning, and claim-token delivery through it so every BluFi session follows the same ordering while iOS remains unchanged.

**Tech Stack:** TypeScript, React Native `Platform`, `react-native-ble-plx`, Jest fake timers, Android Gradle/ADB.

---

### Task 1: Add regression coverage for discovery ordering

**Files:**
- Modify: `tests/ble/service.test.ts`

- [ ] **Step 1: Mock the React Native platform explicitly**

Import `Platform` from `react-native` and set `Platform.OS = 'android'` in the test setup, restoring it after each test. This makes the platform-specific timing deterministic.

- [ ] **Step 2: Write the failing Android timing test**

Use fake timers with `scanRobotWifiNetworks()`. Resolve the BLE connection immediately, assert `discoverAllServicesAndCharacteristics` has not run at 599 ms, then advance one more millisecond and assert it runs. Complete the mocked BluFi response so the promise settles cleanly.

- [ ] **Step 3: Write the iOS non-delay test**

Temporarily set `Platform.OS = 'ios'`, start the same scan, flush promises without advancing time, and assert service discovery starts immediately.

- [ ] **Step 4: Run the new tests and verify RED**

Run:

```bash
npx jest --selectProjects unit tests/ble/service.test.ts --runInBand -t 'service discovery'
```

Expected: the Android test fails because discovery currently starts before 600 ms; the iOS assertion passes.

### Task 2: Implement the shared settle delay

**Files:**
- Modify: `src/services/ble/service.ts`
- Test: `tests/ble/service.test.ts`

- [ ] **Step 1: Add the Android delay constant and helper**

Import `Platform` from `react-native`, define `BLE_ANDROID_DISCOVERY_SETTLE_MS = 600`, and add a helper that waits only when `Platform.OS === 'android'` before calling `device.discoverAllServicesAndCharacteristics()`.

- [ ] **Step 2: Route all three BluFi discovery paths through the helper**

Replace direct discovery calls in `provisionWifiViaLocalBle()`, `sendClaimBootstrapTokenViaBle()`, and `scanRobotWifiNetworksOnce()`. Keep the existing 15-second timeout around the discovery result, not around the settle delay, so the timeout continues to measure the native discovery operation itself.

- [ ] **Step 3: Run the focused tests and verify GREEN**

Run:

```bash
npx jest --selectProjects unit tests/ble/service.test.ts --runInBand
```

Expected: all BLE service tests pass.

- [ ] **Step 4: Run static verification**

Run:

```bash
npm run typecheck
git diff --check
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit the implementation**

```bash
git add src/services/ble/service.ts tests/ble/service.test.ts
git commit -m "fix(ble): settle Android connection before discovery"
```

### Task 3: Build and physically verify the attached devices

**Files:**
- No source changes expected.

- [ ] **Step 1: Build the Android debug APK**

Run the repository's Android build command and require `BUILD SUCCESSFUL`.

- [ ] **Step 2: Install the APK on device `efc5314f`**

Use the configured Android SDK ADB executable and verify installation succeeds without clearing app data.

- [ ] **Step 3: Run the Wi-Fi scan journey**

Launch the app, enter the existing robot pairing flow, select the attached TBOT robot, and wait for the robot-provided Wi-Fi list. Do not enter, print, or log Wi-Fi credentials.

- [ ] **Step 4: Inspect sanitized Android BLE logs**

Verify the timeline shows connection, a roughly 600 ms pause, `discoverServices()`, natural `onSearchComplete(status=0)` before cancellation, notification setup, and the Wi-Fi scan request. If discovery still completes only after cancellation, record the experiment as disproving the timing-race hypothesis and stop before any firmware flash.

- [ ] **Step 5: Report the result**

State whether the Wi-Fi list appeared, include only timing/status evidence, and explicitly distinguish a successful mobile workaround from a confirmed firmware-side ATT/GATT fault.
