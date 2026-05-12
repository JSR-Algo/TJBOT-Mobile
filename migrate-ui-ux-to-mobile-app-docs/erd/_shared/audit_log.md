---
entity: audit_log
domain: _shared
service_owner: TelemetryService
state_machine: none
api_endpoints:
  - "*"
retention: 1y
sequences_referenced_in:
  - docs/sequences/11-telemetry/audit-log-write-path.sequence.mmd
  - docs/sequences/12-admin/safety-investigation-w2.sequence.mmd
---

# audit_log

## Business purpose

Platform-wide mutation + admin-action audit ledger. Every privileged write across the 22 backend systems appends one row. Drives compliance exports, support investigations, and the sys-11 audit dashboard.

Distinct from:

- `admin_commands` (sys-12) — admin-only narrative log; admin_commands is a richer per-action record, audit_log is the universal mutation ledger.
- `audit_events` (sys-11) — telemetry-side event stream; audit_events is for downstream consumers, audit_log is the canonical row-level history.
- `mutation_log` (sys-11) — service-internal mutation queue; mutation_log feeds audit_log via the mutation handler.

## Ownership rules

- Owner service: `TelemetryService` (canonical writer of the row via the audit logger middleware); `MutationHandler` and `AuditBuffer` feed it.
- Writers: every service via the shared audit logger middleware. **No write succeeds unless the audit row commits.**
- Readers: support tooling, compliance exports, sys-11 telemetry dashboards.

## Lifecycle

- Create: synchronously inside every privileged write path (single transactional unit with the business write).
- Update: forbidden. DB-side grant REVOKE UPDATE/DELETE except for `RetentionWorker`.
- Delete: only by `RetentionWorker` (sys-14) after 1y default retention (extended to 7y for child-data-touching rows per legal).
- State machine: none — append-only.

## Polymorphic target — design rationale

`target_table` + `target_id` are NOT FK-constrained. Reasons:

1. Adding FKs to 95+ tables forces a huge dependency graph that breaks the per-folder lane partition.
2. Audit must survive target hard-delete (you need the history of a deleted child to investigate retention SLA compliance).
3. Cross-folder Refs are explicitly avoided per CONVENTIONS rule (kept at the documentation layer in `_shared/cross-domain-data-flow.md`).

App-layer validation: the audit logger middleware checks `target_table` against a generated allow-list of table names at write time.

## Related sequences

- `docs/sequences/11-telemetry/audit-log-write-path.sequence.mmd` — write path.
- `docs/sequences/12-admin/safety-investigation-w2.sequence.mmd` — read path for investigations.

## Validation rules

- `action` matches `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$` (verb.noun).
- `target_table` ∈ generated allow-list of platform tables.
- `before_state` + `after_state` PII-redacted at write time per sys-11 retention policy.

## Edge cases

- Audit-amplification: a single business action may emit multiple `audit_log` rows (one per affected table). Acceptable — readers reconstruct by `metadata.transaction_id`.
- Child-data rows (target_table='children' OR linked via metadata.child_id) extend retention to 7y per COPPA + legal hold.
- High-cardinality write path: the audit logger uses `AuditBuffer` (sys-11) to batch writes under load; AuditBuffer guarantees at-least-once delivery and commits the audit row before returning success to the business write.

## Cross-system FK consumers

None — the polymorphic columns are not FKs. See `_shared/cross-domain-data-flow.md` for the documentation-layer cross-references.
