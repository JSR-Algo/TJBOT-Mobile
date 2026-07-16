# Mobile robot rewards leaderboard — production integration closeout

Date executed: 2026-07-13 through 2026-07-16
Task: `adhoc-2026-07-13-mobile-robot-rewards-live`
Scope: production backend integration, real PostgreSQL + Nest HTTP + JWT/AuthGuard, and the mobile API client. This is not a rendered React Native, Detox, physical-phone, or physical-robot proof.

## Accepted heads and architecture

- Backend final head: `63dda4eff6166288b03acc761d9d3212f304193e` (`docs(openapi): sync lesson cache key contract`). Runtime acceptance was executed at its source-identical parent `2293c0fa75e5561a7c59a7169bd8376660bbab7b`; `2293c0f..63dda4e` changes only generated `openapi.json` and has no `src`, `tests`, or `package.json` delta.
- Mobile final head: `c83076fb8838fae1295ff46d0d7e4b6f584c5c61` (`test(rewards): harden privacy and cleanup proof`).
- Production reward work was integrated directly into the existing `LessonsModule`. The implementation chain begins at `d61efcc` (`feat(rewards): grant completion rewards and leaderboard APIs`), adds the production contract at `1f12698`, hardens rewards/privacy through `41de19b`, adds identity expiry hardening at `eabc8ca`, runtime cache-key hardening at `2293c0f`, and the documentation-only OpenAPI sync at `63dda4e`.
- The database contract is migration `104_mobile_robot_rewards_contract.sql` plus `105_reward_leaderboard_badge_index.sql`. The production chain contains 105 forward migrations. No separate reference module was cherry-picked into production.

## Reproduction

From the mobile worktree:

```bash
npm run test:e2e:rewards:live
```

The runner creates a disposable `postgres:16-alpine` container, dynamically discovers and applies all 105 forward raw-SQL migrations, builds and starts the selected backend worktree on a free loopback port, runs the live mobile Jest project, and removes the backend process and container in `finally`. Override backend location with `TBOT_BACKEND_WORKTREE=/path/to/tbot-backend` when the sibling worktree convention is not available.

No production database, account, token, email, child name, or device identifier is used. Fixture emails use the reserved `example.test` domain and all identifiers are random per execution.

## Requirement evidence

| Requirement | Result | Evidence |
|---|---|---|
| Disposable migrated PostgreSQL | PASS | Runner reported `Running 105 UP migration files`, including migrations 104 and 105; container and rewards Node processes were absent after exit. |
| Real Nest HTTP and AuthGuard | PASS | Runner starts compiled `dist/main`; parent and device RS256 JWTs are verified by normal guarded routes. |
| Two isolated households | PASS | Two parents, memberships, active consent-bound children, and owned devices are inserted into the disposable database. |
| Normal catalog and assignment contract | PASS | `GET /v1/courses`, `GET /v1/courses/w01-place-words/lessons`, and `POST /v1/courses/w01-place-words/enroll` return the migrated published canonical lesson, active enrollment, and real assignment. |
| Actual completion ingest | PASS | Device-scoped JWT posts start/step/completion events to `POST /v1/devices/:deviceId/lesson-events`. |
| Duplicate completion collapse | PASS | One original plus four concurrent replay responses all return HTTP 200 and the same non-empty reward ID. Response pairs are exactly `[[1,0],[0,1],[0,1],[0,1],[0,1]]`; the database retains one completion lifecycle row and one immutable ledger row. |
| Persisted private history and totals | PASS | The shared receipt awards exactly 109 XP and 10 coins. Inbox cardinality is 1, history cardinality is 1, and totals are one reward/109 XP/10 coins. |
| Seen acknowledgement idempotency | PASS | Mobile client acknowledges the same reward twice; inbox becomes empty while history remains. |
| Weekly/all-time leaderboard and masking | PASS | After opt-in, both `weekly` and `allTime` return exactly one public row and one owned public row for the rewarded robot; the second household sees only the masked public identity. Raw parent emails and internal IDs are rejected by exact response-key allowlists. |
| Private owned row | PASS | The opted-out foreign household receives no public row for itself and exactly one owned row with `rankStatus: private`, `visibility: private`, and `[hidden]` email. |
| Child rename | PASS | Mobile client renames `Mai` to `An`; the `allTime` public and owned rows both return the server-confirmed name without changing reward totals. |
| Opt-out privacy | PASS | After opt-out, both periods contain zero public rows and exactly one private owned row; private reward history and the published lesson checksum remain unchanged. |
| Cross-household isolation | PASS | Foreign filtered rewards, mismatched-household inbox, seen, preference, and child rename requests each return HTTP 403. |
| Published checksum immutability | PASS | The canonical lesson checksum is equal before assignment/ingest and after reward/privacy mutations. |
| Aggregate parity | PASS | Database cardinalities are exactly ledger 1, completion lifecycle 1, all-time aggregate 1, weekly aggregate 1, streak 1, and recipient receipt 1. Mobile totals, receipt values, and both leaderboard projections agree. |

## Verification evidence

| Gate | Command | Result |
|---|---|---|
| Backend focused | Focused rewards, ingest, assignment authorization, cache-key contract/boundary/OpenAPI, and DTO suite | PASS — 244 tests at runtime head; the earlier exact rewards-focused gate at `eabc8ca` recorded 196 passed with 41 PostgreSQL tests intentionally skipped into the dedicated live gate. |
| Backend identity | Two live PostgreSQL identity suites | PASS — 2 files, 41/41 tests, including owner/member login and refresh behavior. |
| Backend rewards PostgreSQL | `npm run test:integration:rewards:postgres` | PASS — 6 files, 50/50 tests. |
| Backend migrations | `npm run migrate` twice against PostgreSQL 16 | PASS — dynamic 105 migrations on both runs, including 104/105. |
| Backend catalog | `psql -X -v ON_ERROR_STOP=1` catalog checks | PASS — 2 enabled reward triggers, 16 reward indexes, 18 validated reward foreign keys, and 7 validated ledger checks. |
| Backend OpenAPI | `npm run openapi:check` | PASS — OpenAPI 3.1.0, 109 paths; final generated byte sync is committed at `63dda4e`. |
| Backend static/build | `npm run typecheck`, `npm run lint`, `npm run build` | PASS — all exit 0. |
| Mobile privacy | Isolated live response allowlist suite | PASS — 2/2 tests. |
| Mobile runner lifecycle | `npm run test:rewards-runner` | PASS — 14/14 tests. |
| Mobile typecheck | `npm run typecheck` | PASS. |
| Mobile lint | `npm run lint` | PASS. |
| Authoritative production live | `TBOT_BACKEND_WORKTREE=... npm run test:e2e:rewards:live` | PASS — dynamic 105 migrations, exact 2/2 scenarios, two households, and one persisted reward. |
| Cleanup | Post-run container/process inventory | PASS — no disposable rewards containers and no rewards Node processes remained. |

One unrelated portal full-suite check detected an OpenAPI byte-sync difference. The generated backend OpenAPI was subsequently synchronized in `63dda4e`; every required final gate above exits zero.

## Independent review

- Backend reviewer: APPROVED with no Critical, P1, or P2 findings. The runtime acceptance at `2293c0f` and documentation-only descendant `63dda4e` were accepted without requiring a duplicate live run because runtime source is byte-identical.
- Mobile reviewer: APPROVED with no remaining findings at `c83076f`. Exact raw-field allowlists and process/container cleanup were fixed before approval.

## Evidence artifact

Final evidence is stored at `/Users/manhhodinh/Documents/TBOT/.codex_tmp/rewards-live-20260715/production-pass`. Its top-level manifest is intentionally nonrecursive and contains 17 entries, all verified `OK`. The archived runtime acceptance records 19/19 required exit codes at zero, and its original 45-entry manifest verification log ends with `verification_exit=0`. The top-level manifest excludes itself and `checksums-verify-final.log`; archived prior-head directories are excluded by `-maxdepth 1`.

## Defects found by the live proof

1. `LessonEventIngestService` completed assignments over HTTP without granting rewards because optional dependencies compiled to `Object` metadata and `LessonRewardService` had no explicit Nest injection token. Explicit injection is now regression-tested.
2. Owned child rename returned PostgreSQL `42P08` because the reused audit parameter had ambiguous text/JSON typing. Both uses now explicitly bind as text and the SQL shape is regression-tested.

## Residual gaps and scope boundaries

- The production live proof uses locally signed ephemeral parent and device JWT fixtures. It does not exercise the mobile sign-in UI. Backend owner/member login and refresh are proven separately by the 41-test identity gate.
- Lesson Studio clone/edit/publish authoring is explicitly out of scope; this proof consumes the migrated canonical published lesson and does not claim an authoring-chain result.
- No rendered React Native screen, Detox run, iOS/Android simulator, or physical phone was exercised.
- No BLE, WiFi provisioning, firmware, or physical robot was exercised. Device behavior is represented by a device-scoped JWT HTTP client.

## Close assessment

The production backend/mobile HTTP integration, persistence, replay idempotency, reward projections, privacy behavior, and cleanup are accepted at the heads recorded above. The residual items remain unproven and are not upgraded by inference.
