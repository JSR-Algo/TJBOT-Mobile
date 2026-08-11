# Android Worklets Gradle Path Design

## Goal

Make Android debug builds reproducible with Expo SDK 55, React Native 0.83.4,
AGP 8.12.0, Reanimated 4.2.1, and Worklets 0.7.2 without relying on generated
native-build paths or manually created files in `node_modules`.

## Root Cause

Reanimated 4.2.1 imports `libworklets.so` from the pre-AGP CMake output path
`android/build/intermediates/cmake/<variant>/obj/<abi>`. AGP 8.12 writes the
library under `android/build/intermediates/cxx/<Variant>/<hash>/obj/<abi>`, so
the imported target can point at a file with no producing build rule.

Reanimated 4.3.0 removed the filesystem import and uses the CMake target
published by Worklets' Prefab package. Expo SDK 55, however, declares 4.2.1 and
0.7.2 as its bundled versions. Upgrading both packages would fix the native
link but would move outside Expo's validated dependency set.

## Selected Approach

Keep Expo's supported package versions and use the repository's existing
`patch-package` postinstall mechanism to backport the upstream Prefab linkage:

- add `find_package(react-native-worklets REQUIRED CONFIG)`;
- remove direct Worklets source include paths and the imported-library path;
- link `react-native-worklets::worklets`.

This is narrower than a dependency upgrade and is independent of AGP's hashed
intermediate directory layout.

## Automated Reproduction

Add a Node test that inspects the installed Reanimated CMake file. Before the
patch it must fail because the file contains `intermediates/cmake` and lacks the
Prefab package/target. After `npm ci` applies the patch, the same test must pass.

## Verification

Use a clean worktree dependency install and remove only this worktree's Android
and native-module build outputs before running `./gradlew clean assembleDebug`.
Run typecheck, ESLint, unit tests, focused script tests, repository validators,
and inspect the resulting APK with `aapt` or `apkanalyzer`. Do not install it.
