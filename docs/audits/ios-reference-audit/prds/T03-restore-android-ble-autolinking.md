# T03: Restore Android BLE autolinking

## Status
Registry status: NOT_STARTED | Priority: P0 | Blast radius: HIGH

## Problem
`react-native.config.js` opts `react-native-ble-plx` out of Android autolinking by setting `platforms.android` to `null` for that dependency. This disables the core robot-pairing flow on Android: the native BLE module is not linked into the Android build, so any scan/connect/provision call that depends on `react-native-ble-plx` fails at runtime with "native module not linked" or equivalent.

The override was added as a temporary workaround because `react-native-ble-plx@3.5.1` ships an empty `codegenConfig` that is incompatible with React Native 0.83's new-architecture codegen pipeline. The config comment explicitly states the fix is to upgrade the library or pin RN to the old architecture, but neither has happened, so Android BLE remains broken.

Audit sources:
- `docs/audits/ios-reference-audit/reports/project-health.md#improvements`: "`react-native.config.js` lines 24–31: `react-native-ble-plx` is opted out of Android autolinking because its codegen spec is incompatible with React Native 0.83's new architecture. This disables BLE on Android, a core robot-pairing flow."
- `docs/audits/ios-reference-audit/reports/ble-provisioning.md#bottlenecks`: "`react-native.config.js` BLE opt-out: Android builds currently lack BLE autolinking. As the project scales, this becomes a hard blocker for Android device provisioning and must be resolved before production."

Current offending config (project root `react-native.config.js`, lines 24–31):
```js
module.exports = {
  dependencies: {
    'react-native-ble-plx': {
      platforms: {
        android: null,
      },
    },
  },
};
```

## Scope

### In scope
- `react-native.config.js` — remove or replace the Android opt-out override for `react-native-ble-plx`.
- `package.json` — upgrade `react-native-ble-plx` to an RN 0.83-compatible release if one exists, or document the chosen fallback (e.g., new-architecture opt-out, patch-package).
- `tests/verification/T03-restore-android-ble-autolinking.test.ts` — Jest test asserting that the autolinking override is gone.

### Out of scope
- `ios/**` — iOS autolinking already works; do not change iOS native project files.
- `src/services/ble/permissions.ts` — permission behavior is covered by T04.
- BLE scan/sort/RSSI logic (T04), provisioning cleanup/retry/error mapping (T05), pairing state store (T06), and allowlist hardening (T07).
- Re-architecting the BLE/provisioning stack onto a single library (noted in project-health audit as a longer-term recommendation but not required to close this task).

## Proposed solution

1. **Determine the viable library version.**
   - Check the `react-native-ble-plx` release notes and npm registry for a version that declares RN 0.83 / new-architecture compatibility (look for `codegenConfig.android.javaPackageName` or similar in its `package.json` / `react-native.config.js`).
   - If a compatible release exists, bump `package.json` → `dependencies["react-native-ble-plx"]` to that version, run `npm install`, and remove the override.
   - If no compatible release exists, keep the current version but replace the opt-out with a documented, time-boxed fallback such as:
     - Disabling the new architecture for Android only (`newArchEnabled=false` in `android/gradle.properties`), or
     - A small patch-package patch that adds the missing codegen spec, with a `postinstall` script and a `patches/` directory entry.
   - Record the chosen path and the expiration date / upgrade trigger in `react-native.config.js` comments and in this PRD.

2. **Edit `react-native.config.js`.**
   - Remove the `dependencies['react-native-ble-plx'].platforms.android = null` block.
   - If other overrides remain (none expected today), leave them untouched.
   - After the fix the file should either be empty (default autolinking for all deps) or contain only unrelated overrides plus a comment explaining the BLE fallback.

3. **Regenerate lockfile and native build artifacts.**
   - Run `npm install` so `package-lock.json` reflects the changed version.
   - Run `cd android && ./gradlew clean` and `npx react-native run-android` (the build_gate) to verify Android compilation.
   - If using patch-package, ensure the patch is applied and committed.

4. **Verify with the Jest test.**
   - The verification test loads `react-native.config.js` and asserts that `react-native-ble-plx` is no longer opted out of Android autolinking.

## Acceptance criteria

1. `react-native-ble-plx` is no longer opted out of Android autolinking.
2. Either the library is upgraded to a React Native 0.83-compatible release or the override is replaced with a documented, time-boxed fallback.
3. Android debug build succeeds (`npx react-native run-android`).

## Dependencies

None.

## Exclusions / anti-overlap

- T04 will edit `src/services/ble/*` and `PairSearchScreen.tsx`; do not touch those files here.
- T02 edits `package.json` Jest/lint sections; avoid conflicting `package.json` edits by coordinating if both tasks land in the same release branch. The only `package.json` change for T03 should be the `react-native-ble-plx` version and optionally patch-package scripts.
- T01 edits `eas.json`, `app.json`, and `src/config.ts`; no overlap with T03 files except `package.json` (different keys).

## Verification test plan

- Test file: `tests/verification/T03-restore-android-ble-autolinking.test.ts`
- What it proves: `react-native.config.js` no longer disables Android autolinking for `react-native-ble-plx`.
- How to run it: `npx jest tests/verification/T03-restore-android-ble-autolinking.test.ts`
- Expected state before fix: FAIL (the current config explicitly sets `android: null`).
- Expected state after fix: PASS (the override is removed or changed so Android autolinking is enabled).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Upgraded `react-native-ble-plx` version still fails codegen on RN 0.83. | Pin to the exact version known to work; run the Android build gate before merging; if it fails, fall back to patch-package or old-architecture opt-out and document it. |
| Removing the override surfaces a build error elsewhere in the Android native layer. | Run `npx react-native run-android` on a clean build; capture and fix any missing imports/CMake targets before considering the task done. |
| Patch-package fallback becomes permanent. | Add a calendar reminder / TODO comment tied to a future `react-native-ble-plx` release; file a follow-up task to remove the patch. |
| iOS autolinking is accidentally disabled. | Keep iOS entry as `null` only if it was already null (it is not today); the verification test also asserts iOS is not opted out. |
| Merge conflict with T02/T01 `package.json` changes. | Make the smallest possible `package.json` diff; review `package.json` diffs holistically before merging. |

## Coordination notes

No cross-role coordination required. The mobile role owns both `react-native.config.js` and `package.json`. If a backend contract for device provisioning changes as a result of fixing BLE flows, that will be handled under T05/T07.

## Implementation hints

- Read `react-native.config.js` first; the current override is the only content in the file.
- If upgrading, inspect the installed `node_modules/react-native-ble-plx/package.json` to confirm it contains a non-empty `codegenConfig` (or no `codegenConfig` at all on old architecture).
- The Android build gate (`npx react-native run-android`) is the real source of truth; the Jest test only verifies config-level intent.
- If you choose patch-package, add it as a dev dependency and a `postinstall` script in `package.json`.
- Do not change `src/services/ble/permissions.ts` in this task; iOS permission state handling is out of scope.
