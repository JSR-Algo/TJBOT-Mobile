# 17-gateway — Gateway / WAF ERD

**System spec:** `docs/site/software/systems/17-api-gateway-rate-limiting.md`
**Sequences:** `docs/sequences/17-gateway/*.sequence.mmd`
**Owning service(s):** `Gateway`
**Lane:** G (worker-6, Phase 2)

## Entities

| Entity | Purpose |
|---|---|
| `rate_limit_buckets` | Time-windowed sliding-window counter per subject; hypertable candidate |
| `api_keys` | Device-bearer and admin-bearer machine auth credentials; raw key never stored |

## Not in this folder

- `idempotency_keys` belongs to `_shared/` per plan Q-5 default — every service writes it.

## Key conventions

- `rate_limit_buckets` UNIQUE on `(subject_kind, subject_id, window_start)` — atomic UPSERT increment.
- `api_keys.key_hash` UNIQUE — SHA-256 of raw key; raw key never persisted.
- `api_keys.owner_id` is polymorphic (device or admin_user depending on `type`) — not a DB FK.
