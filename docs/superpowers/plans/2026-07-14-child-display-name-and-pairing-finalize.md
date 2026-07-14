# Child Display Name and Pairing Finalize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional editable child display name with a buddy-based fallback, preserve idempotent pairing finalization, and verify the complete flow on the attached Android phone and robot.

**Architecture:** Put display-name normalization in a small pure helper and keep UI state in `ChildProfileScreen`. The existing `createdChildRef` remains the boundary that prevents duplicate child creation when finalization retries. Physical verification treats Android API/navigation failures and robot SRAM/heartbeat failures as separate evidence streams.

**Tech Stack:** React Native, TypeScript, Jest, React Native Testing Library, Android ADB, ESP-IDF UART logs.

---

### Task 1: Display-name policy

**Files:**
- Create: `src/features/onboarding/childDisplayName.ts`
- Create: `tests/features/onboarding/child-display-name.test.ts`

- [ ] **Step 1: Write failing helper tests**

Test that `normalizeChildDisplayName` collapses whitespace, truncates to the backend limit of 64 characters, and falls back to the supplied suggestion for empty input.

```ts
expect(normalizeChildDisplayName('  Bé   Bông  ', 'Bạn Gấu trúc')).toBe('Bé Bông');
expect(normalizeChildDisplayName('   ', 'Bạn Gấu trúc')).toBe('Bạn Gấu trúc');
expect(normalizeChildDisplayName('a'.repeat(70), 'Bạn Gấu trúc')).toHaveLength(64);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --runInBand tests/features/onboarding/child-display-name.test.ts`

Expected: FAIL because `childDisplayName.ts` does not exist.

- [ ] **Step 3: Implement the pure helper**

Export `CHILD_DISPLAY_NAME_MAX_LENGTH = 64` and `normalizeChildDisplayName(value, fallback)` using `trim()`, whitespace collapse, and `slice(0, 64)`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --runInBand tests/features/onboarding/child-display-name.test.ts`

Expected: all helper tests pass.

### Task 2: Editable onboarding field

**Files:**
- Modify: `src/features/onboarding/screens/ChildProfileScreen.tsx`
- Modify: `src/services/i18n/locales/en.json`
- Modify: `src/services/i18n/locales/vi.json`
- Modify: `tests/features/onboarding/childProfile-pairing-finalize.test.tsx`

- [ ] **Step 1: Add failing screen tests**

Cover these observable behaviors:

```ts
expect(screen.getByTestId('childDisplayNameInput').props.value).toBe('Panda friend');
fireEvent.changeText(screen.getByTestId('childDisplayNameInput'), '  Bé   Bông  ');
pickAgeAndSave(screen);
expect(mockedSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bé Bông' }), expect.anything());
```

Add cases for whitespace-only fallback, untouched suggestion changing with the buddy, and a custom value surviving a buddy change.

- [ ] **Step 2: Run the screen test and verify RED**

Run: `npm test -- --runInBand tests/features/onboarding/childProfile-pairing-finalize.test.tsx`

Expected: FAIL because `childDisplayNameInput` is absent and the payload remains hard-coded.

- [ ] **Step 3: Implement the field and effective greeting**

Use the existing `Input` component with `maxLength={64}`, `autoCapitalize="words"`, and `testID="childDisplayNameInput"`. Track whether the parent edited the value; update the buddy suggestion only while untouched. Save `normalizeChildDisplayName(rawName, currentSuggestion)` and show that effective value in the Robot greeting preview.

Add translation keys for `Child's display name (optional)`, `Name Robot will use`, and `{{label}} friend`, with Vietnamese values `Tên gọi của bé (không bắt buộc)`, `Tên Robot sẽ gọi bé`, and `Bạn {{label}}`.

- [ ] **Step 4: Run screen and helper tests and verify GREEN**

Run: `npm test -- --runInBand tests/features/onboarding/child-display-name.test.ts tests/features/onboarding/childProfile-pairing-finalize.test.tsx`

Expected: all tests pass, including the existing no-duplicate retry test.

### Task 3: Diagnose and fix the physical save failure

**Files:**
- Modify only the file identified by fresh Android/UART evidence.
- Test the identified component with its focused existing suite or a new regression test.

- [ ] **Step 1: Capture a clean physical reproduction**

Clear Android logcat, select an age range, edit the child name, press `Save and meet Robot`, and concurrently capture the Android UI hierarchy and robot UART.

- [ ] **Step 2: Classify the failing boundary**

Determine whether failure is child creation, provisioning completion, navigation, or robot runtime. Do not modify another subsystem based only on timing correlation.

- [ ] **Step 3: Add a failing regression test for the identified cause**

The test must reproduce the concrete error code or allocation lifecycle observed in Step 1.

- [ ] **Step 4: Implement the smallest fix and verify GREEN**

Run the focused regression suite and the component's existing related tests.

### Task 4: Build and physical verification

**Files:**
- No source changes unless verification finds a new reproducible defect.

- [ ] **Step 1: Run mobile verification**

Run focused tests, `npm run typecheck`, and the Android release build.

- [ ] **Step 2: Install and launch on the attached Android device**

Install `android/app/build/outputs/apk/release/app-release.apk` with ADB and launch `com.TJBotmobile`.

- [ ] **Step 3: Verify the physical flow**

Confirm the editable child name appears, blank input uses the suggestion, save reaches pairing success, no duplicate child is created on retry, and the Robot continues accepted heartbeats without repeated task-allocation failure.

- [ ] **Step 4: Record exact evidence**

Report test counts, build exit status, Android destination screen, claim/finalize status, and masked UART heartbeat/memory observations.
