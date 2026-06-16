# AD-HOC: Export HTML 7 TJBOT-Mobile Redesign Adaptation

Date: 2026-06-16
Repo: TJBOT-Mobile
System: sys-16

## Scope

- Adapted the provided Export HTML 7 visual direction to the existing TJBOT-Mobile structures.
- Changed the Home tab, Devices tab, Course Library tab, and bottom tab shell styling.
- Preserved route names, screen ownership, Home state logic, Course Library API behavior, error/empty/loading copy, auth boundaries, BLE/device routes, and navigation contracts.
- Did not edit backend APIs, onboarding/auth contracts, provisioning, BLE pairing, payments, or route constants.

## Files Changed

- `src/features/home/screens/HomeHubScreen.tsx`
- `src/features/device/screens/DeviceHomeScreen.tsx`
- `src/features/course-library/screens/CourseLibraryScreen.tsx`
- `src/navigation/MainTabNavigator.tsx`
- `src/assets/export-html-7/*`
- `design-qa.md`
- `migrate-ui-ux-to-mobile-app-docs/qa/2026-06-16-adhoc-export-html-7-tjbot-mobile-redesign.md`

## Acceptance Criteria

1. The supplied Home Hub, Device Overview, and Course Library visual language is adapted to the corresponding existing TJBOT-Mobile surfaces.
2. Existing route names, tested copy, API calls, and navigation behavior remain intact.
3. Verification passes for TypeScript, lint, focused tests, full unit tests, and security scanning.

## Evidence

| Gate | Command | Result | Key output |
|---|---|---|---|
| TypeScript | `npm run typecheck` | PASS | Exit 0 |
| ESLint | `npm run lint -- src/features/home/screens/HomeHubScreen.tsx src/features/device/screens/DeviceHomeScreen.tsx src/features/course-library/screens/CourseLibraryScreen.tsx src/navigation/MainTabNavigator.tsx` | PASS | Exit 0, 0 errors, existing warnings only |
| Focused tests | `npm test -- --runInBand tests/e2e/course-progress-stability.test.tsx tests/navigation/main-tab-active-state.test.tsx` | PASS | 2 suites passed, 14 tests passed |
| Full unit tests | `npm test -- --runInBand --forceExit` | PASS | 134 suites passed, 1 skipped; 1039 tests passed, 19 skipped |
| Semgrep | `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off src/features/course-library/screens/CourseLibraryScreen.tsx src/features/home/screens/HomeHubScreen.tsx src/features/device/screens/DeviceHomeScreen.tsx src/navigation/MainTabNavigator.tsx` | PASS | 0 findings |
| Screenshot | Native simulator/app screenshot | BLOCKED | No web/storybook/view-shot runtime; simulator did not have TJBot installed; target tabs are behind real onboarding/auth |

## Residual Risk

- Visual screenshot verification is blocked until a native debug build is installed and signed into a state that can reach the Home, Devices, and Course Library tabs.
- The earlier wrong-target Child Companion edits remain in the root dirty worktree and were not reverted in this pass.
