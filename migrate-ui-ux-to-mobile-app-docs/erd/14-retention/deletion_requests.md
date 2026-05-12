---
entity: deletion_requests
domain: 14-retention
service_owner: AccountDeletionService
state_machine: '@inline'
api_endpoints:
  - POST /v1/account/delete
  - POST /v1/account/cancel-deletion
  - GET /v1/account/deletion-status
retention: coppa-on-deletion
sequences_referenced_in:
  - docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd
---

# deletion_requests

## Business purpose

The legal record that a parent's right of deletion was exercised. Captures the request, the 30-day grace period, the cancel option, and the eventual execution timestamp. Spec calls this the "compliance audit trail proving deletion occurred" — this entity is the answer to "show me proof you deleted my child's data" in an FTC audit.

## Legal foundation

- **COPPA 16 CFR §312.10** — parents must be able to delete information collected from a child.
- **GDPR §17** — right to erasure (where applicable to EU residents).

This entity is retained INDEFINITELY (no automatic deletion). Even after the cascade in `deletion_jobs` completes, this row remains as legal proof. **`retention: coppa-on-deletion`** here means "this row triggers COPPA-scoped deletion of OTHER tables; the row itself is the deletion proof and survives".

## Ownership rules

- Owner service: `AccountDeletionService`.
- Writers: `POST /v1/account/delete` (INSERT `pending` → `grace_period` in one transaction); cancel endpoint (UPDATE `status='cancelled'`); `DeletionExecutor` (UPDATE `status` through `executing → completed | failed`).
- Readers: parent app deletion-status view, admin investigation, sys-12 support, FTC audit export.

## Lifecycle

- Create: parent issues `POST /v1/account/delete` (password re-confirmation required).
- Update: status advances `pending → grace_period → executing → completed | failed`; or `grace_period → cancelled` if the parent cancels.
- Delete: NEVER. **Lifecycle.delete = never** — the row is the compliance evidence.

State machine (inline):

```
pending     (transient — created inside the transaction before commit)
  → grace_period (committed; 30-day clock starts)
  → cancelled (parent cancels via email link or by re-login)
  → executing (DeletionExecutor picks up after grace_period_ends_at)
    → completed (cascade succeeds)
    → failed (cascade rolls back; retried next hourly run)
```

## Related APIs

- `POST /v1/account/delete` — INSERT
- `POST /v1/account/cancel-deletion` — UPDATE `cancelled_at`, status='cancelled'
- `GET /v1/account/deletion-status` — read

## Related sequences

- `docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd` — full lifecycle

## Validation rules

- One ACTIVE request per parent — enforced at INSERT time by `idx_deletion_requests_parent_status` filtered query (no existing row with `status ∈ {pending, grace_period, executing}`).
- `grace_period_ends_at` MUST be `requested_at + 30 days` exactly (COPPA-compliant grace window).
- When `scope_kind='child_profile'`, `child_id` is required AND must reference a child owned by `parent_account_id`'s household.
- `cancel_token_hash` is sha256 of a signed one-time token — token sent in the confirmation email.

## Edge cases

- **Account-delete cancels via re-login**: per spec, re-login during grace period also cancels (UX-friendly). The login handler in sys-01 checks for active `grace_period` row and calls the cancel endpoint server-side.
- **Email-failure resilience**: if the confirmation email fails to send (`email_send_failure`), the deletion is still scheduled — only a P2 alert fires (spec sequence). The cancel link is the only blocker for confused-parent recovery, so SLA on the email is tight.
- **Executor partial failure** (sys-14 account-deletion-pipeline `executor_partial_failure`): the per-household transaction rolls back; row stays at `grace_period` (NOT `failed`) so the next hourly run retries automatically. `failed` is reserved for permanent errors (e.g. corrupt FK references).
- **Child-scope deletion (`scope_kind='child_profile'`)**: cascades child's session_turns, sessions, summaries, safety_events, cost_attributions, telemetry rows — but does NOT delete the household or parent account. Treated by `DeletionExecutor` as a narrower cascade.
- **Cross-domain FKs**: `parent_account_id` → sys-01 users; `child_id` → sys-01 children. Declared on producer side. Phase 3 records this in `_shared/cross-domain-data-flow.md`.
