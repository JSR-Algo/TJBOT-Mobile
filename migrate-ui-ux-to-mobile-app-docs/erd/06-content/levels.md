---
entity: levels
domain: 06-content
service_owner: ContentService
state_machine: '@inline'
api_endpoints:
  - GET /internal/v1/content/courses/:courseId/levels
retention: hard
sequences_referenced_in:
  - docs/sequences/06-content/content-pack-publish.sequence.mmd
  - docs/sequences/06-content/content-selection.sequence.mmd
---

# levels

## Business purpose

Ordered subdivision of a course. Each level groups thematically related units and drives the child's progression path through the curriculum.

## Ownership rules

- Owner service: `ContentService`
- Writers: `ContentService` (admin API + PublishOrchestrator).
- Readers: `ContentService` (selection pipeline), `AuthoringService`.

## Lifecycle

- Create: on course pack publish; position assigned at publish time.
- Update: `title`, `position`, `status` mutable; `slug` immutable after `active`.
- Delete: hard-delete only when no dependent `units` exist.
- State machine (inline): mirrors `course_status` — `draft → active → archived`.

## Related APIs

- `GET /internal/v1/content/courses/:courseId/levels` — list levels in course

## Related sequences

- `docs/sequences/06-content/content-pack-publish.sequence.mmd` — levels upserted during pack publish
- `docs/sequences/06-content/content-selection.sequence.mmd` — selection walks hierarchy

## Validation rules

- `position` ≥ 1; unique within `course_id`.
- `slug` unique within `course_id`.

## Edge cases

- Position gaps allowed (sparse ordering) to permit later insertion without renumbering.
