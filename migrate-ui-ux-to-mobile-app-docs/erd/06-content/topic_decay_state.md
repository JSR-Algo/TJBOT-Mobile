---
entity: topic_decay_state
domain: 06-content
service_owner: ContentService
state_machine: none
api_endpoints:
  - '@no-api'
retention: coppa-180d
sequences_referenced_in:
  - docs/sequences/06-content/topic-decay.sequence.mmd
  - docs/sequences/06-content/content-selection.sequence.mmd
---

# topic_decay_state

## Business purpose

Tracks per-child engagement with each content topic. The `interaction_count` field drives the topic boost weighting in content selection and is halved weekly by the `DecayScheduler` for stale topics (last seen > 30 days ago). Rows are deleted when `interaction_count` drops below 1. Contains child-linked data — COPPA retention applies.

## Ownership rules

- Owner service: `ContentService`
- Writers: `ContentService` (increments on activity delivery), `DecayScheduler` (weekly halving + row deletion).
- Readers: `ContentService` (topic boost during selection).

## Lifecycle

- Create: on first activity delivery for a (child, topic) pair.
- Update: `interaction_count` incremented on each delivery; `last_seen_at` updated; `updated_at` updated.
- Delete: soft-delete via `deleted_at` when `interaction_count` < 1 post-decay; COPPA hard-delete at 180 days.
- State machine: none — `interaction_count` is a numeric timer, not a state enum.

## Related APIs

- No direct API — internal state maintained by `ContentService` and `DecayScheduler`.

## Related sequences

- `docs/sequences/06-content/topic-decay.sequence.mmd` — `UPDATE topic_preferences SET interaction_count = count/2 WHERE last_interaction_at < now-30d AND count >= 2` + `DELETE WHERE count < 1`
- `docs/sequences/06-content/content-selection.sequence.mmd` — topic boost (cap 2.0x) applied from this table

## Validation rules

- `interaction_count` ≥ 0; never negative.
- `(child_id, topic_id)` unique per DB constraint.

## Edge cases

- Decay is idempotent: UPDATE WHERE `last_interaction_at < cutoff` is safe to replay.
- Child deletion cascades: when `children.deleted_at` is set, this table is swept by sys-14 RetentionWorker.
- Cross-domain ref: `child_id` → `children.id` in `IdentityService`; FK enforced in app, not DB.
