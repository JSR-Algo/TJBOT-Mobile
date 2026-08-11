# T5.4 Bound-child assignment evidence

## Repro

The selected mobile child could differ from `assignedChildProfileId` on the resolved robot.
`SendToRobotScreen` still submitted the selected child, so the backend correctly rejected the
cross-household/robot mismatch and the physical lesson could not be assigned from mobile.

RED command:

```bash
node node_modules/jest/bin/jest.js tests/api/device-api.test.ts \
  tests/e2e/course-library-flow.test.tsx --runInBand \
  -t 'robot-bound child|robot binding'
```

Result before the fix: 3 failed assertions. The API returned an empty device, the assignment used
`ch-1` instead of robot-bound `ch-2`, and an unresolved binding still sent a request.

## Fix

- Child-scoped primary-device resolution preserves exact-match and unbound precedence, then returns
  an explicitly bound household robot so the screen can honor that binding.
- The screen derives one effective child from the resolved device and uses it for lesson/course
  payloads, conflict matching, progress invalidation, and navigation context.
- The globally active child is not changed.
- A binding absent from the household child list fails closed with visible copy and no assignment.

## GREEN evidence

```text
Targeted Jest: 4 suites passed, 115 tests passed
TypeScript: tsc --noEmit exited 0
```

The full repository gates and Android physical run are recorded in the parent T5.4 evidence after
integration and installation from merged main.
