# T5.4 Parent Session Assignment Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a test-only Android instrumentation APK that uses the installed Parent app's existing SecureStore session to create one exact T5.4 assignment without navigating away from Parent Today or exposing tokens.

**Architecture:** Add isolated `androidTest` Java components only. Pure validators are host-tested; the instrumentation runner performs live route gating, target-UID SecureStore decryption, one normal Parent POST, strict response validation, and secret-free result persistence.

**Tech Stack:** AndroidX Test/JUnit4, Java, Android Keystore AES-GCM, `HttpURLConnection`, Gradle Android test APK, Jest source-contract tests.

---

### Task 1: Freeze the Test-Only Contract

**Files:**
- Create: `tests/android/t54-parent-session-bridge-contract.test.ts`
- Test: `tests/android/t54-parent-session-bridge-contract.test.ts`

- [ ] **Step 1: Write the failing source-contract test**

The test reads the future Java sources and requires fixed production identities, `PASS42` arming,
live `UiAutomation`, `SecureStore`, `AndroidKeyStore`, exactly one `.setRequestMethod("POST")`, an
external result file, and no logging calls containing token variables.

- [ ] **Step 2: Run RED**

Run:

```bash
npx jest --selectProjects unit --runInBand tests/android/t54-parent-session-bridge-contract.test.ts
```

Expected: FAIL because the bridge sources do not exist.

### Task 2: Implement SecureStore Decryption and Pure Validation

**Files:**
- Create: `android/app/src/androidTest/java/com/TJBotmobile/t54/T54SecureStoreReader.java`
- Create: `android/app/src/androidTest/java/com/TJBotmobile/t54/T54AssignmentContract.java`
- Create: `android/app/src/androidTest/java/com/TJBotmobile/t54/T54AssignmentContractTest.java`

- [ ] **Step 1: Add pure validation tests**

Cover fixed request identities, accepted `201/ASSIGNED` response, and rejection of wrong device,
child, lesson, version, state, malformed UUID, or missing assignment version.

- [ ] **Step 2: Implement minimal validators**

Use constants:

```java
static final String DEVICE_ID = "91deb5af-c1c0-416b-956d-266d510eac5e";
static final String CHILD_ID = "2bbcd940-f9da-47cf-8a99-f1eaf2380e8c";
static final String LESSON_ID = "w02-feelings";
static final int LESSON_VERSION = 7;
static final String PROFILE = "espTft";
```

`T54SecureStoreReader` reads preference `key_v1-TJBot_access_token`, requires scheme `aes`, loads
the Expo alias from `AndroidKeyStore`, and decrypts AES-GCM without logging or writing plaintext.

- [ ] **Step 3: Compile GREEN**

Run:

```bash
cd android
./gradlew :app:compileReleaseAndroidTestJavaWithJavac
```

Expected: BUILD SUCCESSFUL.

### Task 3: Implement Live Route and Read-Only Session Probe

**Files:**
- Create: `android/app/src/androidTest/java/com/TJBotmobile/t54/ParentSessionAssignmentBridgeTest.java`

- [ ] **Step 1: Add the probe test entry point**

Use `InstrumentationRegistry.getInstrumentation().getUiAutomation()` and traverse the active root.
Require package `com.TJBotmobile` and all markers:

```text
Hôm nay
Trạng thái bài học trực tiếp
Hiện không có bài học nào đang diễn ra
```

- [ ] **Step 2: Add read-only SecureStore probe**

Decrypt the access token, require a JWT-shaped three-segment value, record only
`SESSION_PROBE_OK route=READY tokenPresent=true`, then zero the local reference. Do not make HTTP
requests or write token material.

- [ ] **Step 3: Build and run the read-only probe**

Run:

```bash
cd android
./gradlew :app:assembleRelease :app:assembleReleaseAndroidTest
adb install -r app/build/outputs/apk/androidTest/release/app-release-androidTest.apk
adb shell am instrument -w -r \
  -e class com.TJBotmobile.t54.ParentSessionAssignmentBridgeTest#probeExistingSession \
  com.TJBotmobile.test/androidx.test.runner.AndroidJUnitRunner
```

Expected: `OK (1 test)` and `SESSION_PROBE_OK`; no assignment request.

### Task 4: Implement Exactly-One Assignment POST

**Files:**
- Modify: `android/app/src/androidTest/java/com/TJBotmobile/t54/ParentSessionAssignmentBridgeTest.java`

- [ ] **Step 1: Add the armed assignment test**

Require instrumentation argument `confirmAssignmentId=PASS42` and exact external result path.
Delete only that exact prior result, re-run the live route gate, decrypt the access token, then
perform exactly one POST to:

```text
https://tbot-backend-8wmh.onrender.com/v1/devices/91deb5af-c1c0-416b-956d-266d510eac5e/assignments
```

Use the fixed request JSON and 30-second connect/read timeouts. Never retry.

- [ ] **Step 2: Validate and persist only safe fields**

Require HTTP 201 and exact response identity/state. Write only the normalized assignment object to
`getExternalFilesDir(null)/t54-pass42-assignment.json`. On failure, delete the result and throw a
stable error without including headers, token, or raw response body.

- [ ] **Step 3: Run the contract and compile gates**

Run:

```bash
npx jest --selectProjects unit --runInBand tests/android/t54-parent-session-bridge-contract.test.ts
cd android
./gradlew :app:compileReleaseAndroidTestJavaWithJavac :app:assembleReleaseAndroidTest
```

Expected: all tests PASS and BUILD SUCCESSFUL.

### Task 5: Verify Signing and H1 Fail-Closed Commands

**Files:**
- Create: `docs/qa/ad-hoc/2026-08-20-t54-parent-session-assignment-bridge.md`

- [ ] **Step 1: Verify certificate identity**

Use `apksigner verify --print-certs` on installed `base.apk`, release APK, and androidTest APK.
Require the same SHA-256 signer for target/release and a test APK accepted by `adb install` and
`am instrument` against the non-debuggable target.

- [ ] **Step 2: Record the read-only physical probe**

Preserve runner output proving route READY and SecureStore availability with no HTTP assignment.

- [ ] **Step 3: Prepare Pass 42 assignment invocation**

The POST test may run only after H1 starts capture before reset, observes Wi-Fi/WebSocket/cache
27/27, starts the four-worker collector, and its READY gate passes. Host shell must use
`set -euo pipefail`, require `OK (1 test)`, pull one fresh result, validate exact fields with `jq`,
and then arm the answer helper with the returned assignment ID. Any failure freezes Pass 42 and
forbids a second invocation.

- [ ] **Step 4: Commit the harness**

```bash
git add android/app/src/androidTest tests/android docs/qa/ad-hoc
git commit -m "test(android): bridge existing Parent session for T5.4"
```
