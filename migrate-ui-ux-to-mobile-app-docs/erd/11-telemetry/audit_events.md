---
entity: audit_events
domain: 11-telemetry
service_owner: TelemetryService
state_machine: none
api_endpoints:
  - GET /admin/audit/search
  - GET /admin/audit/export
retention: 365d
sequences_referenced_in:
  - docs/sequences/11-telemetry/audit-log-write-path.sequence.mmd
  - docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd
---

# audit_events

## Business purpose

The COPPA compliance audit trail. One row per mutation across every service that goes through the audit middleware. Designed to serve as evidence in an FTC investigation. Polymorphic on target — a single row may point at `users`, `children`, `devices`, `sessions`, `ota_releases`, etc.

## Ownership rules

- Owner service: `TelemetryService` (operationally owns the table); writes performed by every service via `AuditBuffer`.
- Writers: `AuditBuffer` only (via DB role `audit_writer` — INSERT-only privilege).
- Readers: admin search/export (`audit_admin` role — DELETE + SELECT); sys-14 retention sweep (excludes consent/deletion events).

## Lifecycle

- Create: every mutation through the audit middleware writes a row (buffered, flushed at 100 entries or 5s).
- Update: NEVER — append-only invariant enforced by `audit_writer` role lacking UPDATE permission.
- Delete: 1-year retention via sys-14 `audit_log_cleanup`. EXCLUDES consent and deletion-related actions (retained indefinitely as legal proof). **Immutable record** annotation: rows are immutable for their lifetime.

**Lifecycle.update = never.**

## Related APIs

- `GET /admin/audit/search` — admin search by actor / resource / action
- `GET /admin/audit/export` — admin export for compliance investigation

## Related sequences

- `docs/sequences/11-telemetry/audit-log-write-path.sequence.mmd` — buffered INSERT path
- `docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd` — deletion writes audit rows that survive cleanup

## Validation rules

- `target_table` MUST be a known entity name (validated against the ERD's registered table set; not enforced by DB).
- `target_id` is uuid; polymorphic — NO FK constraint. Phase 3 documents this as an intentional design choice.
- `action` follows `verb_noun` convention; admin search relies on this format.
- `actor_kind` ∈ {`parent`, `admin`, `system`, `device`} (spec §Audited Actions).

## Edge cases

- **Append-only invariant**: DB role `audit_writer` grants INSERT only. If any service attempts UPDATE / DELETE on `audit_events`, the query fails with permission denied — sys-11 audit-log-write-path failure path `role_permission_denied` raises a P1 alert.
- **Fallback** path: when batch INSERT fails 3× with backoff (spec retry policy 200/400/800ms), entries are emitted to CloudWatch Logs as structured JSON for offline replay (no data loss).
- **Polymorphic FK absence**: documented intentionally — Phase 3 records this in `_shared/cross-domain-data-flow.md` as "polymorphic — no FK by design". The validator's `fk-reachable` rule does not apply because there's no `Ref:` line.
- **Retention exclusions**: spec §Audit Log Cleanup Exclusions — rows where `action LIKE 'consent_%'` OR `action LIKE 'account_deletion%'` are retained beyond 1 year. The cleanup job filters with a WHERE clause.
- **COPPA**: this row may reference child data (e.g. `target_table='children'`); for child-data audit, the row stays for 1 year for accountability, but `details` MUST NOT contain raw conversation text.
