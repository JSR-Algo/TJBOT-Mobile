# Mobile Release Blockers Design

Date: 2026-05-18
Scope: TJBot-mobile sys-16 only

## Goal

Close mobile-owned release blockers from the QA coordinator verdict without editing backend, BLE protocol, legal COPPA copy, or root TJBot docs.

## Approach

Use a mobile-first fix set:

1. Make `PurchaseIntroScreen` primary CTA visible and hittable without Detox coordinate taps.
2. Strengthen recovery screens so fallback flows state data/progress safety, expose support/back paths, avoid technical implementation terms, and avoid non-danger red where practical.
3. Add tests first for the release blockers, then update only the narrow screens/helpers needed.

Backend runtime blockers remain external: factory auth header, device DTO validation, billing route composition, and backend worker/schema log errors.

## Components

- `src/features/purchase/screens/PurchaseIntroScreen.tsx`: reduce vertical pressure and make the primary CTA reachable by testID/text.
- `e2e/module-matrix.test.ts`: use stable CTA testID instead of coordinate tapping.
- `tests/e2e/purchase-intro-cta.test.tsx`: lock compact content and CTA testID.
- `tests/ui-validation/fallback-offline.test.tsx`: lock recovery copy/support/data-safe behavior.
- Recovery screens under `src/features/fallback`, `src/features/device`, `src/features/course-library`, and `src/features/parent`: narrow copy/style/action updates only where tests prove gaps.

## Error Handling

Do not hide backend contract gaps with synthetic success. UI copy may explain safe retry and support, but real service failures must remain visible to tests/gates.

## Testing

Targeted commands:

```sh
npm test -- --runInBand tests/e2e/purchase-intro-cta.test.tsx tests/ui-validation/fallback-offline.test.tsx tests/components/robot-body.test.tsx tests/e2e/parent-settings.test.tsx
npx tsc --noEmit --pretty false
npm run lint
```

Native gate after local services are healthy:

```sh
detox test --configuration ios.sim.debug e2e/module-matrix.test.ts --record-logs failing --take-screenshots failing
```
