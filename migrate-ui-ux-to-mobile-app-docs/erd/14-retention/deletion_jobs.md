---
entity: deletion_jobs
domain: 14-retention
service_owner: DeletionExecutor
state_machine: '@inline'
api_endpoints:
  - GET /admin/retention/deletion-jobs/:id
retention: coppa-on-deletion
sequences_referenced_in:
  - docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd
---

# deletion_jobs

## Business purpose

Tracks the **per-household cascade execution** for an active `deletion_requests` row. The cascade is the legally meaningful operation: each `execution_log` entry documents which table was cleared, how many rows, and when. In an FTC audit, this is the "we deleted X rows from Y tables at Z timestamp" evidence.

## Legal foundation

- **COPPA 16 CFR §312.10** — verifiable parental request for deletion of child information.
- **GDPR §17** — right to erasure cascade requirements.

## Ownership rules

- Owner service: `DeletionExecutor`.
- Writers: `DeletionExecutor` cron (hourly) — INSERTs one row per owned household at execution start; updates status + `execution_log` as cascade progresses.
- Readers: admin investigation, FTC audit, sys-12 support drill-down, sys-11 audit-events correlation.

## Lifecycle

- Create: when `deletion_requests.status` transitions to `executing` AND the executor enumerates owned households.
- Update: status advances `requested → grace_period → executing → completed | failed`. `execution_log` appends per step. **Lifecycle.update = append-only on `execution_log`** — once a log entry is in the array it does NOT mutate.
- Delete: NEVER. **Lifecycle.delete = never** — the row is the deletion-method-of-record evidence.

State machine (inline):

```
requested      (placeholder before grace clock starts)
grace_period   (mirrors deletion_requests.grace_period; same window)
  → executing  (executor BEGIN transaction)
    → completed (cascade COMMIT'd)
    → failed   (cascade ROLLBACK; retry next hourly run; status stays grace_period in parent request, BUT this job row records failure detail)
```

## Related APIs

- `GET /admin/retention/deletion-jobs/:id` — admin inspect

## Related sequences

- `docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd` — execution lifecycle

## Validation rules

- `execution_log` schema: array of `{step:int, table:string, rows_affected:int, completed_at:string-iso}` objects. Spec §Deletion Execution lists the 14-step canonical order.
- At most one job per `(deletion_request_id, household_id)` pair (a household is processed once per request).
- When `status='failed'`, `error_message` is required.
- `retry_count` bounded — operationally we cap retries at 24 (one day) before escalating to manual intervention.

## Edge cases

- **Per-household transaction**: each job represents ONE transaction (`BEGIN ... COMMIT`). A parent owning 3 households produces 3 jobs and 3 transactions. Failure of one job does NOT roll back the others.
- **Idempotent retry**: an executor that crashes mid-cascade leaves the transaction unrolled; next run picks the same job (status stays `executing` on partial — DB-level rollback ensures consistency, app-level resume picks the next pending job).
- **Devices unbind, not delete** (spec §Deletion Execution Step 6/7): the cascade NULLs `devices.household_id` and sets status='unassigned' rather than deleting the device row — supports re-pairing after account deletion.
- **Child profiles soft-delete**: Step 9 sets `children.deleted_at` instead of hard delete — the row stays for COPPA audit; sys-01 retention sweep eventually purges after the spec window.
- **Cross-domain FKs** (`household_id`, `child_id`) — declared on producer side (sys-01).
- **Append-only execution_log**: enforced at app layer (no DB trigger). Validator may add a per-row constraint check in Phase 3.
