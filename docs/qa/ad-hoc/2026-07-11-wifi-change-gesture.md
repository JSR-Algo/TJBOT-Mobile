# Wi-Fi Change Gesture — RED/GREEN Evidence

**Task:** `adhoc-2026-07-11-wifi-change-gesture`  
**Date:** 2026-07-11  
**Scope:** Task 1 established the RED test contract; Task 2 implements and validates the production copy changes.

## Approved Contract

- Normal Wi-Fi change/reconnect: `Double-click the BOOT button to change Wi-Fi without unpairing Robot.`
- Active reconnect scan: `Double-click BOOT, then keep Robot within 1–2 m while this phone searches.`
- Destructive repair pairing only: `Hold BOOT for 5 seconds only if you want to reset pairing and saved Wi-Fi.`
- Reconnect actions continue to navigate to `PairSearchScreen` with `{ reconnectMode: true }`.

## Focused RED Run

Command:

```bash
npx jest --selectProjects unit --runTestsByPath tests/features/device/pair-static-screens.test.tsx tests/features/device/pair-search-helpers.test.tsx tests/features/device/pair-failed-screen.test.tsx --runInBand
```

Exit code: `1`

Key summary:

```text
Test Suites: 3 failed, 3 total
Tests:       3 failed, 150 passed, 153 total
Snapshots:   0 total
Ran all test suites within paths "tests/features/device/pair-static-screens.test.tsx", "tests/features/device/pair-search-helpers.test.tsx", "tests/features/device/pair-failed-screen.test.tsx".
```

`--runTestsByPath` restricted execution to exactly the three target files. The
three contract assertions failed for the intended reason; the remaining 150
tests passed, and there were no syntax, transform, import, or setup errors.

## Expected Failures

1. `PairOfflineScreen › renders all three troubleshooting tips with their titles and bodies`
   - Missing approved normal-change copy and destructive-reset distinction.
   - Assertion evidence was `[false, false]` versus `[true, true]`, proving both approved strings were evaluated before the test failed.
   - Current copy includes `If your network changed or password rotated`, `Open setup mode`, and `Hold the top button for 5 seconds until Robot is ready to connect`.
2. `cancelSearchToIntro (back-to-intro) › tells reconnect users to double-click BOOT and stay nearby while scanning`
   - Missing approved active-scan instruction.
   - Current copy is `On Robot: hold the right touch button for about 3 seconds to open Wi‑Fi setup (keeps pairing). Then keep Robot within 3 meters.`
3. `PairFailedScreen copyForError matrix › renders distinct heading "We couldn't see Robot nearby" for BLE_SCAN_TIMEOUT`
   - Missing approved safe recovery copy.
   - Current copy is `Move Robot within 1-2 m, make sure it is in setup mode, then scan again.`

## Navigation Preservation

Existing assertions remain unchanged and passed during the RED run, including
offline/reconnect actions routing to `PairSearchScreen` with
`{ reconnectMode: true }`.

## Result

`RED confirmed`: failures identify missing approved production copy only.

## Focused GREEN Run

Command:

```bash
npx jest --selectProjects unit --runTestsByPath tests/features/device/pair-static-screens.test.tsx tests/features/device/pair-search-helpers.test.tsx tests/features/device/pair-failed-screen.test.tsx tests/features/device/device-home-screen.test.tsx --runInBand
```

Exit code: `0`

Key summary:

```text
Test Suites: 4 passed, 4 total
Tests:       163 passed, 163 total
Snapshots:   0 total
```

The approved ordinary Wi-Fi change, active reconnect scan, and destructive
reset warning strings now render in their intended contexts. Existing
reconnect navigation assertions remain green.

## I18n Validation

Command: `npm run i18n:check`

Exit code: `0`

```text
TOTAL hardcoded (not in en.json, not allowlisted): 0
EN keys: 1792
VI keys: 1792
Delta:   0  (only-en: 0, only-vi: 0)
Empty VI values (untranslated TODOs): 0
bundle check: N/A (bare RN — locales imported statically)
```

No generated locale bundle update is required for this bare React Native app.

## Result

`GREEN confirmed`: the scoped regression suite and i18n catalog checks pass.
Physical Android/robot gesture validation remains a separate runtime QA step.

## Task 3 Software Gate Run

Validation-only run on dirty `main`; no production code was edited and no
hardware, ADB, password, commit, or remote actions were performed.

| # | Command | Exit | Evidence | Verdict |
|---|---|---:|---|---|
| 1 | `npx tsc --noEmit` | 2 | 2 TS2339 errors in `src/services/ble/service.ts` for `requestMTU` on `LocalProvisioningDevice` | FAIL |
| 2 | `npm run lint` | 1 | 2 errors, 1 warning: unused `waitForBluFiConnReport`, unused test import, and an unused disable directive | FAIL |
| 3 | `npm test` | 1 | 191 passed, 1 failed, 1 skipped suites; 2085 passed, 1 failed, 19 skipped tests | FAIL |
| 4 | `npm run test:integration` | 0 | 1/1 suite and 3/3 tests passed | PASS |
| 5 | `npm run flows:validate` | 0 | 15 generated files, 12 domain README files, 0 undeclared targets | PASS |
| 6 | `npm run sequences:fast` | 0 | 102 sequence files parsed; 22 systems covered; 5 scripts + 5 files checked | PASS |
| 7 | `npm run erd:validate` | 0 | 109 DBML files and 107 entity Markdown files checked | PASS |
| 8 | `npm run usecases:check` | 0 | 154 use cases checked; 15 domains; 0 skeletons/failures | PASS |
| 9 | `npm run check:token-parity` | 0 | 7 token files verified | PASS |
| 10 | `npm run check:route-coverage` | 0 | 133 screen files, 125 routes, 125 feature registrations, 0 duplicates | PASS |
| 11 | `npm run check:screen-prop-types` | 0 | 133 screen files checked | PASS |

### Failure Attribution

- Typecheck and lint failures are pre-existing dirty-baseline BLE findings,
  outside Task 2's approved screen, locale, and copy-test scope. Task 2 did not
  edit the reported BLE service/protocol implementation.
- The full unit-suite failure identified one stale broader copy-contract
  assertion in `tests/ui-validation/fallback-offline.test.tsx`. That test now
  expects the approved PairOffline double-click BOOT reassurance sentence.

### Focused Behavior Proof

Command:

```bash
npx jest --selectProjects unit --runTestsByPath tests/features/device/pair-static-screens.test.tsx tests/features/device/pair-search-helpers.test.tsx tests/features/device/pair-failed-screen.test.tsx tests/features/device/device-home-screen.test.tsx --runInBand
```

Exit code: `0`

```text
Test Suites: 4 passed, 4 total
Tests:       163 passed, 163 total
Snapshots:   0 total
```

`git diff --check` also exited `0` with no whitespace errors.

## Task 3 Result

`DONE_WITH_CONCERNS`: 8 of 11 requested gates passed with non-zero validation
counts in the recorded Task 3 run. Typecheck and lint remained red because of
pre-existing dirty-baseline BLE findings, not Task 2. The stale broader unit
copy assertion was subsequently updated and revalidated.

## Broader Copy-Contract Follow-up

The stale PairOffline assertion in
`tests/ui-validation/fallback-offline.test.tsx` now expects the approved
double-click BOOT reassurance sentence.

Targeted fallback command:

```bash
npx jest --selectProjects unit --runTestsByPath tests/ui-validation/fallback-offline.test.tsx --runInBand
```

Exit code: `0` — 1/1 suite and 22/22 tests passed.

The focused four-suite gesture command remained green: exit code `0`, 4/4
suites and 163/163 tests passed.

Full unit command:

```bash
npm test -- --runInBand
```

Exit code: `0`

```text
Test Suites: 1 skipped, 192 passed, 192 of 193 total
Tests:       19 skipped, 2086 passed, 2105 total
Snapshots:   0 total
```

This confirms the broader unit-suite copy drift is resolved. The separately
recorded typecheck/lint BLE findings remain pre-existing dirty-baseline issues
outside Task 2.

## BLE Baseline Compile/Lint Prerequisite

Bounded follow-up on dirty `main` before physical E2E. Attribution is limited
to `src/services/ble/service.ts` and `tests/ble/blufiProtocol.test.ts`; all
other dirty changes remain user-owned and untouched by this prerequisite.

- Replaced the MTU capability casts with a TypeScript type guard based on the
  library `Device.requestMTU` member. Selection remains discovered device,
  connected device, then no-op when neither exposes the optional capability.
- Removed the uncalled single-monitor conn-report wrapper only. The active
  shared notify-hub path and conn-report parsing/timeout behavior are unchanged.
- Removed one obsolete lint suppression and one unused local test binding. No
  assertion, UUID, frame, protocol, or navigation behavior changed.

| Command | Exit | Sanitized evidence |
|---|---:|---|
| `npx tsc --noEmit` | 0 | TypeScript completed with no diagnostics. |
| `npm run lint` | 0 | ESLint completed with zero warnings/errors under `--max-warnings=0`. |
| Focused BLE Jest command | 0 | 2/2 suites and 109/109 tests passed. |
| `npm test -- --runInBand` | 0 | Full unit project passed; verbose fixture logs omitted from this record. |
| `git diff --check` | 0 | No whitespace errors. |

Result: `PASS (software prerequisite)`. The compile/lint prerequisite is green;
physical BLE E2E remains the next separate hardware validation step.

### MTU Behavior Test Follow-up

The prior test labeled as an MTU negotiation failure actually rejected the
characteristic writer. It was replaced with public provisioning-path coverage
that keeps write failures separate and verifies the best-effort MTU contract:
discovered-device preference, connected-device fallback, absent-capability
skip, and non-fatal rejection. Production code was unchanged.

| Command | Exit | Sanitized evidence |
|---|---:|---|
| Service Jest path | 0 | 1/1 suite and 67/67 tests passed. |
| Focused BLE Jest command | 0 | 2/2 suites and 112/112 tests passed. |
| `npx tsc --noEmit` | 0 | TypeScript completed with no diagnostics. |
| `npm run lint` | 0 | ESLint completed with zero warnings/errors. |
| `npm test -- --runInBand --silent` | 0 | Full unit project passed; expected guard-script stderr exercised by its own tests was omitted from attribution. |
| `git diff --check` | 0 | No whitespace errors. |

## Physical Android/Robot E2E — 2026-07-11

Physical validation used Android device `efc5314f`, the connected robot serial
node, and a fresh Metro bundle. No firmware/reset action was performed, and no
Wi-Fi password was entered, read, logged, or stored by the agent.

### Gesture and Discovery Evidence

- The offline screen rendered the ordinary recovery guidance: double-click
  BOOT to change Wi-Fi without removing the existing pairing.
- The active search screen rendered the matching instruction to double-click
  BOOT and keep Robot within 1–2 m of the phone.
- The first bounded scan timed out without discovering Robot and correctly
  transitioned to the nearby-Robot failure screen. Interaction stopped until
  the physical setup action was performed.
- On resume, the app was already past discovery and credential entry. It showed
  the selected network provisioning steps as complete through server startup,
  then waited for Robot authentication. Credential entry occurred outside the
  agent interaction.
- The flow returned to Home after the bounded wait. The Device tab still showed
  no Robot connected to the account, so account-level pairing/authentication is
  not proven complete.

### Sanitized Artifacts

| Artifact | Evidence |
|---|---|
| `/tmp/tbot-e2e-05-offline-guidance.png` | Offline double-click BOOT guidance. |
| `/tmp/tbot-e2e-06-wifi-prep.png` | Active scan double-click BOOT guidance. |
| `/tmp/tbot-e2e-07-search-after-wait.png` | Initial scan timeout/failure state. |
| `/tmp/tbot-e2e-resume-01.png` | Provisioning reached Robot-authentication wait for the selected network. |
| `/tmp/tbot-e2e-resume-02-result.png` | Flow returned to Home after bounded wait. |
| `/tmp/tbot-e2e-resume-05-device-status.png` | Device tab still reports no connected Robot. |
| `/tmp/tbot-e2e-resume-ble-sanitized.txt` | Bounded Android BLE diagnostics with credential terms excluded and addresses redacted. |

Metro remained available for continuation on port `8081` (session `48426`,
node PID `13548`) with ADB reverse active.

### Physical E2E Result

`DONE_WITH_CONCERNS`: the new non-destructive double-click gesture guidance is
verified on physical Android, Robot discovery/provisioning progressed after the
physical action, and the agent did not handle a password. Final account pairing
is not verified because the Device tab still reports no connected Robot after
the authentication wait returned to Home.

## Read-Only Incomplete-Pairing Diagnosis

The resume evidence was re-checked against Android timestamps and the runtime
implementation. `/tmp/tbot-e2e-resume-01.png` is a stale native surface from
the pre-reload React Native instance, not proof that the fresh Metro instance
continued the in-flight provisioning request. The new JavaScript bundle began
initializing afterward at approximately 17:18:12–17:18:15 and then rendered
Home. No new provisioning attempt was made during this diagnostic pass.

### Boundary Evidence

- The stale connecting surface had the first three normal-claim steps complete
  and `Waiting for robot authentication` active. In `PairConnectingScreen`,
  that state is reached only after the local BLE provisioning handoff resolves
  and before backend claim/provisioning confirmation resolves.
- The normal `ble` path treats `STA_CONN_FAIL` as terminal, but allows a missing
  connection report to continue to backend confirmation. Therefore the screen
  proves credentials/token frames were handed off without an explicit failure;
  it does not independently prove a positive Wi-Fi join report.
- The fresh Device screen rendered `No Robot connected`, not `Robot status
  unavailable`. This corresponds to a successful household-device query whose
  normalized result has no device id, rather than a device-status request error.
- The bounded 18-second robot serial capture contained only healthy periodic
  runtime metrics. It contained no BLUFI, station, backend, claim, WebSocket,
  authentication, or connection failure event during the observation window.
- Sanitized Android logs contain the fresh application initialization and no
  `TBOT PairConnecting` or `TBOT BLE Provision` event after the reload. Earlier
  attempt-specific logs were unavailable because logcat had been cleared when
  the resume session started.

### Diagnosis

Most likely boundary: `BLE handoff completed or was accepted without an
explicit failure, then backend claim/device-authentication confirmation did not
complete`. Confidence: medium (`0.72`). The evidence favors claim/auth timeout
over a UI refresh bug because the household query returns an empty device set;
however, a lost BLUFI connection report means an unconfirmed Wi-Fi join cannot
be fully excluded from the historical attempt.

This is not consistent with the offline `DEVICE_NOT_FOUND` credential-only UI:
the observed connecting copy was the normal backend/robot-authentication copy,
not the credential-only `Sending Wi-Fi` / `Waiting for Robot to join Wi-Fi`
copy.

### Next Minimal Test

Run one controlled retry with Metro and logcat already live before the physical
double-click. Start the sanitized robot serial capture before Wi-Fi submission,
have the user enter the credential directly, and capture exactly these two
boundaries:

1. `[TBOT BLE Provision] conn_report` (`SUCCESS`, `FAIL`, or missing/timeout).
2. `[TBOT PairConnecting] local_ble_handoff_complete` followed by either claim
   confirmation or the final `failed.errorCode`.

That single retry distinguishes Wi-Fi join failure/unconfirmed handoff from
claim/auth timeout without firmware reset, NVS erase, or credential logging.

Diagnostic artifacts:

- `/tmp/tbot-e2e-diagnosis-logcat-sanitized.txt`
- `/tmp/tbot-e2e-diagnosis-serial-sanitized.txt`
- `/tmp/tbot-e2e-resume-05-device-status.png`
