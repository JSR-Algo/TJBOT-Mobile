# API ↔ Entity Alignment (§7)

CRUD-mapped index of every public API endpoint that touches each entity. Sourced from `api_endpoints:` frontmatter in entity `.md` files (every entity carries this list or an `@no-api` annotation).

Conventions:

- `C` = Create (POST)
- `R` = Read (GET)
- `U` = Update (PATCH / PUT)
- `D` = Delete (DELETE) — soft-delete in most cases; sys-14 hard-delete is internal
- `*` = endpoint touches the entity but is not strictly CRUD (e.g. login → writes `auth_sessions`)

`@no-api` entities are written exclusively by internal services (queues, workers, cron) — listed at the end.

---

## 01-identity

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `users` | * | ✓ | ✓ | ✓ | `POST /v1/auth/signup`, `POST /v1/auth/login`, `GET /v1/me`, `PATCH /v1/me`, `POST /v1/auth/logout`, `POST /v1/auth/logout-all` |
| `households` | * | ✓ | — | — | `POST /v1/auth/signup`, `GET /v1/households` |
| `household_members` | ✓ | ✓ | — | ✓ | `POST /v1/households/:id/members`, `GET /v1/households` |
| `children` | ✓ | ✓ | ✓ | ✓ | `POST /v1/households/:householdId/children`, `PATCH /v1/children/:childProfileId`, `POST /v1/children/:childProfileId/archive` |
| `auth_sessions` | * | — | * | * | `POST /v1/auth/login` (create), `POST /v1/auth/refresh` (touch), `POST /v1/auth/logout`, `POST /v1/auth/logout-all` |
| `refresh_tokens` | * | — | * | * | inherited from `auth_sessions` |
| `email_verifications` | * | — | * | — | `POST /v1/auth/signup`, `POST /v1/auth/verify-email`, `POST /v1/me/email` |
| `password_reset_tokens` | ✓ | — | * | — | `POST /v1/auth/forgot-password`, `POST /v1/auth/reset-password` |
| `mfa_secrets` | ✓ | — | ✓ | ✓ | `POST /v1/me/mfa/enroll`, `POST /v1/me/mfa/verify`, `DELETE /v1/me/mfa/:id` (forward-looking — `@no-sequence`) |

## 02-device

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `devices` | ✓ | ✓ | ✓ | ✓ | `POST /v1/devices/pair`, `GET /v1/devices`, `PATCH /v1/devices/:id`, `POST /v1/devices/:id/decommission` |
| `device_pairings` | ✓ | ✓ | ✓ | — | `POST /v1/devices/pair`, `GET /v1/devices/pairings/:code` |
| `device_transfers` | ✓ | ✓ | ✓ | — | `POST /v1/devices/:id/transfer/start`, `POST /v1/devices/:id/transfer/accept`, `POST /v1/devices/:id/transfer/cancel` |
| `device_decommissions` | ✓ | ✓ | — | — | `POST /v1/devices/:id/decommission` (append-only) |
| `device_heartbeats` | * | — | — | — | device → `POST /v1/devices/:id/heartbeat` (hypertable write only) |

## 03-device-runtime

All three entities (`runtime_boot_reports`, `runtime_local_event_log`, `safe_mode_entries`) are populated via device-side upload endpoints (`POST /v1/devices/:id/runtime/boot`, `.../runtime/events`, `.../runtime/safe-mode`). Append-only — no R/U/D from the public API.

## 04-realtime

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `sessions` | * | ✓ | * | — | `POST /v1/realtime/sessions/start`, `GET /v1/realtime/sessions/:id`, `POST /v1/realtime/sessions/:id/close` |
| `session_turns` | * | ✓ | * | — | internal — turn writes via realtime WebSocket; read via `GET /v1/realtime/sessions/:id/turns` |
| `session_transcripts` | * | ✓ | — | * | internal write; `GET /v1/realtime/transcripts/:id` (admin); sys-14 redaction cron |
| `phrase_cache_entries` | ✓ | — | ✓ | — | admin-only `POST /admin/phrase-cache` |
| `provider_failover_records` | * | ✓ | — | — | internal append; `GET /admin/realtime/failovers` |

## 05-safety

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `safety_events` | * | ✓ | — | — | internal append via `Orchestrator`; `GET /admin/safety/events` |
| `safety_blocklist_entries` | ✓ | ✓ | ✓ | ✓ | `POST /admin/safety/blocklist`, `GET /admin/safety/blocklist`, `PATCH /admin/safety/blocklist/:id`, `DELETE /admin/safety/blocklist/:id` |
| `safety_topics` | * | ✓ | — | — | `GET /admin/safety/topics` (classifier outputs) |
| `safety_pii_redactions` | * | ✓ | — | — | internal append; admin read |
| `fallback_templates` | ✓ | ✓ | ✓ | * | `POST /admin/safety/fallbacks`, `GET /admin/safety/fallbacks`, `PATCH /admin/safety/fallbacks/:id` |

## 06-content

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `courses` | * | ✓ | * | * | publish-only via authoring pipeline; `GET /v1/content/courses` |
| `levels` | * | ✓ | * | * | publish-only; `GET /v1/content/courses/:id/levels` |
| `units` | * | ✓ | * | * | publish-only; `GET /v1/content/levels/:id/units` |
| `lessons` | * | ✓ | * | * | publish-only; `GET /v1/content/lessons/:id` |
| `activities` | * | ✓ | * | * | publish-only; `GET /v1/content/lessons/:id/activities` |
| `words` | * | ✓ | * | * | publish-only; `GET /v1/content/words` |
| `topics` | * | ✓ | * | * | publish-only |
| `topic_decay_state` | * | ✓ | * | — | internal cron; `GET /v1/me/children/:id/decay` |
| `content_personalization_snapshots` | * | ✓ | — | — | internal append by `ContentService`; admin read |
| `daily_summaries` | * | ✓ | — | — | cron-generated; `GET /v1/children/:id/summary/daily` |

## 07-parent

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `parent_controls` | ✓ | ✓ | ✓ | — | `POST /v1/children/:id/controls`, `GET /v1/children/:id/controls`, `PATCH /v1/children/:id/controls` |
| `usage_caps` | ✓ | ✓ | ✓ | — | `POST /v1/children/:id/caps`, `GET /v1/children/:id/caps`, `PATCH /v1/children/:id/caps/:capId` |
| `weekly_summaries` | * | ✓ | — | — | cron-generated; `GET /v1/children/:id/summary/weekly` |
| `parent_notifications_outbox` | * | ✓ | * | — | internal append; read via `GET /v1/notifications` |

## 08-config

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `config_documents` | ✓ | ✓ | ✓ | — | `POST /admin/config/documents`, `GET /admin/config/documents`, `PATCH /admin/config/documents/:id` |
| `config_versions` | * | ✓ | — | — | append-only via `ConfigAssembler`; admin read |
| `config_cohorts` | ✓ | ✓ | ✓ | ✓ | `POST /admin/config/cohorts`, `GET /admin/config/cohorts`, `PATCH /admin/config/cohorts/:id`, `DELETE` |
| `config_assignments` | ✓ | ✓ | — | — | `POST /admin/config/assignments`, `GET /admin/config/assignments` |
| `config_signing_keys` | ✓ | ✓ | ✓ | — | `POST /admin/config/signing-keys`, `GET /admin/config/signing-keys` (KMS-backed; deletes are rotation) |
| `config_push_events` | * | ✓ | — | — | internal append on MQTT push |

## 09-ota

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `ota_releases` | ✓ | ✓ | ✓ | — | `POST /admin/ota/releases`, `GET /admin/ota/releases`, `PATCH /admin/ota/releases/:id` |
| `ota_cohorts` | ✓ | ✓ | ✓ | ✓ | `POST /admin/ota/cohorts`, `GET`, `PATCH`, `DELETE` |
| `ota_assignments` | * | ✓ | * | — | internal — `OtaService` drives; `GET /v1/devices/:id/ota/status` |
| `ota_crash_reports` | * | ✓ | — | — | device-uploaded; admin read |
| `ota_pause_decisions` | ✓ | ✓ | — | — | `CrashMonitorWorker` + admin via `POST /admin/ota/releases/:id/pause` |

## 10-notifications

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `notification_templates` | ✓ | ✓ | ✓ | — | `POST /admin/notifications/templates`, `GET`, `PATCH` |
| `notification_dispatches` | * | ✓ | * | — | `NotificationService` writes; `GET /admin/notifications/dispatches` |
| `notification_receipts` | * | ✓ | — | — | append-only via SQS worker |
| `push_tokens` | ✓ | ✓ | ✓ | ✓ | `POST /v1/me/push-tokens`, `GET`, `PATCH /:id`, `DELETE /:id` |
| `email_sends` | * | ✓ | — | — | append-only via SQS worker |

## 11-telemetry

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `telemetry_events` | * | ✓ | — | — | device-batch ingest; admin read |
| `audit_events` | * | ✓ | — | — | append-only `AuditBuffer`; admin read |
| `cost_attributions` | * | ✓ | — | — | `CostAttributionWorker`; admin read |
| `mutation_log` | * | — | — | — | `MutationHandler` internal; never read by external API |

## 12-admin

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `admin_users` | ✓ | ✓ | ✓ | — | `POST /admin/users`, `GET /admin/users`, `PATCH /admin/users/:id` |
| `admin_sessions` | * | ✓ | * | * | `POST /admin/auth/login`, `POST /admin/auth/logout` |
| `admin_commands` | * | ✓ | — | — | append-only ledger; admin read |
| `safety_investigations` | ✓ | ✓ | ✓ | — | `POST /admin/safety/investigations`, `GET`, `PATCH /:id` |
| `admin_role_assignments` | ✓ | ✓ | * | — | `POST /admin/users/:id/roles`, `DELETE /admin/users/:id/roles/:role` (revoke writes a new row) |

## 13-security

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `kms_keys` | ✓ | ✓ | ✓ | — | `POST /security/keys`, `GET /security/keys`, `POST /security/keys/:id/rotate`, `POST /security/keys/:id/compromise` |
| `secret_versions` | ✓ | ✓ | ✓ | — | `POST /security/secrets/:name/versions`, `.../activate`, `.../retire` |
| `key_rotations` | ✓ | ✓ | — | — | append-only ceremony log written by `POST /security/keys/:id/rotate` |
| `brute_force_lockouts` | ✓ | ✓ | * | * | `POST /security/lockouts`, `DELETE /security/lockouts/:id` |
| `mtls_certificates` | ✓ | ✓ | * | — | `POST /security/certificates`, `POST /security/certificates/:id/revoke` |

## 14-retention

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `deletion_requests` | ✓ | ✓ | * | * | `POST /v1/me/deletion-request`, `GET /v1/me/deletion-request`, `POST /v1/me/deletion-request/cancel` |
| `deletion_jobs` | * | ✓ | * | — | internal — `DeletionExecutor` drives |
| `retention_policies` | ✓ | ✓ | ✓ | — | `POST /admin/retention/policies`, `GET`, `PATCH` |
| `backup_snapshots` | * | ✓ | — | — | cron-generated; admin read |

## 15-manufacturing

All three entities (`factory_records`, `factory_test_results`, `factory_serial_assignments`) are written via `FactoryCLI` against `POST /factory/records`, `POST /factory/records/:id/test-results`, `POST /factory/serials`. Append-only. No public mobile API.

## 17-gateway

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `rate_limit_buckets` | * | — | * | — | implicit — gateway middleware writes |
| `api_keys` | ✓ | ✓ | ✓ | ✓ | `POST /admin/api-keys`, `GET`, `PATCH`, `DELETE` |

## 19-billing

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `subscription_plans` | ✓ | ✓ | ✓ | — | `POST /admin/billing/plans`, `GET /v1/billing/plans`, `PATCH /admin/billing/plans/:id` |
| `subscriptions` | * | ✓ | * | * | `POST /v1/me/subscriptions` (Stripe-mediated), `GET /v1/me/subscriptions`, `POST /v1/me/subscriptions/cancel` |
| `entitlements` | * | ✓ | — | — | resolved + cached; `GET /v1/me/entitlements` |
| `invoices` | * | ✓ | — | — | Stripe-mirrored; `GET /v1/me/invoices` |
| `stripe_customers` | * | ✓ | — | — | implicit — created on first subscription |
| `stripe_webhook_events` | ✓ | ✓ | * | — | `POST /webhooks/stripe` (Stripe → us), idempotent |
| `orders` | ✓ | ✓ | * | — | `POST /v1/me/orders`, `GET /v1/me/orders/:id` |
| `order_items` | * | ✓ | — | — | written as part of `POST /v1/me/orders` |

## 20-authoring

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `content_drafts` | ✓ | ✓ | ✓ | * | `POST /authoring/drafts`, `GET`, `PATCH`, `DELETE` (soft) |
| `content_revisions` | * | ✓ | — | — | append-only on every save |
| `review_assignments` | ✓ | ✓ | ✓ | — | `POST /authoring/reviews`, `GET`, `PATCH` |
| `review_decisions` | ✓ | ✓ | — | — | `POST /authoring/reviews/:id/decision` (append-only) |
| `publication_records` | ✓ | ✓ | * | — | `POST /authoring/publications` (append-only with rollback row) |

## 22-demo

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `demo_devices` | ✓ | ✓ | ✓ | — | `POST /demo/devices`, `GET`, `PATCH` (DemoCLI only) |
| `demo_session_overrides` | ✓ | ✓ | ✓ | * | `POST /demo/sessions/overrides`, `GET`, `PATCH`, `DELETE` |

## `_shared/`

| Entity | C | R | U | D | Endpoints |
|---|---|---|---|---|---|
| `audit_log` | * | * | — | — | `*` — every privileged write across the platform inserts here via shared middleware. No direct admin endpoint. |
| `idempotency_keys` | * | * | * | — | `*` — every idempotent endpoint reads + writes via shared middleware |
| `outbox_events` | * | * | * | — | `*` — every producer service writes; `MutationHandler` / per-service relay reads |
| `feature_flags` | ✓ | ✓ | ✓ | ✓ | `PUT /flags/:key`, `GET /flags` (admin) |
| `i18n_strings` | ✓ | ✓ | ✓ | ✓ | `PUT /i18n/:key/:locale`, `GET /i18n/:locale` |
| `media_assets` | ✓ | ✓ | * | * | `POST /media/upload-url`, `POST /media/:id/finalize`, `GET /media/:id` |

## `@no-api` / cron-only / projection-only entities

- `device_heartbeats` — write-only via device upload; hypertable.
- `runtime_*` (3 entities) — append-only device uploads.
- `mfa_secrets` — endpoints reserved; flow forward-looking; entity carries `@no-sequence`.
- `admin_role_assignments` — auxiliary to admin RBAC; surfaced under `/admin/users/:id/roles`.
- `provider_failover_records`, `safety_events`, `safety_pii_redactions`, `notification_receipts`, `email_sends`, `cost_attributions`, `audit_events`, `mutation_log`, `runtime_boot_reports`, `runtime_local_event_log`, `safe_mode_entries` — all append-only internal writes.

## Stateless / projection-only folders

- `16-mobile/` — projection-only; `ParentApp` consumes endpoints owned by other systems. No new entities.
- `18-wire-protocol/` — Type aliases only; no row state.
- `21-testing/` — `@stateless` annotation; no entities.

## API surface estimate

- Public mobile API: ~60 endpoints across sys-01 / sys-02 / sys-04 / sys-06 / sys-07 / sys-10 / sys-14 / sys-19.
- Admin API: ~70 endpoints across sys-05 / sys-08 / sys-09 / sys-10 / sys-12 / sys-13 / sys-14 / sys-17 / sys-20.
- Internal RPC (no external API): sys-03 (device-uploaded only), sys-11 (telemetry), sys-15 (factory CLI), sys-22 (DemoCLI), `_shared/` middleware.
- Webhooks: `POST /webhooks/stripe` (sys-19), `POST /webhooks/ses` (sys-10 implied).
