---
entity: units
domain: 06-content
service_owner: ContentService
state_machine: '@inline'
api_endpoints:
  - GET /internal/v1/content/levels/:levelId/units
retention: hard
sequences_referenced_in:
  - docs/sequences/06-content/content-pack-publish.sequence.mmd
  - docs/sequences/06-content/content-selection.sequence.mmd
---

# units

## Business purpose

Ordered grouping of lessons within a level. Units chunk the curriculum into teachable blocks and govern the pacing of lesson delivery to the child.

## Ownership rules

- Owner service: `ContentService`
- Writers: `ContentService` (admin API + PublishOrchestrator).
- Readers: `ContentService` (selection pipeline), `AuthoringService`.

## Lifecycle

- Create: on pack publish.
- Update: `title`, `position`, `status` mutable; `slug` immutable after `active`.
- Delete: hard when no dependent `lessons`.
- State machine (inline): `draft → active → archived`.

## Related APIs

- `GET /internal/v1/content/levels/:levelId/units`

## Related sequences

- `docs/sequences/06-content/content-pack-publish.sequence.mmd`
- `docs/sequences/06-content/content-selection.sequence.mmd`

## Validation rules

- `position` ≥ 1; unique within `level_id`.
- `slug` unique within `level_id`.

## Edge cases

- Sparse positioning supported; gaps harmless.
