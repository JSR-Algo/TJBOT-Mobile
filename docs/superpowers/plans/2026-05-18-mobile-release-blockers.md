# Mobile Release Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix mobile-owned release blockers blocking TJBot mobile production readiness.

**Architecture:** Keep fixes in sys-16 UI/tests. Use stable selectors and smaller vertical layouts instead of coordinate taps. Keep backend contract failures as explicit external blockers.

**Tech Stack:** React Native 0.83, Jest, React Native Testing Library, Detox.

---

### Task 1: Purchase CTA Native Hittability

**Files:**
- Modify: `tests/e2e/purchase-intro-cta.test.tsx`
- Modify: `src/features/purchase/screens/PurchaseIntroScreen.tsx`
- Modify: `e2e/module-matrix.test.ts`

- [ ] Write a failing test asserting `purchaseIntroHowItWorksCta` exists and the hero content stays compact enough for native flow.
- [ ] Run `npm test -- --runInBand tests/e2e/purchase-intro-cta.test.tsx` and confirm the new expectation fails before production code changes.
- [ ] Reduce purchase intro vertical pressure and keep the CTA in the normal scroll/hit path.
- [ ] Replace Detox coordinate tap with `tapId('purchaseIntroHowItWorksCta')`.
- [ ] Rerun the purchase test.

### Task 2: Recovery UX Regression Coverage

**Files:**
- Modify: `tests/ui-validation/fallback-offline.test.tsx`
- Modify: targeted fallback/device/course/parent screens only if tests fail.

- [ ] Add assertions for support/back/data-safe copy on fallback screens named in QA verdict.
- [ ] Run `npm test -- --runInBand tests/ui-validation/fallback-offline.test.tsx` and confirm any missing behavior fails.
- [ ] Update only failing screens with concise user-safe copy/actions.
- [ ] Rerun fallback tests.

### Task 3: Verification

**Files:**
- No intended production changes beyond Tasks 1-2.

- [ ] Run targeted tests:

```sh
npm test -- --runInBand tests/e2e/purchase-intro-cta.test.tsx tests/ui-validation/fallback-offline.test.tsx tests/components/robot-body.test.tsx tests/e2e/parent-settings.test.tsx
```

- [ ] Run typecheck:

```sh
npx tsc --noEmit --pretty false
```

- [ ] Run lint:

```sh
npm run lint
```

- [ ] Record remaining backend-owned blockers separately.
