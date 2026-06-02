---
entity: fallback_templates
domain: 05-safety
service_owner: SafetyService
state_machine: '@inline'
api_endpoints:
  - POST /internal/v1/admin/fallback-templates
  - GET /v1/admin/safety/fallback-templates
  - PATCH /v1/admin/safety/fallback-templates/:id
retention: hard
sequences_referenced_in:
  - docs/sequences/05-safety/fallback-selection.sequence.mmd
  - docs/sequences/05-safety/policy-publish.sequence.mmd
---

# fallback_templates

## Business purpose

Deterministic, locale + age-band-calibrated safe replies for every blocked or degraded scenario — the 19 fallback trigger codes in sys-05 §17. Selection is a deterministic cascade (`fallback-selection.sequence.mmd`): exact match `(template_set, trigger_code, locale, age_band)` → broader age fallback → `generic_safe` → hardcoded "Let's ask a grown-up together." The hardcoded ultimate fallback is in code, not DB, so the system survives a DB outage (sys-05 §4 ultimate-hardcoded-fallback tip).

## Ownership rules

- Owner service: `SafetyService` (`FallbackTemplateStore` module)
- Writers: admin via `POST /internal/v1/admin/fallback-templates`. Writes are governed by sys-05 publish-gate flow (red-team suite, sys-05 §16).
- Readers: `FallbackTemplateStore` (in-memory load + Redis cache `conv:fallback:*` with 10m TTL); `SafetyInvestigationService` (sys-12 timeline rendering of fallback used).

## Lifecycle

- Create: admin drafts new template OR edits existing (creates new `version_no`).
- Update: admin publishes → status flips `draft → published`, `published_at` set, prior published row for same (template_set, trigger_code, locale, age_band) flips to `retired` in the same transaction.
- Delete: hard-delete after 365d post-retirement (curated content, no PII; operational only).
- State machine (inline): `draft → published → retired`. Retirement is reversible only via a new draft+publish.

## Related APIs

- `POST /internal/v1/admin/fallback-templates` — admin publish; invalidates Redis cache via `conv-policy-publish` queue.
- `GET /v1/admin/safety/fallback-templates` — list / diff between versions.
- `PATCH /v1/admin/safety/fallback-templates/:id` — edit draft only (published rows immutable).

## Related sequences

- `docs/sequences/05-safety/fallback-selection.sequence.mmd` — cascade lookup; one row served per blocked turn.
- `docs/sequences/05-safety/policy-publish.sequence.mmd` — publish gate flow (admin RBAC + red-team regression).

## Validation rules

- `(template_set, trigger_code, locale, age_band, status='published')` MUST be at most 1 row at any time (enforced by application transaction; partial index alternative).
- `text_segment` length ≤ 900 chars (sys-05 §12 output gate — final response cap).
- `render_plan` JSON shape: `{"baseScene": <one of 5>, "emotion": <one of 7>}` per sys-05 §11.
- `motion_plan` JSON shape: `{"style": <one of 4>, "maxAmplitudePct": 0-100}` per sys-05 §11.
- Age-4-5 templates MUST pass age-vocabulary check (≤6 words, ≤2 syllables) — pre-publish lint.
- Age-6-8 templates MUST pass age-vocabulary check (≤12 words, simple syntax).

## Related entities

- Pair-with: [[phrase_cache_entries]] (sys-04) — text-side template ↔ audio-side rendered cache. Two artefacts intentionally separated per plan §13 anti-pattern rationale; lookup keys are `(trigger_code, locale, age_band)` here and `phrase_text_sha256` on the audio side, joined at runtime by `Orchestrator`.
- Read-side: [[safety_events]].fallback_template_id captures which template served a specific block.

## Edge cases

- **Cascade miss → hardcoded ultimate:** if every cascade step misses (DB outage, missing seed), the orchestrator falls back to the hardcoded "Let's ask a grown-up together." string — independent of DB, Redis, model. This is sys-05's safety-of-last-resort.
- **Cross-locale fallback:** Year-1 is en-US only; Year-2 multi-locale plan adds locale → en-US fallback chain (NOT in scope of cascade above which is age-band-only).
- **Severe household:** when household crosses severe threshold (sys-05 §17), template selection uses stricter `template_set` (`severe_strict` instead of default) — column governs the lookup; no separate table.
- **Reviewer pipeline:** new templates pass sys-20 authoring review BEFORE landing as `published` — admin handler refuses publish if no approved reviewer signoff exists.
- **No COPPA exposure:** templates contain no child-specific data; they are static content.
