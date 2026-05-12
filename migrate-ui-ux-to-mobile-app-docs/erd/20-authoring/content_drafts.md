---
entity: content_drafts
domain: 20-authoring
service_owner: AuthoringService
state_machine: '@inline'
api_endpoints:
  - POST /internal/v1/authoring/templates
  - GET /internal/v1/authoring/templates
  - GET /internal/v1/authoring/templates/:id
  - PATCH /internal/v1/authoring/templates/:id
  - POST /internal/v1/authoring/templates/:id/submit-for-review
retention: hard
sequences_referenced_in:
  - docs/sequences/20-authoring/template-safety-screen-to-publish.sequence.mmd
  - docs/sequences/20-authoring/publish-to-system06.sequence.mmd
---

# content_drafts

## Business purpose

Working draft record for a content template under authoring. Each draft tracks the full authoring lifecycle from initial creation through safety screening, human review, approval, and publication to sys-06. Revisions are tracked as append-only rows in `content_revisions`.

## Ownership rules

- Owner service: `AuthoringService`
- Writers: `AuthoringService` (author creates/edits/submits), `SafetyScreener` (status transitions on screening result), `ReviewerConsole` (approve/reject).
- Readers: `AuthoringService`, `PublishOrchestrator` (sys-20 publish pipeline reads `status=approved`).

## Lifecycle

- Create: `POST /internal/v1/authoring/templates` — author creates draft; `status='draft'`.
- Update: `PATCH` mutates `title`, `template_text`, `variation_instruction`, `tags`; increments `current_version` on submit.
- Delete: hard when in `draft` state only; `approved`/`published` records archived, not deleted.
- State machine (inline):
  - `draft → safety_screening` (author submits for review)
  - `safety_screening → in_review` (passes blocklist + LLM + PII)
  - `safety_screening → changes_requested` (fails any check)
  - `in_review → approved` (reviewer approves)
  - `in_review → changes_requested` (reviewer requests changes)
  - `changes_requested → draft` (author edits)
  - `approved → published` (pack published to sys-06)
  - `published → archived` (retired)

## Related APIs

- `POST /internal/v1/authoring/templates` — create
- `GET /internal/v1/authoring/templates` / `/:id` — list / read
- `PATCH /internal/v1/authoring/templates/:id` — edit
- `POST /internal/v1/authoring/templates/:id/submit-for-review` — transition to safety_screening

## Related sequences

- `docs/sequences/20-authoring/template-safety-screen-to-publish.sequence.mmd` — full status state machine
- `docs/sequences/20-authoring/publish-to-system06.sequence.mmd` — `SELECT status FROM ca_authoring_templates WHERE id = ANY($1)` before pack assembly

## Validation rules

- `template_text` 10-500 chars.
- `variation_instruction` 10-300 chars when provided.
- `age_bands` array ≥ 1 element.
- `tags` array ≤ 10 elements.

## Edge cases

- Every version is immutable once submitted — new edit creates a `content_revisions` row.
- Safety screen is per `current_version` — re-submit after `changes_requested` creates a new revision.
- Published drafts are immutable — updates require archival + new draft.
- Cross-domain ref: `author_id` → `admin_users.id` (AdminAuthService); FK enforced in app, not DB.
