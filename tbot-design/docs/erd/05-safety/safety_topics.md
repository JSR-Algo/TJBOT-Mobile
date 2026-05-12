---
entity: safety_topics
domain: 05-safety
service_owner: SafetyService
state_machine: none
api_endpoints:
  - GET /v1/admin/safety/topics
  - POST /v1/admin/safety/topics
  - PATCH /v1/admin/safety/topics/:id
retention: hard
sequences_referenced_in:
  - docs/sequences/05-safety/input-filter.sequence.mmd
---

# safety_topics

## Business purpose

Catalog of unsafe-evasion topics that the `TopicClassifier` uses to catch semantically harmful input that evades the regex blocklist (sys-05 §13). Each row groups weighted keywords + cumulative threshold + severity action. **Distinct from sys-06 content topics** (curriculum tag taxonomy) — same word, completely different shape and lifetime. Cross-domain collision pre-empted by the name `safety_topics` (sys-05) vs `topics` (sys-06), enforced by `no-cross-domain-name-collision` validator rule (plan §3 Q-6).

## Ownership rules

- Owner service: `SafetyService`
- Writers: admin via `POST /v1/admin/safety/topics` / `PATCH /v1/admin/safety/topics/:id`; `TopicClassifier` reads only.
- Readers: `TopicClassifier` (in-memory load at boot, refresh on publish event); `SafetyInvestigationService` (post-incident lookup of which topic_id matched).

## Lifecycle

- Create: admin authors a new evasion topic.
- Update: admin tunes keyword weights / threshold; bumps `updated_at`. Live `TopicClassifier` instances refresh on publish event (sys-05 §5 Redis cache invalidation).
- Delete: soft-retire via `retired_at`; never hard-deleted while [[safety_events]] still reference the row.
- State machine: none — `retired_at` is the only state-equivalent marker.

## Related APIs

- `GET /v1/admin/safety/topics` — list active + retired.
- `POST /v1/admin/safety/topics` — add new topic (e.g. emerging evasion pattern from production).
- `PATCH /v1/admin/safety/topics/:id` — tune keywords / threshold / parent_alert_threshold.

## Related sequences

- `docs/sequences/05-safety/input-filter.sequence.mmd` — `TopicClassifier` step 3 of the input filter pipeline (5ms budget).

## Validation rules

- `slug` MUST match `^[a-z][a-z0-9_]{2,63}$` — machine identifier convention.
- `classifier_threshold_pct` ∈ [50, 100] — values below 50 are dangerously permissive.
- `keywords` JSON shape: `[{"token": "<string>", "weight": <int 0-100>}]` — sum of weights MUST be ≥ `classifier_threshold_pct`; admin pre-check enforces.
- `required_keyword_count` ≥ 1 — single-keyword topics belong in [[safety_blocklist_entries]], not here.
- `fallback_trigger_code` MUST resolve to an existing `[[fallback_templates]].trigger_code`.

## Edge cases

- **Emerging topic from production:** when [[safety_events]] surfaces a recurring pattern not caught by current topics, admin authors a new safety_topics row + publishes — propagates via Redis cache invalidation within seconds.
- **Locale-specific:** Year-1 is en-US only; the JSON keywords are English. Year-2 multi-locale plan: extend with a `locale` column.
- **Parent alert escalation:** `parent_alert_threshold` lets admin promote a normally-blocked-only topic to parent-alerted without changing severity.
- **NOT a content moderation surface:** authoring (sys-20) uses its own `content_drafts` review path; safety_topics governs runtime classification only.
- **Reference integrity:** retiring a topic does NOT cascade to safety_events rows that reference it (historic audit must remain intact).
