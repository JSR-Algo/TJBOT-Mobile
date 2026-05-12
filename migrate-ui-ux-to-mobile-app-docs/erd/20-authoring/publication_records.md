---
entity: publication_records
domain: 20-authoring
service_owner: AuthoringService
state_machine: '@inline'
api_endpoints:
  - POST /internal/v1/authoring/schedules
  - POST /internal/v1/authoring/schedules/:id/publish-now
  - POST /internal/v1/authoring/schedules/:id/cancel
retention: hard
sequences_referenced_in:
  - docs/sequences/20-authoring/publish-to-system06.sequence.mmd
---

# publication_records

## Business purpose

Immutable audit record of a content pack publication event. Each scheduled or immediate publish attempt creates one row. Tracks the full lifecycle from pack assembly through S3 upload to sys-06 `ContentService` acceptance. `pack_id` is the content-addressable hash ensuring idempotent delivery to sys-06.

## Ownership rules

- Owner service: `AuthoringService`
- Writers: `AuthoringService` (schedule creation — inserts `pending`), `PublishOrchestrator` (updates status through publish lifecycle).
- Readers: `AuthoringService` (audit), `PublishOrchestrator`, `ContentService` (sys-06, verifies pack_id dedup).

## Lifecycle

- Create: `AuthoringService` on schedule accept — `status='pending'`.
- Update: `PublishOrchestrator` transitions `status`; `published_at` set on sys-06 acceptance; `failed_reason` set on failure.
- Delete: hard; publication records are permanent audit artifacts.
- State machine (inline):
  - `pending → published` (ContentService accepts pack)
  - `pending → failed` (S3 upload error or ContentService rejection — no retry)
  - `pending → cancelled` (author cancels before execution)
  - `published → rolled_back` (admin rollback — rare)

## Related APIs

- `POST /internal/v1/authoring/schedules` — creates schedule + publication_record(pending)
- `POST /internal/v1/authoring/schedules/:id/publish-now` — triggers immediate execution
- `POST /internal/v1/authoring/schedules/:id/cancel` — cancels pending

## Related sequences

- `docs/sequences/20-authoring/publish-to-system06.sequence.mmd` — full publish pipeline: schedule → SQS → PublishOrchestrator → S3 → ContentService → UPDATE status

## Validation rules

- `publisher_id` must hold `content_admin` role (enforced in app).
- `pack_id` unique — sys-06 deduplicates on this key.
- Only `approved` templates may appear in a pack (re-validated by `PublishOrchestrator` before S3 upload).

## Edge cases

- `content_service_rejection` (schema_mismatch): `status='failed'`; no retry — author must fix draft and republish.
- DLQ after 3 SQS retries: PagerDuty alert; record remains `pending` until manual intervention.
- Cross-domain ref: `publisher_id` → `admin_users.id` (AdminAuthService); FK enforced in app, not DB.
- `schedule_id` FK to `ca_publish_schedules` is in same folder — deferred to Phase 3 reconciliation.
