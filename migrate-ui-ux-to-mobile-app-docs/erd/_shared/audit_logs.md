---
entity: audit_logs
domain: _shared
service_owner: TelemetryService
state_machine: none
api_endpoints:
  - GET /admin/audit-logs
  - GET /v1/parent/audit-logs
sequences_referenced_in:
  - docs/sequences/07-parent/parent-gate-validate.sequence.mmd
  - docs/sequences/01-identity/account-delete.sequence.mmd
  - docs/sequences/19-billing/subscription-lifecycle.sequence.mmd
  - docs/sequences/11-telemetry/audit-log-write-path.sequence.mmd
retention: 7y
---

# audit_logs

## Business purpose

Cross-cutting structured event log for privileged domain actions: parent authentication, subscription mutations, content-entitlement grants, account deletion, and other compliance-sensitive writes. Used by parent-gate validation, sys-11 compliance exports, and account-deletion audits.

**Distinction from `audit_log`** (also in `_shared/`):
- `audit_log` — platform-wide mutation ledger; polymorphic `action`+`target_table`+`target_id`; driven by the audit logger middleware wrapping every privileged write; owned by TelemetryService/sys-11 + AdminService/sys-12.
- `audit_logs` — structured domain-event log; typed `actor_type` + `event_type` vocabulary; richer request context (`ip`, `user_agent`, `request_id`, `actor_session_jti`); designed for parent-gate compliance, COPPA/GDPR audit exports, and account-delete evidence collection.

The two tables coexist. High-volume domain writes may emit to both; compliance tooling queries `audit_logs` for the structured event stream.

## Ownership rules

- Owner service: `TelemetryService`
- Writers: every service that handles a compliance-sensitive action, via the shared audit middleware. Key emitters: `IdentityService` (auth events), `BillingService` (subscription+order mutations), `ControlsService` (entitlement grants), `AccountDeletionService` (deletion events)
- Readers: `TelemetryService` (compliance exports), `AdminConsole` (admin audit view), `AccountDeletionService` (evidence collection during deletion), `ParentApp` (parent-facing audit history for their own account)

## Lifecycle

- Create: synchronously on every compliance-sensitive write. Audit row is committed in the same database transaction as the business write. If the audit insert fails, the transaction rolls back.
- Update: forbidden. DB-side grant: `REVOKE UPDATE, DELETE ON audit_logs FROM application_role`. Only `RetentionWorker` (sys-14) may delete rows after the 7-year window.
- Delete: `RetentionWorker` purges rows with `created_at < now() - interval '7 years'` during retention sweeps. Rows touching COPPA-regulated child data are extended per legal hold.
- State machine: none — append-only.

## Notes

### TimescaleDB hypertable

`audit_logs` is high-volume append-only (millions of rows per day at fleet scale). The table is declared as a TimescaleDB hypertable partitioned by `created_at` with 7-day chunks:

```sql
SELECT create_hypertable('audit_logs', 'created_at', chunk_time_interval => INTERVAL '7 days');
```

This annotation is carried in the DBML as `-- Note: @timescaledb-hypertable(column=created_at, interval='7d')`. Emission tooling reads this annotation.

### No FK on `actor_user_id`

`actor_user_id` is NOT FK-constrained to `users.id`. Rationale:

1. Audit rows must survive user hard-delete (compliance retention mode — row must outlive the user for 7 years post-deletion).
2. `actor_type = system` or `cron` has NULL `actor_user_id` — partial FK not expressible without application-layer enforcement.
3. Cross-domain integrity enforced at write time: the audit middleware validates `actor_user_id` against the session JWT before emit.

### Partial index on `subject_id`

`idx_audit_logs_subject` ideally has predicate `WHERE subject_id IS NOT NULL`. DBML cannot express this natively. Migration adds:

```sql
CREATE INDEX idx_audit_logs_subject_partial
  ON audit_logs(subject_type, subject_id)
  WHERE subject_id IS NOT NULL;
```

### `event_type` vocabulary

Dot-delimited `domain.action.qualifier` — e.g.:
- `parent.auth.success`, `parent.auth.failure`
- `subscription.created`, `subscription.canceled`, `subscription.reactivated`
- `account.deletion.requested`, `account.deletion.completed`
- `entitlement.granted`, `entitlement.revoked`
- `coppa.consent.accepted`, `coppa.consent.revoked`

The allow-list is maintained in the sys-11 spec. Unknown event_types are rejected by the audit middleware.

## Related APIs

- `GET /admin/audit-logs` — admin compliance export with filters (event_type, actor_user_id, date range)
- `GET /v1/parent/audit-logs` — parent-facing audit history (own account events only; rate-limited)

## Related sequences

- `docs/sequences/07-parent/parent-gate-validate.sequence.mmd` — parent auth audit events
- `docs/sequences/01-identity/account-delete.sequence.mmd` — deletion audit trail
- `docs/sequences/19-billing/subscription-lifecycle.sequence.mmd` — subscription mutation events
- `docs/sequences/11-telemetry/audit-log-write-path.sequence.mmd` — write path + middleware

## Validation rules

- `event_type` must match the allow-list in sys-11 spec (audit middleware enforces at write time).
- `actor_type = system` or `cron` → `actor_user_id` must be NULL (enforced in middleware).
- `actor_type = parent | admin | support` → `actor_user_id` must be non-NULL.
- `updated_at` always equals `created_at` — immutable after insert.
- `payload` shape validated per `event_type` by the audit middleware before insert.

## Edge cases

- **High-volume writes**: `AuditBuffer` (sys-11) batches inserts under load; guarantees at-least-once delivery.
- **Child-data rows**: rows where `subject_type = 'children'` or `payload` contains `child_id` extend to 7-year minimum per COPPA + legal hold.
- **Account deletion**: `AccountDeletionService` reads all `audit_logs` rows for `actor_user_id = deleted_user_id` as evidence before initiating deletion; the rows are NOT deleted during the scrub — they outlive the user.
- **Compliance export**: `TelemetryService` streams rows in batches by `(event_type, created_at)` using the `idx_audit_logs_event_type_created` index; hypertable chunk exclusion keeps exports fast.
