# Edge Cases (§11)

Catalogue of edge-case patterns the ERD supports, grouped by behavior. Each row cites the supporting entity files plus the implementation mechanism.

## 1. Retry / idempotency

Anchor entity: `_shared/idempotency_keys`.

| Endpoint family | Idempotency key | Window | Source |
|---|---|---|---|
| `POST /v1/auth/signup` | client `X-Request-Id` | 24h | `docs/sequences/01-identity/signup.sequence.mmd` |
| `POST /v1/auth/login`, `/refresh` | client `X-Request-Id` (optional) | 24h | `docs/sequences/01-identity/login.sequence.mmd` |
| `POST /webhooks/stripe` | Stripe `event.id` (natural) | 30d | `docs/erd/19-billing/stripe_webhook_events.dbml` |
| `POST /v1/me/orders` | client `X-Request-Id` | 24h | `docs/erd/19-billing/orders.md` |
| `POST /v1/devices/pair` + `/transfer/*` | pairing code + client request id | 24h | `docs/erd/02-device/device_pairings.md` |
| `POST /v1/me/deletion-request` | user_id natural key (one open per user) | until resolved | `docs/erd/14-retention/deletion_requests.md` |
| outbox publisher | producer-row uniqueness + bus de-dup at consumer | bus retention | `docs/erd/_shared/outbox_events.md` |

State machine: `in_flight → succeeded | failed` on `idempotency_keys`. Response body cached in `response_body jsonb` and replayed verbatim on retry.

## 2. Cancellation / rollback

| Scenario | Mechanism | Entities |
|---|---|---|
| User cancels deletion request | `POST /v1/me/deletion-request/cancel` flips `deletion_requests.status='cancelled'` (only allowed while `status='pending'`) | `deletion_requests`, `deletion_jobs` (none yet emitted) |
| Admin cancels device transfer | `POST /v1/devices/:id/transfer/cancel` flips `device_transfers.status='cancelled'`; FK columns nullify on target side | `device_transfers` |
| OTA release recall | `POST /admin/ota/releases/:id/recall` flips `ota_releases.status='recalled'` + emits `ota_pause_decisions` row | `ota_releases`, `ota_pause_decisions`, `ota_assignments` (each device rolls back via runtime) |
| Authoring publish rollback | `POST /authoring/publications` with `kind='rollback'` (append-only; new row references the original `publication_records`) | `publication_records` |
| Subscription cancellation | `POST /v1/me/subscriptions/cancel` flips `subscriptions.status='cancelled'`; entitlements expire | `subscriptions`, `entitlements` |
| Refresh-token revocation | session row → `status='revoked'`; downstream refresh_tokens to `status='revoked'` | `auth_sessions`, `refresh_tokens` |
| Stripe webhook rejection | `stripe_webhook_events.status='ignored'` | `stripe_webhook_events` |

## 3. Partial failure

| Scenario | Mechanism | Entities |
|---|---|---|
| Outbox relay partial delivery | `outbox_events.status='delivering' → failed → next_attempt_at += backoff`; max-attempts → `dead_lettered` | `outbox_events` |
| Notification fanout partial | Per-recipient receipts; `notification_receipts` row per `recipient + status` | `notification_dispatches`, `notification_receipts` |
| Deletion job partial | Per-resource-kind jobs; one row per dependent table; `deletion_jobs.status='retrying'` with backoff | `deletion_jobs` |
| OTA crash-rate auto-pause partial | Crash-rate windowed counter on `ota_crash_reports`; auto-pause if rate > threshold | `ota_crash_reports`, `ota_pause_decisions` |
| Authoring publish multi-file | Append-only `publication_records` per artefact; rollback row references original | `publication_records` |

## 4. Expiry / TTL

| Entity | TTL column | Default | Cron |
|---|---|---|---|
| `auth_sessions` | `expires_at` | 30d (parent), 12h (admin) | `auth.maintenance.expire_sessions` |
| `refresh_tokens` | `expires_at` | bounded by parent session | `auth.maintenance.expire_tokens` |
| `email_verifications` | `expires_at` | 24h | `auth.maintenance.expire_tokens` |
| `password_reset_tokens` | `expires_at` | 1h | `auth.maintenance.expire_tokens` |
| `idempotency_keys` | `expires_at` | 24h | sys-14 sweep |
| `phrase_cache_entries` | implicit TTL via `last_used_at` | 90d | retention cron |
| `brute_force_lockouts` | `expires_at` | 1h default, 24h max | sys-13 sweep |
| `device_transfers` | `transfer_code_expires_at` | 7d | admin sweep |
| `backup_snapshots` | `expires_at` per `kind` | varies | sys-14 sweep |
| `outbox_events` | `created_at + 30d` (delivered) / `90d` (dead-lettered) | n/a | sys-14 sweep |
| `mtls_certificates` | `expires_at` | up to 5y | sys-13 expiry sweep |
| `secret_versions` | none — but compromised flag triggers re-wrap | n/a | manual |
| `kms_keys` | none — rotation produces successor | n/a | manual |

## 5. Concurrency

| Scenario | Mechanism | Entities |
|---|---|---|
| Concurrent refresh of same session | Advisory lock on `auth_sessions.id` at app layer | `auth_sessions`, `refresh_tokens` |
| Concurrent OTA assignment writes | Unique `(release_id, device_id)` index | `ota_assignments` |
| Concurrent Stripe webhook for same event | Unique `stripe_event_id` index | `stripe_webhook_events` |
| Concurrent rotation of same secret | Advisory lock on `secret_name` | `secret_versions`, `key_rotations` |
| Concurrent role grants | Unique partial index `(admin_user_id, role)` where status=active | `admin_role_assignments` |
| Two parents inviting same email | Unique `(household_id, user_id)` on `household_members` | `household_members` |
| Two devices pairing same code | First-write-wins; pairing code column unique while status=pending | `device_pairings` |

## 6. Soft-delete + hard-delete interaction

Pattern documented in `audit-history-strategy.md`. Edge cases:

- A user soft-deletes (own request) → status `scheduled_for_deletion`. Re-login is blocked. After retention window, sys-14 hard-deletes the row + cascades to children + dependents.
- A child soft-archived (parent action) keeps the row until COPPA window expires; admin can reactivate while `status='archived'`.
- A re-created child (same nickname, same household) is treated as brand-new — no resurrection of personalisation snapshots.
- Stripe customer deletion is via Stripe API call (sys-14 worker emits the side-effect); the local mirror row gets hard-deleted in sys-14 cascade.

## 7. Hot-delete protection (restrict cascade)

Tables that must NEVER be hard-deleted while referenced (audit/compliance evidence):

- `admin_users` — soft-disable only (`status='disabled'`).
- `factory_records` — append-only manufacturing audit; restrict.
- `device_decommissions`, `device_transfers` — restrict cascade.
- `publication_records`, `content_revisions` — content history; restrict.
- `kms_keys` (any state) — never hard-deleted; rotation creates successor.
- `audit_log`, `admin_commands`, `audit_events` — only retention worker.

## 8. Cross-system consistency models

For cross-folder Refs, the consistency model varies by use case. See `_shared/cross-domain-data-flow.md` for the full table. Quick summary:

- `sync-FK` (logical FK, app-enforced): identity / household / device / session refs — read-modify-write atomicity required.
- `replication-via-event` (denormalised snapshot): `cost_attributions`, `session_transcripts.child_profile_id`, `safety_pii_redactions.*`, `telemetry_events.*`, `ota_crash_reports.device_id`. Producer emits an outbox event, consumer materialises the field.
- `eventually-consistent-via-outbox`: parent notifications outbox, billing → entitlement, safety event fanout, deletion job triggers.
- `polymorphic` (no FK by construction): `audit_log.target_id`, `feature_flags.scope_target_id`, `api_keys.owner_id`, `media_assets.owner_service`.

## 9. Privacy / PII handling

| Pattern | Mechanism | Entities |
|---|---|---|
| Transcript redaction | Per-turn redaction by sys-05 PIIDetector at write time; redacted text stored separately | `session_transcripts`, `safety_pii_redactions` |
| `audit_log` PII redaction | Audit logger redacts `before_state`/`after_state` per sys-11 spec | `audit_log` |
| Child data scope-anchor | `children.id` propagates through every dependent table for hard-delete cascade | `children` (anchor), all downstream |
| COPPA right-of-access export | `backup_snapshots` row of `kind='s3_data_export'` with `scope_household_id` set | `backup_snapshots` |
| Email-bounce suppression | SES bounce/complaint → `push_tokens.status='invalid'` + `users.email` suppression flag | `push_tokens`, `email_sends` |

## 10. Conflict edge cases

- **Email change conflict** — token consumed but new email duplicates another `users.email`. Token stays `consumed`; email-change transaction rolls back. User must restart.
- **Concurrent household primary-parent transfer** — first commit wins; second commit fails on `households.primary_parent_id` constraint check.
- **Account-exists response** — 409 returned without leaking which email is on file (sys-01 anti-enumeration).
- **OTA crash threshold race** — `CrashMonitorWorker` snapshots window then decides; multiple workers serialise on advisory lock per `release_id`.
- **Demo device collision with production** — `demo_devices.device_id` may be null until paired; pairing transaction validates production row exists in `devices`.

## 11. Forward-compatibility notes

Entities reserved for upcoming features:

- `mfa_secrets` — parent MFA flow (admin MFA lives in `admin_users.mfa_*`). `@no-sequence` until mobile rolls out.
- `feature_flags` — cohort scope_target_id points at sys-08 `config_cohorts` (read-only cross-reference).
- Three governance tables (`prompt_template_versions`, `safety_policy_versions`, `blocklist_versions`) deferred to `.omc/plans/erd-sys05-governance-tables.md`.
- `ca_publish_schedules` deferred to `.omc/plans/erd-content-authoring-publish-schedule.md`.
- TimescaleDB hypertable commitment deferred to sys-11 readiness.

## 12. Source pointers

- Every edge case above is documented in the producing entity's `.md` `Edge cases` section (entity files cited inline).
- Cross-system consistency: `docs/erd/_shared/cross-domain-data-flow.md`.
- COPPA scope: `docs/erd/01-identity/children.md` + `docs/erd/_global/audit-history-strategy.md`.
- Hot queries motivating indexes: `docs/erd/_global/indexes.md`.
