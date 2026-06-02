# Mobile UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign TJBot mobile UX foundations and high-risk flows so parent, child, purchase, setup, and recovery screens meet core mobile UX and accessibility gates.

**Architecture:** Start with shared UI primitives, then patch screens whose UX risk is not solved by primitive changes. Keep API/navigation behavior unchanged. Tests protect contrast, touch target, accessible labels/states, and representative screen behavior.

**Tech Stack:** React Native, TypeScript strict, Jest, react-test-renderer, @testing-library/react-native.

---

## File Structure

- Modify `src/design-system/components/PrimaryCTA/index.tsx`: accessible defaults, AA text color, min target, optional disabled state.
- Modify `src/components/DeviceBigBtn/index.tsx`: role/label/state defaults, min target, disabled handling.
- Modify `src/components/OnbBigBtn/index.tsx`: role/label/state defaults, min target.
- Modify `src/design-system/components/CircleBtn/index.tsx`: enforce minimum visual 44pt, role/label.
- Modify `src/components/DeviceShell/index.tsx`: 44pt back button.
- Modify `src/features/parent/components/ParentScroll.tsx`: 44pt back button with role/label.
- Modify `src/features/parent/screens/ParentAccountPrivacyScreen.tsx`: replace `Text onPress` action controls with accessible button-like `TouchableOpacity`, clarify destructive copy.
- Modify `src/features/purchase/screens/SubscriptionsScreen.tsx`: reduce competing CTAs by grouping subscription management and continue action.
- Modify `src/features/lesson-session/screens/AudioErrorScreen.tsx`, `SafetyScreen.tsx`, `ExitConfirmScreen.tsx`: role/label for secondary actions and calmer copy where not legal.
- Modify `src/features/device/pairing/screens/PairAddScreen.tsx`, `PairWifiPasswordScreen.tsx`, `PairFailedScreen.tsx`: labels, touch targets, real show-password control.
- Test `tests/ui-validation/accessibility-primitives.test.tsx`: shared primitive requirements.
- Test `tests/e2e/parent-settings.test.tsx`: account privacy action states.
- Test `tests/e2e/course-progress-stability.test.tsx`: purchase/course representative labels.
- Test `tests/e2e/onboarding.test.tsx` or new focused e2e test: pairing password show/hide and failure rows.

## Task 1: Foundation Tests

**Files:**
- Modify: `tests/ui-validation/accessibility-primitives.test.tsx`

- [ ] **Step 1: Add failing tests for contrast and touch target**

Add tests that render `PrimaryCTA`, `DeviceBigBtn`, `OnbBigBtn`, `CircleBtn`, `DeviceShell`, and `ParentScroll`. Assert default roles, labels, and minimum 44pt visual sizes. Add a pure contrast helper in the test file for `PrimaryCTA` foreground/background pairs.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui-validation/accessibility-primitives.test.tsx --runInBand`

Expected: FAIL on missing role/label/min-size or contrast assertions.

- [ ] **Step 3: Implement shared primitive fixes**

Update primitives and shell controls only. Do not touch feature screens in this task.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui-validation/accessibility-primitives.test.tsx --runInBand`

Expected: PASS.

## Task 2: Parent Privacy Actions

**Files:**
- Modify: `src/features/parent/screens/ParentAccountPrivacyScreen.tsx`
- Modify: `tests/e2e/parent-settings.test.tsx`

- [ ] **Step 1: Add failing tests for privacy actions**

Assert `Request export`, `Refresh export status`, `Request deletion`, `Refresh deletion status`, `Cancel deletion`, and `Download export` are accessible buttons with disabled state where applicable.

- [ ] **Step 2: Run targeted parent test**

Run: `npm test -- tests/e2e/parent-settings.test.tsx --runInBand`

Expected: FAIL on current `Text onPress` buttons lacking complete a11y/touch behavior.

- [ ] **Step 3: Replace action text with accessible touch controls**

Use local helper `PrivacyActionButton` inside `ParentAccountPrivacyScreen.tsx`. Preserve API calls and existing messages.

- [ ] **Step 4: Run targeted parent test**

Run: `npm test -- tests/e2e/parent-settings.test.tsx --runInBand`

Expected: PASS.

## Task 3: Purchase CTA Reduction

**Files:**
- Modify: `src/features/purchase/screens/SubscriptionsScreen.tsx`
- Modify: `tests/e2e/course-progress-stability.test.tsx`

- [ ] **Step 1: Add failing tests for one primary continuation action**

Assert the screen exposes one clear continue action and subscription management actions are labeled secondary management controls.

- [ ] **Step 2: Run targeted course/purchase test**

Run: `npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand`

Expected: FAIL on missing labels/grouping.

- [ ] **Step 3: Patch subscription screen labels/grouping**

Keep backend calls. Add labels to management actions and avoid visually competing primary CTAs where possible.

- [ ] **Step 4: Run targeted course/purchase test**

Run: `npm test -- tests/e2e/course-progress-stability.test.tsx --runInBand`

Expected: PASS.

## Task 4: Child Recovery Actions

**Files:**
- Modify: `src/features/lesson-session/screens/AudioErrorScreen.tsx`
- Modify: `src/features/lesson-session/screens/SafetyScreen.tsx`
- Modify: `src/features/lesson-session/screens/ExitConfirmScreen.tsx`
- Test: existing lesson/session or onboarding e2e tests as locally appropriate.

- [ ] **Step 1: Add failing tests for secondary actions**

Assert secondary actions have role/label and copy remains short.

- [ ] **Step 2: Run targeted test**

Run targeted Jest file for lesson screens.

- [ ] **Step 3: Patch secondary controls**

Add `accessibilityRole`, `accessibilityLabel`, and min-height styles to secondary actions. Keep navigation targets.

- [ ] **Step 4: Run targeted test**

Expected: PASS.

## Task 5: Device Pairing Accessibility

**Files:**
- Modify: `src/features/device/pairing/screens/PairAddScreen.tsx`
- Modify: `src/features/device/pairing/screens/PairWifiPasswordScreen.tsx`
- Modify: `src/features/device/pairing/screens/PairFailedScreen.tsx`
- Test: pairing-focused e2e/unit test.

- [ ] **Step 1: Add failing pairing tests**

Assert option cards and failure reason rows have labels, and `Show password` toggles secure entry.

- [ ] **Step 2: Run targeted pairing test**

Expected: FAIL on missing labels and nonfunctional show-password row.

- [ ] **Step 3: Patch pairing screens**

Add labels/roles/states and implement local `showPassword` state for Wi-Fi password.

- [ ] **Step 4: Run targeted pairing test**

Expected: PASS.

## Task 6: Full Verification

**Files:**
- No additional code files unless verification reveals a regression.

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 3: Run targeted tests**

Run all targeted test files changed in this plan.

Expected: PASS with non-zero test count.

- [ ] **Step 4: Record residual risks**

If full app runtime screenshots were not captured, report dynamic type and visual screenshot gaps explicitly.

## Self-Review

- Spec coverage: tasks map to foundation, parent/privacy, purchase, child recovery, device pairing, and verification.
- Placeholder scan: no TBD/TODO/fill-in placeholders.
- Type consistency: uses existing component and test paths from repo.
- Scope: broad but phased; foundation changes intentionally cover home, course, progress, robot management indirectly.
