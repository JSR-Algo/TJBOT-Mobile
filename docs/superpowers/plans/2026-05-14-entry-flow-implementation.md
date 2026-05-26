# Entry Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the reviewed Entry Flow so new users move from public education to auth, post-auth setup, microphone priming, and the first lesson without protected-route leakage.

**Architecture:** Treat Splash, Welcome, intro, Trust, Login, and LoginError as the public entry branch. Treat ChildProfile, MicAsk, and FirstLessonEntry as post-auth setup. Keep protected routes behind the root auth + household + child + onboarding gate.

**Tech Stack:** React Native, React Navigation native stack, Jest, `@testing-library/react-native`, Zustand-free context state.

---

### Task 1: Public Entry Branch

**Files:**
- Modify: `src/features/auth/navigation.ts`
- Modify: `src/features/onboarding/navigation.ts`
- Test: `tests/navigation/state-machine-route-alignment.test.ts`

- [ ] **Step 1: Write failing route ownership test**
  - Auth/public route map includes Splash, Welcome, IntroListen, IntroSpeak, IntroRetry, IntroCelebrate, Trust, Login, LoginError.
  - Onboarding/post-auth route map includes ChildProfile, MicAsk, FirstLessonEntry.

- [ ] **Step 2: Run targeted test**
  - Run: `npm test -- tests/navigation/state-machine-route-alignment.test.ts --runInBand`
  - Expected before implementation: FAIL because public intro screens are still onboarding-owned.

- [ ] **Step 3: Move public screens into auth navigation config**
  - Import public entry screens into `src/features/auth/navigation.ts`.
  - Set auth initial route to Splash.
  - Keep Login/LoginError in same public branch.
  - Set onboarding initial route to ChildProfile and leave only ChildProfile, MicAsk, FirstLessonEntry there.

- [ ] **Step 4: Run targeted test again**
  - Run: `npm test -- tests/navigation/state-machine-route-alignment.test.ts --runInBand`
  - Expected: PASS for changed route ownership.

### Task 2: Linear Screen Actions

**Files:**
- Modify: `src/features/onboarding/screens/WelcomeScreen.tsx`
- Modify: `src/features/onboarding/components/IntroFrame.tsx`
- Modify: `src/features/onboarding/screens/TrustScreen.tsx`
- Modify: `src/features/onboarding/screens/ChildProfileScreen.tsx`
- Modify: `src/features/onboarding/screens/MicAskScreen.tsx`
- Modify: `src/features/onboarding/screens/FirstLessonEntryScreen.tsx`
- Test: `tests/e2e/onboarding.test.tsx`

- [ ] **Step 1: Write failing screen tests**
  - Welcome has no Skip intro and Get started goes to IntroListen.
  - Intro screens have no Skip.
  - Trust Continue goes to Login.
  - ChildProfile save goes to MicAsk.
  - MicAsk shows Enable microphone and no Not now.
  - FirstLessonEntry uses Start lesson.

- [ ] **Step 2: Run targeted onboarding tests**
  - Run: `npm test -- tests/e2e/onboarding.test.tsx --runInBand`
  - Expected before implementation: FAIL on old secondary CTAs and old route targets.

- [ ] **Step 3: Make minimal screen changes**
  - Delete first-run secondary CTAs.
  - Change Trust target to Login.
  - Change ChildProfile success target to MicAsk.
  - Change MicAsk primary label and remove Not now.
  - Change FirstLessonEntry CTA to Start lesson.

- [ ] **Step 4: Run targeted onboarding tests again**
  - Run: `npm test -- tests/e2e/onboarding.test.tsx --runInBand`
  - Expected: PASS.

### Task 3: Household + Child Readiness Gate

**Files:**
- Modify: `src/navigation/RootStackNavigator.tsx`
- Modify: `src/contexts/HouseholdContext.tsx`
- Modify: `src/features/onboarding/screens/ChildProfileScreen.tsx`
- Test: `tests/e2e/onboarding.test.tsx`
- Test: root navigation tests if present

- [ ] **Step 1: Write failing readiness tests**
  - ChildProfile creates a household before adding child when none exists.
  - Protected branch is unavailable until children length is non-zero.

- [ ] **Step 2: Run targeted tests**
  - Run: `npm test -- tests/e2e/onboarding.test.tsx --runInBand`
  - Expected before implementation: FAIL because missing household currently shows error and root gate only checks onboardingComplete.

- [ ] **Step 3: Implement readiness**
  - Expose children from `useHousehold`.
  - ChildProfile calls `createHousehold('My TJBot household')` when activeHousehold is missing.
  - RootStackNavigator requires `children.length > 0` before protected branch.

- [ ] **Step 4: Run targeted tests**
  - Run: `npm test -- tests/e2e/onboarding.test.tsx --runInBand`
  - Expected: PASS.

### Task 4: Final Verification

**Files:**
- All touched files.

- [ ] **Step 1: Run typecheck**
  - Run: `npx tsc --noEmit`
  - Expected: exit 0.

- [ ] **Step 2: Run lint**
  - Run: `npm run lint`
  - Expected: exit 0.

- [ ] **Step 3: Run unit tests**
  - Run: `npm test`
  - Expected: exit 0 with non-zero test count.

- [ ] **Step 4: Report gaps**
  - If repo-wide validation is blocked by pre-existing dirty worktree failures, record exact failing command and output.
