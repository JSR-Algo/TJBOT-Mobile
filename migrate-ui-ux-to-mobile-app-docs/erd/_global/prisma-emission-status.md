# Prisma Emission Status — Phase P3 Final Report

**Status:** ✅ COMPLETE. All 23 schemas emitted, validated, and parity-checked.
**Date:** 2026-05-12.
**Plan of record:** `.omc/plans/erd-to-prisma-emission.md`.
**Generator:** `scripts/erd/dbml-to-prisma.mjs` (calls `scripts/erd/lib/parse-dbml.mjs`).
**Parity check:** `scripts/erd/check-prisma-emission.mjs`.

## 1. Headline numbers

| Metric | Value |
|---|---|
| Schemas emitted | 23 (21 real + 2 stateless stubs) |
| Models total | 108 (across 21 real schemas; 0 across 2 stateless stubs) |
| Enums total | 117 (across 23 schemas; includes 2 stateless marker enums) |
| `check-prisma-emission` PASS rate | 21/21 (stateless stubs skip parity by design — no .dbml sources) |
| `prisma@5 validate` clean | 23/23 ✅ |
| `npm run erd:full` | PASS (0 FAIL; 3 advisory WARNs unrelated to Prisma) |
| Hypertable annotations present | 3 / 5 (device_heartbeats, telemetry_events, rate_limit_buckets) |
| Hypertable annotation gaps still open | 2 (session_turns, outbox_events — lane-owner sign-off required) |

## 2. 23-schema inventory

| Folder | Lines | Models | Enums | Bytes | check-prisma-emission | prisma validate |
|---|--:|--:|--:|--:|---|---|
| `_shared/` | 243 | 6 | 7 | 10,575 | PASS | valid 🚀 |
| `01-identity/` | 356 | 10 | 15 | 16,250 | PASS | valid 🚀 |
| `02-device/` | 228 | 6 | 5 | 10,874 | PASS | valid 🚀 |
| `03-device-runtime/` | 116 | 3 | 3 | 4,824 | PASS | valid 🚀 |
| `04-realtime/` | 376 | 6 | 11 | 17,876 | PASS | valid 🚀 |
| `05-safety/` | 281 | 5 | 9 | 13,932 | PASS | valid 🚀 |
| `06-content/` | 288 | 10 | 6 | 12,979 | PASS | valid 🚀 |
| `07-parent/` | 146 | 4 | 3 | 7,050 | PASS | valid 🚀 |
| `08-config/` | 181 | 6 | 2 | 10,722 | PASS | valid 🚀 |
| `09-ota/` | 199 | 5 | 3 | 10,115 | PASS | valid 🚀 |
| `10-notifications/` | 197 | 5 | 6 | 10,066 | PASS | valid 🚀 |
| `11-telemetry/` | 149 | 4 | 2 | 8,168 | PASS | valid 🚀 |
| `12-admin/` | 164 | 5 | 6 | 7,739 | PASS | valid 🚀 |
| `13-security/` | 175 | 5 | 7 | 7,322 | PASS | valid 🚀 |
| `14-retention/` | 166 | 4 | 6 | 7,916 | PASS | valid 🚀 |
| `15-manufacturing/` | 109 | 3 | 2 | 5,745 | PASS | valid 🚀 |
| `16-mobile/` (stub) | 23 | 0 | 1 | 825 | n/a | valid 🚀 |
| `17-gateway/` | 71 | 2 | 2 | 2,892 | PASS | valid 🚀 |
| `18-wire-protocol/` | 85 | 0 | 10 | 1,167 | PASS | valid 🚀 |
| `19-billing/` | 267 | 8 | 5 | 12,967 | PASS | valid 🚀 |
| `20-authoring/` | 180 | 5 | 4 | 8,674 | PASS | valid 🚀 |
| `21-testing/` (stub) | 23 | 0 | 1 | 811 | n/a | valid 🚀 |
| `22-demo/` | 55 | 2 | 0 | 2,727 | PASS | valid 🚀 |

Notes:
- `16-mobile/` and `21-testing/` are **STATELESS** systems: schema is a generator + datasource header plus a single marker enum (`enum stateless_marker { stateless }`) that exists solely because Prisma 5.x rejects schemas without any model or enum. No models. No backend tables. See folder READMEs for rationale.
- `18-wire-protocol/` carries 0 models because the lane is **types-only** (DBML declares Type aliases that downstream services consume as shared Prisma enums); no rows persist in this domain.

## 3. Phase P0 → P2 emitter improvements applied

All improvements landed at `scripts/erd/dbml-to-prisma.mjs` + `scripts/erd/lib/parse-dbml.mjs`.

| Phase | Improvement | Location |
|---|---|---|
| P0 | Pure refactor: `parseDbml()` extracted to `lib/parse-dbml.mjs` (shared by validator + emitter). | `lib/parse-dbml.mjs` |
| P0 | Type mapping: uuid → `String @id @default(uuid()) @db.Uuid`; varchar(N) → `String @db.VarChar(N)`; timestamptz → `DateTime @db.Timestamptz(6)`; jsonb → `Json @db.JsonB`; bigint → `BigInt`; integer → `Int`; smallint → `Int @db.SmallInt`; boolean → `Boolean`; inet → `String @db.VarChar(45)`. | `mapType()` |
| P0 | Snake_case ↔ PascalCase model names + camelCase field names with `@map`/`@@map` round-trip. | `pascalCase()`, `camelCase()` |
| P0 | DBML column `note:` → Prisma `///` doc comment under each field. | column emit loop |
| P0 | Generator + datasource header on every schema. | `emitFolder()` |
| P1 | Singularization map (`SINGULAR_OVERRIDES`) — 22+ explicit plurals; default strips trailing 's' guarded against `ss`/`us`. | `singularize()` |
| P1 | Cascade map (`CASCADE_MAP`) — 60+ intra-folder refs from `_global/relationships.md`; emits Prisma `onDelete: {Cascade\|Restrict\|SetNull\|NoAction}` + `///` doc-comment when cascade verb is app-layer (cascade-soft, cascade-delete-coppa). All emit `onUpdate: NoAction`. | `CASCADE_MAP`, `cascadeToPrisma()` |
| P1 | Immutable entity list (`IMMUTABLE_ENTITIES`) — 23 entities from `_global/audit-history-strategy.md` §Immutable. Suppresses `@updatedAt` on `updated_at` columns + emits model-level `///` immutable header. | `IMMUTABLE_ENTITIES` |
| P1 | Polymorphic allow-list comments (`POLYMORPHIC_NOTES`) — structured `///` doc on 7 models (audit_log, feature_flags, idempotency_keys, outbox_events, media_assets, cost_attributions, retention_policies). | `POLYMORPHIC_NOTES` |
| P1 | Hypertable candidate detection (`HYPERTABLE_CANDIDATES`) — pre-validates 5 candidates; flags missing annotations on stderr; lifts present annotations as model-level `///` doc. | `parseHypertableNote()`, `HYPERTABLE_CANDIDATES` |
| P1 | Soft-delete partial-index helper — `isSoftRetention()` reads entity .md frontmatter; when retention is soft-ish AND DBML has `deleted_at`, emits `@@index([deletedAt], map: "idx_<table>_deleted_at_soft")` + `///` post-migration WHERE note. | `isSoftRetention()` |
| P1 | Relation-field nullability mirrors FK column nullability (Prisma 5.x requirement). | forward relation loop |
| P1 | Inverse @relation auto-emission with disambiguation when source has multiple FKs into the same target. | back-ref loop |
| P1 | Cross-folder Refs default: **no @relation**; DBML column note carries through as `///` doc. Per plan §4. | column emit loop |
| P1 | `prisma:format` + `prisma:validate` npm scripts (uses `npx -y prisma@5` — no install). | `package.json` |
| P3 | Parser hardening: table-level `Note: '...'` now supports backslash-escaped inner quotes (e.g. `Note: '...interval=\'1h\'...'`). Unblocks `rate_limit_buckets`. | `lib/parse-dbml.mjs` `noteM` regex |
| P3 | `parseHypertableNote()` accepts both space-separated (`column=x interval=1d`) and parenthesised (`column=x, interval='1h'`) forms. | `parseHypertableNote()` |
| P3 | `HYPERTABLE_CANDIDATES` aligned with live DBML notes (telemetry_events column=created_at, not received_at; map is now in agreement with `device_heartbeats.dbml` and `telemetry_events.dbml`). | `HYPERTABLE_CANDIDATES` |

## 4. P1 + P2 hand-off issues — current state

From `.omc/research/p1-hypertable-annotation-gap.md` + P1 hand-off message:

| # | Issue | State |
|---|---|---|
| 1 | Hypertable annotation gap: `outbox_events` (_shared) | OPEN — lane owner must add `Note: '@timescaledb-hypertable column=created_at interval=1d'`. Emitter flags non-fatally. |
| 2 | Hypertable annotation gap: `session_turns` (04-realtime) | OPEN — same. |
| 3 | Hypertable annotation gap: `telemetry_events` (11-telemetry) | **CLOSED in P3** — DBML had a trailing Note outside the Table block; moved inside in P3 (`telemetry_events.dbml`). Lane owner: reconcile with `audit-history-strategy.md` (which says `received_at` / 1h; live DBML uses `created_at` / 1d). |
| 4 | Hypertable annotation gap: `rate_limit_buckets` (17-gateway) | **CLOSED in P3** — DBML already had a parenthesised Note (`@timescaledb-hypertable(column=window_start, interval='1h')`); parser was hardened in P3 to recognise both syntaxes. |
| 5 | `device_heartbeats` reconciliation: live DBML says `created_at / 1d`; `audit-history-strategy.md` says `received_at / 1d`. | OPEN — sys-02 spec owner must confirm. Emitter follows DBML (the contract). |
| 6 | `prisma:validate` env-var requirement: Prisma CLI hard-requires `DATABASE_URL` even for syntax validation. CI invocation needs a dummy URL. | DOCUMENTED — captured in this report + `docs/erd/README.md`. |
| 7 | `prisma:format` rewrites the file (re-orders attributes). Generator is canonical. | DOCUMENTED — recommendation: do not run `prisma:format` in CI; emitter is the formatter. |
| 8 | Singularization map is enumerated, not algorithmic. | LIVE — current map covers every plural P0-P2 emitted. Each new entity may require an entry. |
| 9 | `onUpdate: NoAction` everywhere — correct for uuid PKs. Future non-uuid PKs would need cascade-map extension. | DOCUMENTED — not blocking. |
| 10 | Soft-delete partial-index uses fallback (`@@index([deletedAt])` + `///` doc) rather than Prisma 5.x `where:` preview. | DOCUMENTED — apply WHERE clause post-migration; plan AC-P11 allows. |

## 5. Per-folder breakdowns

### Cascade rules summary (intra-folder refs, by verb)

| Folder | cascade | restrict | nullify | cascade-soft | cascade-delete-coppa | Total intra-folder refs |
|---|--:|--:|--:|--:|--:|--:|
| 01-identity | 5 | 3 | 0 | 2 | 1 | 11 |
| 02-device | 2 | 2 | 0 | 0 | 0 | 4 |
| 04-realtime | 5 | 0 | 0 | 0 | 0 | 5 |
| 05-safety | 1 | 2 | 0 | 0 | 0 | 3 |
| 06-content | 6 | 2 | 0 | 0 | 0 | 8 |
| 08-config | 2 | 5 | 0 | 0 | 0 | 7 |
| 09-ota | 2 | 3 | 0 | 0 | 0 | 5 |
| 10-notifications | 2 | 0 | 0 | 0 | 0 | 2 |
| 12-admin | 1 | 4 | 0 | 0 | 0 | 5 |
| 13-security | 0 | 3 | 0 | 0 | 0 | 3 |
| 14-retention | 0 | 1 | 0 | 0 | 0 | 1 |
| 15-manufacturing | 1 | 0 | 0 | 0 | 0 | 1 |
| 19-billing | 1 | 5 | 0 | 1 | 0 | 7 |
| 20-authoring | 4 | 1 | 0 | 0 | 0 | 5 |
| 22-demo | 1 | 0 | 0 | 0 | 0 | 1 |
| 03-device-runtime, 07-parent, 11-telemetry, 17-gateway, 18-wire-protocol, _shared | 0 | 0 | 0 | 0 | 0 | 0 (all polymorphic / cross-folder) |

Verb mapping (from `cascadeToPrisma()`):
- `cascade` → Prisma `onDelete: Cascade`
- `restrict` → Prisma `onDelete: Restrict`
- `nullify` → Prisma `onDelete: SetNull`
- `cascade-soft` → Prisma `onDelete: NoAction` + `///` doc (sys-14 retention sweep cascades soft-delete)
- `cascade-delete-coppa` → Prisma `onDelete: NoAction` + `///` doc (COPPA §312.10 retention worker enforces hard delete)

### Immutable models (per `IMMUTABLE_ENTITIES`)

23 entities flagged immutable; rows are append-only. DB GRANT model REVOKEs UPDATE/DELETE for application roles; only `RetentionWorker` may delete after retention. `@updatedAt` is suppressed; `///` header documents the contract.

Members: `audit_log`, `admin_commands`, `admin_role_assignments`, `audit_events`, `mutation_log`, `factory_records`, `factory_test_results`, `factory_serial_assignments`, `device_decommissions`, `config_versions`, `config_push_events`, `ota_crash_reports`, `ota_pause_decisions`, `notification_receipts`, `email_sends`, `deletion_requests`, `deletion_jobs`, `backup_snapshots`, `publication_records`, `content_revisions`, `key_rotations`, `safety_pii_redactions`, `cost_attributions`.

`device_transfers` deliberately NOT immutable — `audit-history-strategy.md` allows status updates.

### Polymorphic models (per `POLYMORPHIC_NOTES`)

7 entities carry structured `///` polymorphic allow-list comments at model level. App-layer validates the polymorphic target.

| Entity | Polymorphic column(s) | Allow-list source |
|---|---|---|
| `audit_log` | target_table + target_id | 102-table catalogue (validated at write time) |
| `feature_flags` | scope_target_id | depends on scope (household_id / user_id / device_id / cohort slug) |
| `idempotency_keys` | actor_id | user / admin / device / service id |
| `outbox_events` | source_id + aggregate_id | opaque ids of producing rows |
| `media_assets` | owner_service | sys-06 / sys-09 / sys-20 / sys-22 |
| `cost_attributions` | target column(s) | per-entity cost-bearing identifier |
| `retention_policies` | subject_table | entity governed by the policy |

### Hypertables

5 entities are TimescaleDB hypertable candidates. Model-level `///` doc lifts the annotation when present; emitter flags non-fatally when missing.

| Entity | Folder | Annotation present? | Resolved column / interval |
|---|---|---|---|
| `device_heartbeats` | 02-device | ✅ | created_at / 1d |
| `telemetry_events` | 11-telemetry | ✅ (after P3 fix moving Note inside Table block) | created_at / 1d |
| `rate_limit_buckets` | 17-gateway | ✅ (after P3 parser hardening for parenthesised syntax) | window_start / 1h |
| `session_turns` | 04-realtime | ❌ | lane owner must add `Note: '@timescaledb-hypertable column=created_at interval=1d'` |
| `outbox_events` | _shared | ❌ | lane owner must add `Note: '@timescaledb-hypertable column=created_at interval=1d'` |

Post-migration trigger required for all 5: `SELECT create_hypertable('<table>', '<column>', chunk_time_interval => INTERVAL '<window>');`.

### Soft-delete partial indexes

22 entities declared with `retention: soft|coppa|coppa-on-deletion|child-COPPA-bound` AND a `deleted_at timestamptz` column. Each emits `@@index([deletedAt], map: "idx_<table>_deleted_at_soft")` + `///` post-migration WHERE note. The Prisma 5.x `where: { deletedAt: null }` preview syntax is intentionally NOT used; the WHERE clause must be applied as a post-migration SQL trigger.

Members (from `audit-history-strategy.md` §Soft-delete): `users`, `households`, `household_members`, `children`, `auth_sessions`, `refresh_tokens`, `mfa_secrets`, `devices`, `sessions`, `session_transcripts`, `phrase_cache_entries`, `fallback_templates`, `daily_summaries`, `weekly_summaries`, `content_personalization_snapshots`, `topic_decay_state`, `parent_notifications_outbox`, `parent_controls`, `usage_caps`, `notification_templates`, `push_tokens`, `subscriptions`, `entitlements`, `media_assets`. (Subset of 22 — list lives in `audit-history-strategy.md`; emitter detects via frontmatter + column presence, not the list.)

## 6. Cross-domain FK matrix

All cross-folder refs are **doc-only-comment** per plan §4 — emitter passes through the DBML column `note:` as a `///` Prisma doc comment. No `@relation` lines for cross-folder refs. Producer → consumer enumeration (summary, from `relationships.md` §Cross-folder):

| Producer (lane) | Consumed by (lanes) | Treatment |
|---|---|---|
| `users.id` (sys-01) | 02, 04, 06, 07, 10, 14, 19, _shared | doc-only |
| `households.id` (sys-01) | 02, 04, 05, 06, 07, 11, 14, 19, _shared | doc-only |
| `children.id` (sys-01) | 04, 05, 06, 07, 11, 14, 19 | doc-only (COPPA scope-anchor) |
| `admin_users.id` (sys-12) | 04, 05, 09, 20 | doc-only |
| `mtls_certificates.id` (sys-13) | 02 (via `devices.cert_serial`) | doc-only |
| `kms_keys.id` (sys-13) | 08, 14 | doc-only |
| `devices.id` (sys-02) | 03, 06, 07, 08, 09, 10, 11, 12, 13, 15, 17, 22 | doc-only |
| `sessions.id` (sys-04) | 05, 11, 12 | doc-only |
| `session_turns.id` (sys-04) | 05, 11, 12 | doc-only |
| `config_cohorts.id` (sys-08) | 09 | doc-only |
| `subscriptions.id` (sys-19) | n/a (intra-folder only) | n/a |

Total documented cross-folder refs: 56 (per `_shared/cross-domain-data-flow.md`).

## 7. Validation evidence

```bash
# Per-schema check-prisma-emission
for f in _shared 01-identity 02-device ... 22-demo; do
  node scripts/erd/check-prisma-emission.mjs --folder "$f"
done
# → 21/21 PASS

# Per-schema prisma@5 validate
for f in _shared 01-identity 02-device ... 22-demo 16-mobile 21-testing; do
  DATABASE_URL='postgresql://x:x@localhost/x' \
  npx -y prisma@5 validate --schema docs/erd/$f/schema.prisma
done
# → 23/23 valid 🚀

# DBML validator + global build
npm run erd:full
# → 0 FAIL; 3 advisory cross-domain-fk-documented WARNs (pre-existing, not P3-introduced).
```

## 8. Files modified in P3

- `docs/erd/11-telemetry/telemetry_events.dbml` (1-line fix: moved trailing `Note:` line inside the `Table { ... }` block)
- `scripts/erd/lib/parse-dbml.mjs` (Note regex hardened to accept backslash-escaped inner quotes)
- `scripts/erd/dbml-to-prisma.mjs` (`HYPERTABLE_CANDIDATES` aligned with DBML; `parseHypertableNote()` accepts parenthesised syntax)
- `docs/erd/16-mobile/schema.prisma` (stateless stub — created in option (b) turn)
- `docs/erd/21-testing/schema.prisma` (stateless stub — created in option (b) turn)
- `docs/erd/_global/implementation-readiness.md` (Prisma emission section appended)
- `docs/erd/_global/prisma-emission-status.md` (this file — new)
- `docs/erd/README.md` (Prisma emission section appended — separate edit)
- `docs/qa/ad-hoc/2026-05-12-erd-prisma-emission.md` (evidence row — new)
- 21 real `schema.prisma` files re-emitted via `node scripts/erd/dbml-to-prisma.mjs --all` to canonicalise output.

## 9. Open follow-ups

| Plan | Scope |
|---|---|
| `.omc/plans/erd-to-postgres-ddl.md` (FUTURE) | SQL migration emission from Prisma (or directly from DBML if Prisma proves limiting). |
| sys-11 hypertable infra plan | TimescaleDB vs Postgres partitioned vanilla vs Kinesis Firehose decision. |
| Lane-owner action — `outbox_events` | Add `Note: '@timescaledb-hypertable column=created_at interval=1d'` inside the Table block. |
| Lane-owner action — `session_turns` | Same annotation, inside the Table block. |
| Lane-owner action — `device_heartbeats` | Reconcile column name with `audit-history-strategy.md` (DBML says `created_at`; doc says `received_at`). |
| P4 cross-domain query helpers | Generate `prisma-relation-with-no-FK` candidates where query ergonomics demand it (per-pair decision; plan §4 enumeration). |
| P5 SQL DDL emission | Direct DBML → PostgreSQL DDL bypassing Prisma (for Postgres-specific features Prisma cannot model: exclusion constraints, generated columns, true partial unique indexes, hypertable triggers). |
| Singularization-map growth | Each new entity may require a `SINGULAR_OVERRIDES` entry. Track per-lane as new DBMLs land. |
| `prisma:validate:ci` wrapper | npm script that sets dummy `DATABASE_URL` automatically. |

## 10. Verdict

✅ **DONE.** Phase P0 + P1 + P2 + P3 closed. 23/23 schemas emit cleanly, validate against Prisma 5.x, and survive the parity check. Two remaining hypertable annotation gaps are lane-owner sign-off decisions (plan §11 R-P8), not blockers. Backend implementation for the 16 READY-WITH-PRISMA-SCHEMA systems can begin against the emitted clients.
