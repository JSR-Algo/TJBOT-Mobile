---
entity: users
domain: 01-identity
service_owner: IdentityService
state_machine: '@inline'
api_endpoints:
  - POST /v1/auth/signup
  - POST /v1/auth/login
  - GET /v1/me
  - PATCH /v1/me
  - POST /v1/auth/logout
  - POST /v1/auth/logout-all
retention: soft
sequences_referenced_in:
  - docs/sequences/01-identity/signup.sequence.mmd
  - docs/sequences/01-identity/login.sequence.mmd
  - docs/sequences/01-identity/password-reset.sequence.mmd
  - docs/sequences/01-identity/token-refresh.sequence.mmd
---

# users

## Business purpose

Canonical adult identity for every parent / household manager. One row per signed-up adult; the root ownership boundary for households, children, devices, billing.

## Ownership rules

- Owner service: `IdentityService`
- Writers: `IdentityService` (signup, profile edit, status transitions, soft-delete).
- Readers: every parent-facing service via auth middleware; `BillingService`, `NotificationService`, `RetentionWorker`, admin tooling.

## Lifecycle

- Create: `POST /v1/auth/signup` — atomic transaction creating `users` + initial `households` + `household_members(owner)` + consent rows.
- Update: profile edits via `PATCH /v1/me`; `last_login_at` on every successful login; `status` on disable / scheduled-deletion.
- Delete: soft-delete sets `deleted_at` and `status='deleted'`; sys-14 retention sweep hard-deletes after the policy window.
- State machine (inline): `active → disabled` (admin / abuse), `active → scheduled_for_deletion` (user request), `scheduled_for_deletion → deleted` (retention sweep), `disabled → active` (admin re-enable).

## Related APIs

- `POST /v1/auth/signup` — create
- `POST /v1/auth/login` — auth, updates `last_login_at`
- `GET /v1/me` / `PATCH /v1/me` — read / edit profile
- `POST /v1/auth/logout` / `logout-all` — revokes sessions (not the user row)
- `POST /v1/auth/forgot-password` — emits `password_reset_tokens`

## Related sequences

- `docs/sequences/01-identity/signup.sequence.mmd` — initial creation transaction
- `docs/sequences/01-identity/login.sequence.mmd` — credential check + session issue
- `docs/sequences/01-identity/password-reset.sequence.mmd` — out-of-band recovery
- `docs/sequences/01-identity/token-refresh.sequence.mmd` — session refresh, replay detection

## Validation rules

- Email lower-cased + trimmed; uniqueness enforced by `idx_users_email_unique`.
- Password meets policy (zxcvbn score ≥3) before `password_hash` is set.
- `status` transitions guarded in app layer; no DB-side trigger.
- `default_household_id` must reference an existing household where the user has an active `household_members` row.

## Edge cases

- Account-exists path returns 409 without leaking which email is on file.
- Soft-delete is reversible only by admin within retention window; cascades to `household_members.status=revoked` for memberships in non-owned households.
- COPPA: this row itself is adult; child data lives in `children`. See plan §3 R-6.
- Email-change flow requires verification via `email_verifications` before `users.email` is mutated.
