---
entity: coppa_consents
domain: 01-identity
service_owner: IdentityService
state_machine: docs/decisions/0005-parent-gate-security-model.md#consentform-state-machine
api_endpoints:
  - POST /v1/identity/coppa/consent
  - GET /v1/identity/coppa/consent/status
  - DELETE /v1/identity/coppa/consent
sequences_referenced_in:
  - docs/sequences/01-identity/coppa-consent-record.sequence.mmd
retention: coppa-on-deletion
---

# coppa_consents

## Business purpose

Records parent consent to the TBOT child-data processing policy, as required by COPPA (Children's Online Privacy Protection Act). One row is created each time a parent affirmatively accepts a specific policy version. When the policy text changes (version bump), a new consent is required and the prior row is status=superseded. Revoking consent sets status=revoked and triggers the account-deletion or child-data-scrub workflow.

## Ownership rules

- Owner service: `IdentityService`
- Writers: `IdentityService` (creates on consent form submit; updates status on revocation or supersession)
- Readers: `IdentityService` (pre-child-data-write consent check), `AccountDeletionService` (sys-14, consent-revocation trigger), compliance exports

## Lifecycle

- Create: on parent consent-form submission (parent taps "Accept" in the app). One row per (user_id, version) pair — UNIQUE constraint prevents duplicate accepts.
- Update: `status` transitions and `revoked_at` set only.
- Delete: never hard-deleted. Rows are retained for the lifetime of the parent account plus the `coppa-on-deletion` retention window (7 years from account deletion per legal). Soft-delete is NOT used — the `status` column carries lifecycle state.
- State machine: pointer to `docs/decisions/0005-parent-gate-security-model.md#consentform-state-machine`.
  If the referenced section does not yet exist (spec placeholder), the inline transitions are:
  - `active` → `superseded` (new policy version accepted by same user; prior row superseded atomically in same tx)
  - `active` → `revoked` (parent revokes via settings screen or account-delete initiates)
  - `superseded` → terminal (no further transitions — historical audit row)
  - `revoked` → terminal (no re-activation; user must create fresh consent with new row)

## Related APIs

- `POST /v1/identity/coppa/consent` — record parent acceptance; returns consent id
- `GET /v1/identity/coppa/consent/status` — returns latest active consent version + status for the authenticated user
- `DELETE /v1/identity/coppa/consent` — revoke consent; triggers account-deletion workflow

## Related sequences

- `docs/sequences/01-identity/coppa-consent-record.sequence.mmd` — consent accept + pre-write guard check

## Validation rules

- `version` must match the currently published policy version (IdentityService validates against config); stale-version submits rejected with 409.
- `ip` must be a valid IPv4 or IPv6 address (DB inet type enforces this).
- `accepted_locale` must be a valid BCP-47 tag (app-layer validated before insert).
- At most one row with `status = 'active'` per user_id (enforced by unique index on (user_id, version) plus app-layer status check).

## Edge cases

- **Policy version bump**: IdentityService atomically marks the previous active row as `superseded` and inserts the new `active` row in a single transaction.
- **Concurrent acceptance**: the UNIQUE(user_id, version) index serialises concurrent consent submits — second attempt gets a 409.
- **Account deletion**: `AccountDeletionService` (sys-14) sets `status = revoked` and `revoked_at = now()` before initiating deletion; the consent row outlives the user row per coppa-on-deletion retention.
- **Child-data write guard**: every service that writes child data calls `IdentityService.checkConsent(user_id)` before the write; no write proceeds without an `active` row.
