---
entity: config_versions
domain: 08-config
service_owner: ConfigService
state_machine: none
api_endpoints:
  - GET /admin/fleet/devices/:id/config-history
retention: hard
sequences_referenced_in:
  - docs/sequences/08-config/assembly-and-signing.sequence.mmd
  - docs/sequences/08-config/mqtt-push-and-fetch.sequence.mmd
  - docs/sequences/08-config/kms-key-rotation-ceremony.sequence.mmd
---

# config_versions

## Business purpose

Append-only audit trail of every signed config ever assembled. One row per `(device_id, config_version)` pair. Critical for compliance, rollback, and forensics after a misconfiguration incident.

## Ownership rules

- Owner service: `ConfigService` (writes by `ConfigAssembler`).
- Writers: `ConfigAssembler` only (INSERT). `superseded_at` updated by the same assembler when a newer version becomes current.
- Readers: admin console (`GET /admin/fleet/devices/:id/config-history`), `ConfigService` rollback path, sys-13 key-rotation auditor, sys-11 telemetry correlations.

## Lifecycle

- Create: every successful assembly pipeline run inserts exactly one row (see assembly-and-signing sequence step 10).
- Update: only `superseded_at` (when next version takes over) and `applied_at` (mirroring device ack) are mutated. Body fields are immutable — append-only invariant.
- Delete: hard delete via sys-14 retention sweep only when the owning device is deleted (cascade). No standalone purge — the version history is part of the device record.

**Lifecycle.update = never** (except `superseded_at`, `applied_at`, `updated_at` marker — append-only annotation).

## Related APIs

- `GET /admin/fleet/devices/:id/config-history` — admin read
- Internal: read by `ConfigAssembler` for rollback (`change_source='rollback'`)

## Related sequences

- `docs/sequences/08-config/assembly-and-signing.sequence.mmd` — INSERT path (pipeline step "UPSERT device_configs + INSERT device_config_history")
- `docs/sequences/08-config/mqtt-push-and-fetch.sequence.mmd` — read by `GET /v1/config/fetch` to return blob+sig
- `docs/sequences/08-config/kms-key-rotation-ceremony.sequence.mmd` — `signing_key_id` audit during rotation

## Validation rules

- `(device_id, config_version)` MUST be unique — enforced by `idx_config_versions_device_version_unique`.
- `config_blob` ≤ 8 KB serialised (rejected at assembly by `config_size_exceeds_8kb` path).
- `config_signature` is base64-encoded ECDSA P-256 DER over the canonical-JSON payload defined in spec §Signing Process.
- `change_source` ∈ {`initial_provision`, `parent_controls_changed`, `template_updated`, `cohort_membership_changed`, `admin_push`, `emergency_override`, `rollback`} (assembly trigger matrix).

## Edge cases

- Schema-transformed versions (sys-08 SchemaTransformer 2.0→1.1→1.0) store the **transformed** blob — the version actually pushed to the device, not the template original.
- `cohort_id` may differ from current `fleet_cohort_memberships` because cohort membership can change after a version is issued — frozen at assembly time for audit accuracy.
- Rollback path (`change_source='rollback'`) writes a new version whose body is a copy of an older `config_versions` row — preserves append-only invariant.
- Key-rotation impact: `signing_key_id` may point at a decommissioned key (sys-08 rotation §Stage 4). The row remains valid for audit; verification requires the historical pubkey kept in `config_signing_keys`.
