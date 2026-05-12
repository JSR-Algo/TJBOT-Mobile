---
entity: config_signing_keys
domain: 08-config
service_owner: ConfigService
state_machine: '@inline'
api_endpoints:
  - GET /admin/security/config-signing-keys
retention: hard
sequences_referenced_in:
  - docs/sequences/08-config/assembly-and-signing.sequence.mmd
  - docs/sequences/08-config/kms-key-rotation-ceremony.sequence.mmd
---

# config_signing_keys

## Business purpose

Lifecycle metadata for every ECDSA P-256 key ever used to sign device-runtime configs. The key material itself stays inside AWS KMS; this table is the audit record + the join target for `config_versions.signing_key_id`. Used by the annual rotation ceremony (sys-08 §KMS Key Rotation).

## Ownership rules

- Owner service: `ConfigService` (operationally), with `SecurityService` (sys-13) holding the upstream `kms_keys` record.
- Writers: rotation ceremony script (annual + emergency), `ConfigSigner` at startup updates `status` on env-var swap.
- Readers: `ConfigSigner` (always picks the row with `status='active'`), admin security console, sys-13 rotation audit.

## Lifecycle

- Create: rotation ceremony Stage 1 — new KMS key generated, row inserted with `status='next'`.
- Update: Stage 3 promotes a `next` row to `active` (`promoted_to_active_at` set). Stage 4 transitions the prior active to `decommissioning` then to `retired` after the 30-day KMS pending-deletion window closes.
- Delete: never delete in-place. Retired rows remain for audit of historical signatures in `config_versions`.

State machine (inline): `next → active` (promotion), `active → decommissioning` (new key takes over), `decommissioning → retired` (KMS deletion completes).

## Related APIs

- `GET /admin/security/config-signing-keys` — list (audit)
- Internal: read by `ConfigSigner` at every signature operation

## Related sequences

- `docs/sequences/08-config/assembly-and-signing.sequence.mmd` — uses the active key
- `docs/sequences/08-config/kms-key-rotation-ceremony.sequence.mmd` — full annual lifecycle

## Validation rules

- Exactly one row has `status='active'` at any moment (operationally enforced; not a DB constraint — rotation script handles transition).
- `kms_key_id` must reference an existing KMS key ARN (validated against sys-13 `kms_keys` table during creation; cross-domain FK lives in sys-13).
- `key_purpose='config_signing'` separates this from sys-09 OTA signing key and sys-13 mTLS-CA root.

## Edge cases

- Devices embed two pubkeys (`current_key` + `next_key`). After Stage 2 (firmware shipped with new pubkey in `next_key`), devices verify against either; ConfigSigner can switch to the new key once ≥99% fleet adopts (`fleet_adoption_below_threshold` gate).
- Stage 4 `old_key_decommission_blocked` race: if any device still verifies with old key, retain the row in `decommissioning` until KMS deletion safe — `retired_at` only set after KMS confirms.
- `signing_key_id` references from `config_versions` outlive `retired_at` — historical configs remain auditable even after KMS material is destroyed (signature validation post-retirement requires the cached `public_key_pem`).
- Cross-domain: this row's `kms_key_id` MUST exist as a row in sys-13 `kms_keys`. Phase 3 makes the FK explicit.
