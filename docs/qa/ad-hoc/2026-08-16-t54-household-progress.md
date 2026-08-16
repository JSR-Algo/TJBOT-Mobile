# T5.4 Android parent Progress - non-first household child

## Reproduction

The physical Android app persisted the definitive T5.4 child:

```text
active_child_id=2bbcd940-f9da-47cf-8a99-f1eaf2380e8c
```

The production backend returned the completed T5.4 lesson and `1/26` course
progress for that child, but the app requested learning status for
`55015eec-...`, the first child of the first household, and rendered zero
progress. `HouseholdContext.refresh()` always selected `households[0]` and only
loaded that household's children, so a persisted child in a later household
could never resolve.

The regression test was added first and failed with:

```text
Expected: hh-target|child-target
Received: hh-first|child-first
```

## Fix

`HouseholdContext.refresh()` now reads the persisted child ID alongside the
household list. It loads the first household normally, then searches later
households only when the persisted child is absent, retaining the matching
household, child list, and active child ID.

## Passing verification

```text
npm test -- --runInBand tests/contexts/household-context-race.test.tsx
PASS - 4 tests

npx tsc --noEmit
PASS

npx eslint src/contexts/HouseholdContext.tsx tests/contexts/household-context-race.test.tsx --max-warnings=0
PASS

./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
BUILD SUCCESSFUL in 59s - 527 actionable tasks

adb install -r android/app/build/outputs/apk/debug/app-debug.apk
Success
```

The APK was installed without clearing app data. On the connected Android
device, the parent Progress screen then rendered:

```text
5 lessons today
18 min active time today
1 lesson completed
6-Month English Curriculum: 1/26
```

Physical screenshot:
`robot/docs/evidence/t54-live-20260816-final/android-progress.png`.

