---
entity: retention_policies
domain: 14-retention
service_owner: RetentionWorker
state_machine: none
api_endpoints:
  - GET /admin/retention/policies
  - PUT /admin/retention/policies/:id
retention: hard
sequences_referenced_in:
  - docs/sequences/14-retention/cron-job-base-execution.sequence.mmd
  - docs/sequences/14-retention/transcript-redaction-cron.sequence.mmd
---

# retention_policies

## Business purpose

Configuration-as-data: one row per retention rule, binding a target entity (by table name) to its sweep window, method, cron schedule, batch parameters, and legal basis. Externalises the spec §Retention Rules table — admins can adjust retention windows without code changes.

## Cross-references which entities each policy targets

Per spec §Retention Rules, this table covers (non-exhaustive):

| target_table | retention | method | legal_basis |
|---|---|---|---|
| `session_turns` (sys-04 — Lane D) | 24h then 30d | redact_in_place → hard_delete | COPPA §312.10 (24h redaction P0) |
| `sessions` (sys-04 — Lane D) | 90d | hard_delete | best practice |
| `daily_summaries` (sys-06 — Lane E) | 90d | hard_delete | best practice |
| `weekly_summaries` (sys-07 — Lane E) | 90d | hard_delete | best practice |
| `safety_events` (sys-05 — Lane D) | 90d | hard_delete | compliance evidence |
| `notification_dispatches` (sys-10 — Lane F) | 90d | hard_delete | best practice |
| `ota_assignments` (sys-09 — Lane F) | 365d | hard_delete | business need |
| `cost_attributions` (sys-11 — Lane F) | 365d | hard_delete | business need |
| `audit_events` (sys-11 — Lane F) | 365d | hard_delete (consent/deletion excluded) | compliance evidence |
| `telemetry_events` (sys-11 — Lane F) | 90d | hypertable_drop_chunks | best practice |
| `mutation_log` (sys-11 — Lane F) | 30d | hard_delete | operational |
| `config_push_events` (sys-08 — Lane F) | 30d | hard_delete | operational |
| `children` (sys-01 — Lane B) | until_parent_deletes | soft_delete then sys-14 cascade | COPPA §312.10 |
| `users` (sys-01 — Lane B) | until_deletion + 30d grace | soft_delete + anonymise | COPPA §312.10 + GDPR §17 |

## Ownership rules

- Owner service: `RetentionWorker`.
- Writers: admin console (`PUT /admin/retention/policies/:id`), DB migration seeds.
- Readers: `RetentionWorker` at startup + every cron tick.

## Lifecycle

- Create: at deploy via migration seed; rarely added later.
- Update: admin tweaks (window, batch size). Each update SHOULD be audited via sys-11 `audit_events`.
- Delete: hard delete only when a target entity is removed from the product.

## Related APIs

- `GET /admin/retention/policies` — list
- `PUT /admin/retention/policies/:id` — edit window / cron / batch

## Related sequences

- `docs/sequences/14-retention/cron-job-base-execution.sequence.mmd` — every cron read
- `docs/sequences/14-retention/transcript-redaction-cron.sequence.mmd` — specifically for the 24h redaction policy

## Validation rules

- `target_table` unique across active rows — one policy per entity.
- `cron_expression` is a valid AWS EventBridge cron / rate expression.
- `retention_seconds > 0`; minimum 1 hour to avoid accidental aggressive sweeps.
- `legal_basis` REQUIRED for any policy targeting child data (validated in app layer against the COPPA-scoped entity set).

## Edge cases

- **transcript_text P0**: spec §Retention Rules makes `transcript_redaction` the single most legally sensitive job. Validator (future Phase) hard-fails if its `cron_expression` is anything weaker than `rate(1 hour)` or its `retention_seconds` is anything other than 86400 (24h).
- **Polymorphic target**: `target_table` is a varchar — no FK because policies span every lane. Phase 3 documents this design choice in `_shared/cross-domain-data-flow.md`.
- **Soft-disable** vs delete: setting `active=false` halts the cron without losing the historical record of what the policy was — preferable to deletion.
- **Hypertable jobs** (`method='hypertable_drop_chunks'`): the worker calls `drop_chunks` on the TimescaleDB hypertable (e.g. `telemetry_events`) rather than per-row DELETE. The `batch_size` is ignored for this method.
- **S3 lifecycle**: `method='s3_lifecycle'` policies are informational — the actual enforcement is the S3 bucket lifecycle config, not RetentionWorker. Recorded here for compliance audit visibility.
