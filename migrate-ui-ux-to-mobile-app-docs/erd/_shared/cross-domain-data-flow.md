# Cross-Domain Data Flow

Documentation-layer record of every cross-folder foreign-key reference in the TBOT ERD. Per the Phase 3 decision (see `.omc/handoffs/team-exec-to-phase3.md`), cross-folder `Ref:` lines are kept **commented-out** in the per-system DBML files so each folder builds independently; this file is the authoritative cross-folder graph.

Intra-folder Refs (within a single `<NN>-<system>/` folder) remain LIVE in their DBML files and are not listed here.

**Last reconciliation:** 2026-05-12 (Phase 3, worker-1).

## Consistency models

| Model | Meaning |
|---|---|
| `sync-FK` | Logically a hard FK; producer write commits before consumer read. App-layer enforces; physical FK kept commented for build isolation. |
| `eventually-consistent-via-outbox` | Producer writes own row + emits `outbox_events` row in same tx; consumer materialises view on consumption. Reads may lag. |
| `replication-via-event` | Consumer holds a denormalised snapshot of producer fields; updates propagate via `outbox_events`. |
| `polymorphic` | Column carries a foreign id but the table varies — no FK by construction (e.g. `audit_log.target_id`). |

## Cascade conventions

| Notation | Meaning |
|---|---|
| `cascade-delete` | Producer delete deletes consumer row (sys-14 retention sweep enforces). |
| `cascade-soft-delete` | Producer soft-delete propagates; consumer keeps row in `archived` / `deleted` state. |
| `restrict` | Producer cannot delete while consumer rows exist. |
| `nullify` | Producer delete nulls the consumer column (consumer row survives). |

---

## Identity → other systems (producer: sys-01)

### devices.owner_user_id → users.id (1) {#devices-owner_user_id}

- Consumer lane: 02-device
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: cascade-soft-delete (devices retained for audit; owner_user_id set null via sys-14 sweep on user hard-delete)
- Notes: nullable when device is unassigned (factory / decommissioned).

### devices.current_household_id → households.id (2) {#devices-current_household_id}

- Consumer lane: 02-device
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: cascade-soft-delete (devices follow household lifecycle to scheduled_for_deletion)
- Notes: updated on every household transfer.

### devices.assigned_child_id → children.id (3) {#devices-assigned_child_id}

- Consumer lane: 02-device
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: nullify on child archive; cascade-delete on COPPA hard-delete
- Notes: nullable — most devices have a default child assignment but rotation is allowed.

### device_pairings.{household_id, initiated_by_user_id, assigned_child_id} → IdentityService

- Consumer lane: 02-device
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: cascade-soft-delete on household; cascade-delete on COPPA child hard-delete
- Notes: assigned_child_id nullable until pairing complete.

### device_transfers.{source_household_id, source_user_id, target_household_id} → IdentityService

- Consumer lane: 02-device
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: restrict (transfer rows must outlive the parties for audit)
- Notes: target_household_id nullable until claim.

### device_decommissions.{household_id, initiated_by_user_id} → IdentityService

- Consumer lane: 02-device
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: restrict (decommissions are audit records)

### pairing_attempts.user_id → users.id {#pairing_attempts-user_id}

- Consumer lane: 02-device
- Producer lane: 01-identity
- Owning service: DeviceService (consuming side stores the FK; IdentityService owns `users`)
- Consistency model: sync-FK
- Cascade: cascade-delete on user hard-delete (pairing attempts have no independent audit value after the user is deleted)
- Justification: `pairing_attempts` is a DeviceService entity that must resolve the initiating parent's identity to enforce per-user rate limits and associate the pairing with a household. A cross-folder FK is the correct primitive; the dependency direction is 02-device → 01-identity and is not cyclic.

### realtime_sessions.user_id → users.id {#realtime_sessions-user_id}

- Consumer lane: 04-realtime
- Producer lane: 01-identity
- Owning service: RealtimeService (consuming side stores the FK; IdentityService owns `users`)
- Consistency model: sync-FK
- Cascade: cascade-delete on COPPA user hard-delete; cascade-soft-delete on household dissolution
- Justification: every realtime session is scoped to a parent account for COPPA attribution and billing. The parent `user_id` is the authoritative COPPA anchor; RealtimeService cannot denormalise this without creating a stale-read risk for deletion sweeps.

### realtime_sessions.device_id → devices.id {#realtime_sessions-device_id}

- Consumer lane: 04-realtime
- Producer lane: 02-device
- Owning service: RealtimeService (consuming side stores the FK; DeviceService owns `devices`)
- Consistency model: sync-FK
- Cascade: cascade-delete on device hard-delete
- Justification: a realtime session is physically initiated by a device; the `device_id` FK is required to route WS connections, enforce per-device session limits, and associate session telemetry back to hardware provenance. No viable denormalisation path exists without replication lag that breaks the session-start uniqueness check.

### sessions.{device_id, household_id, child_profile_id} → multi

- Consumer lane: 04-realtime
- Producer lane: 02-device (device_id) + 01-identity (household_id, child_profile_id → children.id)
- Owning service: DeviceService + IdentityService
- Consistency model: sync-FK
- Cascade: cascade-delete on COPPA child hard-delete; cascade-soft-delete on household
- Notes: every session is COPPA-scoped; sys-14 transcript redaction cron sweeps child-linked rows.

### session_transcripts.child_profile_id → children.id

- Consumer lane: 04-realtime
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: replication-via-event (denormalised for COPPA retention sweep)
- Cascade: cascade-delete on COPPA hard-delete
- Notes: denormalised on insert from sessions.child_profile_id for sweep efficiency.

### safety_events.{session_id, session_turn_id, child_profile_id, household_id} → multi

- Consumer lane: 05-safety
- Producer lane: 04-realtime (session_id, session_turn_id) + 01-identity (child_profile_id, household_id)
- Owning service: RealtimeService + IdentityService
- Consistency model: sync-FK (all nullable for non-turn events)
- Cascade: cascade-delete on COPPA child hard-delete

### safety_pii_redactions.{session_id, session_turn_id, child_profile_id, household_id} → multi

- Consumer lane: 05-safety
- Producer lane: 04-realtime + 01-identity
- Owning service: RealtimeService + IdentityService
- Consistency model: replication-via-event (denormalised for COPPA on-deletion sweep)
- Cascade: cascade-delete on COPPA hard-delete

### content_personalization_snapshots.child_id → children.id

- Consumer lane: 06-content
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: cascade-delete on COPPA hard-delete

### daily_summaries.{device_id, child_profile_id} → multi

- Consumer lane: 06-content
- Producer lane: 02-device + 01-identity
- Owning service: DeviceService + IdentityService
- Consistency model: sync-FK
- Cascade: cascade-delete on COPPA hard-delete (child); cascade-soft-delete on device

### topic_decay_state.child_id → children.id

- Consumer lane: 06-content
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: cascade-delete on COPPA hard-delete

### parent_controls.{device_id, household_id} → multi

- Consumer lane: 07-parent
- Producer lane: 02-device + 01-identity
- Owning service: DeviceService + IdentityService
- Consistency model: sync-FK
- Cascade: cascade-delete on household / device hard-delete

### parent_notifications_outbox.{device_id, child_profile_id} → multi

- Consumer lane: 07-parent
- Producer lane: 02-device + 01-identity
- Owning service: DeviceService + IdentityService
- Consistency model: sync-FK (child_profile_id nullable for device-level events)
- Cascade: cascade-delete on COPPA hard-delete

### usage_caps.{device_id, child_profile_id} → multi

- Consumer lane: 07-parent
- Producer lane: 02-device + 01-identity
- Owning service: DeviceService + IdentityService
- Consistency model: sync-FK
- Cascade: cascade-delete on COPPA hard-delete

### weekly_summaries.{device_id, child_profile_id} → multi

- Consumer lane: 07-parent
- Producer lane: 02-device + 01-identity
- Owning service: DeviceService + IdentityService
- Consistency model: sync-FK
- Cascade: cascade-delete on COPPA hard-delete

### config_assignments.device_id → devices.id

- Consumer lane: 08-config
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: sync-FK
- Cascade: cascade-delete on device hard-delete

### config_documents.device_id → devices.id

- Consumer lane: 08-config
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: sync-FK
- Cascade: cascade-delete on device hard-delete

### config_push_events.device_id → devices.id

- Consumer lane: 08-config
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: sync-FK
- Cascade: cascade-delete on device hard-delete

### config_versions.device_id → devices.id

- Consumer lane: 08-config
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: sync-FK (denormalised for fast per-device history scan)
- Cascade: cascade-delete on device hard-delete

### config_signing_keys.kms_key_id → kms_keys (sys-13)

- Consumer lane: 08-config
- Producer lane: 13-security
- Owning service: SecurityService
- Consistency model: sync-FK
- Cascade: restrict (kms_keys never hard-deleted; rotation creates successor row)
- Notes: stored as KMS ARN varchar(2048) rather than uuid since sys-08 references the external KMS handle directly. Phase 4 may normalise.

### ota_assignments.device_id → devices.id

- Consumer lane: 09-ota
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: sync-FK
- Cascade: cascade-delete on device hard-delete

### ota_crash_reports.device_id → devices.id

- Consumer lane: 09-ota
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: replication-via-event (denormalised for crash-rate queries)
- Cascade: cascade-soft-delete on device hard-delete (crash reports preserved for OTA rollback investigation)

### ota_pause_decisions.admin_user_id → admin_users.id (sys-12)

- Consumer lane: 09-ota
- Producer lane: 12-admin
- Owning service: AdminAuthService
- Consistency model: sync-FK
- Cascade: restrict (admin_users soft-delete only)
- Notes: nullable — only set for manual-pause / manual-resume / manual-recall decisions.

### ota_releases.rollout_cohort_id → config_cohorts.id (sys-08)

- Consumer lane: 09-ota
- Producer lane: 08-config
- Owning service: ConfigService
- Consistency model: sync-FK
- Cascade: restrict (config_cohorts retained while referenced)
- Notes: was a LIVE `Ref:` in ota_releases.dbml:46 during Phase 3 audit; commented out in Phase 5 per Phase 3 decision.

### ota_cohorts.base_cohort_id → config_cohorts.id (sys-08)

- Consumer lane: 09-ota
- Producer lane: 08-config
- Owning service: ConfigService
- Consistency model: sync-FK
- Cascade: restrict
- Notes: was a LIVE `Ref:` in ota_cohorts.dbml:23 during Phase 3 audit; commented out in Phase 5.

### notification_dispatches.parent_account_id → users.id

- Consumer lane: 10-notifications
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: cascade-delete on user hard-delete

### notification_dispatches.device_id → devices.id

- Consumer lane: 10-notifications
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: sync-FK
- Cascade: cascade-delete on device hard-delete

### push_tokens.user_id → users.id

- Consumer lane: 10-notifications
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: cascade-delete on user hard-delete

### cost_attributions.{device_id, household_id} → multi

- Consumer lane: 11-telemetry
- Producer lane: 02-device + 01-identity
- Owning service: DeviceService + IdentityService
- Consistency model: replication-via-event (denormalised; cost attribution survives parent deletion for finance reconciliation)
- Cascade: nullify on household hard-delete (column kept; row preserved for finance audit)

### telemetry_events.{device_id, child_id, session_id} → multi

- Consumer lane: 11-telemetry
- Producer lane: 02-device + 01-identity + 04-realtime
- Owning service: DeviceService + IdentityService + RealtimeService
- Consistency model: replication-via-event (hypertable; high write volume)
- Cascade: cascade-delete on COPPA hard-delete (child_id-scoped rows); device-scoped retained for hardware analytics

### safety_investigations.{device_id, session_id, turn_id} → multi

- Consumer lane: 12-admin
- Producer lane: 02-device (device_id) + 04-realtime (session_id, turn_id → session_turns.id)
- Owning service: DeviceService + RealtimeService
- Consistency model: sync-FK (turn_id nullable for session-level cases)
- Cascade: restrict (investigations preserved for compliance audit)

### mtls_certificates.device_id → devices.id (sys-02)

- Consumer lane: 13-security
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: sync-FK
- Cascade: cascade-delete on device hard-delete (cert row deleted with device)

### backup_snapshots.encryption_key_id → kms_keys (sys-13)

- Consumer lane: 14-retention
- Producer lane: 13-security
- Owning service: SecurityService
- Consistency model: sync-FK
- Cascade: restrict

### backup_snapshots.scope_household_id → households.id

- Consumer lane: 14-retention
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: restrict (snapshot is the export — it outlives the household)
- Notes: set only for COPPA right-of-access data exports.

### deletion_jobs.household_id → households.id

- Consumer lane: 14-retention
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK (nullable — set for parent_account scope only)
- Cascade: restrict (job row outlives the household it deleted)

### deletion_jobs.child_id → children.id

- Consumer lane: 14-retention
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK (set only when this job is the child-profile cascade)
- Cascade: restrict (job row outlives the child row)

### deletion_requests.parent_account_id → users.id

- Consumer lane: 14-retention
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: restrict (request row outlives the user it deleted)

### deletion_requests.child_id → children.id

- Consumer lane: 14-retention
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK (set only when scope_kind=child_profile)
- Cascade: restrict

### factory_records.device_id → devices.id (sys-02)

- Consumer lane: 15-manufacturing
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: sync-FK
- Cascade: restrict (factory provenance preserved indefinitely)
- Notes: was a LIVE `Ref:` in factory_records.dbml:31 during Phase 3 audit; commented out in Phase 5.

### factory_serial_assignments.device_id → devices.id (sys-02)

- Consumer lane: 15-manufacturing
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: sync-FK
- Cascade: restrict
- Notes: was a LIVE `Ref:` in factory_serial_assignments.dbml:18 during Phase 3 audit; commented out in Phase 5.

### runtime_boot_reports.device_id → devices.id (sys-02)

- Consumer lane: 03-device-runtime
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: replication-via-event (high write volume)
- Cascade: cascade-delete on device hard-delete
- Notes: was a LIVE `Ref:` in runtime_boot_reports.dbml:30 during Phase 3 audit; commented out in Phase 5.

### runtime_local_event_log.device_id → devices.id (sys-02)

- Consumer lane: 03-device-runtime
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: replication-via-event
- Cascade: cascade-delete on device hard-delete
- Notes: was a LIVE `Ref:` in runtime_local_event_log.dbml:19 during Phase 3 audit; commented out in Phase 5.

### safe_mode_entries.device_id → devices.id (sys-02)

- Consumer lane: 03-device-runtime
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: sync-FK
- Cascade: cascade-delete on device hard-delete
- Notes: was a LIVE `Ref:` in safe_mode_entries.dbml:37 during Phase 3 audit; commented out in Phase 5.

### entitlements.child_id → children.id

- Consumer lane: 19-billing
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: cascade-delete on COPPA hard-delete

### orders.household_id → households.id

- Consumer lane: 19-billing
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: restrict (orders preserved for finance audit)

### stripe_customers.user_id → users.id

- Consumer lane: 19-billing
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: cascade-delete on user hard-delete (Stripe customer deleted via API in sys-14 deletion pipeline)

### subscriptions.household_id → households.id

- Consumer lane: 19-billing
- Producer lane: 01-identity
- Owning service: IdentityService
- Consistency model: sync-FK
- Cascade: cascade-soft-delete on household hard-delete

### content_drafts.author_id → admin_users.id

- Consumer lane: 20-authoring
- Producer lane: 12-admin
- Owning service: AdminAuthService
- Consistency model: sync-FK
- Cascade: restrict (admin_users soft-delete only)

### content_revisions.author_id → admin_users.id

- Consumer lane: 20-authoring
- Producer lane: 12-admin
- Owning service: AdminAuthService
- Consistency model: sync-FK
- Cascade: restrict

### publication_records.publisher_id → admin_users.id

- Consumer lane: 20-authoring
- Producer lane: 12-admin
- Owning service: AdminAuthService
- Consistency model: sync-FK
- Cascade: restrict (publication audit preserved)

### review_assignments.reviewer_id → admin_users.id

- Consumer lane: 20-authoring
- Producer lane: 12-admin
- Owning service: AdminAuthService
- Consistency model: sync-FK
- Cascade: restrict

### review_decisions.reviewer_id → admin_users.id

- Consumer lane: 20-authoring
- Producer lane: 12-admin
- Owning service: AdminAuthService
- Consistency model: sync-FK (denormalised for audit)
- Cascade: restrict

### demo_devices.device_id → devices.id

- Consumer lane: 22-demo
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: sync-FK
- Cascade: cascade-delete on device hard-delete
- Notes: nullable — demo device may exist before paired to a production device row.

### phrase_cache_entries.created_by_admin_user_id → admin_users.id

- Consumer lane: 04-realtime
- Producer lane: 12-admin
- Owning service: AdminAuthService
- Consistency model: sync-FK
- Cascade: restrict

### fallback_templates.created_by_admin_user_id → admin_users.id

- Consumer lane: 05-safety
- Producer lane: 12-admin
- Owning service: AdminAuthService
- Consistency model: sync-FK
- Cascade: restrict

### safety_blocklist_entries.created_by_admin_user_id → admin_users.id

- Consumer lane: 05-safety
- Producer lane: 12-admin
- Owning service: AdminAuthService
- Consistency model: sync-FK
- Cascade: restrict

### api_keys.owner_id → devices.id (when type = device_bearer)

- Consumer lane: 17-gateway
- Producer lane: 02-device
- Owning service: DeviceService
- Consistency model: polymorphic (owner_id varies by `type` enum)
- Cascade: cascade-delete on device hard-delete (only for device_bearer)
- Notes: polymorphic column; FK only logical, validated at app layer per type.

---

## Orphan refs deferred to follow-up plans

Three sys-04 columns and one sys-20 column point at tables that are **not yet modelled** in this ERD (they would be governance metadata):

| Column | Target | Follow-up plan |
|---|---|---|
| `session_turns.prompt_version_id` | `prompt_template_versions` (sys-05 governance) | `.omc/plans/erd-sys05-governance-tables.md` |
| `session_turns.safety_policy_version_id` | `safety_policy_versions` (sys-05 governance) | `.omc/plans/erd-sys05-governance-tables.md` |
| `session_turns.blocklist_version_id` | `blocklist_versions` (sys-05 governance) | `.omc/plans/erd-sys05-governance-tables.md` |
| `publication_records.schedule_id` (referenced in comments) | `ca_publish_schedules` (sys-20 scheduling) | `.omc/plans/erd-content-authoring-publish-schedule.md` |

Lane D's `.dbml` files keep the columns but the Refs are not declared (no FK target exists). When the follow-up plans land, Phase 4+ will revisit.

---

## Polymorphic columns (no FK by construction)

| Table.column | Variants | Validation |
|---|---|---|
| `audit_log.actor_id` | user / admin_user / service / system / device | app-layer allow-list per actor_type |
| `audit_log.target_id` | any platform table pk | app-layer allow-list per target_table |
| `admin_commands.target_id` | any platform target | app-layer convention |
| `idempotency_keys.actor_id` | user / admin / device / service | app-layer per service_name |
| `feature_flags.scope_target_id` | household / user / device / cohort | app-layer per scope |
| `api_keys.owner_id` | device / service / partner | app-layer per type |
| `media_assets.owner_service` | service identifier | app-layer convention |

---

## Naming-collision audit (AC-9)

Verified by validator (`npm run erd:full --rule no-cross-domain-name-collision`). Zero collisions across all 102 entity tables. Distinct names preserved where conceptually similar:

- `users` (sys-01) ≠ `admin_users` (sys-12) — plan Q-1 default.
- `auth_sessions` (sys-01) ≠ `admin_sessions` (sys-12) — plan §13.
- `topics` (sys-06 content taxonomy) ≠ `safety_topics` (sys-05 classifier output) — plan §13 Q-6.
- `parent_notifications_outbox` (sys-07) ≠ `notification_dispatches` (sys-10) — plan §13.
- `daily_summaries` (sys-06) and `weekly_summaries` (sys-07) — distinct names by intent.

---

## How to update this file

When a Phase 2 lane adds or changes a cross-folder column:

1. Add or update the column section above (`<consumer_table>.<column> → <producer_table>.<column>`).
2. Choose a consistency model + cascade convention.
3. Run `npm run erd:fast` — the `cross-domain-fk-documented` WARN must clear for that pair.
4. If activating a live Ref: across folders, justify in the section's `Notes:` and surface to the orchestrator.
