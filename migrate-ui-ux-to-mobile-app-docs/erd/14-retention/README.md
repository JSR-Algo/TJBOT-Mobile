# 14-retention — Retention + deletion + backup

**System spec:** `docs/site/software/systems/14-data-retention-deletion-backup.md`
**Sequences:** `docs/sequences/14-retention/*.sequence.mmd`
**Owning service(s):** `AccountDeletionService`, `DeletionExecutor`, `RetentionWorker`, `EmailService`
**Lane:** F (worker-5, Phase 2)
**Status:** complete — 4 entities.

## Entities

| Entity | Role |
|---|---|
| `deletion_requests` | Parent-initiated deletion request; legal proof retained INDEFINITELY (COPPA §312.10 + GDPR §17). Lifecycle `pending → grace_period → executing → completed | cancelled | failed`. |
| `deletion_jobs` | Per-household cascade execution tracker with explicit `execution_log` JSONB per step (immutable record). Lifecycle `requested → grace_period → executing → completed | failed`. COPPA legal P0. |
| `retention_policies` | Configuration-as-data: per-entity retention windows, methods, cron, legal basis. Cross-references every retention-bound entity across all lanes. |
| `backup_snapshots` | Manifest of RDS automated/cross-region/manual snapshots + S3 data-export packages (COPPA §312.6 right-of-access). |

## COPPA / GDPR legal posture

- `deletion_requests` and `deletion_jobs` are **never deleted** — they are the right-of-deletion proof.
- `audit_events` (sys-11) excludes consent / deletion actions from the 1-year cleanup — they are retained indefinitely.
- `retention_policies.legal_basis` cites the controlling regulation for every child-data entity.

## Stateless service annotations

- `@stateless: EmailService` — outbound SES wrapper; writes `email_sends` rows owned by Lane F / sys-10.

## BackendService note

- `@stateless: BackendService` — generic placeholder in `_actors.md` for unspecified service in some sequence files; no entity ownership.
