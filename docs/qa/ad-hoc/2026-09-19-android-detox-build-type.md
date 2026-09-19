# Android Detox instrumentation build type

The Detox debug build passes `-DtestBuildType=debug`, but the Android app
previously hardcoded `testBuildType "release"`. Gradle selected release
instrumentation and started an unnecessary release build after building the
debug app. Those instrumentation and app artifacts did not match.

The app now honors the system property, preserving release as the default when
no property is supplied. No dependency versions or signing policy change.

Regression: `node --test tests/scripts/android-detox-build-type.test.mjs`
with the repository Android SDK and JDK available. This runs the real Gradle
task graph in dry-run mode, asserting debug instrumentation is selected and
release app tasks are absent. Before the fix it failed on missing debug
instrumentation; the same assertion passes after the fix. Dry-run proves task
selection only; actual build and device test evidence remain separate.

Integration evidence and full command logs:
`task-artifacts/course-merge-cleanup-20260919/mobile/` in the TBOT workspace.

The pairing native entry test also needed real viewport and platform handling.
On the Android AVD, the intro CTA and recovery actions require scrolling. The
search heading is `Looking for Robot…`, not the stale test string. Android can
scan while the iOS simulator reports unsupported Bluetooth immediately, so the
test uses the existing "I don't see my Robot" action when present, asserts the
failure screen, and scrolls to assert the actual "Try Bluetooth setup again"
recovery action (the prior "Try again"/"Search again" copy was stale). No
product logic, visibility requirements, or timeouts were changed. Native tests
use local mock services and cannot qualify physical BLE or real-backend pairing.
