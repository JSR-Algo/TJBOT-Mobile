# Reconnect BLE Fallback Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep mobile BLE discovery active long enough to find a robot after firmware automatically restores setup mode when saved Wi-Fi is unavailable.

**Architecture:** Configure discovery attempts at the pairing screen based on reconnect mode. Normal pairing retains its current three default scans; reconnect mode uses two 40-second scans to cover the firmware's approximately 60-second fallback without changing the shared BLE service default.

**Tech Stack:** React Native, TypeScript, Jest, React Native Testing Library

---

### Task 1: Extend reconnect discovery through firmware fallback

**Files:**
- Modify: `src/features/device/pairing/screens/PairSearchScreen.tsx`
- Test: `tests/features/device/pair-search-multi-device.test.tsx`

- [ ] **Step 1: Write the failing reconnect-window test**

Add a test that returns no candidate from the first reconnect scan and the owned robot from the second. Assert that both calls use `40000`, that the app routes to `PairWifiScreen`, and that it never routes to `PairFailedScreen`.

- [ ] **Step 2: Verify the test fails for the expected timeout mismatch**

Run:

```bash
npx jest --selectProjects unit tests/features/device/pair-search-multi-device.test.tsx --runInBand
```

Expected: the new assertion fails because `scanForTJBotDevices` is currently called without a reconnect-specific timeout.

- [ ] **Step 3: Implement reconnect-specific scan policy**

Define `RECONNECT_BLE_DISCOVERY_ATTEMPTS = 2` and `RECONNECT_BLE_SCAN_TIMEOUT_MS = 40000`. Select the attempt count from `reconnectMode` and call `scanForTJBotDevices(RECONNECT_BLE_SCAN_TIMEOUT_MS)` only in reconnect mode; retain `scanForTJBotDevices()` for normal pairing.

- [ ] **Step 4: Verify focused and full checks**

Run:

```bash
npx jest --selectProjects unit tests/features/device/pair-search-multi-device.test.tsx --runInBand
npm test -- --runInBand
npm run typecheck
npx eslint src/features/device/pairing/screens/PairSearchScreen.tsx tests/features/device/pair-search-multi-device.test.tsx --max-warnings=0
git diff --check
```

Expected: all commands exit successfully with no failed tests, type errors, lint errors, or whitespace errors.
