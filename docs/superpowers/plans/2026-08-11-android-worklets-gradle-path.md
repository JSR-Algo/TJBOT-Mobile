# Android Worklets Gradle Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Android `assembleDebug` link Reanimated to Worklets without depending on AGP's generated intermediate path.

**Architecture:** Preserve Expo SDK 55's dependency versions and backport Reanimated's upstream Prefab linkage with `patch-package`. A focused Node test locks the installed CMake contract, while a clean native build proves the real integration.

**Tech Stack:** Expo 55, React Native 0.83.4, Reanimated 4.2.1, Worklets 0.7.2, AGP 8.12.0, Gradle 8.14.3, CMake/Prefab, Node test runner, patch-package.

---

### Task 1: Lock the failing native-link contract

**Files:**
- Create: `tests/scripts/android-worklets-linkage.test.mjs`
- Modify: `package.json`

- [ ] Add a Node test that reads `node_modules/react-native-reanimated/android/CMakeLists.txt`, rejects `intermediates/cmake`, and requires `find_package(react-native-worklets REQUIRED CONFIG)` plus `react-native-worklets::worklets`.
- [ ] Add `test:android-native-linkage` to run the focused test with `node --test`.
- [ ] Run `npm ci` and the focused test; record the expected failure against unpatched Reanimated 4.2.1.

### Task 2: Backport upstream Prefab linkage

**Files:**
- Create: `patches/react-native-reanimated+4.2.1.patch`

- [ ] Apply the minimal upstream CMake changes: find the Worklets Prefab package, remove the imported filesystem library, and link its exported target.
- [ ] Generate the patch with the repository's pinned `patch-package` version.
- [ ] Run the focused test and confirm it passes.
- [ ] Reinstall from the lockfile and rerun the focused test to prove postinstall reproducibility.

### Task 3: Validate from clean native state

**Files:**
- Create: `docs/qa/ad-hoc/2026-08-11-android-worklets-gradle-path.md`

- [ ] Remove only this worktree's `node_modules`, Android build outputs, and native module build outputs; run `npm ci`.
- [ ] Run typecheck, ESLint, focused tests, unit tests, integration tests, and applicable repository validators.
- [ ] Run `cd android && ./gradlew clean assembleDebug` with the configured Android SDK/JDK.
- [ ] Verify `android/app/build/outputs/apk/debug/app-debug.apk` exists and inspect its package/native libraries with `aapt` or `apkanalyzer`.
- [ ] Record exact commands, versions, exit codes, build result, APK path, and residual risks in the QA file.

### Task 4: Review and commit

**Files:**
- Modify: only files listed by the preceding tasks.

- [ ] Confirm no T5.4, firmware, robot, Wi-Fi/router, system-setting, or other-worktree files changed.
- [ ] Review the diff and rerun the focused test plus final required verification after the QA record is complete.
- [ ] Commit with `fix(android): link worklets through prefab` and `Refs: adhoc-2026-08-11-android-worklets-gradle-path`.
