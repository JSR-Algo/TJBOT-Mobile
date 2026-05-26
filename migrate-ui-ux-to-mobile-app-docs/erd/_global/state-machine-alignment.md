# State-Machine Alignment (§6)

Every entity in the ERD with a `<entity>_status` enum, mapped to its declared state-machine source. Per CONVENTIONS §2, state-bearing entities MUST declare `state_machine:` in frontmatter — either a path to a state-machine doc, `@inline` (transitions captured in the entity .md body), or `none` (only used for one-shot outcome enums on append-only rows; currently zero rows in that category after the Phase 5 cleanup).

Total status enums: **48** across **48 entities**.

**Enum values are regenerated from the authoritative DBML (Phase 5 sweep) — do not hand-edit the value lists below; rerun the helper at the bottom of this file if a `.dbml` enum changes.**

## Stateful entities (live state machines)

For each entity below, transitions are documented inline in its entity `.md` "Lifecycle" + "Edge cases" sections. Values listed are extracted from `<entity>.dbml`.

### 01-identity

| Entity | Enum | States | Source |
|---|---|---|---|
| `users` | `user_status` | active, disabled, scheduled_for_deletion, deleted | `docs/erd/01-identity/users.md` Lifecycle |
| `households` | `household_status` | active, locked, scheduled_for_deletion, deleted | `docs/erd/01-identity/households.md` |
| `household_members` | `household_member_status` | active, pending_invite, revoked | `docs/erd/01-identity/household_members.md` |
| `children` | `child_status` | active, archived, scheduled_for_deletion, deleted | `docs/erd/01-identity/children.md` (COPPA scope-anchor) |
| `auth_sessions` | `auth_session_status` | active, revoked, expired | `docs/erd/01-identity/auth_sessions.md` |
| `refresh_tokens` | `refresh_token_status` | active, rotated, revoked, replayed | `docs/erd/01-identity/refresh_tokens.md` |
| `email_verifications` | `email_verification_status` | pending, consumed, expired, invalidated | `docs/erd/01-identity/email_verifications.md` |
| `password_reset_tokens` | `password_reset_token_status` | pending, consumed, expired, invalidated | `docs/erd/01-identity/password_reset_tokens.md` |
| `mfa_secrets` | `mfa_secret_status` | active, disabled, revoked | `docs/erd/01-identity/mfa_secrets.md` |

### 02-device

| Entity | Enum | States | Source |
|---|---|---|---|
| `devices` | `device_status` | factory_new, provisioning, active, offline, decommissioned, quarantined | `docs/erd/02-device/devices.md` |
| `device_pairings` | `device_pairing_status` | started, ble_paired, device_authenticated, completed, failed, expired | `docs/erd/02-device/device_pairings.md` |
| `device_transfers` | `device_transfer_status` | initiated, awaiting_factory_reset, awaiting_target_claim, completed, failed, expired, cancelled | `docs/erd/02-device/device_transfers.md` |

### 04-realtime

| Entity | Enum | States | Source |
|---|---|---|---|
| `sessions` | `session_status` | connecting, open, turn_active, turn_complete, reconnecting, closing, closed | `docs/erd/04-realtime/sessions.md` |
| `session_turns` | `session_turn_status` | audio_capture, stt_processing, intent_classification, input_safety_check, llm_generation, output_safety_check, tts_synthesis, streaming, complete, failed, safety_blocked, cancelled | `docs/erd/04-realtime/session_turns.md` |
| `phrase_cache_entries` | `phrase_cache_status` | active, retired, rebuilding | `docs/erd/04-realtime/phrase_cache_entries.md` |

### 05-safety

| Entity | Enum | States | Source |
|---|---|---|---|
| `fallback_templates` | `fallback_template_status` | active, deprecated, retired | `docs/erd/05-safety/fallback_templates.md` |

### 06-content

| Entity | Enum | States | Source |
|---|---|---|---|
| `courses` | `course_status` | draft, active, archived | `docs/erd/06-content/courses.md` |
| `levels` | `level_status` | draft, active, archived | `docs/erd/06-content/levels.md` |
| `units` | `unit_status` | draft, active, archived | `docs/erd/06-content/units.md` |
| `lessons` | `lesson_status` | draft, active, archived | `docs/erd/06-content/lessons.md` |
| `activities` | `activity_status` | draft, active, archived | `docs/erd/06-content/activities.md` |

### 07-parent

| Entity | Enum | States | Source |
|---|---|---|---|
| `parent_notifications_outbox` | `parent_notification_status` | pending, enqueued, failed | `docs/erd/07-parent/parent_notifications_outbox.md` |

### 08-config

| Entity | Enum | States | Source |
|---|---|---|---|
| `config_signing_keys` | `config_signing_key_status` | active, next, decommissioning, retired | `docs/erd/08-config/config_signing_keys.md` |

### 09-ota

| Entity | Enum | States | Source |
|---|---|---|---|
| `ota_releases` | `ota_release_status` | drafted, cohort_assigned, rolling_out, paused, completed, rolled_back | `docs/erd/09-ota/ota_releases.md` |
| `ota_assignments` | `ota_assignment_status` | offered, downloading, downloaded, flashing, verifying, success, failed, rollback, skipped | `docs/erd/09-ota/ota_assignments.md` |

### 10-notifications

| Entity | Enum | States | Source |
|---|---|---|---|
| `notification_dispatches` | `notification_dispatch_status` | queued, sent, delivered, failed, bounced, suppressed | `docs/erd/10-notifications/notification_dispatches.md` |
| `push_tokens` | `push_token_status` | active, invalidated, revoked | `docs/erd/10-notifications/push_tokens.md` |

### 12-admin

| Entity | Enum | States | Source |
|---|---|---|---|
| `admin_users` | `admin_user_status` | active, disabled | `docs/erd/12-admin/admin_users.md` |
| `admin_sessions` | `admin_session_status` | active, revoked, expired | `docs/erd/12-admin/admin_sessions.md` |
| `admin_role_assignments` | `admin_role_assignment_status` | active, revoked | `docs/erd/12-admin/admin_role_assignments.md` |
| `safety_investigations` | `safety_investigation_status` | open, investigating, resolved, escalated | `docs/erd/12-admin/safety_investigations.md` |

### 13-security

| Entity | Enum | States | Source |
|---|---|---|---|
| `kms_keys` | `kms_key_status` | active, rotating, retired, compromised | `docs/erd/13-security/kms_keys.md` |
| `secret_versions` | `secret_version_status` | pending, active, retired, compromised | `docs/erd/13-security/secret_versions.md` |
| `key_rotations` | `key_rotation_status` | completed, failed, rolled_back | `docs/erd/13-security/key_rotations.md` — `@inline` (one-shot outcome enum on append-only ceremony record) |
| `brute_force_lockouts` | `brute_force_lockout_status` | active, expired, released_early | `docs/erd/13-security/brute_force_lockouts.md` |
| `mtls_certificates` | `mtls_certificate_status` | provisioned, active, revoked, expired | `docs/erd/13-security/mtls_certificates.md` |

### 14-retention

| Entity | Enum | States | Source |
|---|---|---|---|
| `deletion_requests` | `deletion_request_status` | pending, grace_period, cancelled, executing, completed, failed | `docs/erd/14-retention/deletion_requests.md` |
| `deletion_jobs` | `deletion_job_status` | requested, grace_period, executing, completed, failed | `docs/erd/14-retention/deletion_jobs.md` |
| `backup_snapshots` | `backup_snapshot_status` | creating, available, expired, deleted | `docs/erd/14-retention/backup_snapshots.md` |

### 19-billing

| Entity | Enum | States | Source |
|---|---|---|---|
| `subscriptions` | `subscription_status` | trialing, active, past_due, canceled, expired | `docs/erd/19-billing/subscriptions.md` |
| `invoices` | `invoice_status` | draft, open, paid, void, uncollectible | `docs/erd/19-billing/invoices.md` |
| `orders` | `order_status` | pending, paid, fulfilled, canceled, refunded | `docs/erd/19-billing/orders.md` |
| `stripe_webhook_events` | `stripe_webhook_event_status` | received, processed, failed | `docs/erd/19-billing/stripe_webhook_events.md` |

### 20-authoring

| Entity | Enum | States | Source |
|---|---|---|---|
| `content_drafts` | `content_draft_status` | draft, safety_screening, in_review, changes_requested, approved, published, archived | `docs/erd/20-authoring/content_drafts.md` |
| `review_assignments` | `review_assignment_status` | pending, in_progress, completed, reassigned | `docs/erd/20-authoring/review_assignments.md` |
| `publication_records` | `publication_status` | pending, published, failed, cancelled, rolled_back | `docs/erd/20-authoring/publication_records.md` |

### `_shared/`

| Entity | Enum | States | Source |
|---|---|---|---|
| `media_assets` | `media_asset_status` | uploading, active, archived, deleted | `docs/erd/_shared/media_assets.md` |
| `outbox_events` | `outbox_event_status` | pending, delivering, delivered, failed, dead_lettered | `docs/erd/_shared/outbox_events.md` |
| `idempotency_keys` | `idempotency_key_status` | in_flight, succeeded, failed | `docs/erd/_shared/idempotency_keys.md` |

## One-shot outcome enums

After the Phase 5 cleanup (`key_rotations.md` frontmatter flipped to `state_machine: '@inline'`), no entity remains in the `state_machine: none` bucket with a `<entity>_status` enum present. The one prior example was `key_rotations`, which is captured in the table above with its inline annotation noting the append-only one-shot nature.

## Aggregate-status / outcome enums (NOT state machines)

Some `_status`-like columns are simple outcome shapes, not full lifecycles. Documented inline in entity `.md`:

- `audit_log_result` (success | failure | partial) — outcome of the audited action, not the row's state.
- `factory_record_result` (pass | fail | inconclusive) — manufacturing test outcome, append-only.

## Cross-system state machines

Two flows span multiple status fields across folders:

- **COPPA hard-delete**: `deletion_requests → deletion_jobs → child / session / transcript / telemetry rows` — coordinated by sys-14 cron-job-base-execution + transcript-redaction-cron sequences. The state machine is documented in `docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd`.
- **OTA rollout pause**: `ota_releases → ota_pause_decisions → ota_assignments` — auto-pause triggered by `ota_crash_reports` rate. Documented in `docs/sequences/09-ota/crash-rate-auto-pause.sequence.mmd`.

## Non-state-machine columns matching `_status` (validator allow-list)

The validator's `state-machine-alignment` rule ignores these HTTP-style names (Phase 3 tightening):

- `http_status`, `http_status_code`, `response_status`, `response_status_code`, `webhook_status_code`, `response_http_status`

Two entity files carry these as legacy `_code` workaround renames from a pre-Phase-3 era of the validator. After the Phase 3 validator regex hardening they are no longer required to be renamed; the entity files have not been re-touched and the columns remain `*_code`. This is a deliberate keep — the column carries an HTTP outcome, not a domain state, and the `_code` suffix is independently clearer to read.

- `docs/erd/04-realtime/provider_failover_records.dbml` — `primary_http_code`
- `docs/erd/11-telemetry/mutation_log.dbml` — `http_status_code`

## Helper to regenerate this file

Enum values were extracted with this one-liner. Re-run if any `.dbml` enum block changes:

```
node --input-type=module -e '
import fs from "node:fs";
import path from "node:path";
function walk(d, ext){const out=[]; if(!fs.existsSync(d))return out; for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory()) out.push(...walk(p,ext)); else if(e.isFile()&&p.endsWith(ext)) out.push(p);} return out;}
for (const fp of walk("docs/erd",".dbml")) {
  if (fp.includes("_global")||fp.includes("templates")) continue;
  const src = fs.readFileSync(fp,"utf8");
  for (const m of src.matchAll(/^enum\s+([a-z_]+_status)\s*\{([\s\S]*?)\n\}/gm)) {
    const vals = m[2].split("\n").map(s=>s.trim()).filter(s=>s && !s.startsWith("//"));
    console.log(m[1] + ": " + vals.join(", "));
  }
}
'
```
