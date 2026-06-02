---
entity: activities
domain: 06-content
service_owner: ContentService
state_machine: '@inline'
api_endpoints:
  - GET /internal/v1/content/lessons/:lessonId/activities
  - POST /internal/v1/content/select
retention: hard
sequences_referenced_in:
  - docs/sequences/06-content/content-selection.sequence.mmd
  - docs/sequences/06-content/content-pack-publish.sequence.mmd
---

# activities

## Business purpose

Leaf-level delivery unit of the curriculum. Each activity is a discrete interactive exercise (vocabulary drill, pronunciation, game, etc.) resolved by the content selection pipeline and delivered to the child within a session turn.

## Ownership rules

- Owner service: `ContentService`
- Writers: `ContentService` (publish pipeline).
- Readers: `ContentService` (selection — `POST /internal/v1/content/select`), `SafetyService` (caller).

## Lifecycle

- Create: on pack publish.
- Update: `payload`, `position`, `status` mutable; `slug` immutable after `active`.
- Delete: hard when no active references in `content_personalization_snapshots`.
- State machine (inline): `draft → active → archived`.

## Related APIs

- `GET /internal/v1/content/lessons/:lessonId/activities`
- `POST /internal/v1/content/select` — selection pipeline resolves an activity

## Related sequences

- `docs/sequences/06-content/content-selection.sequence.mmd` — SELECT active+approved activities WHERE category + ageBand
- `docs/sequences/06-content/content-pack-publish.sequence.mmd` — upserted on pack publish

## Validation rules

- `payload` shape validated per `activity_type` (enforced in app layer, not DB).
- `position` ≥ 1; unique within `lesson_id`.

## Edge cases

- Disabled activities (`status='archived'`) are never selected; selection pipeline hard-filters.
- Pack publish is idempotent per (packKey, version); activity upsert on conflict updates payload only.
