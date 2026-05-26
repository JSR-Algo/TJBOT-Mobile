---
entity: children
domain: 01-identity
service_owner: IdentityService
state_machine: '@inline'
api_endpoints:
  - POST /v1/households/:householdId/children
  - PATCH /v1/children/:childProfileId
  - POST /v1/children/:childProfileId/archive
retention: coppa-on-deletion
sequences_referenced_in:
  - docs/sequences/01-identity/child-profile-create.sequence.mmd
---

# children

## Business purpose

Child identity inside a household. COPPA-scoped: the row stores no direct PII beyond an opaque nickname + age band + behavioural preferences. Every downstream child-linked record (sessions, summaries, telemetry, transcripts) refers to `children.id`.

## Ownership rules

- Owner service: `IdentityService`
- Writers: `IdentityService` (create / patch / archive).
- Readers: `RealtimeService`, `ContentService`, `SafetyService`, `ControlsService`, `SummaryService`, `RetentionWorker`, admin tooling — all via auth context.

## Lifecycle

- Create: `POST /v1/households/:householdId/children` after COPPA consent recorded in `consent_records` (handled by sys-01 §4 COPPA flow).
- Update: nickname / age-band changes via `PATCH`; mode toggles via controls flows.
- Delete: archive sets `archived_at + status='archived'`; user-initiated deletion sets `status='scheduled_for_deletion'`; sys-14 retention worker hard-deletes `deleted_at` after COPPA window.
- State machine (inline): `active → archived` (user archive), `active → scheduled_for_deletion`, `scheduled_for_deletion → deleted`.

## Related APIs

- `POST /v1/households/:householdId/children` — create
- `PATCH /v1/children/:childProfileId` — edit
- `POST /v1/children/:childProfileId/archive` — archive
- (sys-14) deletion-request flow eventually hard-deletes.

## Related sequences

- `docs/sequences/01-identity/child-profile-create.sequence.mmd` — create-with-COPPA-consent

## Validation rules

- Nickname sanitization per sys-01 §4.10 (HTML-entity decode, profanity / homoglyph filter).
- Unique nickname within household (UI nudge; not a DB constraint — duplicates rejected at app layer).
- `age_band` immutable except by admin support flow.
- Consent record for COPPA must exist (`consent_records` row) before insert.

## Edge cases

- COPPA hard-delete (`retention: coppa-on-deletion`): when a deletion request is accepted, every record linking to `children.id` MUST also be deleted within the SLA (180-day max by US COPPA; tighter for EU GDPR). Sys-14 enforces; this entity is the **scope anchor**.
- Re-creation after deletion is treated as a brand-new profile (no resurrection of personalisation).
- Archived children retain row + history until retention sweep; reactivation by admin is possible while `status='archived'`.

## Cross-system FK consumers (this row is referenced by)

- `sessions.child_id` (sys-04)
- `daily_summaries.child_id`, `weekly_summaries.child_id` (sys-06, sys-07)
- `topic_decay_state.child_id`, `content_personalization_snapshots.child_id` (sys-06)
- `parent_controls.child_id`, `usage_caps.child_id` (sys-07)
- `safety_events.child_id` (sys-05)
- `telemetry_events.child_id` (sys-11) — only when explicitly child-scoped

Phase 3 reconciles every cross-folder FK into `_shared/cross-domain-data-flow.md`.
