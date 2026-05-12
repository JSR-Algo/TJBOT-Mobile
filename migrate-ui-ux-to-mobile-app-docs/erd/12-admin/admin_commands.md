---
entity: admin_commands
domain: 12-admin
service_owner: AdminCommandService
state_machine: none
api_endpoints:
  - "*"
retention: hard
sequences_referenced_in:
  - docs/sequences/12-admin/device-transfer-w4.sequence.mmd
  - docs/sequences/12-admin/mqtt-remote-command.sequence.mmd
  - docs/sequences/12-admin/safety-investigation-w2.sequence.mmd
---

# admin_commands

## Business purpose

Compliance-grade audit ledger for every admin action: device transfer, user disable, safety investigation step, remote MQTT command, etc. Insert-only — never updated. Hard-deleted only by `RetentionWorker` after the legal retention window has lapsed (typically 7 years).

## Ownership rules

- Owner service: `AdminCommandService` (writes); `RetentionWorker` (eventually deletes).
- Writers: every admin-side write path appends here via shared logger.
- Readers: admin support tooling, compliance exports, sys-11 telemetry consumers.

## Lifecycle

- Create: synchronously inside every admin write path. **No write succeeds unless the audit row commits.**
- Update: forbidden. DB-side grants REVOKE UPDATE/DELETE except for retention worker.
- Delete: only by `RetentionWorker` after retention policy.
- State machine: none.

## Related APIs

Every admin write endpoint. The audit is universal, not endpoint-specific.

## Related sequences

- `docs/sequences/12-admin/device-transfer-w4.sequence.mmd` — transfer-initiated row.
- `docs/sequences/12-admin/mqtt-remote-command.sequence.mmd` — remote-command row.
- `docs/sequences/12-admin/safety-investigation-w2.sequence.mmd` — investigation step rows.

## Validation rules

- `target_id` stored as varchar(120) since target may be a UUID, a slug, or an external reference (Stripe customer, etc.).
- `metadata` schema is per-action-type but is documented in `docs/site/software/systems/12-*` §3 Audit Logger.

## Edge cases

- Write-amplification: every admin action emits 1 audit row + N business writes. SLA bound at app layer (<200ms p95 for audit append).
- Retention: cohabits with `_shared/audit_log` (different scope — `audit_log` is platform-wide; this table is admin-only). Phase 3 may merge if shapes align.
