# Mobile No-Fake Lesson Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make legacy lesson-session/static course prototype routes explicitly production-hidden and regression-guarded so they cannot imply a real child lesson session in production.

**Architecture:** Extend the local navigation metadata with an optional hidden-route reason. Keep all filtering behavior in the existing `featureRegistry` path; tests enforce that hidden routes stay absent from mounted stacks and deep links.

**Tech Stack:** React Native, TypeScript strict mode, Jest unit project, existing feature navigation registry.

---

### Task 1: RED Test For Explicit Hidden-Route Reasons

**Files:**
- Modify: `tests/navigation/production-hidden-routes.test.ts`

- [ ] **Step 1: Write the failing test**

Add an assertion that every screen in `FEATURE_NAVIGATION_REGISTRY` with `productionVisible:false` has a non-empty `productionHiddenReason`, and that every hidden lesson-session route uses `backend-contract-unavailable`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx jest --selectProjects unit --runTestsByPath tests/navigation/production-hidden-routes.test.ts --runInBand
```

Expected: fail because current hidden route entries do not define `productionHiddenReason`.

### Task 2: Minimal Metadata Implementation

**Files:**
- Modify: `src/navigation/types.ts`
- Modify: `src/features/lesson-session/navigation.ts`
- Modify: `src/features/course/navigation.ts`

- [ ] **Step 1: Add metadata type**

Add `readonly productionHiddenReason?: 'backend-contract-unavailable' | 'static-prototype-hidden';` to `FeatureStackScreen`.

- [ ] **Step 2: Add metadata to hidden lesson-session routes**

Set `const HIDDEN_LESSON_ROUTE = { productionVisible: false, productionHiddenReason: 'backend-contract-unavailable' } as const;`.

- [ ] **Step 3: Add metadata to hidden static course routes**

Set `const HIDDEN_COURSE_PROTOTYPE_ROUTE = { productionVisible: false, productionHiddenReason: 'static-prototype-hidden' } as const;`.

- [ ] **Step 4: Run focused test**

Run:

```bash
npx jest --selectProjects unit --runTestsByPath tests/navigation/production-hidden-routes.test.ts --runInBand
```

Expected: pass.

### Task 3: Source Guard And Evidence Updates

**Files:**
- Modify: `tests/navigation/production-hidden-routes.test.ts`
- Modify: `migrate-ui-ux-to-mobile-app-docs/qa/2026-06-30-adhoc-lesson-production-readiness.md`
- Modify: `../docs/qa/ad-hoc/2026-06-30-courses-production-readiness-goals.md`

- [ ] **Step 1: Add runtime source guard**

Add a test that scans `src/**/*.ts(x)` and asserts `createLessonSessionMachine(` appears only in `src/state/machines/lessonSession.machine.ts`.

- [ ] **Step 2: Run combined focused gate**

Run:

```bash
npx jest --selectProjects unit --runTestsByPath tests/navigation/production-hidden-routes.test.ts tests/api/learning-flow-coverage-gaps.test.ts tests/features/lesson-production-readiness.test.tsx --runInBand
```

Expected: pass with non-zero suite/test counts.

- [ ] **Step 3: Run validation commands**

Run:

```bash
npx tsc --noEmit
npm run lint
npm run navigation:route-map -- --check
npm run check:route-coverage
```

Expected: each exits 0 with non-empty output where applicable.

- [ ] **Step 4: Update evidence docs**

Record the focused test and validation outputs in the mobile QA artifact and root production-readiness goal doc.
