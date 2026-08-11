# Android Worklets Gradle Path QA

- Task: `adhoc-2026-08-11-android-worklets-gradle-path`
- Branch: `fix/android-worklets-gradle-path`
- Worktree: `/Users/manhhodinh/Documents/TBOT/tbot-mobile/.worktrees/android-worklets-gradle-path`
- Date: 2026-08-11 (Asia/Ho_Chi_Minh)

## Scope

This task changes only mobile Android dependency linkage, its automated
regression test, and QA/design documentation. It does not change T5.4 files or
status, the T5.4 branch/worktree, firmware, robot behavior, Wi-Fi/router state,
system settings, or device installation state.

## Root Cause

The locked Expo SDK 55 dependency set installs:

| Component | Version | Compatibility evidence |
| --- | --- | --- |
| Expo | 55.0.11 | `bundledNativeModules.json` declares Reanimated 4.2.1 and Worklets 0.7.2 |
| React Native | 0.83.4 | Expo SDK 55 project version; ships React Native Gradle Plugin 0.83.4 |
| Reanimated | 4.2.1 | Peer dependency accepts Worklets `>=0.7.0` |
| Worklets | 0.7.2 | Matches installed Expo 55.0.11 bundled version |
| Android Gradle Plugin | 8.12.0 | React Native 0.83.4 version catalog |
| Gradle | 8.14.3 | Repository Gradle wrapper |

Reanimated 4.2.1 creates an imported CMake target whose `IMPORTED_LOCATION`
is the old AGP output path:

`react-native-worklets/android/build/intermediates/cmake/<variant>/obj/<abi>/libworklets.so`

AGP 8.12's native build output is under a hashed directory:

`react-native-worklets/android/build/intermediates/cxx/<Variant>/<hash>/obj/<abi>/libworklets.so`

Worklets 0.7.2 can materialize a compatibility copy at the old path, which made
one local full build pass before the fix. The link still depends on an AGP
intermediate that CMake does not own, so ordering or cache differences can
produce the reported Ninja error with no rule to create the imported file.

Reanimated 4.3.0 replaced this filesystem import with Worklets' exported Prefab
target. Upgrading to 4.3.0 also requires Worklets 0.8.x and moves outside Expo
55.0.11's validated package set, so this change backports only the upstream
Prefab linkage through the repository's existing `patch-package` postinstall.

## Changes

- `patches/react-native-reanimated+4.2.1.patch`
  - finds `react-native-worklets` as a CMake package;
  - removes direct Worklets source include paths;
  - removes the imported `libworklets.so` filesystem path;
  - links `react-native-worklets::worklets`.
- `tests/scripts/android-worklets-linkage.test.mjs`
  - rejects the legacy AGP intermediate path;
  - requires the Prefab package and exported target.
- `package.json`
  - adds `test:android-native-linkage`.

No dependency versions or lockfile entries changed.

## Red/Green Reproduction

### Red

Command: `npm run test:android-native-linkage`

Result: exit 1 before the patch. The assertion reported:

`Reanimated must not import libworklets.so from an AGP intermediate path`

The inspected file contained
`android/build/intermediates/cmake/${BUILD_TYPE}/obj/${ANDROID_ABI}/libworklets.so`.

### Green After Clean Install

Commands:

```sh
find /Users/manhhodinh/Documents/TBOT/tbot-mobile/.worktrees/android-worklets-gradle-path/node_modules -depth -delete
npm ci
npm run test:android-native-linkage
```

Results:

- `npm ci`: exit 0; `react-native-reanimated@4.2.1` patch applied by postinstall.
- Focused test: exit 0; 1 test passed.

The first `npm ci` retry encountered macOS `ENOTEMPTY` while replacing an
existing dependency directory. Removing only this worktree's `node_modules`
and retrying produced the successful clean install above.

## Validation Results

| Gate | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | PASS, exit 0 |
| ESLint | `npm run lint` | PASS, exit 0 |
| Focused linkage | `npm run test:android-native-linkage` | PASS, 1/1 |
| Runtime environment | `node --test scripts/runtime/mobile-env.test.mjs` | PASS, 5/5 |
| Unit tests | `npm test -- --runInBand` | PASS, 229 suites and 2,713 tests; 1 suite/19 tests skipped |
| Integration tests | `npm run test:integration -- --runInBand` | PASS, 3 suites and 6 tests |
| Flow validation | `npm run flows:validate` | PASS, 16 generated files checked |
| Sequence validation | `npm run sequences:fast` | PASS, 103 diagrams and index checked |
| ERD validation | `npm run erd:validate` | PASS, 109 DBML and 107 entity Markdown files checked |
| Use-case validation | `npm run usecases:check` | PASS, 157 files checked |
| Token parity | `npm run check:token-parity` | PASS, 7 token files |
| Route coverage | `npm run check:route-coverage` | PASS, 135 screens/127 routes |
| Screen prop types | `npm run check:screen-prop-types` | PASS, 135 screens |

## Clean Android Build

After `npm ci`, the previous app `.cxx` graph referenced codegen directories
removed by the reinstall, causing the first `gradlew clean` attempt to fail
during its own stale-cache cleanup. The following isolated worktree caches were
then deleted explicitly:

- `android/app/.cxx`
- `android/app/build`
- `android/build`

Final command:

```sh
cd android
./gradlew clean assembleDebug --no-build-cache
```

Result: PASS, exit 0.

Key output:

`BUILD SUCCESSFUL in 7m 12s`

`593 actionable tasks: 487 executed, 106 up-to-date`

All four Reanimated ABIs linked after Worklets published its Prefab package.

## APK Inspection

- APK: `/Users/manhhodinh/Documents/TBOT/tbot-mobile/.worktrees/android-worklets-gradle-path/android/app/build/outputs/apk/debug/app-debug.apk`
- Size: 244,000,757 bytes (233 MiB)
- SHA-256: `65e89322ce9813d0979cb02524495de5693b32bc25d72194b20455c5abd0182a`
- Package: `com.TJBotmobile`
- Version: `1.0.2` (`versionCode` 3)
- Min/target SDK: 24/36
- Inspection tool: Android SDK Build Tools 37.0.0 `aapt`

`aapt list` confirmed both libraries for every packaged ABI:

- `arm64-v8a`: `libreanimated.so`, `libworklets.so`
- `armeabi-v7a`: `libreanimated.so`, `libworklets.so`
- `x86`: `libreanimated.so`, `libworklets.so`
- `x86_64`: `libreanimated.so`, `libworklets.so`

The APK was not installed on a phone or emulator.

## Remaining Risks

- Current Expo tooling recommends later SDK 55 patch releases, including Expo
  55.0.28, React Native 0.83.10, and Worklets 0.7.4. Updating the wider native
  dependency set was intentionally excluded from this focused fix.
- Remove and re-evaluate this patch when upgrading Reanimated to 4.3.0 or later,
  where Prefab linkage is upstream.
- The Android build emits existing deprecation and SDK XML warnings; none are
  introduced by this patch and none prevented APK generation.
- `npm ci` reports 44 existing audit findings (3 low, 16 moderate, 23 high,
  2 critical). Dependency security remediation is outside this build fix.
