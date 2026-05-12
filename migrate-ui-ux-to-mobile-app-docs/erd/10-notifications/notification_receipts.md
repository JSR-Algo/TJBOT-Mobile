---
entity: notification_receipts
domain: 10-notifications
service_owner: NotificationService
state_machine: none
api_endpoints:
  - POST /webhooks/ses-events
retention: 90d
sequences_referenced_in:
  - docs/sequences/10-notifications/ses-bounce-complaint-handling.sequence.mmd
  - docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd
---

# notification_receipts

## Business purpose

Append-only log of every provider event (FCM ack/failure, SES delivery / bounce / complaint). Preserves the chronology that `notification_dispatches.status` collapses into a single field. Critical for forensics ("when did this email actually bounce?"), bounce-rate dashboards, and email-channel auto-disable decisions.

## Ownership rules

- Owner service: `NotificationService`.
- Writers: `POST /webhooks/ses-events` handler; FCM response handler in the worker pipeline.
- Readers: admin troubleshooting, sys-12 support, sys-11 telemetry-derived dashboards.

## Lifecycle

- Create: every provider event INSERTs a row.
- Update: never — append-only. **Lifecycle.update = never.**
- Delete: 90-day retention via sys-14 `notification_log_cleanup` companion (cascade with parent dispatch).

## Related APIs

- `POST /webhooks/ses-events` — SNS-fronted webhook from SES

## Related sequences

- `docs/sequences/10-notifications/ses-bounce-complaint-handling.sequence.mmd` — primary write path
- `docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd` — FCM ack write path

## Validation rules

- `provider_event_id` unique — SES MessageId or FCM correlation id deduplicates webhook redeliveries.
- `bounce_subtype` populated only when `receipt_kind ∈ {ses_hard_bounce, ses_soft_bounce}`.
- `dispatch_id` MUST exist in `notification_dispatches` — orphan receipts are rejected at INSERT.

## Edge cases

- SES retries deliveries up to 23 days; the unique index on `provider_event_id` makes the webhook idempotent.
- Mid-flight scenario: provider sends `delivery` then `bounce` for the same MessageId (legitimate when address rejects after acceptance). Receipts capture both events; the latest receipt drives `notification_dispatches.status` to `bounced`.
- Hard bounce on a transactional email (password_reset): writes the receipt but does NOT block the next password-reset send (spec §Bounce and Complaint Handling: "transactional emails ... are still allowed through").
- FCM `token_invalid` receipt also triggers an UPDATE on the parent's push-token registry (sys-10 `push_tokens.status='invalidated'`).
- No COPPA scope — receipts contain no child data.
