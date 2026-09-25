# iOS 1.0.1 (10) release evidence

Date: 2026-09-23. App: TJBOT (`tjbot`), Apple app ID 6784078502,
team B45DG8CLV9. Candidate: HEAD
`3a341d092734800877e163d48c0fc3e25d9e001f` plus the recorded working-tree diff.
No commit or App Review submission is implied by this record.

## Changes

- Increment Expo and Xcode iOS version/build from 1.0.0 (9) to 1.0.1 (10).
- Cancel the pending retry timer when the family presses Stop and go home.
  Reset the stack to Home so Back cannot reopen the cancelled reconnect flow.
- Add regression coverage for stopping attempts 1 and 3, and actual StackRouter
  history/back behavior for both normal navigation and direct deep-link entry.
- Pod install changed only the Hermes podspec checksum. The podspec embeds the
  checkout's absolute HERMES_CLI_PATH; replacing it with the prior
  `.worktrees/apple-review-build-9` path reproduces the old checksum exactly.
  Dependency versions are unchanged; 107 pods installed and lockfiles agree.

## Regression and review evidence

The initial iOS E2E run passed 20/21 tests; modal Stop did not reliably return
to Home. Two timer regressions failed before timer cancellation and passed
afterward. Two actual StackRouter regressions then reproduced retained reconnect
history with both entry paths; resetting Home made them pass. The existing Stop
expectation was strengthened from a navigate call to a root reset.

The focused final fallback suite passes 27/27 cases. Read-only final review
reported no remaining actionable findings. The related-path search covered
fallback timers and other feature timers: splash navigation has no Stop action,
parent gate cooldown does not navigate, and pairing/robot polling has cancellation.
This is a bounded search, not a claim that every timer in the app was audited.

## Final source checks

All logs below are under `build/ios/release-20260923/`.

| Command | Exit | Evidence |
| --- | --- | --- |
| `npx tsc --noEmit` | 0 | `typecheck-final.log` |
| `npm run lint` | 0 | `lint-final.log`, zero warnings |
| `npm test -- --runInBand` | 0 | `unit-release.log`, 249 suites / 3401 tests |
| `npm run test:integration -- --runInBand` | 0 | `integration-final.log`, 3 suites / 6 tests |
| `npm run flows:validate` | 0 | 16 generated files, 13 domain READMEs |
| `npm run sequences:fast` | 0 | 103 sequence files |
| `npm run erd:validate` | 0 | 109 DBML files, 107 entity documents |
| `npm run usecases:check` | 0 | 157 use cases, zero failures |
| `npm run check:token-parity` | 0 | 7 token files |
| `npm run check:route-coverage` | 0 | 135 screens, 127 routes |
| `npm run check:screen-prop-types` | 0 | 135 typed screens, zero violations |

Earlier integration runs timed out under host load; the unchanged default-timeout
command subsequently passed. An attempted focused Detox command containing an
unquoted pipe in testNamePattern exited 127 before tests; it is not a test result.
The first history-test draft had a TypeScript partial-state type error; explicit
router rehydration fixed the test harness, and final typecheck passed.

## Native artifact and delivery

The full iOS simulator run after timer cancellation passed all 4 suites / 21 tests
(`npm run detox:test:ios -- --runInBand --json --outputFile
build/ios/release-20260923/detox-final-results.json`, exit 0,
`detox-final-test.log`). This bundle predates the final navigation reset;
the changed module suite was rerun on a rebuilt final bundle.

Two final-bundle module runs initially failed the modal tap. The diagnostic
failure screenshot shows NetworkError after the retry timer, rather than Home
under an undismissed modal. With Detox synchronization disabled for the looping
robot animation, a visible Stop button could still be moving during the native
sheet entrance. The test now waits for its screen frame to remain stable for
500 ms (5-second bound) before the single real tap. All original assertions
remain. Frame comparison uses an ordered numeric tuple rather than native
dictionary key order; the first helper draft failed to settle because of the
unordered dictionary serialization.

Final command: `npm run detox:test:ios -- e2e/module-matrix.test.ts --runInBand
--take-screenshots all --json --outputFile
build/ios/release-20260923/detox-module-settled-results.json`, exit 0:
**8/8 tests pass**. Native build command: `npm run detox:build:ios --
--config-path build/ios/release-20260923/detox.config.js`, exit 0. The temporary
config uses arm64-only simulator compilation with four build jobs.
The final E2E helper received read-only review with no actionable findings.
`npm test -- --runInBand --testPathPattern=e2e-native-coverage-contract` also
passed 17/17 tests, exit 0, after the E2E change.

Final archive: `TJBOT-1.0.1-10-final.xcarchive`, `archive-final.log`, exit 0.
IPA: `export-final/TJBOT.ipa`, signed by Xcode Organizer using Cloud Managed
Apple Distribution, team B45DG8CLV9, get-task-allow false. CLI export and upload
reported No Accounts despite Organizer recognizing the existing Admin account;
the Organizer distribution flow successfully produced the signed IPA, which
was copied from its logged distribution pipeline Packages path.

`codesign --verify --deep --strict` passed for both the archive app and the
distribution-signed app. IPA metadata confirms `tjbot`, version 1.0.1, build 10,
and its Hermes bundle is byte-identical to the final archive bundle.

- IPA SHA256: `67f1b80e926cc5f9ae4798924ab0c1150048e73121dadfe1d81cb01eb994f5e4`
- Hermes bundle SHA256: `ee98bb5e3d6ef532d10dc9f7179c47fa2c6ba4a9c62b929b1c6fe7acad65e944`
- Production candidate patch SHA256: `652b383b9215a7039798940361cf4d0d7307f10ddc8b99e050b6b83718a3dfbe`
- Candidate including final E2E patch SHA256: `4cf6cd17d107fd0dbe048a399953393a4c3f500e4d3f77ab217de3bc6497c934`

Upload completed on 2026-09-23 at 13:22 ICT through Xcode Organizer.
ContentDelivery reports `UPLOAD SUCCEEDED with no errors` and delivery UUID
`9d6349ff-bcbf-4285-825b-6d461a1d46ff`. Safari App Store Connect independently
confirms Version 1.0.1, Build 10: upload **Complete**, build **Ready to Submit**,
expires in 90 days. No App Review submission or public App Store release was
performed.

The exact upload package is preserved as `export-final/TJBOT-uploaded.ipa`,
SHA256 `a693a5e82e6d8374af6a06ef99961fbe040f8cbe9b994a05e7b39ae8c7e0d2bb`.
Its Hermes bundle matches the final archive. Organizer reports a non-blocking
symbol-upload warning: missing hermesvm.framework dSYM with UUID
`B99B4F0D-1B56-3D94-940F-383F4F00C905`. Hermes crash stack symbolication may be
incomplete; this warning did not prevent Apple from processing the build.
The earlier `TJBOT-1.0.1-10.xcarchive` and `export/TJBOT.ipa` predate the reconnect
fix and are superseded; they must not be uploaded.

Production archive overrides use the Render HTTPS API and AI URLs and disable
the voice test harness, simulation, and parent progress diagnostics. Simulator
builds use test endpoints; their generated runtime file must not be mistaken
for the separately bundled production artifact.

Android and physical-device BLE/hardware tests are outside this iOS upload run.
Simulator and mocked tests do not establish physical-device or production
service readiness.
