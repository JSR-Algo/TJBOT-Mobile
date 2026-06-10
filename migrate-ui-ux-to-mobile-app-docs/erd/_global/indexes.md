# Indexes (§9)

Index catalogue for the 102-entity ERD. Index naming follows CONVENTIONS §4 — `idx_<table>_<columns>_<purpose>` for non-unique, plus unique indexes in a separate `Indexes { ... [unique] }` block.

Counts (from `global-erd.dbml`):

- Total declared indexes: **258**
- Unique indexes: **64**
- Composite indexes: ~140
- Single-column indexes: ~118

Composite indexes MUST cite a motivating sequence file in the DBML `Note:` per the `index-justified` validator rule (WARN). 4 composite indexes still lack a sequence citation — listed at the bottom under "Phase 5 cleanup".

## Index purpose classification

| Purpose | Definition | Sample |
|---|---|---|
| `lookup` | Single-column lookup on an FK or natural key | `idx_users_email_unique` |
| `FK` | Index on a foreign-key column (cascade-aware) | `idx_household_members_user_status` |
| `uniqueness` | Constraint-enforcing unique index | `idx_users_email_unique` |
| `composite-hot` | Composite index for a documented hot query | `idx_sessions_household_status_created_at` |
| `partial` | Conditional index (filter clause in DDL emitter) | `idx_brute_force_lockouts_expires_at` (status = active) |
| `time-series` | Index on `created_at` / `occurred_at` for retention sweep | `idx_audit_log_occurred_at_desc` |

## Highlighted indexes by lane

The full catalogue is queryable from the global DBML. Below is a curated index showing the highest-traffic composite indexes per domain, each citing a motivating sequence (per the `index-justified` rule).

### 01-identity

- `idx_users_email_unique` — RFC 5321 case-insensitive email lookup on every login.
- `idx_users_status_created_at` — `login.sequence.mmd` admin list of active accounts.
- `idx_household_members_user_status` — `login.sequence.mmd` resolves accessible households for `/v1/me`.
- `idx_household_members_household_role_status` — `child-profile-create.sequence.mmd` authz gate.
- `idx_auth_sessions_user_status` — `token-refresh.sequence.mmd` `/logout-all`.
- `idx_refresh_tokens_session_status` — `token-refresh.sequence.mmd` active generation per session.
- `idx_children_household_status_created_at` — `child-profile-create.sequence.mmd`.

### 02-device

- `idx_devices_household_status` — device dashboard scoped per household.
- `idx_device_pairings_code_status` — pairing-flow polling.
- `idx_device_transfers_target_household_status` — incoming transfer claim.
- `idx_device_heartbeats_device_received_at` — hypertable time-series; powers admin "last seen".

### 03-device-runtime

- `idx_runtime_boot_reports_device_received_at` — admin / OTA crash investigation.
- `idx_runtime_local_event_log_device_uploaded_at` — sweep-and-relay.
- `idx_safe_mode_entries_device_entered_at` — safe-mode-investigation flow.

### 04-realtime

- `idx_sessions_household_status_started_at` — household session list (parent app).
- `idx_session_turns_session_status` — `turn-pipeline.sequence.mmd` turn streaming.
- `idx_session_transcripts_session_turn_id` — transcript fetch per turn.
- `idx_phrase_cache_entries_intent_locale_status` — `provider-failover.sequence.mmd` cache lookup.
- `idx_provider_failover_records_session_started_at` — failover incident audit.

### 05-safety

- `idx_safety_events_session_severity_created_at` — `output-filter.sequence.mmd` triage.
- `idx_safety_blocklist_entries_origin_status` — `policy-publish.sequence.mmd`.
- `idx_safety_topics_classifier_run_id` — `generation-pipeline.sequence.mmd`.
- `idx_safety_pii_redactions_child_session_id` — COPPA sweep.

### 06-content

- `idx_lessons_unit_status_order` — published-curriculum query.
- `idx_words_lesson_lemma` — word-coverage analytics.
- `idx_topic_decay_state_child_topic` — decay-cron hot path.

### 07-parent

- `idx_parent_controls_child_id` — controls fetch on parent-app open.
- `idx_usage_caps_child_id_status_active` — per-turn cap check.
- `idx_weekly_summaries_child_week_start` — summary fetch.
- `idx_parent_notifications_outbox_user_status_created_at` — `/v1/notifications` feed.

### 08-config

- `idx_config_documents_device_status_updated_at` — device config fetch.
- `idx_config_versions_document_version` — version lookup.
- `idx_config_assignments_device_active` — cohort assignment.
- `idx_config_push_events_device_pushed_at` — debug.

### 09-ota

- `idx_ota_releases_status_published_at` — admin release dashboard.
- `idx_ota_assignments_device_release_status` — device update check.
- `idx_ota_crash_reports_release_received_at` — auto-pause sliding window.
- `idx_ota_pause_decisions_release_decided_at` — pause history.

### 10-notifications

- `idx_notification_dispatches_user_status_scheduled_for` — outbox scheduling.
- `idx_notification_receipts_dispatch_recipient` — delivery audit.
- `idx_push_tokens_user_platform_active` — push fanout.
- `idx_email_sends_dispatch_sent_at` — SES correlate.

### 11-telemetry

- `idx_telemetry_events_device_event_type_received_at` — hypertable, time-series.
- `idx_audit_events_actor_subject_occurred_at` — investigation.
- `idx_cost_attributions_household_period` — finance.
- `idx_mutation_log_mutation_started_at` — mutation handler.

### 12-admin

- `idx_admin_commands_admin_user_id` / `idx_admin_commands_target` / `idx_admin_commands_occurred_at_desc` — investigation feeds.
- `idx_admin_role_assignments_user_status` — admin auth middleware role resolve.
- `idx_safety_investigations_severity_created_at` — triage queue.

### 13-security

- `idx_kms_keys_purpose_status` — `secrets-cache-fetch.sequence.mmd` active key resolve.
- `idx_secret_versions_name_status` — cache miss path.
- `idx_key_rotations_secret_rotated_at` — rotation cadence dashboard.
- `idx_brute_force_lockouts_ip_expires_at` — gateway hot path.
- `idx_mtls_certificates_device_status` — `cert-verification-and-revocation.sequence.mmd`.

### 14-retention

- `idx_deletion_requests_user_status` — open requests.
- `idx_deletion_jobs_request_status` / `idx_deletion_jobs_status_next_attempt_at` — executor poll.
- `idx_retention_policies_resource_kind_active` — sweep dispatch.

### 15-manufacturing

- `idx_factory_records_serial_unique` — manufacturing dedup.
- `idx_factory_test_results_factory_record_phase` — yield analysis.

### 17-gateway

- `idx_rate_limit_buckets_subject_window` — gateway hot path (every request).
- `idx_api_keys_owner_type_status` — admin issuance.

### 19-billing

- `idx_subscriptions_household_status` — entitlement resolve.
- `idx_entitlements_household_kind_active` — `entitlement-check-session-start.sequence.mmd`.
- `idx_stripe_webhook_events_stripe_event_id_unique` — webhook idempotency.
- `idx_invoices_stripe_customer_status` — billing audit.

### 20-authoring

- `idx_content_drafts_author_status_updated_at` — drafts dashboard.
- `idx_review_assignments_reviewer_status` — reviewer inbox.
- `idx_publication_records_pack_published_at` — publication audit.

### `_shared/`

- `idx_audit_log_actor_occurred_at` — actor activity audit.
- `idx_audit_log_target` — per-record audit trail across services.
- `idx_audit_log_action_occurred_at` — recent privileged actions feed.
- `idx_idempotency_keys_service_request_unique` — entry-time dedup.
- `idx_outbox_events_status_next_attempt_at` — relay worker poll.
- `idx_feature_flags_key_scope_target_unique` — point lookup.
- `idx_i18n_strings_key_locale_unique` — render-time lookup.
- `idx_media_assets_checksum` — content-addressed dedup.

## Phase 5 cleanup — 4 `index-justified` WARNs

Composite indexes missing a sequence citation in their DBML `Note:`. Adding a citation clears the WARN.

- `docs/erd/01-identity/children.dbml` → index on `(household_id, nickname)` — could cite `docs/sequences/01-identity/child-profile-create.sequence.mmd`.
- `docs/erd/01-identity/mfa_secrets.dbml` → `(user_id, status)` — no current sequence; could annotate `@no-sequence` (forward-looking entity).
- `docs/erd/12-admin/admin_role_assignments.dbml` → `(admin_user_id, status)` — admin auth middleware reads on every request; cite `docs/sequences/12-admin/login-and-mfa.sequence.mmd`.
- `docs/erd/_shared/audit_log.dbml` → `(target_table, target_id)` — cite `docs/sequences/12-admin/safety-investigation-w2.sequence.mmd`.

(These are not blocking; the WARN is advisory.)

## Hypertables

Time-series tables with high write volume should be promoted to TimescaleDB hypertables in the DDL emitter (DBML `Note:` annotation `@timescaledb-hypertable(column=<ts>, interval='<window>')` reserved per CONVENTIONS §7):

| Table | Time column | Interval | Status |
|---|---|---|---|
| `device_heartbeats` | `received_at` | 1d | declared candidate |
| `telemetry_events` | `received_at` | 1h | declared candidate |
| `session_turns` | `created_at` | 1d | candidate (read-mostly after session close) |
| `rate_limit_buckets` | `window_start` | 1h | candidate (high churn) |
| `outbox_events` | `created_at` | 1d | candidate (high churn; deleted after `delivered_at + 30d`) |

Final hypertable decision deferred to sys-11 implementation-readiness pass (`implementation-readiness.md`).

## Notes on naming conformance

- All composite indexes follow `idx_<table>_<cols>_<purpose>` (CONVENTIONS §4).
- Unique indexes named `idx_<table>_<cols>_unique` to make the constraint visible in error messages.
- Partial-index conditions are documented inline as a DBML `Note:` because DBML lacks a partial-index syntax; the DDL emitter materialises the `WHERE` clause.
