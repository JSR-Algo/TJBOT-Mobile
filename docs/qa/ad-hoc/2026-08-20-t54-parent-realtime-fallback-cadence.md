# T5.4 Parent Today short-step fallback cadence

- Date: 2026-08-20
- Branch: `lesson-prod/t54-parent-realtime-physical-repro`
- Base: `03570f60cbdf9b79e0e205d65f8bf90707c848f8`
- Status: `IN_PROGRESS`; no physical verification, merge, install, deploy, or production mutation was performed

## Saved Pass 28 evidence

The frozen evidence under
`robot/docs/evidence/t54-live-20260820-final-closeout/final-parent-sla-pass-28`
shows a healthy collector observing Parent Today throughout the lesson:

- 362 route observations, 334 `READY`, 28 step observations, and zero route violations;
- s1, s8, and s9 never appeared in the accessibility hierarchy;
- retained first observations for s2-s7 were separated by
  `10024, 9980, 10098, 10010, 10049` milliseconds;
- canonical runtime step windows were only 3180-8226 milliseconds.

Pass 21 installed branch commit `03570f60` with APK SHA-256
`8c0dd52c8fc77774748514da5598cf446eb601d3258cfd93add5c95952e21a19`.
No later mobile installation is recorded in the preserved Pass 22-28 closeouts.

## Root cause and prior test gap

The installed branch intentionally reconciled a focused Parent Today screen every ten seconds
when the WebSocket was healthy but silent. That interval aliases short-lived projections: a REST
refresh can observe s2 after s1 has already ended, then advance one projection per ten-second
tick and miss terminal s8/s9 before the next tick.

The previous M1 regressions injected every WebSocket update directly, so they proved frame
parsing and cache merging but not production delivery. The later healthy-silent regression only
asserted one REST refetch after ten seconds. It therefore locked in eventual recovery while never
testing whether nine physical transitions lasting three to eight seconds could each become
observable.

The saved artifacts do not prove why the production WebSocket delivered no observable step
frames. That remains an upstream mobile-subscription/backend-projection boundary finding. This
mobile correction does not change the WebSocket protocol or claim to repair that unproven cause.

## Behavioral RED to GREEN

The maintained hook regression starts from the active `READY` state observed during canonical s1,
keeps the socket open and silent, then exposes authoritative REST projections s1-s9 one second
apart. It records the actual TanStack Query result after every tick and requires the observable
sequence `[1,2,3,4,5,6,7,8,9]`.

RED at `03570f60` behavior:

```text
Expected currentStep.stepNumber: 1
Received: undefined
Test Suites: 1 failed, 1 total
Tests: 1 failed, 21 skipped, 22 total
```

GREEN after the mobile change:

```text
PASS reconciles every short step transition while Parent Today is focused and realtime is silent
Test Suites: 1 passed, 1 total
Tests: 1 passed, 21 skipped, 22 total
```

## Fix

- Focused Parent Today reconciliation polls every 1000 milliseconds while an assignment is
  active, so short authoritative projections are not deterministically skipped by a ten-second
  sampling interval.
- Inactive assignment discovery and reconnect-exhaustion fallback remain 10000 milliseconds,
  avoiding one request per second during the required pre-assignment foreground dwell.
- Existing foreground, focus, terminal-state, socket-recovery, and unmount cleanup gates remain
  unchanged.

## Verification

```text
Focused parent/realtime: 5 suites passed; 65 tests passed; 0 failed
TypeScript: PASS (`tsc --noEmit`, exit 0)
ESLint: PASS (`eslint src/ tests/ --max-warnings=0`, exit 0)
git diff --check: PASS
Forbidden suppression/placeholder scan across changed `src` and `tests`: PASS
```

Physical validation remains exclusively H1-owned.
