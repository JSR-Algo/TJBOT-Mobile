---
entity: content_revisions
domain: 20-authoring
service_owner: AuthoringService
state_machine: none
api_endpoints:
  - GET /internal/v1/authoring/templates/:id/revisions
retention: hard
sequences_referenced_in:
  - docs/sequences/20-authoring/template-safety-screen-to-publish.sequence.mmd
---

# content_revisions

## Business purpose

Append-only, immutable version history for `content_drafts`. Each time an author submits a draft for review, a new revision row is created capturing a snapshot of all payload fields at that moment. No rows are ever updated or deleted in production (audit trail). The `draft_id` + `version_no` pair is the canonical revision identifier.

## Ownership rules

- Owner service: `AuthoringService`
- Writers: `AuthoringService` (append-only on `submit-for-review`).
- Readers: `AuthoringService` (revision history view), `SafetyScreener` (`SELECT template_text, variation_instruction`), `PublishOrchestrator` (revalidate before pack assembly).

## Lifecycle

- Create: on `submit-for-review` — one new row per submission.
- Update: **never** — rows are immutable once written.
- Delete: hard only as part of account deletion / legal request (sys-14); normal operations never delete.

## Related APIs

- `GET /internal/v1/authoring/templates/:id/revisions` — list revisions for a draft

## Related sequences

- `docs/sequences/20-authoring/template-safety-screen-to-publish.sequence.mmd` — `SafetyScreener->>PostgreSQL: SELECT template_text, variation_instruction`

## Validation rules

- `version_no` monotonically increasing per `draft_id`; unique per (draft_id, version_no).
- Payload fields (template_text, variation_instruction, age_bands, tags) snapshot immutable — no UPDATE allowed.

## Edge cases

- Safety screen operates on a specific (draft_id, version_no) — re-submit after changes_requested creates version_no + 1.
- Cross-domain ref: `author_id` → `admin_users.id` (AdminAuthService); FK enforced in app, not DB.
