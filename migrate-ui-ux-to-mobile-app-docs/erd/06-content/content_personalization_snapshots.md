---
entity: content_personalization_snapshots
domain: 06-content
service_owner: ContentService
state_machine: none
api_endpoints:
  - POST /internal/v1/personalization/retrieve
retention: coppa-180d
sequences_referenced_in:
  - docs/sequences/06-content/retrieval.sequence.mmd
---

# content_personalization_snapshots

## Business purpose

Immutable per-turn personalization retrieval snapshot. Records what traits, preferences, memory summaries, and content templates were surfaced for a child at the moment of a retrieval request. Used for audit, debugging, and analytics. Contains child-linked data — COPPA retention applies.

## Ownership rules

- Owner service: `ContentService`
- Writers: `ContentService` (`POST /internal/v1/personalization/retrieve` — INSERT; never UPDATE payload fields).
- Readers: `ContentService` (analytics), `SummaryService` (memory pipeline).

## Lifecycle

- Create: on each `POST /internal/v1/personalization/retrieve` — one row per conversation_request_id.
- Update: `updated_at` only (for soft-delete bookkeeping); payload fields immutable.
- Delete: soft-delete via `deleted_at`; COPPA hard-delete at 180 days via sys-14 RetentionWorker.

## Related APIs

- `POST /internal/v1/personalization/retrieve` — inserts this row

## Related sequences

- `docs/sequences/06-content/retrieval.sequence.mmd` — `INSERT retrieval_snapshots row` (trimmed/degraded variants documented)

## Validation rules

- `conversation_request_id` unique per DB constraint — duplicate requests return existing row (idempotent).
- `traits_payload` ≤ 5 entries; `preferences_payload` ≤ 5; `memories_payload` ≤ 3; `templates_payload` ≤ 5 (enforced in app).
- `retrieval_policy` must be a known policy key (validated by ContentService before insert).

## Edge cases

- `trimmed=true` when total payload exceeds 1800 chars — entries trimmed by salience + recency.
- `degraded=true` when Redis cooldown was unavailable; cooldown filtering skipped.
- `sensitive_data_blocked` path: traits with `blocked_realtime` classification omitted — snapshot reflects what was actually sent.
- Cross-domain ref: `child_id` → `children.id` in `IdentityService`; FK enforced in app, not DB.
