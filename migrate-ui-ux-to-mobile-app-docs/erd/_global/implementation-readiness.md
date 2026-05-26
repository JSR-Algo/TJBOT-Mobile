# Implementation Readiness (§13)

Per-system classification against the final 102-entity tree:

- **READY** — system spec is complete, entities clear, sequences cover lifecycle, no unresolved cross-system dependency.
- **NEEDS CLARIFICATION** — design is sound but a specific implementation decision is unresolved (infrastructure choice, policy detail).
- **MISSING REQUIREMENTS** — sequence or spec gaps that block backend implementation.

## Summary counts

| Status | Count | Systems |
|---|---|---|
| READY | 15 | sys-01, sys-02, sys-03, sys-06, sys-07, sys-08, sys-09, sys-10, sys-12, sys-13, sys-14, sys-15, sys-17, sys-19, sys-22 |
| NEEDS CLARIFICATION | 5 | sys-04 (failover PII + 3 governance refs), sys-05 (3 governance tables deferred), sys-11 (hypertable infra), sys-20 (ca_publish_schedules deferred), sys-18 (types only — no rows but `RuntimeApp` ↔ `RealtimeService` codec implementation TBD) |
| MISSING REQUIREMENTS | 0 | — |
| STATELESS / OUT-OF-SCOPE | 2 | sys-16 (projection), sys-21 (testing fixtures only) |

## Per-system detail

### sys-01 identity — READY

- 9 entities; all sequence-backed; COPPA frontmatter complete.
- All status enums + lifecycles documented.
- `mfa_secrets` carries `@no-sequence` (forward-looking; not blocking).
- Sequence files: `docs/sequences/01-identity/*.sequence.mmd` cover signup, login, refresh, child create, password reset.

### sys-02 device — READY

- 5 entities; all device-lifecycle paths sequence-backed.
- `device_heartbeats` flagged as hypertable candidate (sys-11 readiness covers infra choice).
- All cross-folder Refs in this folder are commented per Phase 3 decision; the 5 sys-03 + sys-15 Refs against `devices.id` (LIVE during Phase 3 audit) were also commented out in Phase 5.

### sys-03 device-runtime — READY (with caveat)

- 3 entities; append-only upload semantics clear.
- All 3 entity `.dbml` files originally carried LIVE cross-folder Refs to `devices.id` during Phase 3 audit; commented out in Phase 5. Does not block implementation.

### sys-04 realtime — NEEDS CLARIFICATION

- 5 entities; core lifecycle sequence-backed.
- **Unresolved**:
  - `provider_failover_records` — at-rest PII redaction strategy not finalised (transcripts excerpt vs metadata-only).
  - `session_turns` has 3 orphan column refs (`prompt_version_id`, `safety_policy_version_id`, `blocklist_version_id`) → deferred to `.omc/plans/erd-sys05-governance-tables.md`.
- Hypertable candidacy: `session_turns` time-series — confirm with sys-11 readiness.

### sys-05 safety — NEEDS CLARIFICATION

- 5 entities; safety event flow + policy publish sequence-backed.
- **Unresolved**: three governance tables (`prompt_template_versions`, `safety_policy_versions`, `blocklist_versions`) deferred to follow-up plan `.omc/plans/erd-sys05-governance-tables.md`.
- `BlocklistCache`, `TopicClassifier`, `PIIDetector` are stateless service components — `@stateless` annotation added to lane README in Phase 5.

### sys-06 content + personalization — READY

- 10 entities; curriculum hierarchy fully modelled.
- Topic decay + summary generation cron-driven; sequences cover all paths.

### sys-07 parent controls + summary — READY

- 4 entities; controls + cap flows sequence-backed.
- Weekly summary cron sequence in place.

### sys-08 config fleet management — READY

- 6 entities; config publish + cohort assignment + signing flows sequence-backed.
- `kms_key_id` cross-domain ref → sys-13 documented.

### sys-09 OTA — READY (with caveat)

- 5 entities; release lifecycle + auto-pause sequence-backed.
- **Cleanup**: 2 cross-folder Refs to `config_cohorts.id` were LIVE during Phase 3 audit; commented out in Phase 5.

### sys-10 notifications — READY

- 5 entities; dispatch + receipt flow sequence-backed.
- SES bounce/complaint handling sequence in place.

### sys-11 telemetry — NEEDS CLARIFICATION

- 4 entities; sequence-backed for write paths.
- **Unresolved**: hypertable infrastructure decision pending (TimescaleDB vs Postgres declarative partitioning vs Kinesis Firehose → S3 Parquet). Affects `telemetry_events`, `device_heartbeats`, `session_turns`, `rate_limit_buckets`, `outbox_events`. Decision recorded as a sys-11 implementation-readiness pre-requisite.

### sys-12 admin — READY

- 5 entities; MFA-bound login + admin action audit sequence-backed.
- `DeviceTransferService` is the actor for cross-domain transfer flows.

### sys-13 security — READY

- 5 entities; KMS + secrets + brute-force + cert flows sequence-backed.
- `key_rotations.md` frontmatter `state_machine: '@inline'` set in Phase 5; advisory WARN cleared.

### sys-14 retention — READY

- 4 entities; deletion + backup flow sequence-backed.
- Coordinates COPPA scope across every child-data table.

### sys-15 manufacturing — READY (with caveat)

- 3 entities; factory provision + test sequence in place.
- **Cleanup**: 2 cross-folder Refs to `devices.id` were LIVE during Phase 3 audit; commented out in Phase 5.

### sys-16 parent mobile application — STATELESS / OUT-OF-SCOPE

- No backend entities; consumer surface only.
- `mobile-projection-views.md` documents which entities the app reads/writes.

### sys-17 API gateway — READY

- 2 entities (rate-limit buckets + api keys).
- `idempotency_keys` promoted to `_shared/`.

### sys-18 wire protocol — NEEDS CLARIFICATION

- 1 file: `wire-protocol-domain-types.dbml` (Type declarations).
- **Unresolved**: device-side codec implementation TBD (binary frame schema beyond what's documented).
- Marked NEEDS rather than MISSING because the type catalogue is complete; only the runtime codec is downstream.

### sys-19 billing — READY

- 8 entities; subscription + Stripe webhook + entitlement check sequence-backed.

### sys-20 authoring + review — NEEDS CLARIFICATION

- 5 entities; draft → revision → publish flow sequence-backed.
- **Unresolved**: `publication_records.schedule_id` references `ca_publish_schedules` (deferred to `.omc/plans/erd-content-authoring-publish-schedule.md`).

### sys-21 integration testing — STATELESS / READY

- No entities; lane declared stateless.
- CI uses test fixtures via repository-level mocks, not a backend table.

### sys-22 demo retail mode — READY

- 2 entities; demo device + session-override flow minimal.
- `demo_devices.device_id` nullable (pre-pairing) handled in CONVENTIONS.

### `_shared/` — READY

- 6 entities; documented + sequenced where applicable.
- `audit_log` is the canonical mutation ledger; polymorphic columns app-validated.

## Follow-up plans referenced

| Plan | Status | Scope |
|---|---|---|
| `.omc/plans/erd-sys05-governance-tables.md` | STUB | `prompt_template_versions`, `safety_policy_versions`, `blocklist_versions`; resolves 3 orphan refs on `session_turns`. |
| `.omc/plans/erd-content-authoring-publish-schedule.md` | STUB | `ca_publish_schedules`; resolves 1 orphan ref on `publication_records`. |
| `.omc/plans/erd-22-systems-design.md` | THIS PARENT PLAN | Source of truth; §3 manifest. |

## Phase 5 cleanup record (all items resolved)

All five items below carried over from Phase 3 + Phase 4 and were fully resolved during Phase 5; section preserved for audit trail.

1. ✅ Commented out 7 LIVE cross-folder Refs (Lane C × 5, Lane F × 2).
2. ✅ `key_rotations.md` frontmatter set to `state_machine: '@inline'` (1 WARN cleared).
3. ✅ `provider_failover_records` + `mutation_log` workaround `*_code` renames evaluated — kept for wire-format consistency with spec (validator no longer requires).
4. ✅ `@stateless` annotation added to lane READMEs for all 22 stateless services (22 WARNs cleared).
5. ✅ Sequence citations added to `Note:` for 4 composite indexes (4 index-justified WARNs cleared).

Final validator state: 0 FAIL, 0 WARN (down from 28 advisory WARNs at Phase 4 close).

## Critical blockers

**None.** Every NEEDS CLARIFICATION item has a known unblock path (follow-up plan exists OR the decision is scoped to an infra owner).

## Prisma emission status (Phase P0-P2, 2026-05-12)

23 `schema.prisma` files emitted via `scripts/erd/dbml-to-prisma.mjs` from the 102 entity DBML sources. Generator + cascade map + immutable list + polymorphic notes + hypertable annotations + soft-delete partial-index helper all wired per `.omc/plans/erd-to-prisma-emission.md`. Every schema passes `npx -y prisma@5 validate` (with `DATABASE_URL` set to a dummy URL).

Per-system Prisma classification:

| System | Status | Prisma emission |
|---|---|---|
| sys-01 identity | READY | READY-WITH-PRISMA-SCHEMA (9 models, P0+P1 reference lane) |
| sys-02 device | READY | READY-WITH-PRISMA-SCHEMA (5 models, hypertable doc on device_heartbeats) |
| sys-03 device-runtime | READY | READY-WITH-PRISMA-SCHEMA |
| sys-04 realtime | NEEDS CLARIFICATION | NEEDS-CLARIFICATION-PRISMA-PENDING (schema emitted; failover PII redaction + 3 governance refs still open) |
| sys-05 safety | NEEDS CLARIFICATION | NEEDS-CLARIFICATION-PRISMA-PENDING (schema emitted; 3 governance tables deferred) |
| sys-06 content | READY | READY-WITH-PRISMA-SCHEMA |
| sys-07 parent | READY | READY-WITH-PRISMA-SCHEMA |
| sys-08 config | READY | READY-WITH-PRISMA-SCHEMA |
| sys-09 ota | READY | READY-WITH-PRISMA-SCHEMA |
| sys-10 notifications | READY | READY-WITH-PRISMA-SCHEMA |
| sys-11 telemetry | NEEDS CLARIFICATION | NEEDS-CLARIFICATION-PRISMA-PENDING (hypertable infra decision pending; emission proceeds with `/// hypertable` doc comments) |
| sys-12 admin | READY | READY-WITH-PRISMA-SCHEMA |
| sys-13 security | READY | READY-WITH-PRISMA-SCHEMA |
| sys-14 retention | READY | READY-WITH-PRISMA-SCHEMA |
| sys-15 manufacturing | READY | READY-WITH-PRISMA-SCHEMA |
| sys-16 mobile | STATELESS | STATELESS (stub schema.prisma with marker enum) |
| sys-17 gateway | READY | READY-WITH-PRISMA-SCHEMA |
| sys-18 wire-protocol | NEEDS CLARIFICATION | NEEDS-CLARIFICATION-PRISMA-PENDING (types-only; codec implementation downstream) |
| sys-19 billing | READY | READY-WITH-PRISMA-SCHEMA (P1 reference lane) |
| sys-20 authoring | NEEDS CLARIFICATION | NEEDS-CLARIFICATION-PRISMA-PENDING (ca_publish_schedules deferred) |
| sys-21 testing | STATELESS | STATELESS (stub schema.prisma with marker enum) |
| sys-22 demo | READY | READY-WITH-PRISMA-SCHEMA |
| `_shared/` | READY | READY-WITH-PRISMA-SCHEMA (P0 reference lane) |

Summary:
- READY-WITH-PRISMA-SCHEMA: 16
- NEEDS-CLARIFICATION-PRISMA-PENDING: 5 (schemas emitted; clarifications track follow-up plans)
- STATELESS: 2 (stub schemas)

Regeneration command: `npm run prisma:emit` (full re-emit). Per-folder: `node scripts/erd/dbml-to-prisma.mjs --folder <NN-system>`. Drift check: `node scripts/erd/check-prisma-emission.mjs --folder <NN-system>` or `--all`. Final reconciliation report at `docs/erd/_global/prisma-emission-status.md` (Phase P3).
