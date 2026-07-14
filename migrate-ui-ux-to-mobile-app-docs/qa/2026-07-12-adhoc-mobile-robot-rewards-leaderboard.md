# Mobile robot rewards leaderboard — cross-repo live proof

Date executed: 2026-07-13
Task: `adhoc-2026-07-13-mobile-robot-rewards-live`
Scope: real PostgreSQL + Nest HTTP + JWT/AuthGuard + mobile API client. This is not a rendered mobile, browser, simulator, or physical-robot proof.

## Reproduction

From the mobile worktree:

```bash
npm run test:e2e:rewards:live
```

The runner creates a disposable `postgres:16-alpine` container, applies all 102 raw-SQL migrations, builds and starts the selected backend worktree on a free loopback port, runs the live mobile Jest project, and removes the backend process and container in `finally`. Override backend location with `TBOT_BACKEND_WORKTREE=/path/to/tbot-backend` when the sibling worktree convention is not available.

No production database, account, token, email, child name, or device identifier is used. Fixture emails use the reserved `example.test` domain and all identifiers are random per execution.

## Requirement evidence

| Requirement | Result | Evidence |
|---|---|---|
| Disposable migrated PostgreSQL | PASS | Runner reported `Running 102 UP migration files` and `Migrations complete`; container absent after exit. |
| Real Nest HTTP and AuthGuard | PASS | Runner starts compiled `dist/main`; parent and device RS256 JWTs are verified by normal guarded routes. |
| Two isolated households | PASS | Two parents, memberships, active consent-bound children, and owned devices are inserted into the disposable database. |
| Normal catalog and assignment contract | PASS | `GET /v1/courses`, `GET /v1/courses/w01-place-words/lessons`, and `POST /v1/courses/w01-place-words/enroll` return the migrated published canonical lesson, active enrollment, and real assignment. |
| Actual completion ingest | PASS | Device-scoped JWT posts start/step/completion events to `POST /v1/devices/:deviceId/lesson-events`. |
| Duplicate completion collapse | PASS | Five concurrent completion deliveries produce exactly one `lesson_reward_ledger` row for the assignment/session. |
| Persisted private history and totals | PASS | Mobile client reads one matching inbox/history receipt and totals of 109 XP, 10 coins, one reward. |
| Seen acknowledgement idempotency | PASS | Mobile client acknowledges the same reward twice; inbox becomes empty while history remains. |
| Weekly/all-time leaderboard and masking | PASS | Owner opts in; both periods include the owned row. The second household sees the public row with masked email and never receives the raw address. |
| Child rename | PASS | Mobile client renames the owned child; the owned leaderboard row updates to the server-confirmed name. |
| Opt-out privacy | PASS | Public row disappears, owned row becomes private, and private reward history remains unchanged. |
| Cross-household isolation | PASS | Foreign filtered rewards, mismatched-household inbox, seen, preference, and child rename requests each return HTTP 403. |
| Published checksum immutability | PASS | The canonical lesson checksum is equal before assignment/ingest and after reward/privacy mutations. |
| Aggregate parity | PASS | Mobile totals, immutable ledger count, reward receipt values, and leaderboard projection agree for the single completion. |
| Sign-in endpoint | NOT PASS | Tokens are locally signed fixture JWTs so AuthGuard is real, but `/auth/login` is not exercised. |
| Rendered mobile/browser UI and console | NOT PASS | This proof runs the mobile API client in Jest without a rendered app or browser. |
| Detox iOS/Android | NOT PASS | Not part of this HTTP/client proof execution. |
| Physical robot | NOT PASS | Device behavior is represented by a device-scoped JWT HTTP client, not hardware. |

## Verification evidence

| Gate | Command | Result |
|---|---|---|
| Cross-repo live | `npm run test:e2e:rewards:live` | PASS — 2 suites scenarios, 2 tests; disposable cleanup confirmed. |
| Backend targeted | `npx vitest run src/lessons/lesson-event-ingest.service.spec.ts src/lessons/lesson-event-ingest.service.null-rowcount.spec.ts src/lessons/lesson-event-ingest.session-ownership.spec.ts src/lessons/lesson-event-ingest.stuck-slot.spec.ts src/lessons/lesson-event-ingest.wiring.spec.ts src/rewards/reward-query.service.spec.ts src/rewards/leaderboard.service.spec.ts src/rewards/lesson-reward.service.spec.ts src/rewards/mobile-rewards.controller.spec.ts src/rewards/mobile-leaderboard.controller.spec.ts` | PASS — 10 files, 85 tests. |
| Backend typecheck | `npm run typecheck` | PASS. |
| Backend lint | `npm run lint -- --quiet` | PASS. |
| Backend build | `npm run build` | PASS inside runner. |
| Mobile targeted | `npx jest --selectProjects unit --runInBand tests/api/rewards-api.test.ts tests/api/households.test.ts tests/features/rewards` | PASS — 9 suites, 59 tests; Jest reported a pre-existing open-handle warning after success. |
| Mobile typecheck | `npm run typecheck` | PASS. |
| Mobile lint | `npm run lint -- --quiet` | PASS. |
| Runner syntax | `node --check scripts/run-rewards-live-e2e.mjs` | PASS. |

## Defects found by the live proof

1. `LessonEventIngestService` completed assignments over HTTP without granting rewards because optional dependencies compiled to `Object` metadata and `LessonRewardService` had no explicit Nest injection token. Explicit injection is now regression-tested.
2. Owned child rename returned PostgreSQL `42P08` because the reused audit parameter had ambiguous text/JSON typing. Both uses now explicitly bind as text and the SQL shape is regression-tested.

## Close assessment

The HTTP/client cross-repo acceptance slice is reproducible and passing. Task 12 as a whole remains partial until sign-in, rendered UI/console, Detox, and physical robot evidence are captured; this record does not upgrade those rows by inference.
