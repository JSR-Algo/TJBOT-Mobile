---
entity: review_assignments
domain: 20-authoring
service_owner: AuthoringService
state_machine: '@inline'
api_endpoints:
  - GET /internal/v1/authoring/reviews
  - POST /internal/v1/authoring/reviews/:id/approve
  - POST /internal/v1/authoring/reviews/:id/request-changes
retention: hard
sequences_referenced_in:
  - docs/sequences/20-authoring/template-safety-screen-to-publish.sequence.mmd
---

# review_assignments

## Business purpose

Tracks assignment of a specific content draft revision to a human reviewer. Created automatically by `SafetyScreener` when a template passes all safety checks and transitions to `in_review`. One row per (draft, revision, reviewer) combination.

## Ownership rules

- Owner service: `AuthoringService`
- Writers: `SafetyScreener` (auto-assign on safety pass), `AuthoringService` (reassign on reviewer unavailability).
- Readers: `ReviewerConsole` (reviewer queue), `AuthoringService`.

## Lifecycle

- Create: `SafetyScreener` inserts after `UPDATE template SET status='in_review' + auto-assign reviewer`.
- Update: `status` transitions; `completed_at` set on decision.
- Delete: hard; no soft-delete.
- State machine (inline): `pending → in_progress` (reviewer opens), `in_progress → completed` (decision submitted), `any → reassigned` (admin re-routes to different reviewer).

## Related APIs

- `GET /internal/v1/authoring/reviews` — reviewer queue
- `POST /internal/v1/authoring/reviews/:id/approve` — approve draft
- `POST /internal/v1/authoring/reviews/:id/request-changes` — reject with feedback

## Related sequences

- `docs/sequences/20-authoring/template-safety-screen-to-publish.sequence.mmd` — `SafetyScreener->>PostgreSQL: UPDATE template SET status='in_review' + auto-assign reviewer`

## Validation rules

- `reviewer_id` must hold `content_reviewer` or `content_admin` role (enforced in `AdminAuthService`).
- One active assignment per (draft_id, revision_no) — reassignment first marks existing as `reassigned`.

## Edge cases

- Reviewer reassignment on leave of absence: admin marks existing `reassigned`, creates new assignment row.
- Cross-domain ref: `reviewer_id` → `admin_users.id` (AdminAuthService); FK enforced in app, not DB.
