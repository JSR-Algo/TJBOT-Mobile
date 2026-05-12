# Clean Architecture Recommendations (§14)

Final architectural notes based on the 102-entity ERD, Phase 2 lane reports, Phase 3 reconciliation, and plan §13 anticipated items.

## 1. Merge candidates (NOT merged — document the distinction)

### `phrase_cache_entries` (sys-04) vs `fallback_templates` (sys-05)

Both are pre-rendered TTS responses. Kept separate:

- `phrase_cache_entries` — per-session ephemeral cache; high churn; `expires_at` TTL.
- `fallback_templates` — curated catalogue; immutable until status change; reviewer-approved.

Document boundary in `docs/erd/04-realtime/phrase_cache_entries.md` + `docs/erd/05-safety/fallback_templates.md` — they reference each other as related-but-distinct lifecycle.

### `audit_log` (`_shared/`) vs `admin_commands` (sys-12) vs `audit_events` (sys-11)

Three coexisting audit lanes; rationale + boundaries in `audit-history-strategy.md`. Do NOT merge:

- `audit_log` — universal mutation ledger (polymorphic).
- `admin_commands` — admin-only narrative log.
- `audit_events` — telemetry stream surfaced to downstream consumers.

A single admin action emits all three rows; readers fetch by purpose.

### `topics` (sys-06) vs `safety_topics` (sys-05)

Kept distinct (plan §13 Q-6):

- `topics` — content taxonomy (tags on lessons / activities).
- `safety_topics` — classifier outputs (per-event labels).

Names enforced unique by `no-cross-domain-name-collision` validator rule.

## 2. Over-normalization watches (review post-launch)

### `safety_blocklist_entries` cardinality

Plan §13 flag: blocklist may be <10k entries — joining at every safety check might be slower than an in-memory cache. Current design loads via `BlocklistCache`; the table is canonical source. Acceptable; revisit if cardinality grows past 100k.

### `household_members` join table

For most households there are 1-2 members. The join table is justified for the role + invite lifecycle but is over-engineered for the 1-member common case. Acceptable — readability + multi-parent support trumps minor duplication.

## 3. Naming improvements already enforced

- Plan Q-1: `users` (sys-01) ≠ `admin_users` (sys-12).
- Plan §13: `parent_notifications_outbox` (sys-07) ≠ `notification_dispatches` (sys-10).
- Plan §13 Q-6: `topics` ≠ `safety_topics`.

All three verified by validator at every `npm run erd:full`.

## 4. Money-type precedent (Phase 3 amendment)

CONVENTIONS §5 amended 2026-05-12 to permit `bigint micros` (sub-cent precision) when a column requires it (per-LLM-call cost attribution). Default remains `bigint cents`. Source columns: `cost_attributions.cost_micros`, `provider_failover_records.cost_micros`. Each column declares the unit in a DBML `Note:`.

## 5. Cross-folder Ref convention

Phase 3 decision: cross-folder `Ref:` lines stay **commented**. Documentation lives in `_shared/cross-domain-data-flow.md`. Rationale: keeps DBML files independently buildable; couples at docs layer only.

Phase 5 cleanup target: **7 LIVE cross-folder Refs** still need to be commented (see `implementation-readiness.md` checklist):

- `docs/erd/03-device-runtime/runtime_boot_reports.dbml:30`
- `docs/erd/03-device-runtime/runtime_local_event_log.dbml:19`
- `docs/erd/03-device-runtime/safe_mode_entries.dbml:37`
- `docs/erd/15-manufacturing/factory_records.dbml:31`
- `docs/erd/15-manufacturing/factory_serial_assignments.dbml:18`
- `docs/erd/09-ota/ota_cohorts.dbml:23`
- `docs/erd/09-ota/ota_releases.dbml:46`

All 7 currently pass `fk-reachable` (target tables exist in the global DBML). The `cross-domain-fk-documented` WARN is cleared because each pair is mentioned in `cross-domain-data-flow.md`. Unwinding to commented form is a stylistic + lane-discipline cleanup.

## 6. Anti-patterns to avoid

Listed once here to prevent regression:

1. **Storing realtime transcripts as JSONB inside `sessions`** — separate `session_transcripts` table with TTL. Transcripts contain PII and need independent retention.
2. **DB-side triggers for COPPA retention** — declare retention in entity markdown frontmatter + drive via `RetentionWorker` cron. Triggers hide business logic from the ERD.
3. **Inline `[ref:]` shorthand** — use explicit `Ref:` lines (CONVENTIONS rule 3 + validator FAIL).
4. **`serial` / `bigserial` PKs** — always `uuid` (CONVENTIONS rule 1 + validator FAIL).
5. **`varchar` without length** — always specify (CONVENTIONS rule 5 + validator FAIL).
6. **`numeric` / `float` for currency** — `bigint cents`, exceptionally `bigint micros` with explicit unit annotation (CONVENTIONS rule 5 + validator FAIL when paired with currency-hint regex).
7. **Cross-domain FK declared on the consuming side** — declare in producer file as a comment (CONVENTIONS rule 3).
8. **Composite index without sequence justification** — composite indexes cite a hot-query sequence in the DBML `Note:` (validator WARN).
9. **Audit-log target FK** — `audit_log.target_table + target_id` are polymorphic by design. Adding FKs would break the abstraction + couple every consumer to every other table.
10. **Status-as-trigger** — state-machine transitions handled in app layer + tracked via `<entity>_status` column. Do NOT add database triggers to enforce transitions; the validator's `state-machine-alignment` rule + entity `.md` Lifecycle section is the documented contract.

## 7. Implicit business logic risks

- **COPPA retention** is a cross-system state machine on `children` + every linked table. Declared explicitly in `children.md` retention frontmatter + `audit-history-strategy.md` cascade rules. Do NOT bury this in a trigger.
- **Refresh-token replay** detection is a cross-row invariant (`status='rotated' → 'replayed'` forces session revoke). App-layer enforced; documented in `refresh_tokens.md`.
- **Single-owner-per-household** invariant: partial unique index in DDL emitter; declared in `household_members.md`.

## 8. Folder boundary discipline

`_shared/` and `_global/` are touched ONLY by Lane A (worker-1) in Phases 3-5. Phase 2 lanes never write here.

`scripts/erd/` (validator + builders) touched only in Phase 1 / Phase 3 (when validator rules change).

`CONVENTIONS.md` amendments require Phase 3 (or later) ownership and a comment block dated to the amendment date.

## 9. Hypertable + retention coupling

Five tables are hypertable candidates (see `audit-history-strategy.md` table). The retention sweep behavior differs by infrastructure choice:

- TimescaleDB hypertables: `drop_chunks()` policy. Cleanest.
- Postgres declarative partitioning: per-partition `DETACH + DROP`. Acceptable.
- Kinesis Firehose → S3 Parquet: lifecycle policy on the bucket. Decouples retention from the OLTP DB but adds analytics-DB latency.

`implementation-readiness.md` lists this as the sys-11 NEEDS CLARIFICATION item; the ERD itself stays infra-agnostic.

## 10. Forward-looking entities (reservations, NOT premature)

- `mfa_secrets` — parent MFA endpoint design pending; entity reserved with `@no-sequence` annotation.
- Three governance tables (deferred to follow-up plan).
- `ca_publish_schedules` (deferred to follow-up plan).
- `wire-protocol-domain-types.dbml` — Type declarations only; codec implementation downstream.

## 11. Out-of-scope items (explicit non-goals)

These were considered and excluded from the ERD scope:

- On-device firmware-only state (FreeRTOS in-RAM buffers) — only persisted backend uploads modelled.
- Transient Redis cache shapes — service-internal.
- Frontend client-side store schemas — projections.
- Migration scripts / Prisma client / SQL DDL emission — follow-up plan `.omc/plans/erd-to-prisma-emission.md` (out of scope for this ERD).
- Index micro-tuning (`EXPLAIN ANALYZE`) — post-launch performance lane.

## 12. Implementation-readiness consequence (high-signal)

- 15 systems READY (build-ready as-is).
- 5 systems NEEDS CLARIFICATION (none block initial implementation; each has a follow-up plan or infra owner).
- 2 systems STATELESS (sys-16 mobile projection, sys-21 testing).
- 0 systems MISSING REQUIREMENTS.

Backend implementation can begin for the 15 READY systems while the 5 clarifications resolve in parallel.

## 13. Pointers

- Plan of record: `.omc/plans/erd-22-systems-design.md`.
- Conventions: `docs/erd/CONVENTIONS.md` (with 2026-05-12 amendment).
- Cross-system docs: `docs/erd/_shared/cross-domain-data-flow.md`.
- This file (§14) — anti-pattern + recommendation catalogue.
- `docs/erd/_global/audit-history-strategy.md` — §10 audit + soft/hard-delete + hypertable.
- `docs/erd/_global/implementation-readiness.md` — §13 per-system classification.
