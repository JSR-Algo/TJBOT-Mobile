---
entity: brute_force_lockouts
domain: 13-security
service_owner: BruteForceDetector
state_machine: '@inline'
api_endpoints:
  - POST /security/lockouts
  - DELETE /security/lockouts/:id
retention: hard
sequences_referenced_in:
  - docs/sequences/13-security/brute-force-detection-and-block.sequence.mmd
---

# brute_force_lockouts

## Business purpose

Per-IP lockout entries triggered by the `BruteForceDetector` on failed-auth bursts (sys-13 §8 detection rules). Gateway WAF (sys-17) reads this table on every request to short-circuit blocked traffic.

## Ownership rules

- Owner service: `BruteForceDetector`
- Writers: `BruteForceDetector` (auto on threshold breach); admin via `/security/lockouts` (manual block); admin release via DELETE.
- Readers: Gateway / sys-17 on every request; admin dashboard.

## Lifecycle

- Create: `BruteForceDetector` on threshold breach; admin manual block.
- Update: `status='released_early' + released_at + released_by` on admin release; `status='expired'` by cron at `expires_at`.
- Delete: hard-deleted by sys-14 after retention.
- State machine (inline): `active → expired | released_early`.

## Related APIs

- `POST /security/lockouts` — admin manual block.
- `DELETE /security/lockouts/:id` — admin early release.

## Related sequences

- `docs/sequences/13-security/brute-force-detection-and-block.sequence.mmd` — auto-block trigger.

## Validation rules

- `expires_at > blocked_at`; default TTL 1h, max 24h (admin manual can extend).
- `status='released_early'` requires `released_by` non-null.

## Edge cases

- IPv6 prefix blocks: store the prefix as text (`varchar(45)`); the WAF interprets `/N` suffix. The `ip_address` column is intentionally a string to allow `2001:db8::/48` style entries.
- `security_event_id` is an optional pointer to a future `security_events` table (not in Lane B scope — reserved for Phase 3 or future lane).
