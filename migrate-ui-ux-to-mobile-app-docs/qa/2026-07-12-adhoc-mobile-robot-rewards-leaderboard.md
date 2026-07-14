# Mobile robot rewards leaderboard — cross-repo live proof

Date executed: 2026-07-14–2026-07-15
Task: `adhoc-2026-07-13-mobile-robot-rewards-live`
Scope: real PostgreSQL + Nest HTTP + JWT/AuthGuard + mobile API client. This is not a rendered mobile, browser, simulator, or physical-robot proof.

## Reproduction

From the mobile worktree:

```bash
TBOT_BACKEND_WORKTREE=/path/to/tbot-backend npm run test:e2e:rewards:live
```

The runner creates a disposable `postgres:16-alpine` container, applies all 102 raw-SQL migrations, builds and starts the selected backend worktree on a free loopback port, runs the live mobile Jest project, and removes tracked process groups plus the container in `finally` or after `SIGINT`/`SIGTERM`. It explicitly supplies the matching packaged development JWT keypair, so an unrelated inherited `JWT_PUBLIC_KEY` cannot invalidate fixture tokens. Override backend location with `TBOT_BACKEND_WORKTREE=/path/to/tbot-backend` when the sibling worktree convention is not available.

No production database, account, token, email, child name, or device identifier is used. Fixture account, household, child, device, assignment/session, and email identifiers are randomized per execution; canonical course and lesson identifiers remain fixed. Fixture emails use the reserved `example.test` domain.

## Requirement evidence

| Requirement | Result | Evidence |
|---|---|---|
| Disposable migrated PostgreSQL | PASS | Runner reported `Running 102 UP migration files` and `Migrations complete`; container absent after exit. |
| Real Nest HTTP and AuthGuard | PASS | Runner starts compiled `dist/main`; parent and device RS256 JWTs are verified by normal guarded routes. |
| Two isolated households | PASS | Two parents, memberships, active consent-bound children, and owned devices are inserted into the disposable database. |
| Active-child server selection | PASS | The consent-bound fixture starts with a different active child; the mobile `setActiveChild` client verifies the authoritative `{ active_child_id }` response from `POST /v1/profile/active-child`, PostgreSQL confirms the persisted switch before completion, and a foreign parent receives `403` without changing it. |
| Robot association/provisioning workflow | NOT PASS | The owned device-to-child association is production-shaped but fixture-seeded in PostgreSQL; BLE/provisioning UI and its authenticated completion endpoint are not exercised by this proof. |
| Normal catalog and assignment contract | PASS | `GET /v1/courses`, `GET /v1/courses/w01-place-words/lessons`, and `POST /v1/courses/w01-place-words/enroll` return the migrated published canonical lesson, active enrollment, and real assignment. |
| Actual completion ingest | PASS | Device-scoped JWT posts start/step/completion events to `POST /v1/devices/:deviceId/lesson-events`. |
| Duplicate completion collapse | PASS | Five concurrent completion deliveries produce exactly one `lesson_reward_ledger` row for the assignment/session. |
| Persisted private history and totals | PASS | Mobile client reads one matching inbox/history receipt and totals of 109 XP, 10 coins, one reward. |
| Seen acknowledgement idempotency | PASS | Mobile client acknowledges the same reward twice; inbox becomes empty while history remains. |
| Weekly/all-time leaderboard and masking | PASS | The live suite independently asserts each period contains the owned row at current rank 1 with 109 XP and one completed lesson. The backend-masked email is present, the full email is absent from both responses, and leaderboard rows do not expose coins. |
| Child rename | PASS | Mobile client renames the owned child; the owned leaderboard row updates to the server-confirmed name. |
| Opt-out privacy | PASS | Public row disappears, owned row becomes private, and private reward history remains unchanged. |
| Cross-household isolation | PASS | Foreign filtered rewards, mismatched-household inbox, seen, preference, and child rename requests each return HTTP 403. |
| Checksum unchanged during reward slice | PASS | The checksum captured after enrollment/assignment but before event ingest equals the value after reward/privacy mutations in the previously executed HTTP/client proof. |
| Full post-customization checksum immutability | PASS | The authenticated admin-browser proof clones the canonical lesson, customizes and republishes the clone, then reopens the canonical lesson and confirms its version checksum and all pinned visual asset bindings remain unchanged. |
| Aggregate parity | PASS | The live proof asserts one immutable receipt and private totals of 109 XP, 10 coins, and one reward; both weekly and all-time projections independently report 109 XP and one completed lesson. |
| Sign-in endpoint | NOT PASS | Tokens are locally signed fixture JWTs so AuthGuard is real, but `/auth/login` is not exercised. |
| Authenticated admin-browser customization round trip | PASS | The live Playwright proof uses the real manager login UI and Nest email/password/MFA flow, then completes clone/edit/visual impact review/asset clone and rebind/exact 480x320 preview/all seven simulations/publish review/publish with no unexpected request or browser-console failures. |
| Rendered mobile/browser UI and console | NOT PASS | This proof runs the mobile API client in Jest without a rendered app or browser. |
| Detox iOS/Android | PARTIAL | The current iOS simulator binary and a clean Android baseline verifier binary build with embedded JavaScript. Earlier iOS execution reached 16/21 tests and Android smoke reached 2/2; the latest scoped iOS and full Android attempts were blocked before business assertions by Detox WebSocket bootstrap and Android ANR/instrumentation failures respectively. The current primary-worktree Android bundle did not build because generated autolinking state pointed at another worktree. No physical-device proof exists. |
| Physical robot | NOT PASS | Device behavior is represented by a device-scoped JWT HTTP client, not hardware. |

## Verification evidence

| Gate | Command | Result |
|---|---|---|
| Cross-repo live | `TBOT_BACKEND_WORKTREE=/path/to/tbot-backend npm run test:e2e:rewards:live` | PASS — 102 migrations, backend build, real Nest HTTP/JWT, active-child persistence, two isolated households, five concurrent completion deliveries, one persisted reward, independent weekly/all-time parity, rename, opt-out, isolation, and checksum assertions passed. |
| Runner lifecycle | `npm run test:rewards-runner` | PASS — 15 tests cover repeated SIGINT/SIGTERM, process-group forced-kill fallback including a surviving descendant after its leader exits, cleanup error preservation and missing-container tolerance, proof-environment signing-secret sanitization, failed output-command handling and the explicit `output()` timeout, packaged development JWT keypair loading under inherited production mode, HTTP timeout, signal-exit detection, listening-port extraction, and syntax validation. |
| Backend targeted | `npx vitest run src/lessons/lesson-event-ingest.service.spec.ts src/lessons/lesson-event-ingest.service.null-rowcount.spec.ts src/lessons/lesson-event-ingest.session-ownership.spec.ts src/lessons/lesson-event-ingest.stuck-slot.spec.ts src/lessons/lesson-event-ingest.wiring.spec.ts src/rewards/reward-query.service.spec.ts src/rewards/leaderboard.service.spec.ts src/rewards/lesson-reward.service.spec.ts src/rewards/mobile-rewards.controller.spec.ts src/rewards/mobile-leaderboard.controller.spec.ts` | PASS — 10 files, 85 tests. |
| Backend typecheck | `npm run typecheck` | PASS. |
| Backend lint | `npm run lint -- --quiet` | PASS. |
| Backend build | `npm run build` | PASS inside runner. |
| Backend required CI | `npm run ci:required` | PASS — 469 test files: 414 passed and 55 skipped; 3,333 tests passed and 470 skipped. Build, OpenAPI 3.1 generation/validation/Spectral lint for 102 paths, Prisma validate/generate, disposable-PostgreSQL migration plus safe reapply and live migration integration, and state-machine tests (34/34) all passed. Transient matching JWT keys and the disposable database container were removed after the run. |
| Backend secret/privacy scan | `rg` over committed branch files | PASS for embedded private-key material — no PEM header or private-key body was found. Email-shaped matches were confined to OpenAPI examples, fixtures, and masking/authorization tests; no values are copied into this record. |
| Mobile targeted | `npx jest --selectProjects unit --runInBand tests/features/rewards/reward-surfaces.test.tsx tests/features/rewards/reward-seen-queue.test.ts tests/features/rewards/reward-hooks.test.tsx tests/features/rewards/robot-preference.test.tsx tests/e2e/parent-settings.test.tsx tests/navigation/route-reachability.test.ts tests/e2e-native-coverage-contract.test.ts tests/e2e/course-library-flow.test.tsx tests/features/device/pair-static-screens.test.tsx tests/features/lesson-production-readiness.test.tsx tests/ui-validation/accessibility-primitives.test.tsx tests/e2e/backend-blacklist-patterns.test.ts` | PASS — 12 suites, 211 tests. Additional review-focused runs covered the final queue concurrency and optional-auth fixes. |
| Mobile unit | `npm test -- --runInBand --silent --forceExit` | PASS — 201 suites, 2,174 tests; 1 suite/19 tests skipped. `--forceExit` is required for the repository's known post-suite open handle. |
| Mobile integration | `npm run test:integration` | PASS — 1 suite passed, 1 skipped; 3 tests passed, 1 skipped. |
| Mobile typecheck | `npm run typecheck` | PASS. |
| Mobile lint | `npm run lint -- --quiet` | PASS. |
| Mobile clean dependency install | `npm ci` with Node 24 in an isolated checkout | PASS — 1,345 packages installed after repairing corrupted SHA-512 integrity entries for `pirates@4.0.7`, `react-native-svg@15.15.4`, and nested `bplist-parser@0.3.1`; all corrected values match npm registry metadata. Postinstall applied the locked `@expo/cli@55.0.21` patch automatically. A separate `npm ci --omit=dev` installed 916 packages and applied the same patch, proving the lifecycle dependency remains available in production installs. |
| CocoaPods metadata repair | `pod install` with CocoaPods 1.16.2 | PASS — regenerated metadata updates the `hermes-engine` checksum to `dd87e18f846a5279bd276d87d27d2ce60c1aec89` and applies deterministic CocoaPods 1.16.2 normalization to the generated Xcode project. |
| Android native resource policy | `npx jest tests/ble/android-native-linking.test.ts --runInBand` | PASS — 4/4 tests; the main manifest and release resource deny all cleartext traffic, while a debug-only resource override preserves local, emulator-host, and physical-device LAN development traffic. |
| Mobile docs/i18n validators | `npm run i18n:check && npm run flows:validate && npm run sequences:fast && npm run erd:validate && npm run usecases:check` | PASS — EN/VI both contain 1,875 keys with zero delta; 16 generated flow files, 103 sequence diagrams, 109 DBML files, 107 entity docs, and 157 use-case sections were checked with zero failures. |
| Mobile route/token/prop validators | `npm run check:token-parity && npm run check:route-coverage && npm run check:screen-prop-types` | PASS — 7 token files, 135 screen files, and 127 registered routes were checked with zero duplicates or missing prop contracts. |
| Detox iOS | `npm run detox:build:ios` / scoped `module-matrix.test.ts` + `device-pairing-flow.test.ts` | PARTIAL — the final iOS build passed and produced `ios/build/Build/Products/Debug-iphonesimulator/TJBOT.app` with an embedded Hermes bundle. The replacement production-mounted route anchors, scroll-aware CTA, hidden-route contract, and dynamic blacklist regressions pass 100/100 focused Jest tests. The scoped Detox attempt launched the app but all 9 tests failed in `beforeAll` before flow assertions because Detox never completed `isReady`; simulator logs show the app remained alive while `DetoxManager` repeatedly reported WebSocket connection failure. Earlier simulator evidence remains 16/21. This is not physical-iPhone proof. |
| Detox Android | clean `npm run detox:build:android` / `npm run detox:test:android` | PARTIAL — a clean isolated verifier detached at baseline commit `4966650` applied the Expo CLI patch and the app-scoped build passed all 460 tasks in 32m18s; the APK contains the embedded `assets/index.android.bundle`. Earlier smoke remains 2/2. The full run started four suites/21 tests, but the first auth suite failed 10/10 in launch hooks after Detox `AsyncStorageIdlingResource` and React Native packager-reconnect ANRs, followed by instrumentation disconnect; no reliable business assertion ran, so the run was stopped. A later current primary-worktree build encountered stale multi-worktree autolinking artifacts before producing an APK. Full current-batch Android, full runtime, and physical-device execution remain unproven. |
| Runner syntax | `node --check scripts/run-rewards-live-e2e.mjs` | PASS as part of the runner lifecycle suite. |

## Defects found by the live proof

1. `LessonEventIngestService` completed assignments over HTTP without granting rewards because optional dependencies compiled to `Object` metadata and `LessonRewardService` had no explicit Nest injection token. Explicit injection is now regression-tested.
2. Owned child rename returned PostgreSQL `42P08` because the reused audit parameter had ambiguous text/JSON typing. Both uses now explicitly bind as text and the SQL shape is regression-tested.
3. Active-child selection trusted a matching JWT `household_id` claim without always verifying the authenticated subject's database membership. The service now authorizes every mutation through `household_memberships`, and the live proof uses a forged foreign-subject/victim-household claim to confirm `403` with no pointer change.

## Native release-gate defects found

1. Three `package-lock.json` integrity strings had been corrupted by an earlier branding replacement. Registry-canonical SHA-512 values were restored and a clean isolated install completed.
2. The CocoaPods lock carried a stale Hermes checksum. CocoaPods 1.16.2 regenerated the checksum and normalized generated Xcode project metadata.
3. Android referenced `@xml/network_security_config` without a tracked resource. The main manifest and release policy now deny all cleartext traffic, a debug-only override preserves local/emulator/LAN development, and a regression test verifies both source sets and manifest wiring.
4. The iOS Detox debug build skipped JavaScript bundling for the simulator while the test command did not start Metro, producing a launchable shell with no script URL. The Detox build now embeds the bundle explicitly and a contract test prevents regression.
5. The Android Detox command requested aggregate `assembleAndroidTest`, which built irrelevant dependency-library test variants and exhausted D8's heap after both required app APKs already existed. App-scoped Gradle tasks now build only the application and its instrumentation APK.
6. The Android Detox debug APK also skipped JavaScript bundling while the test runner did not start Metro. A Detox-only Gradle property now makes the debug APK self-contained while normal developer debug builds remain Metro-backed.
7. Expo CLI's native streams polyfill crashed the production Hermes bundle before Metro installed its module runtime. The previous workaround existed only as an untracked `node_modules` edit; a locked `patch-package` postinstall patch now makes clean and production dependency installs reproducible.
8. Native coverage referenced stale copy and the production-hidden `LessonReadyScreen`. Coverage now follows the production-mounted Daily Mission -> Send to Robot path and uses viewport-stable route anchors plus a scroll-aware CTA.
9. The native offline helper hardcoded backend port `3000`, so dynamic local ports were never blocked. Blacklist patterns now follow the configured scheme/host/port, support loopback aliases and normalized default ports, and reject neighboring-port overmatches.

## Mobile reward defects found

1. `MyRobotScreen` had no real product navigation edge. Parent Settings now exposes a localized, accessible leaderboard-privacy entry while preserving the cross-feature `stack-entry` contract and origin-aware Back behavior.
2. A successful seen acknowledgement could remove the inbox row while `CelebrationScreen` was still mounted, replacing the persisted reward with a false waiting-to-sync state. The screen now latches only the scoped persisted receipt for the mounted celebration.
3. Celebration and offline seen state could cross account/household boundaries during context changes or delayed async completion. Inbox lookup, latch state, queued-seen checks, and acknowledgement callbacks are now keyed by immutable account, household, and reward scope and fail closed without auth.
4. Concurrent offline seen enqueues or enqueue-during-replay could lose acknowledgements through last-write-wins storage updates. Storage transactions are serialized, replay performs backend calls outside the lock, then merges successful removals against the latest queue.

## Close assessment

The strengthened HTTP/client cross-repo acceptance slice passed its Docker-enabled run, backend required CI passed end to end, and all feasible non-Detox mobile validators passed with non-silent counts. The authenticated admin-browser customization and full post-customization immutability rows have separate live Playwright evidence. The current iOS binary and clean Android baseline verifier binary build with embedded JavaScript, and the reward/privacy/native regression suites pass, but native runtime evidence remains partial: iOS is blocked by Detox WebSocket bootstrap before the scoped assertions, while Android is blocked by ANR/instrumentation failure before reliable assertions and the current primary Android build is blocked by stale cross-worktree autolinking state. Task 12 remains partial: `/auth/login`, real robot provisioning/association, rendered parent and child reward surfaces showing the same persisted live reward, clean current-batch full iOS/Android Detox runs, physical mobile-device execution, and physical robot evidence remain unproven. Simulator and emulator evidence is not treated as physical-device or robot-hardware proof, and this record does not upgrade those rows by inference.
