---
entity: api_keys
domain: 17-gateway
service_owner: Gateway
state_machine: none
api_endpoints:
  - POST /v1/admin/api-keys
  - DELETE /v1/admin/api-keys/:id
  - GET /v1/admin/api-keys
sequences_referenced_in:
  - docs/sequences/19-billing/entitlement-check-session-start.sequence.mmd
retention: hard
---

# api_keys

## Business purpose

Machine-to-machine authentication credentials used by devices (device-bearer) and admin tooling (admin-bearer) to access internal Gateway routes. The raw API key is never stored — only a SHA-256 hash is persisted. The `key_prefix` enables identification in audit logs without exposing the secret.

## Ownership rules

- Owner service: `Gateway`
- Writers: `Gateway` (creates on provisioning; updates `last_used_at` on each authenticated request; sets `revoked_at` on revocation)
- Readers: `Gateway` (hashes incoming key → looks up by `key_hash` on every authenticated request)

## Lifecycle

- Create: device keys provisioned at factory (`tbot-demo flash` / DeviceService pairing); admin keys provisioned by admin operations.
- Update: `last_used_at` updated on each authenticated request; `revoked_at` set on explicit revocation.
- Delete: never deleted — `revoked_at` timestamp signals revocation; historical record retained for audit.
- State machine: none — active (revoked_at is null) vs revoked (revoked_at is set); no formal state machine needed.

## Related APIs

- `POST /v1/admin/api-keys` — create a new admin-bearer key
- `DELETE /v1/admin/api-keys/:id` — revoke a key (sets `revoked_at`)
- `GET /v1/admin/api-keys` — list keys for a given owner

## Related sequences

- `docs/sequences/19-billing/entitlement-check-session-start.sequence.mmd` — service-token JWT (audience `tbot:service`) resolved via Gateway auth; api_keys provides device-level auth for firmware calls

## Validation rules

- `key_hash` unique — enforced by DB unique index; raw key is hashed client-side before storage.
- `owner_id` is a UUID but FK target varies by `type` — not a DB-level FK (polymorphic); enforced by Gateway at creation time.
- Expired keys (`expires_at < now()`) treated as invalid by Gateway even if `revoked_at` is null.

## Edge cases

- **Polymorphic owner_id**: `owner_id` references either `devices.id` (DeviceService) or `admin_users.id` (AdminAuthService) depending on `type`. Not a DB FK — Gateway resolves the reference by type. Phase 3 will document this in `_shared/cross-domain-data-flow.md`.
- **Key rotation**: devices rotate keys by creating a new key and then revoking the old one. The overlap window ensures no downtime.
- **Raw key security**: raw key is generated once at provisioning and returned to the caller; it is then discarded by Gateway. Only `key_hash` is stored.
