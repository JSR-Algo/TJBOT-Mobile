---
entity: households
domain: 01-identity
service_owner: IdentityService
state_machine: '@inline'
api_endpoints:
  - GET /v1/households
  - POST /v1/households/:householdId/children
  - POST /v1/auth/signup
retention: soft
sequences_referenced_in:
  - docs/sequences/01-identity/signup.sequence.mmd
  - docs/sequences/01-identity/child-profile-create.sequence.mmd
---

# households

## Business purpose

The household is the **root ownership boundary**: every device, child profile, subscription, and parent membership belongs to exactly one household. Households outlive individual parent users (ownership can transfer).

## Ownership rules

- Owner service: `IdentityService`
- Writers: `IdentityService` (create on signup; status changes; primary-parent transfer).
- Readers: nearly every service via auth context (`DeviceService`, `ContentService`, `ControlsService`, `BillingService`, `RetentionWorker`, admin tooling).

## Lifecycle

- Create: atomic with first user during `POST /v1/auth/signup`.
- Update: rename, primary-parent transfer (when owner archives account), tz/locale edits, status moves.
- Delete: soft (`status='scheduled_for_deletion'`, `archived_at` set), then hard via sys-14 retention sweep (`deleted_at`).
- State machine (inline): `active → locked` (admin lock or payment block), `active → scheduled_for_deletion` (user-initiated), `scheduled_for_deletion → deleted` (retention sweep).

## Related APIs

- `POST /v1/auth/signup` — creates initial household.
- `GET /v1/households` — list user-accessible households.
- `POST /v1/households/:householdId/children` — emits a child profile.

## Related sequences

- `docs/sequences/01-identity/signup.sequence.mmd` — initial creation.
- `docs/sequences/01-identity/child-profile-create.sequence.mmd` — child addition.

## Validation rules

- `primary_parent_id` must reference an `active` user.
- `timezone` validated against IANA tzdata; `locale` validated as BCP-47.
- Single primary-parent invariant: only one row in `household_members` may have `role='owner'` per household (enforced by index in `household_members`).

## Edge cases

- Primary-parent account deletion: ownership transfers to next manager in `household_members` (FIFO by `created_at`), else household enters `scheduled_for_deletion`.
- Locale change does not retroactively re-render past summaries.
- Cross-system FK targets: `devices.household_id`, `children.household_id`, `subscriptions.household_id`, `parent_controls.household_id`. Phase 3 lists these in `_shared/cross-domain-data-flow.md`.
