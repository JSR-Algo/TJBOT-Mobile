# Wi-Fi Change Gesture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Android robot reconnect and Wi-Fi-change guidance match the firmware's safe BOOT double-click gesture while clearly reserving a five-second hold for destructive repair pairing.

**Architecture:** Keep the existing navigation and BluFi implementation unchanged. Update only mobile-owned pairing copy and exact-string i18n catalogs, lock the behavior with focused React Native tests, then validate the existing BLE provisioning path on the connected Android phone and robot.

**Tech Stack:** React Native, TypeScript, Jest, Testing Library, react-native-ble-plx, Android ADB, ESP32-S3 serial logs.

---

## File Map

- `src/features/device/pairing/screens/PairIntroScreen.tsx`: distinguish powering on from entering setup; explain the repair-pairing hold only as a reset action.
- `src/features/device/pairing/screens/PairOfflineScreen.tsx`: use BOOT double-click for reconnect/change-Wi-Fi setup.
- `src/features/device/pairing/screens/PairSearchScreen.tsx`: show the same double-click instruction while reconnect discovery is running.
- `src/features/device/pairing/screens/PairFailedScreen.tsx`: make BLE scan recovery actionable and non-destructive.
- `src/features/device/screens/DeviceHomeScreen.tsx`: align the device-home change-Wi-Fi entry copy with the pairing flow.
- `src/services/i18n/locales/en.json`: add exact English strings introduced by the screens.
- `src/services/i18n/locales/vi.json`: add corresponding Vietnamese strings.
- `tests/features/device/pair-static-screens.test.tsx`: lock intro/offline gesture semantics.
- `tests/features/device/pair-search-helpers.test.tsx`: lock reconnect-search instructions.
- `tests/features/device/pair-failed-screen.test.tsx`: lock scan-timeout recovery copy.
- `docs/qa/ad-hoc/2026-07-11-wifi-change-gesture.md`: record commands and physical E2E evidence.

### Task 1: Lock the gesture contract with failing UI tests

**Files:**
- Modify: `tests/features/device/pair-static-screens.test.tsx`
- Modify: `tests/features/device/pair-search-helpers.test.tsx`
- Modify: `tests/features/device/pair-failed-screen.test.tsx`

- [ ] **Step 1: Replace stale expectations with the approved gesture contract**

Add assertions equivalent to:

```ts
expect(screen.getByText('Double-click the BOOT button to change Wi-Fi without unpairing Robot.')).toBeTruthy();
expect(screen.getByText('Hold BOOT for 5 seconds only if you want to reset pairing and saved Wi-Fi.')).toBeTruthy();
expect(screen.getByText(/Double-click BOOT, keep Robot within 1-2 m/)).toBeTruthy();
```

Keep navigation assertions unchanged: reconnect actions must still navigate to
`PairSearchScreen` with `{ reconnectMode: true }`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npx jest --selectProjects unit \
  tests/features/device/pair-static-screens.test.tsx \
  tests/features/device/pair-search-helpers.test.tsx \
  tests/features/device/pair-failed-screen.test.tsx \
  --runInBand
```

Expected: FAIL because the current screens still contain top-button hold/setup
copy and do not render the approved double-click/reset distinction.

- [ ] **Step 3: Record the RED evidence**

Capture failing assertion names and exact current copy in
`docs/qa/ad-hoc/2026-07-11-wifi-change-gesture.md`.

### Task 2: Implement consistent reconnect and repair-pairing guidance

**Files:**
- Modify: `src/features/device/pairing/screens/PairIntroScreen.tsx`
- Modify: `src/features/device/pairing/screens/PairOfflineScreen.tsx`
- Modify: `src/features/device/pairing/screens/PairSearchScreen.tsx`
- Modify: `src/features/device/pairing/screens/PairFailedScreen.tsx`
- Modify: `src/features/device/screens/DeviceHomeScreen.tsx`
- Modify: `src/services/i18n/locales/en.json`
- Modify: `src/services/i18n/locales/vi.json`

- [ ] **Step 1: Update reconnect/change-Wi-Fi copy**

Use one exact instruction across reconnect entry, active search, and scan-timeout
recovery:

```tsx
<Text>Double-click the BOOT button to change Wi-Fi without unpairing Robot.</Text>
```

For active scanning, include the distance requirement:

```tsx
<Text>Double-click BOOT, then keep Robot within 1–2 m while this phone searches.</Text>
```

- [ ] **Step 2: Separate repair pairing from normal setup**

Where the UI mentions a five-second hold, use:

```tsx
<Text>Hold BOOT for 5 seconds only if you want to reset pairing and saved Wi-Fi.</Text>
```

Do not route ordinary Wi-Fi password, BLE timeout, or offline recovery users
toward repair pairing.

- [ ] **Step 3: Add exact-string translations**

Add these catalog mappings:

```json
"Double-click the BOOT button to change Wi-Fi without unpairing Robot.": "Double-click the BOOT button to change Wi-Fi without unpairing Robot.",
"Double-click BOOT, then keep Robot within 1–2 m while this phone searches.": "Double-click BOOT, then keep Robot within 1–2 m while this phone searches.",
"Hold BOOT for 5 seconds only if you want to reset pairing and saved Wi-Fi.": "Hold BOOT for 5 seconds only if you want to reset pairing and saved Wi-Fi."
```

Vietnamese values:

```json
"Double-click the BOOT button to change Wi-Fi without unpairing Robot.": "Nhấn đúp nút BOOT để đổi Wi-Fi mà không huỷ ghép nối Robot.",
"Double-click BOOT, then keep Robot within 1–2 m while this phone searches.": "Nhấn đúp BOOT, rồi đặt Robot cách điện thoại 1–2 m trong lúc tìm kiếm.",
"Hold BOOT for 5 seconds only if you want to reset pairing and saved Wi-Fi.": "Chỉ giữ BOOT 5 giây khi bạn muốn xoá ghép nối và Wi-Fi đã lưu."
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Task 1 Jest command again.

Expected: all selected suites pass, navigation expectations remain unchanged,
and no stale normal-Wi-Fi instruction recommends a five-second hold.

- [ ] **Step 5: Run i18n checks**

Run:

```bash
npm run i18n:check
```

Expected: hardcoded scan, locale parity, and bundle freshness pass with non-zero
catalog counts.

### Task 3: Validate software and physical Android-to-robot Wi-Fi change

**Files:**
- Create: `docs/qa/ad-hoc/2026-07-11-wifi-change-gesture.md`

- [ ] **Step 1: Run mobile validation gates**

Run:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run test:integration
npm run flows:validate
npm run sequences:fast
npm run erd:validate
npm run usecases:check
npm run check:token-parity
npm run check:route-coverage
npm run check:screen-prop-types
```

Expected: every command exits 0; Jest and validators report non-zero suites/files.

- [ ] **Step 2: Start the Android runtime**

Run:

```bash
npm run start:reset
adb reverse tcp:8081 tcp:8081
adb shell monkey -p com.TJBotmobile -c android.intent.category.LAUNCHER 1
```

Expected: Metro bundles `index.js`, `Running "TJBotMobile"` appears in logcat,
and the app renders rather than showing a blank debug surface.

- [ ] **Step 3: Exercise the safe Wi-Fi-change gesture**

1. Double-click BOOT on the claimed robot.
2. Open Device/Robot offline recovery and choose Update Wi-Fi.
3. Confirm the app discovers `TBOT-288485851A80`.
4. Select `Van Phong Tam Dentist` and submit the operator-provided password.
5. Capture Android BLE/GATT logs and robot serial logs without printing the
   password.

Expected evidence:

```text
[TBOT BLE] scan result ... allowed ... TBOT-288485851A80
[TBOT BLE WiFiScan] ... wifi list received
[TBOT BLE Provision] ... station frames written
BLUFI ... STA connected / connection report success
```

- [ ] **Step 4: Repeat the change-Wi-Fi flow**

Double-click BOOT again and repeat discovery/provisioning to the same SSID (or
another operator-approved SSID). The existing claim must remain intact, the app
must use reconnect mode, and no `BLE_SCAN_TIMEOUT`, false
`WIFI_CONNECT_TIMEOUT`, or repair-pairing reset may occur.

- [ ] **Step 5: Complete the QA record**

Record for each scenario: command, exit code, screenshot path, key sanitized
log lines, result, and cleanup. Explicitly note any residual hardware or backend
blocker rather than claiming success from unit tests alone.

### Task 4: Closeout

**Files:**
- Modify: `docs/qa/ad-hoc/2026-07-11-wifi-change-gesture.md`

- [ ] **Step 1: Review the final diff**

Run:

```bash
git diff --check
git diff -- src/features/device/pairing src/features/device/screens/DeviceHomeScreen.tsx src/services/i18n tests/features/device docs/qa/ad-hoc/2026-07-11-wifi-change-gesture.md
```

Expected: no whitespace errors, no unrelated user changes reverted, no BLE
schema or firmware files changed.

- [ ] **Step 2: Commit only after user requests a commit**

If requested:

```bash
git add docs/superpowers/specs/2026-07-11-wifi-change-gesture-design.md \
  docs/superpowers/plans/2026-07-11-wifi-change-gesture.md \
  src/features/device/pairing/screens/PairIntroScreen.tsx \
  src/features/device/pairing/screens/PairOfflineScreen.tsx \
  src/features/device/pairing/screens/PairSearchScreen.tsx \
  src/features/device/pairing/screens/PairFailedScreen.tsx \
  src/features/device/screens/DeviceHomeScreen.tsx \
  src/services/i18n/locales/en.json src/services/i18n/locales/vi.json \
  tests/features/device/pair-static-screens.test.tsx \
  tests/features/device/pair-search-helpers.test.tsx \
  tests/features/device/pair-failed-screen.test.tsx \
  docs/qa/ad-hoc/2026-07-11-wifi-change-gesture.md
git commit -m "fix(pairing): align Wi-Fi change gesture guidance"
```
