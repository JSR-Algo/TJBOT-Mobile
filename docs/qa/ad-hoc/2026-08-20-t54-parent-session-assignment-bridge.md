# T5.4 Parent-session assignment bridge: H1 Pass 51 handoff

- Date: 2026-08-20
- Owner: H1 only for every Android, robot, assignment, and strict-pass action
- Status: prepared but not physically executed by this task
- Scope: test-only Android instrumentation; no production APK, JavaScript bundle, manifest, backend,
  database, or Parent navigation change

## Fail-closed contract

The bridge uses the already authenticated Parent app session to create exactly one direct
`w02-feelings` v7 assignment for device `91deb5af-c1c0-416b-956d-266d510eac5e` and child
`2bbcd940-f9da-47cf-8a99-f1eaf2380e8c`. It is armed only by
`confirmAssignmentId=PASS51`, accepts no identity override, performs one HTTP `POST`, requires
`201` plus the exact normalized identity and `ASSIGNED` state, and writes only a secret-free JSON
result.

The bridge reads the access token inside the target UID, keeps it in memory, and never returns,
prints, pulls, or persists it. Do not inspect `SecureStore`, dump preferences, add verbose HTTP
logging, print headers, or print raw response bodies. The only permitted probe output is:

```text
SESSION_PROBE_OK route=READY tokenPresent=true
```

Pass 42 froze read-only with `ROUTE_ROOT` before SecureStore access or HTTP; it created no
assignment. Pass 51 adds a bounded active-root acquisition wait of at most five seconds. Both
instrumentation commands retain `--no-restart`, so the runner must not restart or recreate the
visible Parent activity while waiting for its active accessibility root.

Any build, signer, manifest, install, probe, route, capture, Wi-Fi, WebSocket, cache, collector,
HTTP, result, or helper-gate failure freezes Pass 51. After the assignment test is invoked once,
there is no retry, rerun, replay, second assignment, or replacement assignment, even if the host
loses the result or a later strict acceptance item fails.

## Offline build and contract gates

These commands do not contact a phone or robot and contain no credentials:

```bash
set -euo pipefail
cd /Users/manhhodinh/Documents/TBOT/tbot-mobile/.worktrees/t54-parent-session-bridge

npx jest --selectProjects unit --runInBand \
  tests/android/t54-parent-session-bridge-contract.test.ts

cd android
./gradlew \
  :app:compileReleaseAndroidTestJavaWithJavac \
  :app:assembleRelease \
  :app:assembleReleaseAndroidTest

test -s app/build/outputs/apk/release/app-release.apk
test -s app/build/outputs/apk/androidTest/release/app-release-androidTest.apk
```

Required result: the Jest contract passes and Gradle reports `BUILD SUCCESSFUL`. A failure is a
handoff stop, not authorization to alter production code or weaken the contract.

## H1-only signer and manifest inspection

The installed target must remain the already accepted release. H1 may copy its `base.apk` for
read-only signer inspection; this section does not authorize installing or replacing the target
APK.

```bash
set -euo pipefail

ADB=/Users/manhhodinh/Library/Android/sdk/platform-tools/adb
SERIAL=efc5314f
SDK_ROOT=/Users/manhhodinh/Library/Android/sdk
BUILD_TOOLS="$(find "$SDK_ROOT/build-tools" -type f -name apksigner | sort | tail -n 1)"
APK_ANALYZER="$(find "$SDK_ROOT" -type f -name apkanalyzer | sort | tail -n 1)"
MOBILE=/Users/manhhodinh/Documents/TBOT/tbot-mobile/.worktrees/t54-parent-session-bridge
RELEASE_APK="$MOBILE/android/app/build/outputs/apk/release/app-release.apk"
TEST_APK="$MOBILE/android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk"
PASS51=/Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260820-final-closeout/final-parent-sla-pass-51
SIGNERS="$PASS51/parent-session-bridge/signers"

test -x "$ADB"
test -x "$BUILD_TOOLS"
test -x "$APK_ANALYZER"
test -s "$RELEASE_APK"
test -s "$TEST_APK"
mkdir -p "$SIGNERS"

TARGET_BASE="$($ADB -s "$SERIAL" shell pm path com.TJBotmobile \
  | tr -d '\r' | sed -n 's/^package://p' | grep '/base.apk$')"
test -n "$TARGET_BASE"
$ADB -s "$SERIAL" pull "$TARGET_BASE" "$SIGNERS/installed-base.apk"

"$BUILD_TOOLS" verify --print-certs "$SIGNERS/installed-base.apk" \
  > "$SIGNERS/installed.txt"
"$BUILD_TOOLS" verify --print-certs "$RELEASE_APK" > "$SIGNERS/release.txt"
"$BUILD_TOOLS" verify --print-certs "$TEST_APK" > "$SIGNERS/android-test.txt"

installed_digest="$(sed -n 's/^Signer #1 certificate SHA-256 digest: //p' \
  "$SIGNERS/installed.txt")"
release_digest="$(sed -n 's/^Signer #1 certificate SHA-256 digest: //p' \
  "$SIGNERS/release.txt")"
test_digest="$(sed -n 's/^Signer #1 certificate SHA-256 digest: //p' \
  "$SIGNERS/android-test.txt")"
test -n "$installed_digest"
test "$installed_digest" = "$release_digest"
test "$installed_digest" = "$test_digest"

"$APK_ANALYZER" manifest print "$TEST_APK" > "$SIGNERS/android-test-manifest.xml"
grep -Fq 'android:targetPackage="com.TJBotmobile"' \
  "$SIGNERS/android-test-manifest.xml"
grep -Fq 'androidx.test.runner.AndroidJUnitRunner' \
  "$SIGNERS/android-test-manifest.xml"
```

All three SHA-256 signer digests must be identical. Do not continue on an empty digest, multiple
unexpected signers, wrong target package, or wrong runner.

## H1-only test APK install and read-only session probe

This install adds only the separate test APK. It does not authorize `adb install` of the target
release, app-data clearing, force-stop, activity launch, navigation, reset, or assignment creation.
Parent Today must already be foreground and show all three READY markers.

```bash
set -euo pipefail

ADB=/Users/manhhodinh/Library/Android/sdk/platform-tools/adb
SERIAL=efc5314f
TEST_APK=/Users/manhhodinh/Documents/TBOT/tbot-mobile/.worktrees/t54-parent-session-bridge/android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk
PASS51=/Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260820-final-closeout/final-parent-sla-pass-51
BRIDGE="$PASS51/parent-session-bridge"
PROBE_LOG="$BRIDGE/session-probe.log"
COLLECTOR="$PASS51/parent-progress"

mkdir -p "$BRIDGE"
rm -f "$PROBE_LOG"
$ADB -s "$SERIAL" install -r -t "$TEST_APK"

T54_COLLECTOR_OUT="$COLLECTOR" \
T54_COLLECTOR_MODE=with-uiautomation-lease \
T54_COLLECTOR_UIAUTOMATOR_COLLISIONS=0 \
  bash /Users/manhhodinh/Documents/TBOT/t54-parent-collector-pass9.sh -- \
  "$ADB" -s "$SERIAL" shell am instrument --no-restart -w -r \
    -e class com.TJBotmobile.t54.ParentSessionAssignmentBridgeTest#probeExistingSession \
    com.TJBotmobile.test/androidx.test.runner.AndroidJUnitRunner \
  2>&1 | tee "$PROBE_LOG"

grep -Fq 'OK (1 test)' "$PROBE_LOG"
grep -Fq 'SESSION_PROBE_OK route=READY tokenPresent=true' "$PROBE_LOG"
if grep -Eqi 'authorization|bearer[[:space:]]|access[_ -]?token|refresh[_ -]?token' \
  "$PROBE_LOG"; then
  printf 'FAIL: token-bearing label appeared in probe output\n' >&2
  exit 1
fi
if grep -Eq '[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}' "$PROBE_LOG"; then
  printf 'FAIL: JWT-shaped material appeared in probe output\n' >&2
  exit 1
fi
```

The probe performs no HTTP request and creates no assignment. A missing READY marker, wrong
foreground package, missing SecureStore value, invalid JWT shape, runner failure, or any
JWT-shaped output freezes Pass 51 before assignment. The probe may spend at most five seconds
waiting for a non-null active root; `ROUTE_ROOT` after that bound remains a hard pre-assignment
failure. Do not run a separate `uiautomator dump`: the lease blocks all collector hierarchy
dumps while the bridge performs its own READY route check, then requires a new collector READY
observation after instrumentation exits.

## Pass 51 one-shot pre-POST gate

The following conditions must already be true in the same immutable Pass 51 evidence window:

1. H1 started `lesson_e2e_live_capture.py --reset-on-start` before the one authorized reset.
2. The live timeline proves `WifiStation: Got IP`, passive lesson WebSocket open, and
   `cached SD pack sync complete packs=27 synced=27 failed=0`.
3. The single four-worker collector is alive, its latest observation is fresh `READY`, no stop or
   route-violation marker exists, and the scoped UiAutomation collision count is zero.
4. The read-only bridge probe above passed while Parent Today remained foreground.
5. No assignment has been created in Pass 51 and the one-shot command below has never been
   entered.

H1 supplies the live capture PID and the scoped collector logcat file. This gate deliberately
reads existing evidence and processes only; it does not navigate, reset, trigger, or assign.

```bash
set -euo pipefail

PASS51=/Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260820-final-closeout/final-parent-sla-pass-51
TIMELINE="$PASS51/live-capture/timeline.log"
COLLECTOR="$PASS51/parent-progress"
COLLISION_LOG="$PASS51/collector-logcat.txt"
: "${T54_PASS51_CAPTURE_PID:?set to the already-running Pass 51 capture PID}"

test "$T54_PASS51_CAPTURE_PID" -gt 1
kill -0 "$T54_PASS51_CAPTURE_PID"
test -s "$TIMELINE"
grep -Fq 'WifiStation: Got IP:' "$TIMELINE"
grep -Fq 'passive_lesson_websocket_opened' "$TIMELINE"
grep -Fq 'cached SD pack sync complete packs=27 synced=27 failed=0' "$TIMELINE"

test -e "$COLLECTOR/.route-ready"
test ! -e "$COLLECTOR/.route-violation"
test ! -e "$COLLECTOR/.stop"
test -s "$COLLECTOR/collector.pid"
test -s "$COLLECTOR/collector-started-ms"
test -s "$COLLECTOR/route-latest.tsv"
collector_pid="$(tr -d '\r\n' < "$COLLECTOR/collector.pid")"
kill -0 "$collector_pid"
IFS=$'\t' read -r observed_ms worker_id route_state step_text percent \
  < "$COLLECTOR/route-latest.tsv"
test "$route_state" = READY
test "$observed_ms" -ge "$(tr -d '\r\n' < "$COLLECTOR/collector-started-ms")"
route_mtime="$(stat -f %m "$COLLECTOR/route-latest.tsv")"
test "$(( $(date +%s) - route_mtime ))" -le 5
for worker in 1 2 3 4; do
  marker="$COLLECTOR/.worker-${worker}-alive"
  test -s "$marker"
  kill -0 "$(tr -d '\r\n' < "$marker")"
done

test -s "$COLLISION_LOG"
test "$(grep -c 'UiAutomationService.*already registered' "$COLLISION_LOG" || true)" -eq 0
grep -Fq 'OK (1 test)' "$PASS51/parent-session-bridge/session-probe.log"
grep -Fq 'SESSION_PROBE_OK route=READY tokenPresent=true' \
  "$PASS51/parent-session-bridge/session-probe.log"
```

If this block exits nonzero, freeze before assignment. Do not repair the evidence in place and do
not proceed to the POST.

## Gated Pass 51 assignment invocation: enter once only

This is the only assignment-creating command in the handoff. Run it immediately after the
pre-POST gate, with the same Parent Today route and strict-pass processes still live. The result
path is fixed by the Java bridge. Do not change `PASS51`, `resultPath`, the class name, or the
arming value.

```bash
set -euo pipefail

ADB=/Users/manhhodinh/Library/Android/sdk/platform-tools/adb
SERIAL=efc5314f
PASS51=/Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260820-final-closeout/final-parent-sla-pass-51
BRIDGE="$PASS51/parent-session-bridge"
RUNNER_LOG="$BRIDGE/assignment-runner.log"
HOST_RESULT="$BRIDGE/t54-pass51-assignment.json"
DEVICE_RESULT=/storage/emulated/0/Android/data/com.TJBotmobile/files/t54-pass51-assignment.json

mkdir -p "$BRIDGE"
test ! -e "$RUNNER_LOG"
test ! -e "$HOST_RESULT"
$ADB -s "$SERIAL" shell test ! -e "$DEVICE_RESULT"

# The marker is created only after the collector lease is acquired, immediately before
# instrumentation. It remains after every success or failure.
T54_COLLECTOR_OUT="$PASS51/parent-progress" \
T54_COLLECTOR_MODE=with-uiautomation-lease \
T54_COLLECTOR_UIAUTOMATOR_COLLISIONS=0 \
  bash /Users/manhhodinh/Documents/TBOT/t54-parent-collector-pass9.sh -- \
  bash -c 'mkdir "$1"; shift; exec "$@"' _ "$BRIDGE/.assignment-invoked" \
    "$ADB" -s "$SERIAL" shell am instrument --no-restart -w -r \
      -e class com.TJBotmobile.t54.ParentSessionAssignmentBridgeTest#createPass51Assignment \
      -e confirmAssignmentId PASS51 \
      -e resultPath "$DEVICE_RESULT" \
      com.TJBotmobile.test/androidx.test.runner.AndroidJUnitRunner \
  2>&1 | tee "$RUNNER_LOG"

grep -Fq 'OK (1 test)' "$RUNNER_LOG"
grep -Fq 'ASSIGNMENT_CREATED route=READY result=t54-pass51-assignment.json' "$RUNNER_LOG"
if grep -Eqi 'authorization|bearer[[:space:]]|access[_ -]?token|refresh[_ -]?token' \
  "$RUNNER_LOG"; then
  printf 'FAIL: token-bearing label appeared in assignment runner output\n' >&2
  exit 1
fi
if grep -Eq '[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}' "$RUNNER_LOG"; then
  printf 'FAIL: JWT-shaped material appeared in assignment runner output\n' >&2
  exit 1
fi

$ADB -s "$SERIAL" pull "$DEVICE_RESULT" "$HOST_RESULT"
test -s "$HOST_RESULT"
jq -e '
  keys == [
    "assignmentId", "assignmentVersion", "childId", "deviceId", "httpStatus",
    "lessonId", "lessonVersion", "profile", "state"
  ] and
  .httpStatus == 201 and
  (.assignmentId | type == "string" and
    test("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")) and
  (.assignmentVersion | type == "number" and . > 0) and
  .deviceId == "91deb5af-c1c0-416b-956d-266d510eac5e" and
  .childId == "2bbcd940-f9da-47cf-8a99-f1eaf2380e8c" and
  .lessonId == "w02-feelings" and
  .lessonVersion == 7 and
  .profile == "espTft" and
  .state == "ASSIGNED"
' "$HOST_RESULT" >/dev/null
```

The `.assignment-invoked` marker is permanent evidence that this block was entered; never delete
or bypass it. The invocation has occurred once as soon as `am instrument` is entered. Any timeout, `401`,
non-`201`, active-assignment conflict, malformed response, identity mismatch, missing/pull-failed
result, `jq` failure, route loss, or later strict-pass failure is terminal for Pass 51. Do not run
the command a second time.

## Arm the answer helper from the safe result

Only after the one-shot result passes `jq`, read the assignment UUID from that secret-free file
and start exactly one helper. No readiness probe sends a child response.

```bash
set -euo pipefail

PASS51=/Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260820-final-closeout/final-parent-sla-pass-51
HOST_RESULT="$PASS51/parent-session-bridge/t54-pass51-assignment.json"
export T54_FRESH_ASSIGNMENT_ID="$(jq -er '.assignmentId' "$HOST_RESULT")"

T54_ANSWER_LOG="$PASS51/live-capture/esp-server.log" \
T54_ANSWER_STATE_DIR="$PASS51/answer-helper-state" \
T54_ANSWER_EXPECTED_ASSIGNMENT_ID="$T54_FRESH_ASSIGNMENT_ID" \
  bash /Users/manhhodinh/Documents/TBOT/t54-answer-helper-pass9.sh \
  2>&1 | tee "$PASS51/answer-helper.log"
```

In another terminal, require both helper identity and the live route/collector gate before the
normal spoken trigger:

```bash
set -euo pipefail
PASS51=/Users/manhhodinh/Documents/TBOT/robot/docs/evidence/t54-live-20260820-final-closeout/final-parent-sla-pass-51
export T54_FRESH_ASSIGNMENT_ID="$(jq -er '.assignmentId' \
  "$PASS51/parent-session-bridge/t54-pass51-assignment.json")"

T54_ANSWER_MODE=check-ready \
T54_ANSWER_LOG="$PASS51/live-capture/esp-server.log" \
T54_ANSWER_STATE_DIR="$PASS51/answer-helper-state" \
T54_ANSWER_EXPECTED_ASSIGNMENT_ID="$T54_FRESH_ASSIGNMENT_ID" \
  bash /Users/manhhodinh/Documents/TBOT/t54-answer-helper-pass9.sh

T54_COLLECTOR_OUT="$PASS51/parent-progress" \
T54_COLLECTOR_MODE=check-ready \
T54_COLLECTOR_UIAUTOMATOR_COLLISIONS=0 \
T54_ANSWER_STATE_DIR="$PASS51/answer-helper-state" \
T54_ANSWER_EXPECTED_ASSIGNMENT_ID="$T54_FRESH_ASSIGNMENT_ID" \
  bash /Users/manhhodinh/Documents/TBOT/t54-parent-collector-pass9.sh
```

Both commands must pass, and the collector command must print `ROUTE_READY`. Otherwise freeze the
already-created assignment and Pass 51; never create another assignment. This handoff does not
authorize manual Parent refresh, navigation, synthetic progress, assignment replay, an early
protected nudge, or any action outside the existing strict H1 procedure.

## Evidence to preserve

- Offline Jest and Gradle output.
- Installed/release/test signer reports and the decoded test manifest.
- Test APK install output and read-only session-probe output.
- The exact pre-POST gate output and scoped collision log.
- The single instrumentation runner log and normalized result JSON.
- Helper and combined READY-gate output, followed by the existing strict Pass 51 evidence.

None of these artifacts may contain an access token, refresh token, Authorization header, token
fragment, SecureStore envelope, password, or raw assignment response.
