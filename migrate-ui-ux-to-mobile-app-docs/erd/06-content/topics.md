---
entity: topics
domain: 06-content
service_owner: ContentService
state_machine: none
api_endpoints:
  - GET /internal/v1/content/topics
retention: hard
sequences_referenced_in:
  - docs/sequences/06-content/topic-decay.sequence.mmd
  - docs/sequences/06-content/content-selection.sequence.mmd
---

# topics

## Business purpose

Content tag taxonomy used to label activities and personalize content selection. Topics are hierarchical (parent → child) tagging labels — e.g. `animals > mammals > dogs`. **Not the same as `safety_topics` (sys-05)** which are classifier-output safety classifications.

## Ownership rules

- Owner service: `ContentService`
- Writers: `ContentService` (admin API).
- Readers: `ContentService` (selection + decay), `DecayScheduler`.

## Lifecycle

- Create: admin API; topic slugs are curated, not auto-generated.
- Update: `label` mutable; `slug` and `locale` immutable after first use in `topic_decay_state`.
- Delete: hard only when no `topic_decay_state` references exist.

## Related APIs

- `GET /internal/v1/content/topics`

## Related sequences

- `docs/sequences/06-content/topic-decay.sequence.mmd` — decay worker halves `topic_decay_state.interaction_count` per topic
- `docs/sequences/06-content/content-selection.sequence.mmd` — topic boost applied during weighted random selection

## Validation rules

- `slug` alphanumeric + hyphens; unique per `locale`.
- `parent_id` may be null (root topic); no circular references enforced at DB level — enforced in app.

## Edge cases

- Topic merge (rename) requires updating all `topic_decay_state` FK references — no cascade at DB.
- `safety_topics` (sys-05) is a separate table with different shape; naming is intentionally distinct.
