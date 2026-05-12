---
entity: admin_role_assignments
domain: 12-admin
service_owner: AdminAuthService
state_machine: '@inline'
api_endpoints:
  - POST /admin/users/:id/roles
  - DELETE /admin/users/:id/roles/:role
retention: hard
sequences_referenced_in: []
no_sequence: true
---

# admin_role_assignments

## Business purpose

Audit-grade history of every role granted to an admin operator. Lifting the role into its own history table preserves who-granted-whom-what-when (instead of just the current state on `admin_users.role`).

## Ownership rules

- Owner service: `AdminAuthService`
- Writers: `super_admin` actions via `/admin/users/:id/roles` endpoints; provisioning workflow.
- Readers: admin auth middleware (`active` row resolves the operator's current role on every request).

## Lifecycle

- Create: on grant. Setting a new role for `(admin_user_id, role)` while another is `active` is forbidden by partial unique index.
- Update: revoke sets `status='revoked' + revoked_at`.
- Delete: hard-deleted by sys-14 after retention.
- State machine (inline): `active → revoked` (no back-edges; revoke + new grant preserves history).

## Related APIs

- `POST /admin/users/:id/roles` — grant.
- `DELETE /admin/users/:id/roles/:role` — revoke.

## Related sequences

`@no-sequence` — admin RBAC moves are out-of-band today (no `.sequence.mmd` yet). Reservation per plan §3.

## Validation rules

- A `super_admin` grant requires `mfa_enabled=true` on the target `admin_users`.
- `granted_by_admin_id` must currently hold `super_admin` (enforced by app layer).
- At most one `active` row per `(admin_user_id, role)`.

## Edge cases

- Bootstrap: the first super admin's row has `granted_by_admin_id = id` (self-reference). Phase 3 may add a `bootstrap=true` annotation if needed.
- Concurrent grants: serialise on `admin_user_id` at app layer (advisory lock).
