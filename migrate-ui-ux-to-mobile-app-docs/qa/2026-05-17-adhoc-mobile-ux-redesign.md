# AD-HOC: Mobile UX Redesign Accessibility Pass

Date: 2026-05-17
Repo: tbot-mobile
System: sys-16

## Scope

- Strengthened shared CTA, row, card, shell-back, and error-boundary controls for mobile touch target and screen-reader basics.
- Patched high-risk parent privacy, child recovery, fallback, and device-pairing actions.
- Did not change API, BLE, auth, COPPA legal text, route constants, or state-machine contracts.

## Acceptance Criteria

1. Shared and intermediate mobile CTAs expose role, label/state where interactive, and maintain >=44pt visible targets.
2. Parent/child recovery and pairing flows keep clear primary path and accessible secondary actions.
3. Typecheck, lint, and accessibility-focused tests pass.

## Evidence

| Gate | Command | Result | Key output |
|---|---|---|---|
| G1 TypeScript | `npx tsc --noEmit` | PASS | Exit 0, no output |
| G2 ESLint | `npm run lint` | PASS | Exit 0, no error output |
| G3 Unit tests | `npm test` | PASS | `Test Suites: 1 skipped, 90 passed, 90 of 91 total`; `Tests: 19 skipped, 750 passed, 769 total` |
| Focused UX tests | `npx jest --selectProjects unit --runTestsByPath tests/ui-validation/accessibility-primitives.test.tsx tests/e2e/ux-redesign-accessibility.test.tsx tests/e2e/parent-settings.test.tsx --runInBand` | PASS | `Test Suites: 3 passed, 3 total`; `Tests: 44 passed, 44 total` |
| Whitespace | `git diff --check -- <touched paths>` | PASS | Exit 0, no output |
| Forbidden patterns | `rg -n "@ts-ignore|@ts-expect-error|\bas any\b|unknown as|TODO|FIXME|HACK" <touched paths>` | PASS | Exit 1, no matches |

## Residual Risk

- No simulator/device screenshot pass was run, so Dynamic Type 200% and visual overlap remain partially unverified.
- Full visual redesign for every low-risk marketing/purchase screen remains out of this implementation pass; shared primitive fixes improve broad coverage.
