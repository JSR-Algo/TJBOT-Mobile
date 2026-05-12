---
entity: review_decisions
domain: 20-authoring
service_owner: AuthoringService
state_machine: none
api_endpoints:
  - POST /internal/v1/authoring/reviews/:id/approve
  - POST /internal/v1/authoring/reviews/:id/request-changes
retention: hard
sequences_referenced_in:
  - docs/sequences/20-authoring/template-safety-screen-to-publish.sequence.mmd
---

# review_decisions

## Business purpose

Immutable audit record of a reviewer's decision (approve or request-changes) on a specific revision of a content draft. One row per review assignment — never updated after creation. `quality_score` is advisory only (from the async `ca-quality-score` job) and may be NULL if the job timed out.

## Ownership rules

- Owner service: `AuthoringService`
- Writers: `AuthoringService` (on reviewer submit — append-only).
- Readers: `AuthoringService` (audit trail, decision history), `PublishOrchestrator` (revalidate approved status).

## Lifecycle

- Create: on `POST /internal/v1/authoring/reviews/:id/approve` or `request-changes`.
- Update: **never** — rows are immutable.
- Delete: hard only for legal/retention requests (sys-14); normal flow never deletes.

## Related APIs

- `POST /internal/v1/authoring/reviews/:id/approve`
- `POST /internal/v1/authoring/reviews/:id/request-changes`

## Related sequences

- `docs/sequences/20-authoring/template-safety-screen-to-publish.sequence.mmd` — reviewer approves → `UPDATE template SET status='approved'`

## Validation rules

- `feedback` required (non-empty) when `outcome='changes_requested'`.
- `quality_score` ∈ [0, 100] or NULL (advisory; not a gate).
- One decision per assignment (unique on `assignment_id`).

## Edge cases

- Quality score timeout: `quality_score=NULL` is valid; decision not blocked by score absence.
- Reviewer denormalization: `reviewer_id` stored on this row for audit independence from `review_assignments` reassignment history.
- Cross-domain ref: `reviewer_id` → `admin_users.id` (AdminAuthService); FK enforced in app, not DB.
