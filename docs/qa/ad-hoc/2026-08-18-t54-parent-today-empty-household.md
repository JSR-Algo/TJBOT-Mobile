# T5.4 Parent Today empty-household fallback

Status: verified on the isolated H1 mobile branch; not merged.

## Reproduction

The physical release opened `ParentTodayScreen` with `Add a child to see live progress` even
though the authenticated account still had the required child in a later household. The provider
loaded only the first household when no `active_child_id` was persisted. If that household had no
children, `activeChild` remained null and later households were never inspected.

The regression test reproduced the provider state directly:

```text
Expected: hh-target|child-target
Received: hh-empty|none
```

## Fix

When there is no persisted child selection and the first household has no children,
`HouseholdProvider.refresh()` now selects the first later household with a child. Existing
persisted-child resolution remains unchanged.

## Verification

```text
household-context-race: 5 passed
TypeScript: PASS
ESLint changed files: PASS
git diff --check: PASS
unit: 229 passed, 1 skipped; 2726 passed, 19 skipped
Android release: BUILD SUCCESSFUL
APK sha256: bb5d218496578f7272c413af42e7c955e25573b897e96812959c277e8330a7bc
adb install -r: Success
physical Parent Today: Minh Anh; no active lesson
```

The strict H1 assignment remains blocked independently: production reports the robot active and
claimed, but the official eligible-device query returns no device for the required child. T5.4
remains `IN_PROGRESS`.
