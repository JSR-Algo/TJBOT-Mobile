# Relationships (§5)

Every foreign-key relationship across the 102-entity ERD. Live `Ref:` lines come from per-domain `.dbml` files (68 total after Phase 5 cleanup; was 75 before Phase 5 commented out 7 cross-folder Refs that pre-dated the Phase 3 cross-folder-Ref convention). Cross-folder refs are documented in `_shared/cross-domain-data-flow.md` (56 entries, all commented in their DBML files as of Phase 5 close) — they are listed here too for completeness, marked `[doc-only]`.

Classification key:

- **Cardinality**: `1:1` (one-to-one), `1:N` (one-to-many; left side is the "one"), `N:N` (many-to-many — always realized through a join table).
- **Deletion rule**: `cascade` (child rows deleted on parent delete), `restrict` (parent cannot be deleted while children exist), `nullify` (child column nulled, child row survives), `cascade-soft-delete` (parent soft-delete propagates), `cascade-delete-coppa` (sys-14 retention sweep enforces hard delete within COPPA window).
- **Update rule**: surrogate uuid PKs do not change; `n/a` everywhere unless noted.
- **Consistency model**: only used for cross-folder refs (`sync-FK`, `eventually-consistent-via-outbox`, `replication-via-event`, `polymorphic`). Intra-folder refs are always `sync-FK` (live in DBML).

---

## Intra-folder relationships (live `Ref:` lines)

### 01-identity (10 refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `users.id` | `auth_sessions.user_id` | cascade | one user → many sessions |
| 1:N | `households.id` | `children.household_id` | cascade-delete-coppa | parent hard-delete forces child hard-delete |
| 1:N | `users.id` | `email_verifications.user_id` | cascade | dedup pending tokens per user |
| N:N | `users.id` ↔ `households.id` | `household_members` (join) | cascade-soft | role-scoped membership |
| 1:N | `users.id` | `household_members.user_id` | cascade-soft | revoke on user soft-delete |
| 1:N | `users.id` | `household_members.invited_by_user_id` | restrict | preserve invite chain |
| 1:N | `users.id` | `households.primary_parent_id` | restrict | household primary cannot orphan |
| 1:N | `users.id` | `mfa_secrets.user_id` | cascade | factors deleted with user |
| 1:N | `users.id` | `password_reset_tokens.user_id` | cascade | cron also expires |
| 1:N | `auth_sessions.id` | `refresh_tokens.auth_session_id` | cascade | one session → many generations |
| 1:1 | `refresh_tokens.id` | `refresh_tokens.rotated_to_id` | restrict | self-ref to successor |

### 02-device (4 refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `devices.id` | `device_decommissions.device_id` | restrict | decommission outlives the device row |
| 1:N | `devices.id` | `device_heartbeats.device_id` | cascade | hypertable; cascade with device |
| 1:N | `devices.id` | `device_pairings.device_id` | cascade | pairings deleted with device |
| 1:N | `devices.id` | `device_transfers.device_id` | restrict | transfer history preserved for audit |

### 03-device-runtime (3 refs — all 3 cross-folder Refs were LIVE during Phase 3 audit; commented out per Phase 5 cleanup)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `devices.id` (sys-02) | `runtime_boot_reports.device_id` | cascade | Cross-folder Ref — commented out in Phase 5 per Phase 3 decision |
| 1:N | `devices.id` (sys-02) | `runtime_local_event_log.device_id` | cascade | Cross-folder Ref — commented out in Phase 5 |
| 1:N | `devices.id` (sys-02) | `safe_mode_entries.device_id` | cascade | Cross-folder Ref — commented out in Phase 5 |

### 04-realtime (5 intra-folder refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `sessions.id` | `session_turns.session_id` | cascade | one session → many turns |
| 1:N | `session_turns.id` | `session_transcripts.session_turn_id` | cascade | transcript per turn |
| 1:N | `sessions.id` | `session_transcripts.session_id` | cascade | redundancy aid for COPPA sweep |
| 1:N | `sessions.id` | `provider_failover_records.session_id` | cascade | failover events scoped to session |
| 1:N | `session_turns.id` | `provider_failover_records.session_turn_id` | cascade |  |

### 05-safety (3 intra-folder refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `safety_topics.id` | `safety_events.topic_id` | restrict | topic catalogue preserved |
| 1:N | `fallback_templates.id` | `safety_events.fallback_template_id` | restrict | template history preserved |
| 1:N | `safety_events.id` | `safety_pii_redactions.safety_event_id` | cascade |  |

### 06-content (8 refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `courses.id` | `levels.course_id` | cascade |  |
| 1:N | `levels.id` | `units.level_id` | cascade |  |
| 1:N | `units.id` | `lessons.unit_id` | cascade |  |
| 1:N | `lessons.id` | `activities.lesson_id` | cascade |  |
| 1:N | `lessons.id` | `words.lesson_id` | cascade |  |
| 1:N | `activities.id` | `words.activity_id` | cascade |  |
| 1:N | `topics.id` | `topics.parent_id` | restrict | self-ref for taxonomy parent |
| 1:N | `topics.id` | `topic_decay_state.topic_id` | restrict | preserve topic catalog while decay snapshots exist |

### 07-parent (0 live refs; all cross-folder commented)

### 08-config (6 refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `config_cohorts.id` | `config_assignments.cohort_id` | restrict |  |
| 1:N | `config_versions.id` | `config_assignments.config_version_id` | restrict |  |
| 1:1 | `config_documents.current_version_id` | `config_versions.id` | restrict | document points at active version |
| 1:N | `config_documents.id` | `config_push_events.document_id` | cascade |  |
| 1:N | `config_versions.id` | `config_push_events.version_id` | restrict |  |
| 1:N | `config_documents.id` | `config_versions.document_id` | cascade | versions deleted with document |
| 1:N | `config_signing_keys.id` | `config_versions.signing_key_id` | restrict |  |

### 09-ota (5 refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `ota_releases.id` | `ota_assignments.release_id` | cascade |  |
| 1:N | `ota_cohorts.id` | `ota_assignments.ota_cohort_id` | cascade |  |
| 1:N | `config_cohorts.id` (sys-08) | `ota_cohorts.base_cohort_id` | restrict | Cross-folder Ref — commented out in Phase 5 |
| 1:N | `ota_assignments.id` | `ota_crash_reports.assignment_id` | restrict |  |
| 1:N | `ota_releases.id` | `ota_crash_reports.release_id` | restrict |  |
| 1:N | `ota_releases.id` | `ota_pause_decisions.release_id` | restrict |  |
| 1:N | `config_cohorts.id` (sys-08) | `ota_releases.rollout_cohort_id` | restrict | Cross-folder Ref — commented out in Phase 5 |

### 10-notifications (2 refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `notification_dispatches.id` | `email_sends.dispatch_id` | cascade |  |
| 1:N | `notification_dispatches.id` | `notification_receipts.dispatch_id` | cascade |  |

### 12-admin (5 refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `admin_users.id` | `admin_commands.admin_user_id` | restrict | audit preserved |
| 1:N | `admin_users.id` | `admin_role_assignments.admin_user_id` | restrict | history preserved |
| 1:N | `admin_users.id` | `admin_role_assignments.granted_by_admin_id` | restrict |  |
| 1:N | `admin_users.id` | `admin_sessions.admin_user_id` | cascade | sessions purged on disable |
| 1:N | `admin_users.id` | `safety_investigations.reported_by_admin_id` | restrict |  |

### 13-security (3 refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `kms_keys.id` | `key_rotations.kms_key_id` | restrict |  |
| 1:1 | `kms_keys.id` | `kms_keys.rotated_from_id` | restrict | self-ref to predecessor |
| 1:N | `kms_keys.id` | `secret_versions.envelope_kms_key_id` | restrict |  |

### 14-retention (1 ref)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `deletion_requests.id` | `deletion_jobs.deletion_request_id` | restrict | jobs outlive their request |

### 15-manufacturing (3 refs — 2 cross-folder Refs were LIVE during Phase 3 audit; commented out per Phase 5 cleanup)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `devices.id` (sys-02) | `factory_records.device_id` | restrict | Cross-folder Ref — commented out in Phase 5 |
| 1:N | `devices.id` (sys-02) | `factory_serial_assignments.device_id` | restrict | Cross-folder Ref — commented out in Phase 5 |
| 1:N | `factory_records.id` | `factory_test_results.factory_record_id` | cascade |  |

### 19-billing (7 intra-folder refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `subscriptions.id` | `entitlements.subscription_id` | cascade-soft | entitlements expire with subscription |
| 1:N | `stripe_customers.id` | `invoices.stripe_customer_id` | restrict |  |
| 1:N | `subscriptions.id` | `invoices.subscription_id` | restrict |  |
| 1:N | `orders.id` | `order_items.order_id` | cascade |  |
| 1:N | `stripe_customers.id` | `orders.stripe_customer_id` | restrict |  |
| 1:N | `stripe_customers.id` | `subscriptions.stripe_customer_id` | restrict |  |
| 1:N | `subscription_plans.id` | `subscriptions.plan_id` | restrict |  |

### 20-authoring (5 refs)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `content_drafts.id` | `content_revisions.draft_id` | cascade |  |
| 1:N | `content_drafts.id` | `publication_records.draft_id` | restrict | publication is the audit record |
| 1:N | `content_drafts.id` | `review_assignments.draft_id` | cascade |  |
| 1:N | `review_assignments.id` | `review_decisions.assignment_id` | cascade |  |
| 1:N | `content_drafts.id` | `review_decisions.draft_id` | cascade |  |

### 22-demo (1 ref)

| Cardinality | Left | Right | Deletion | Notes |
|---|---|---|---|---|
| 1:N | `demo_devices.id` | `demo_session_overrides.demo_device_id` | cascade |  |

### `_shared/` (0 refs)

Shared tables use polymorphic columns (`audit_log.target_id`, `idempotency_keys.actor_id`, `feature_flags.scope_target_id`, etc.). No live `Ref:` lines by design — see `_shared/audit_log.md` rationale.

---

## Cross-folder relationships (doc-only)

Full enumeration with consistency model + cascade is in `docs/erd/_shared/cross-domain-data-flow.md`. Summary count by producer:

| Producer (Lane) | Tables referenced | Consumer lanes |
|---|---|---|
| `users.id` (Lane B, sys-01) | many | 02, 04, 06, 07, 10, 14, 19, _shared |
| `households.id` (Lane B, sys-01) | many | 02, 04, 05, 06, 07, 11, 14, 19, _shared |
| `children.id` (Lane B, sys-01) | many (COPPA scope-anchor) | 04, 05, 06, 07, 11, 14, 19 |
| `admin_users.id` (Lane B, sys-12) | many | 04, 05, 09, 20 |
| `mtls_certificates.id` (Lane B, sys-13) | 1 | 02 (via `devices.cert_serial`) |
| `kms_keys.id` (Lane B, sys-13) | 2 | 08, 14 |
| `devices.id` (Lane C, sys-02) | many | 03, 06, 07, 08, 09, 10, 11, 12, 13, 15, 17, 22 |
| `sessions.id` (Lane D, sys-04) | several | 05, 11, 12 |
| `session_turns.id` (Lane D, sys-04) | several | 05, 11, 12 |
| `config_cohorts.id` (Lane F, sys-08) | 2 | 09 |
| `subscriptions.id` (Lane G, sys-19) | — (intra-folder only) | n/a |

Total cross-folder refs documented: 56 (all commented out as of Phase 5; 7 were LIVE during Phase 3 audit and were commented out during Phase 5 cleanup).

## Many-to-many realisations (join tables)

The ERD avoids native N:N — every many-to-many is materialised through an explicit join with its own row identity and lifecycle:

| Join table | Realises | Extra fields beyond FKs |
|---|---|---|
| `household_members` | `users` ↔ `households` | role, status, invited_by, accepted_at, revoked_at |
| `config_assignments` | `config_cohorts` ↔ `config_versions` (and ↔ devices via FK) | assignment_status, assigned_at |
| `ota_assignments` | `ota_releases` ↔ `ota_cohorts` (and ↔ devices) | progress fields |
| `admin_role_assignments` | `admin_users` ↔ admin roles | granted_by, granted_at, revoked_at |
| `safety_blocklist_entries` | safety classifier ↔ blocked terms catalogue | created_by_admin_user_id, severity |

## 1:1 relationships

- `stripe_customers.user_id → users.id` (unique constraint: one user → one Stripe customer).
- `households.primary_parent_id → users.id` (uniqueness enforced at app layer: exactly one owner per household).
- `kms_keys.rotated_from_id → kms_keys.id` (self-ref, one predecessor per row).
- `refresh_tokens.rotated_to_id → refresh_tokens.id` (self-ref, one successor).
- `config_documents.current_version_id → config_versions.id` (single pointer to active version).

## Cascade-on-update

All PKs are surrogate uuids and immutable. No cascading-update scenarios apply across the platform.
