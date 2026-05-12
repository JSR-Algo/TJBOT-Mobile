---
entity: courses
domain: 06-content
service_owner: ContentService
state_machine: '@inline'
api_endpoints:
  - GET /internal/v1/content/courses
  - POST /internal/v1/content/courses
retention: hard
sequences_referenced_in:
  - docs/sequences/06-content/content-pack-publish.sequence.mmd
  - docs/sequences/06-content/content-selection.sequence.mmd
---

# courses

## Business purpose

Top-level curriculum unit grouping all levels, units, lessons, and activities for a given locale and age band. A course is the root of the content hierarchy and the primary packaging unit for content packs published by sys-20 and consumed by sys-06.

## Ownership rules

- Owner service: `ContentService`
- Writers: `ContentService` (admin API + PublishOrchestrator on pack publish).
- Readers: `ContentService` (selection pipeline), `AuthoringService` (sys-20, template association).

## Lifecycle

- Create: admin API or PublishOrchestrator inserts draft record before pack assembly.
- Update: `title`, `description`, `status` mutable; `slug` immutable after `active`.
- Delete: hard-delete only when no dependent `levels` exist; otherwise archive via `status='archived'`.
- State machine (inline): `draft → active` (on publish), `active → archived` (manual admin), `archived` is terminal.

## Related APIs

- `GET /internal/v1/content/courses` — list courses by locale + status
- `POST /internal/v1/content/courses` — create

## Related sequences

- `docs/sequences/06-content/content-pack-publish.sequence.mmd` — pack publish upserts course records
- `docs/sequences/06-content/content-selection.sequence.mmd` — selection filters by locale + age band

## Validation rules

- `slug` alphanumeric + hyphens; max 64 chars; unique per DB constraint.
- `age_band_min` < `age_band_max`; both positive.
- `locale` must be a valid BCP-47 tag.

## Edge cases

- Immutable `slug` after `status='active'` — slug changes require archival + new row.
- Pack publish is idempotent per (packKey, version); re-publish requires new version in sys-20 schedule.
