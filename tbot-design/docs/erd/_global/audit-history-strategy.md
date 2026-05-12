# Audit, History & Retention Strategy (§10)

How the ERD records "who did what when" and "what existed when". Three coexisting audit lanes:

- `_shared/audit_log` — universal mutation ledger (polymorphic).
- `12-admin/admin_commands` — admin-only narrative log (richer per-action).
- `11-telemetry/audit_events` — event stream surfaced to downstream consumers + dashboards.

Each has a distinct write path; the canonical writer is `TelemetryService` audit-logger middleware for `audit_log`, the admin tooling for `admin_commands`, and `AuditBuffer` for `audit_events`.

---

## 1. audit_log (`_shared/`)

Source: `docs/erd/_shared/audit_log.md`.

- **Polymorphic columns**: `target_table` + `target_id` (no FK). Allow-list validated at write time.
- **Trigger**: every privileged write across the platform inserts one row in the same DB transaction as the business write.
- **Retention**: 1y default; 7y for child-data-linked rows (`target_table='children'` or `metadata.child_id` present) per legal hold.
- **Immutability**: DB grants REVOKE UPDATE/DELETE except for `RetentionWorker`.

### What writes to audit_log

Every privileged write path in the platform. Concretely:

- Every endpoint under `POST /v1/auth/*`, `PATCH /v1/me`, `POST /v1/households/*`, `PATCH /v1/children/*`, etc.
- Every admin endpoint under `/admin/*`.
- Every internal service mutation (`MutationHandler` writes the audit row).
- Webhook handlers (Stripe, SES bounce/complaint) emit `audit_log` rows alongside their business writes.

### Polymorphic target validation

App-layer middleware checks `target_table` against the generated allow-list of platform tables (102 entries) at write time. Bad target → write rejected (caller gets 500; this is a programming bug).

## 2. admin_commands (sys-12)

Source: `docs/erd/12-admin/admin_commands.md`.

- Richer per-admin-action record (extra fields: action verb + reason + IP + result).
- INSERT-only (DB grant model identical to audit_log).
- Retention: 7y for SOC-2.

Distinction from `audit_log`: `audit_log` is the universal canonical history; `admin_commands` is the curated admin narrative used by the support dashboard. Both rows exist for the same admin action.

## 3. audit_events (sys-11)

Source: `docs/erd/11-telemetry/audit_events.md`.

- Read-side stream for downstream consumers (cost attribution, compliance exports).
- Sourced from `audit_log` via `AuditBuffer`.
- Retention 1y; redacted PII per sys-11 spec.

## 4. mutation_log (sys-11)

Source: `docs/erd/11-telemetry/mutation_log.md`.

- Service-internal mutation queue.
- Feeds `audit_log` + `audit_events` for the asynchronous fan-out.

---

## Soft-delete entities (retention sweep targets)

Entities with `deleted_at timestamptz` (nullable) and explicit retention frontmatter. sys-14 retention sweep walks these on schedule.

| Entity | Retention | Domain |
|---|---|---|
| `users` | soft (sys-14 sweep) | 01-identity |
| `households` | soft | 01-identity |
| `household_members` | soft | 01-identity |
| `children` | **coppa-on-deletion** | 01-identity |
| `auth_sessions` | soft | 01-identity |
| `refresh_tokens` | soft | 01-identity |
| `mfa_secrets` | soft | 01-identity |
| `devices` | soft | 02-device |
| `sessions` | child-COPPA-bound | 04-realtime |
| `session_transcripts` | TTL + COPPA | 04-realtime |
| `phrase_cache_entries` | soft | 04-realtime |
| `fallback_templates` | soft | 05-safety |
| `daily_summaries`, `weekly_summaries` | COPPA | 06-content, 07-parent |
| `content_personalization_snapshots` | COPPA | 06-content |
| `topic_decay_state` | COPPA | 06-content |
| `parent_notifications_outbox` | soft | 07-parent |
| `parent_controls`, `usage_caps` | soft | 07-parent |
| `notification_templates` | soft | 10-notifications |
| `push_tokens` | soft | 10-notifications |
| `subscriptions`, `entitlements` | soft | 19-billing |
| `media_assets` | soft (S3 + DB) | _shared |

## Hard-delete entities (no soft-delete)

| Entity | Retention | Rationale |
|---|---|---|
| `email_verifications`, `password_reset_tokens` | hard, 24h-1h TTL | one-shot tokens; expire cron deletes |
| `admin_sessions` | hard | short-lived sessions; audit lives in `admin_commands` |
| `idempotency_keys` | hard, 24h | dedup TTL; no retention need |
| `outbox_events` | hard, 30d delivered / 90d dead-lettered | bus replay window |
| `feature_flags`, `i18n_strings` | hard | retired entries deleted |

---

## Immutable / append-only entities

These rows MUST NOT be updated after insert. DB grant model REVOKEs UPDATE/DELETE for application roles; only `RetentionWorker` can delete after retention.

| Entity | Source | Notes |
|---|---|---|
| `audit_log` | `_shared/` | polymorphic, universal |
| `admin_commands` | 12-admin | per-action admin log |
| `admin_role_assignments` | 12-admin | new row on revoke, never UPDATE |
| `audit_events` | 11-telemetry | downstream stream |
| `mutation_log` | 11-telemetry | service-internal log |
| `factory_records` | 15-manufacturing | manufacturing provenance |
| `factory_test_results` | 15-manufacturing | per-unit yield |
| `factory_serial_assignments` | 15-manufacturing | serial allocation |
| `device_decommissions` | 02-device | decommission ledger |
| `device_transfers` | 02-device | transfer history (status updates allowed; row never deleted) |
| `config_versions` | 08-config | versioned snapshots |
| `config_push_events` | 08-config | MQTT push log |
| `ota_crash_reports` | 09-ota | crash forensics |
| `ota_pause_decisions` | 09-ota | pause history |
| `notification_receipts` | 10-notifications | delivery receipts |
| `email_sends` | 10-notifications | SES send log |
| `deletion_requests` | 14-retention | user-initiated deletion record |
| `deletion_jobs` | 14-retention | executor run record |
| `backup_snapshots` | 14-retention | backup audit |
| `publication_records` | 20-authoring | publication audit |
| `content_revisions` | 20-authoring | revision history (no rewrite) |
| `key_rotations` | 13-security | rotation ceremony record |
| `safety_pii_redactions` | 05-safety | redaction audit |
| `cost_attributions` | 11-telemetry | finance reconciliation |

---

## Versioning patterns

| Pattern | Versioned entity | Active-version pointer | Notes |
|---|---|---|---|
| Draft → Revision | `content_drafts` ← N `content_revisions` | none (latest by created_at) | revisions immutable |
| Document → Version | `config_documents.current_version_id` → `config_versions.id` | yes | active version per document |
| Secret rotation | `secret_versions` (status=active) | partial-unique index | one active per `secret_name` |
| Key rotation | `kms_keys.rotated_from_id` | chain | active by `status='active'` |
| Refresh token rotation | `refresh_tokens.rotated_to_id` | chain | rotation = new row; predecessor → `status='rotated'` |
| Notification template | `notification_templates` revision-by-content | none | templates retired by setting status |
| OTA release | `ota_releases` immutable record per build | none | rollback = new release with `recall_target` pointer |

## Hypertables (time-series)

| Table | Source | Time col | Interval | Retention |
|---|---|---|---|---|
| `device_heartbeats` | 02-device | `received_at` | 1d | 30d default |
| `telemetry_events` | 11-telemetry | `received_at` | 1h | 90d default + 1y child-linked extension |
| `session_turns` | 04-realtime | `created_at` | 1d | child-COPPA-bound |
| `rate_limit_buckets` | 17-gateway | `window_start` | 1h | 7d |
| `outbox_events` | _shared | `created_at` | 1d | 30d delivered / 90d dead-lettered |

Final commitment to TimescaleDB vs partitioned vanilla vs Kinesis Firehose is deferred to sys-11 implementation-readiness (`implementation-readiness.md`).

## Audit + COPPA hard-delete interaction

When a child profile reaches `coppa-on-deletion`:

1. `deletion_requests` row created (`status='confirmed'`).
2. `deletion_jobs` cascade emits one job per dependent entity (sessions, transcripts, summaries, telemetry rows, etc.).
3. Each job deletes the dependent row(s); meanwhile `audit_log` rows are kept (the act of deletion is audited) but `before_state` PII is redacted at write time.
4. The audit trail of the deletion itself is preserved 7y for compliance.

The `children` row is the SCOPE ANCHOR — every entity that links to `children.id` must declare `retention: coppa-on-deletion` or equivalent.
