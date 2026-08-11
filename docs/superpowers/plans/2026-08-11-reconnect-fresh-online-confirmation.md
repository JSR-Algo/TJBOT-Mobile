# Reconnect Fresh-Online Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the owned-robot Update Wi-Fi flow from reporting a false timeout when credentials were delivered and a fresh backend heartbeat proves the robot came online.

**Architecture:** Leave the BluFi service fail-closed and recover only in `PairConnectingScreen`, which owns the known backend device identity. Timestamp the reconnect attempt, catch only `WIFI_CONNECT_TIMEOUT`, then require `online=true` plus a valid `lastSeenAt` at or after that timestamp before navigating home.

**Tech Stack:** React Native, TypeScript strict mode, Jest, Testing Library, Android/ADB, BluFi.

---

### Task 1: Lock The False-Timeout Behavior With Tests

**Files:**
- Modify: `tests/features/device/pair-connecting-flow.test.tsx`

- [ ] **Step 1: Add the fresh-heartbeat regression**

Mock `provisionWifiViaLocalBle` to reject with `WIFI_CONNECT_TIMEOUT`, mock `Date.now()` to define the handoff boundary, and return `online: true` with `lastSeenAt` newer than that boundary. Assert the screen resets to `DeviceHomeScreen`.

- [ ] **Step 2: Add fail-closed timestamp cases**

Add cases where the backend returns `online: true` with a stale timestamp and with no timestamp. Assert neither case advances to Device Home and the bounded poll ends with the original `WIFI_CONNECT_TIMEOUT`.

- [ ] **Step 3: Verify RED**

Run:

```bash
node node_modules/jest/bin/jest.js --selectProjects unit --runInBand \
  tests/features/device/pair-connecting-flow.test.tsx
```

Expected: the fresh-heartbeat recovery test fails because the current catch path navigates directly to `PairFailedScreen`.

### Task 2: Implement Fresh-Online Recovery

**Files:**
- Modify: `src/features/device/pairing/screens/PairConnectingScreen.tsx`

- [ ] **Step 1: Record the reconnect attempt boundary**

Capture `Date.now()` immediately before starting credential-only BluFi provisioning and pass it through the credential-only orchestration.

- [ ] **Step 2: Recover only the ambiguous report timeout**

Catch only errors whose code is `WIFI_CONNECT_TIMEOUT`. Poll the known device with a freshness predicate requiring `online === true`, a parseable `lastSeenAt`, and `Date.parse(lastSeenAt) >= attemptStartedAtMs`. Re-throw the original timeout when the bounded poll cannot produce fresh proof.

- [ ] **Step 3: Preserve all other failures**

Do not recover `WIFI_CONNECT_FAILED`, GATT errors, invalid credential errors, or non-reconnect transports.

- [ ] **Step 4: Verify GREEN**

Run the focused pairing test and expect all tests to pass.

### Task 3: Synchronize Pairing Documentation And Evidence

**Files:**
- Modify: `migrate-ui-ux-to-mobile-app-docs/state-machines/device-pairing.state.mmd`
- Create: `migrate-ui-ux-to-mobile-app-docs/qa/2026-08-11-adhoc-reconnect-false-timeout.md`

- [ ] **Step 1: Update the state machine**

Document that a credential-only BluFi report timeout may enter backend confirmation only through a fresh post-handoff heartbeat; stale or missing timestamps remain failure paths.

- [ ] **Step 2: Record repro and verification evidence**

Include the Android false-timeout screen, GATT close time, robot `Network connected` and WebSocket markers, code diff, automated gates, and physical rerun verdict without credentials.

### Task 4: Validate And Run The Physical Android Flow

**Files:**
- No additional source files expected.

- [ ] **Step 1: Run required gates**

Run typecheck, lint, unit tests, integration tests, flow/sequences/ERD/use-case validators, token parity, route coverage, and screen-prop checks. Each validator must report a non-zero checked count.

- [ ] **Step 2: Build and install Android**

Build the existing Android debug/release variant used by the connected phone, install it with the absolute ADB binary, and preserve app data when possible.

- [ ] **Step 3: Repeat Update Wi-Fi**

Use the existing network through the app, capture Android and serial logs, and require both an app success transition and robot `Application: Network connected` plus `passive_lesson_websocket_opened`.

- [ ] **Step 4: Commit**

Commit with:

```text
fix(pairing): accept fresh online proof after BluFi timeout

Refs: adhoc-2026-08-11-reconnect-false-timeout
```
