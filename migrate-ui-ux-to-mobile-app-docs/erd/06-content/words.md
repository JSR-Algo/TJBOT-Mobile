---
entity: words
domain: 06-content
service_owner: ContentService
state_machine: none
api_endpoints:
  - GET /internal/v1/content/words
retention: hard
sequences_referenced_in:
  - docs/sequences/06-content/content-selection.sequence.mmd
---

# words

## Business purpose

Vocabulary word entries used by activity-level and lesson-level exercises. Each word carries locale, phonetics, and an optional media asset pointer so the TTS and visual rendering layers can render it without additional lookups.

## Ownership rules

- Owner service: `ContentService`
- Writers: `ContentService` (pack publish or direct admin API).
- Readers: `ContentService` (selection), realtime session rendering layer.

## Lifecycle

- Create: on content pack publish or direct admin word management.
- Update: `definition`, `phonetic`, `media_url` mutable; `word` itself is immutable after creation (new word = new row).
- Delete: hard.

## Related APIs

- `GET /internal/v1/content/words` — list words by locale / activity / lesson

## Related sequences

- `docs/sequences/06-content/content-selection.sequence.mmd` — words resolved for vocabulary activities

## Validation rules

- Exactly one of `activity_id` or `lesson_id` must be non-null (enforced in app layer).
- `locale` must be valid BCP-47.

## Edge cases

- `media_url` is an S3 URI; not a FK — resolved via `media_assets` in `_shared/` if moderation tracking needed.
