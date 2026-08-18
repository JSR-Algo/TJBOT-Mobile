# Remove Assignment PIN Design

## Goal

Remove the parent PIN prompt from every mobile flow that sends a lesson or
assigns a course to Robot. Parent-only settings and other parent security flows
remain unchanged.

## Current Behavior

Direct lesson assignment and the course mode in `SendToRobotScreen` already
submit without a PIN. The remaining PIN gate is `UnlockConfirmModal`, reached
when a parent adds a course from course detail, locked-course, or free-course
screens.

## Design

Keep `UnlockConfirmScreen` as a lightweight confirmation step so an accidental
tap does not immediately assign a course. Replace the lock icon, PIN keypad,
PIN state, and `authenticateParent` call with clear course-assignment copy and a
single accessible `Add to Robot` action.

The confirmation action continues to:

- require a route `courseId` and an active child;
- resolve the active child's Robot;
- call `enrollCourse` once;
- invalidate the same assignment, enrollment, and lesson-progress queries;
- navigate to `CourseAddedScreen` with the authoritative assignment metadata;
- preserve the existing Robot, network, and lesson-readiness error messages.

No route, backend endpoint, request payload, assignment identity, or Parent
Settings behavior changes.

## Testing

Use test-first coverage to prove that the confirmation screen contains no PIN
UI, does not call `authenticateParent`, and enrolls after one press of `Add to
Robot`. Preserve coverage for missing course, missing child, pending duplicate
presses, Robot lookup failures, enrollment failures, and successful navigation.

Run the focused course-library tests first, then the repository typecheck,
lint, unit suite, and required validators.

## Acceptance Criteria

1. Sending or assigning a lesson or course to Robot never prompts for or
   authenticates a parent PIN.
2. Course enrollment is submitted at most once per confirmation action and
   retains existing validation, error handling, cache invalidation, and
   navigation behavior.
3. Parent Settings and unrelated parent-authentication flows are unchanged.
