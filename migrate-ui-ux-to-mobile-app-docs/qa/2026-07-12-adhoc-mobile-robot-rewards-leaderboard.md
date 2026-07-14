# Mobile robot rewards leaderboard — cross-repo live proof

Date executed: 2026-07-14
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
| Detox iOS/Android | NOT PASS | Not part of this HTTP/client proof execution. |
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
| Mobile targeted | `npx jest --selectProjects unit --runInBand tests/api/rewards-api.test.ts tests/api/households.test.ts tests/features/rewards` | PASS — 9 suites, 59 tests; Jest reported a pre-existing open-handle warning after success. |
| Mobile unit | `npm test -- --runInBand --silent --forceExit` | PASS — 200 suites, 2,133 tests; 1 suite/19 tests skipped. `--forceExit` is required for the repository's known post-suite open handle. |
| Mobile typecheck | `npm run typecheck` | PASS. |
| Mobile lint | `npm run lint -- --quiet` | PASS. |
| Runner syntax | `node --check scripts/run-rewards-live-e2e.mjs` | PASS as part of the runner lifecycle suite. |

## Defects found by the live proof

1. `LessonEventIngestService` completed assignments over HTTP without granting rewards because optional dependencies compiled to `Object` metadata and `LessonRewardService` had no explicit Nest injection token. Explicit injection is now regression-tested.
2. Owned child rename returned PostgreSQL `42P08` because the reused audit parameter had ambiguous text/JSON typing. Both uses now explicitly bind as text and the SQL shape is regression-tested.

## Close assessment

The strengthened HTTP/client cross-repo acceptance slice passed its Docker-enabled run. The authenticated admin-browser customization and full post-customization immutability rows have separate live Playwright evidence. Task 12 remains partial until the other release commands and evidence are captured, including parent sign-in, robot provisioning/association, rendered parent/child reward surfaces and console, Detox, and physical robot evidence; this record does not upgrade those rows by inference.
