---
entity: lessons
domain: 06-content
service_owner: ContentService
state_machine: '@inline'
api_endpoints:
  - GET /internal/v1/content/units/:unitId/lessons
retention: hard
sequences_referenced_in:
  - docs/sequences/06-content/content-pack-publish.sequence.mmd
  - docs/sequences/06-content/content-selection.sequence.mmd
---

# lessons

## Business purpose

A single teachable session within a unit, delivered to the child as a structured conversation. Lessons define the pedagogical scope (vocabulary, concepts) that activities within them exercise.

## Ownership rules

- Owner service: `ContentService`
- Writers: `ContentService`.
- Readers: `ContentService` (selection), `AuthoringService`.

## Lifecycle

- Create: on pack publish.
- Update: `title`, `position`, `status` mutable; `slug` immutable after `active`.
- Delete: hard when no dependent `activities`.
- State machine (inline): `draft → active → archived`.

## Related APIs

- `GET /internal/v1/content/units/:unitId/lessons`

## Related sequences

- `docs/sequences/06-content/content-pack-publish.sequence.mmd`
- `docs/sequences/06-content/content-selection.sequence.mmd`

## Validation rules

- `position` ≥ 1; unique within `unit_id`.

## Edge cases

- Lesson archival does not cascade to activities; activities archived independently.
