---
entity: household_members
domain: 01-identity
service_owner: IdentityService
state_machine: '@inline'
api_endpoints:
  - GET /v1/households
  - POST /v1/households/:householdId/members
retention: soft
sequences_referenced_in:
  - docs/sequences/01-identity/signup.sequence.mmd
  - docs/sequences/01-identity/login.sequence.mmd
  - docs/sequences/01-identity/child-profile-create.sequence.mmd
---

# household_members

## Business purpose

Many-to-many mapping between users and households with a role. Tracks invitation lifecycle so multi-parent households can be supported without giving everyone owner rights.

## Ownership rules

- Owner service: `IdentityService`
- Writers: `IdentityService` (membership create on signup; invite accept/revoke).
- Readers: auth middleware (every service); admin tooling.

## Lifecycle

- Create: signup creates `(owner, active)` row; invite flow creates `(manager|viewer, pending_invite)`.
- Update: `accepted_at` set on invite accept (`status → active`); `revoked_at` on revoke (`status → revoked`).
- Delete: soft (revoked) only; hard delete cascades from `users` / `households` soft-delete via sys-14.
- State machine (inline): `pending_invite → active` (accept), `pending_invite → revoked` (reject / cancel), `active → revoked` (admin or self-leave).

## Related APIs

- `POST /v1/households/:householdId/members` — invite a manager / viewer.
- `GET /v1/households` — uses this table to resolve which households the caller can see.

## Related sequences

- `docs/sequences/01-identity/signup.sequence.mmd` — initial owner row.
- `docs/sequences/01-identity/login.sequence.mmd` — `/v1/me` payload resolves households.
- `docs/sequences/01-identity/child-profile-create.sequence.mmd` — authz gate (owner / manager only).

## Validation rules

- Exactly one `(owner, active)` per household (enforced by separate partial-index in DDL emitter).
- `invited_by_user_id` must be an active member of the same household.
- `role` is immutable once accepted; role-change is a revoke + new invite.

## Edge cases

- Owner leaving without successor → household enters `scheduled_for_deletion` per business rule (see `households.md` edge cases).
- Re-invite of a previously revoked user creates a new row (history preserved).
