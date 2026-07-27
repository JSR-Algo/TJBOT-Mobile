# Simple Wi-Fi Provisioning Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move initial BLE pairing forward immediately after Wi-Fi credential delivery while preserving backend-authoritative, retryable finalization.

**Architecture:** For code-based pairing, `PairConnectingScreen` owns only the local BLE handoff and persists context before navigating to rename; zero-code physical confirmation and credential-only reconnect retain their existing waits. `finalizeDevicePairing` absorbs the expected authentication race by retrying only backend not-ready responses with a fixed bound; `PairRenameScreen` keeps a timed-out parent on the editable screen for an explicit retry.

**Tech Stack:** React Native, TypeScript, React Navigation, Jest, React Native Testing Library

---

### Task 1: Lock the post-handoff navigation contract

**Files:**
- Modify: `tests/features/device/pair-connecting-flow.test.tsx`
- Modify: `src/features/device/pairing/screens/PairConnectingScreen.tsx`

- [x] **Step 1: Replace the old handoff-waits test with a failing regression test**

Assert that `wifi_credentials_sent` persists `{ deviceId, serialNumber, provisioningAttemptId }`, navigates to `PairRenameScreen`, and does not call `getProvisioningAttemptStatus` even when its mock never resolves.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --runInBand tests/features/device/pair-connecting-flow.test.tsx`

Expected: FAIL because the current screen polls backend authentication before navigation.

- [x] **Step 3: Implement immediate handoff navigation**

In the resolved BLE run, keep `device_online` unchanged. For `device_authenticated` and `claim_confirmed` completion modes, save pending context from the run result, clear the bootstrap token, and navigate to `PairRenameScreen` without a backend poll. Preserve the existing catch-path reconciliation for delivery-unknown errors.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --runInBand tests/features/device/pair-connecting-flow.test.tsx`

Expected: PASS.

### Task 2: Make strict backend completion tolerate robot initialization

**Files:**
- Modify: `tests/features/device/finalizeDevicePairing.test.ts`
- Modify: `src/features/device/pairing/finalizeDevicePairing.ts`

- [x] **Step 1: Add failing retry and timeout tests**

Add fake-timer tests proving `DEVICE_AUTH_NOT_VERIFIED` and `PROVISIONING_ATTEMPT_NOT_READY` are retried, later success completes normally, non-ready attempts are bounded, and unrelated errors are not retried.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --runInBand tests/features/device/finalizeDevicePairing.test.ts`

Expected: FAIL because completion currently makes one request.

- [x] **Step 3: Add bounded completion retry**

Wrap `completeDeviceProvisioning` in a maximum-attempt loop with a fixed polling interval. Retry only the two not-ready codes. On exhaustion throw an error with code `DEVICE_AUTH_TIMEOUT`; keep existing idempotent-success handling unchanged.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --runInBand tests/features/device/finalizeDevicePairing.test.ts`

Expected: PASS.

### Task 3: Keep timeout recovery on the rename screen

**Files:**
- Modify: `tests/e2e/ux-redesign-accessibility.test.tsx`
- Modify: `src/features/device/pairing/screens/PairRenameScreen.tsx`

- [x] **Step 1: Add a failing UI recovery test**

Mock `finalizeDevicePairing` or backend completion to reject with `DEVICE_AUTH_TIMEOUT`; assert the screen stops saving, displays a concise robot-initializing message, and does not navigate to `PairFailedScreen`.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --runInBand tests/e2e/ux-redesign-accessibility.test.tsx`

Expected: FAIL because timeout currently navigates to the generic failure screen.

- [x] **Step 3: Implement retryable rename feedback**

Store a local save error, clear it on the next save, and special-case `DEVICE_AUTH_TIMEOUT` so the parent remains on `PairRenameScreen` with the save button enabled for another attempt.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --runInBand tests/e2e/ux-redesign-accessibility.test.tsx`

Expected: PASS.

### Task 4: Regression verification

**Files:**
- Verify: `tests/features/device/pair-connecting-flow.test.tsx`
- Verify: `tests/features/device/finalizeDevicePairing.test.ts`
- Verify: `tests/features/device/pair-failed-recovery.test.tsx`
- Verify: `tests/e2e/ux-redesign-accessibility.test.tsx`

- [x] **Step 1: Run the pairing regression set**

Run: `npm test -- --runInBand tests/features/device/pair-connecting-flow.test.tsx tests/features/device/finalizeDevicePairing.test.ts tests/features/device/pair-failed-recovery.test.tsx tests/e2e/ux-redesign-accessibility.test.tsx`

Expected: PASS.

- [x] **Step 2: Run TypeScript validation**

Run: `npm run typecheck`

Expected: PASS.

- [x] **Step 3: Review the diff for scope and secret safety**

Run: `git diff --check && git diff -- src/features/device/pairing tests/features/device tests/e2e/ux-redesign-accessibility.test.tsx`

Expected: no whitespace errors; no password or bootstrap token added to navigation params, logs, or persistent storage.
