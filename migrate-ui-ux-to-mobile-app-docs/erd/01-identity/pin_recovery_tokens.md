---
entity: pin_recovery_tokens
domain: 01-identity
service_owner: IdentityService
state_machine: '@inline'
api_endpoints:
  - POST /v1/parent/pin/recovery/request
  - POST /v1/parent/pin/recovery/validate
  - POST /v1/parent/pin/recovery/complete
sequences_referenced_in:
  - docs/sequences/01-identity/pin-recovery.sequence.mmd
retention: hard
---

# pin_recovery_tokens

## Business purpose

Single-use, time-bounded token that lets a parent reset their forgotten PIN via an email magic link without supplying the prior PIN. Backing data store for the parent PIN recovery flow introduced in ADR-0008. Token material exists only in the SES-delivered magic link; this row stores the sha256 hash of that token. Enables self-service recovery even when the parent is in `GATE_LOCKED_OUT` state, since lockout protects the PIN channel, not the recovery channel.

## Ownership rules

- Owner service: `IdentityService`
- Writers: `IdentityService` (issue on `request`, consume on `complete`, expire via maintenance cron, invalidate when a new request supersedes a prior `pending` row).
- Readers: `IdentityService` only — no read fan-out outside the parent-auth-flow.

## Lifecycle

- Create: `POST /v1/parent/pin/recovery/request` — issues a new token row; any prior `pending` row for the same user is atomically set to `invalidated`.
- Update (validate): `POST /v1/parent/pin/recovery/validate` — verifies token is `pending` + unexpired; no row mutation.
- Update (complete): `POST /v1/parent/pin/recovery/complete` — sets `status='consumed'` + `used_at=now()` atomically with the `parent_pins` bcrypt update and `parent_sessions` revoke.
- Expiry: maintenance cron sweeps rows where `expires_at < now()` and `status='pending'` → sets `status='expired'`.
- Delete: hard-delete by `auth.maintenance.purge_pin_recovery_tokens` cron after 30-day retention window (forensic value of recent recovery attempts; per `retention: hard`).

### State machine (inline)

| From | Event | To |
|---|---|---|
| `pending` | `complete` succeeds | `consumed` |
| `pending` | `expires_at` passed | `expired` (cron sweep) |
| `pending` | new request issued for same user | `invalidated` |
| `consumed` | — | terminal |
| `expired` | — | terminal |
| `invalidated` | — | terminal |

## Related APIs

- `POST /v1/parent/pin/recovery/request` — issue token; returns 202 regardless of email match (anti-enumeration, ADR-0008 D10).
- `POST /v1/parent/pin/recovery/validate` — validate token; returns 200 (valid), 410 (used/expired), 404 (not found).
- `POST /v1/parent/pin/recovery/complete` — consume token + reset PIN; one-shot enforced via `used_at`.

## Related sequences

- `docs/sequences/01-identity/pin-recovery.sequence.mmd` — three-step token lifecycle: request → validate → complete, including SES fan-out and all-sessions revoke side effect.

## Validation rules

- `token_hash` is globally unique (DB unique index).
- `expires_at = created_at + 15 min` (ADR-0008 D5).
- One-shot: server rejects any token where `used_at IS NOT NULL` with 410.
- Server also rejects expired tokens (`expires_at < now()`) with 410 even if `used_at IS NULL`.
- At most one `pending` token per user; new request atomically invalidates existing `pending` rows.
- Rate-limit: at most 1 `request` per `(user_id, /24 IP prefix)` per rolling hour, enforced via the `(user_id, created_at)` index (ADR-0008 D6).

## Notes

- **sha256 hashing**: only the hash is stored; raw 32-byte token travels over email only. Mitigates DB read access from enabling token replay.
- **One-shot enforcement**: `used_at` timestamp is the lock — set atomically in the same transaction as the PIN update and session revoke (ADR-0008 D4). There is no separate boolean flag to drift.
- **Anti-enumeration**: `POST /v1/parent/pin/recovery/request` always returns 202 so callers cannot distinguish valid vs invalid email (ADR-0008 D10).
- **Cross-table side effects on complete**: `parent_pins.bcrypt_hash` updated, all `parent_sessions` for the user revoked, any `parent_lockouts` row cleared — all in the same transaction that sets `status='consumed'`.
