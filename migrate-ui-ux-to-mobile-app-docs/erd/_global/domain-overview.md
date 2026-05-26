# Domain Overview (§1)

Per-system summary of every folder in `docs/erd/`. One row per backend system; the 23rd row is the cross-cutting `_shared/` cluster. Entity counts taken from the final Phase 3 tree (102 entity tables).

## Domain map

| Folder | System spec | Owning service(s) | Entities | Purpose |
|---|---|---|---|---|
| `01-identity/` | `docs/site/software/systems/01-identity-household-access.md` | `IdentityService` | 9 | Adult identity, household trust boundary, child profiles, auth sessions, refresh / verification / reset tokens, MFA secrets. Root ownership boundary for the platform. |
| `02-device/` | `docs/site/software/systems/02-device-provisioning-registry.md` | `DeviceService`, `OfflineSweepWorker`, `DecommissionWorker`, `TransferWorker` | 5 | Device registry, pairing state, household transfers, decommission ledger, heartbeats. |
| `03-device-runtime/` | `docs/site/software/systems/03-device-runtime-local-interaction.md` | `RuntimeApp` (device-local) | 3 | Backend records of device boot reports, uploaded local-event batches, safe-mode entries. |
| `04-realtime/` | `docs/site/software/systems/04-realtime-session-orchestrator.md` | `RealtimeService`, `Orchestrator`, `ControlPlane`, `PhraseCache`, `RetentionScheduler` | 5 | Realtime sessions, per-turn record, transcript artefacts (TTL-bound), phrase cache, provider failover events. |
| `05-safety/` | `docs/site/software/systems/05-conversation-intelligence-and-safety.md` | `SafetyService`, `BlocklistCache`, `TopicClassifier`, `PIIDetector`, `FallbackTemplateStore` | 5 | Safety events, classifier outputs (safety topics — distinct from sys-06 topics), blocklist entries, PII redactions, curated fallback templates. |
| `06-content/` | `docs/site/software/systems/06-content-and-personalization.md` | `ContentService`, `SummaryService`, `DecayScheduler`, `ModerationWorker` | 10 | Course → level → unit → lesson → activity → word hierarchy, topic taxonomy, per-child decay state, personalisation snapshots, daily summaries. |
| `07-parent/` | `docs/site/software/systems/07-parent-controls-summary.md` | `ControlsService`, `SummaryWorker` | 4 | Per-household controls, per-child usage caps, weekly summaries, parent notifications outbox. |
| `08-config/` | `docs/site/software/systems/08-config-fleet-management.md` | `ConfigService`, `ConfigAssembler`, `ConfigSigner`, `CohortResolver`, `SchemaTransformer` | 6 | Logical config documents + versions, rollout cohorts, cohort → device assignments, KMS signing-key metadata, MQTT push events. |
| `09-ota/` | `docs/site/software/systems/09-ota-release-management.md` | `OtaService`, `CrashMonitorWorker` | 5 | OTA release records, cohorts, per-device assignments, crash reports, auto-pause decisions. |
| `10-notifications/` | `docs/site/software/systems/10-notification-delivery.md` | `NotificationService` | 5 | Notification templates, per-recipient dispatches, delivery receipts, FCM/APNs tokens, SES send log. |
| `11-telemetry/` | `docs/site/software/systems/11-telemetry-audit-cost.md` | `TelemetryService`, `AuditBuffer`, `MutationHandler`, `CostAttributionWorker` | 4 | Telemetry-event hypertable, audit-events stream, per-session cost attribution, mutation-handler log. |
| `12-admin/` | `docs/site/software/systems/12-support-admin-operations.md` | `AdminAuthService`, `AdminCommandService`, `SafetyInvestigationService`, `DeviceTransferService` | 5 | Admin identity (distinct from `users`), admin sessions (MFA-bound), append-only admin-command audit, safety-investigation case files, RBAC role-assignment history. |
| `13-security/` | `docs/site/software/systems/13-security-secrets-management.md` | `SecurityService`, `SecretsCache`, `BruteForceDetector`, `CertificateVerifier` | 5 | KMS / YubiHSM key metadata, application-secret version history, key-rotation audit, brute-force lockouts, device mTLS certificates. |
| `14-retention/` | `docs/site/software/systems/14-data-retention-deletion-backup.md` | `AccountDeletionService`, `DeletionExecutor`, `RetentionWorker`, `EmailService` | 4 | Account-deletion requests, deletion-job executor records, retention policies, backup snapshots. |
| `15-manufacturing/` | `docs/site/software/systems/15-manufacturing-provisioning-factory-test.md` | `FactoryCLI`, manufacturing workflows | 3 | Per-unit factory record, factory-test results, serial-number allocation ledger. |
| `16-mobile/` | `docs/site/software/systems/16-parent-mobile-application.md` | `ParentApp` (consumer surface) | 0 — projection-only | Mobile app reads/writes entities owned elsewhere (mostly sys-01, sys-02, sys-06, sys-07, sys-19). No backend tables; folder documents the projection. |
| `17-gateway/` | `docs/site/software/systems/17-api-gateway-rate-limiting.md` | `Gateway / WAF` | 2 | Rate-limit buckets, API keys. (`idempotency_keys` promoted to `_shared/` per plan §3 Q-5.) |
| `18-wire-protocol/` | `docs/site/software/systems/18-wire-protocol-domain-types.md` | shared types | 1 type file | No persistent rows. The folder hosts a single `wire-protocol-domain-types.dbml` declaring shared `Type` aliases (session-id, turn-id) used by sys-04 + sys-18 device runtime. |
| `19-billing/` | `docs/site/software/systems/19-billing-subscription.md` | `BillingService` | 8 | Subscriptions + plans, resolved entitlements, invoices, Stripe customer mirror + webhook idempotency log, one-time orders + items. |
| `20-authoring/` | `docs/site/software/systems/20-content-authoring-review.md` | `AuthoringService`, `ReviewerConsole`, `AuthoringConsole` | 5 | Pre-publish drafts, revision history, reviewer assignments, reviewer decisions, publication audit log. |
| `21-testing/` | `docs/site/software/systems/21-integration-test-infrastructure.md` | `CI` | 0 — stateless | No persistent backend rows. Folder reserved with `@stateless` annotation. |
| `22-demo/` | `docs/site/software/systems/22-demo-retail-mode.md` | `DemoCLI` | 2 | Retail-demo device registry, demo session overrides. |
| `_shared/` | n/a (Lane A) | platform-wide | 6 | `audit_log` (polymorphic mutation ledger), `idempotency_keys` (request dedup), `outbox_events` (transactional fanout), `feature_flags` (gates), `i18n_strings` (backend translations), `media_assets` (DB + S3). |

**Total: 102 entity tables across 22 systems + `_shared/`.**

## Cross-link index — every entity file

For each system, the entity `.md` files are linked below. Each `.md` carries frontmatter (`entity`, `domain`, `service_owner`, `state_machine`, `api_endpoints`, `sequences_referenced_in`, `retention`) plus a body documenting business purpose, ownership, lifecycle, related APIs, related sequences, validation, edge cases.

- `01-identity/` — [users](../01-identity/users.md), [households](../01-identity/households.md), [household_members](../01-identity/household_members.md), [children](../01-identity/children.md), [auth_sessions](../01-identity/auth_sessions.md), [refresh_tokens](../01-identity/refresh_tokens.md), [email_verifications](../01-identity/email_verifications.md), [password_reset_tokens](../01-identity/password_reset_tokens.md), [mfa_secrets](../01-identity/mfa_secrets.md)
- `02-device/` — devices, device_pairings, device_transfers, device_decommissions, device_heartbeats
- `03-device-runtime/` — runtime_boot_reports, runtime_local_event_log, safe_mode_entries
- `04-realtime/` — sessions, session_turns, session_transcripts, phrase_cache_entries, provider_failover_records
- `05-safety/` — safety_events, safety_blocklist_entries, safety_topics, safety_pii_redactions, fallback_templates
- `06-content/` — courses, levels, units, lessons, activities, words, topics, topic_decay_state, content_personalization_snapshots, daily_summaries
- `07-parent/` — parent_controls, usage_caps, weekly_summaries, parent_notifications_outbox
- `08-config/` — config_documents, config_versions, config_cohorts, config_assignments, config_signing_keys, config_push_events
- `09-ota/` — ota_releases, ota_cohorts, ota_assignments, ota_crash_reports, ota_pause_decisions
- `10-notifications/` — notification_templates, notification_dispatches, notification_receipts, push_tokens, email_sends
- `11-telemetry/` — telemetry_events, audit_events, cost_attributions, mutation_log
- `12-admin/` — [admin_users](../12-admin/admin_users.md), [admin_sessions](../12-admin/admin_sessions.md), [admin_commands](../12-admin/admin_commands.md), [safety_investigations](../12-admin/safety_investigations.md), [admin_role_assignments](../12-admin/admin_role_assignments.md)
- `13-security/` — [kms_keys](../13-security/kms_keys.md), [secret_versions](../13-security/secret_versions.md), [key_rotations](../13-security/key_rotations.md), [brute_force_lockouts](../13-security/brute_force_lockouts.md), [mtls_certificates](../13-security/mtls_certificates.md)
- `14-retention/` — deletion_requests, deletion_jobs, retention_policies, backup_snapshots
- `15-manufacturing/` — factory_records, factory_test_results, factory_serial_assignments
- `17-gateway/` — rate_limit_buckets, api_keys
- `19-billing/` — subscriptions, subscription_plans, entitlements, invoices, stripe_customers, stripe_webhook_events, orders, order_items
- `20-authoring/` — content_drafts, content_revisions, review_assignments, review_decisions, publication_records
- `22-demo/` — demo_devices, demo_session_overrides
- `_shared/` — [audit_log](../_shared/audit_log.md), [idempotency_keys](../_shared/idempotency_keys.md), [outbox_events](../_shared/outbox_events.md), [feature_flags](../_shared/feature_flags.md), [i18n_strings](../_shared/i18n_strings.md), [media_assets](../_shared/media_assets.md)

## Notes

- `_global/global-erd.dbml` concatenates every domain `.dbml` into a single buildable DBML for tooling consumption.
- `_global/global-erd.mmd` renders the same set as a Mermaid `erDiagram` (101 tables, 75 declared Refs).
- Stateless folders (`16-mobile/`, `21-testing/`) carry a single README declaring scope but no entity files.
