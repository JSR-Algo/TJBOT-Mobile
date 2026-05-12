---
entity: email_sends
domain: 10-notifications
service_owner: NotificationService
state_machine: none
api_endpoints: []
no_api: true
retention: 90d
sequences_referenced_in:
  - docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd
  - docs/sequences/10-notifications/ses-bounce-complaint-handling.sequence.mmd
---

# email_sends

## Business purpose

Email-channel specific detail row. One row per `dispatch_id` whose channel is `email`. Holds the rendered subject, the From/Reply-To addresses actually used, the SES configuration set, the SES MessageId, and the body content hashes — fields that don't belong on the generic `notification_dispatches` row.

## Ownership rules

- Owner service: `NotificationService`.
- Writers: SQS worker pipeline (insert before SES SendEmail; UPDATE `ses_message_id` after SES accepts).
- Readers: bounce-complaint webhook handler, admin email-troubleshooting, sys-12 support, CAN-SPAM compliance reports.

## Lifecycle

- Create: at the moment the worker begins the SES send path (after suppression / throttle / preference gates pass).
- Update: `ses_message_id` once SES returns; `ses_send_attempt_count` on each retry.
- Delete: 90-day retention via sys-14 cleanup (cascade with parent dispatch).

## Related APIs

- None — backend-only

## Related sequences

- `docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd` — INSERT path
- `docs/sequences/10-notifications/ses-bounce-complaint-handling.sequence.mmd` — looked up by `ses_message_id`

## Validation rules

- 1:1 with `notification_dispatches` rows of `channel='email'` — enforced by unique `dispatch_id`.
- `list_unsubscribe_url` must be present for non-transactional emails (CAN-SPAM); transactional types (`password_reset`, `welcome`, `account_deletion_scheduled`) MAY omit list-unsubscribe per FTC guidance but TBot policy is to include for ALL email types.
- `to_address` MAY differ from the parent's current email when the parent changed address between send-time and webhook-time — store the resolved address at send.

## Edge cases

- Email address change after a bounce: the bounce webhook resolves the dispatch via `ses_message_id` and finds `to_address` here, even if `users.email` has since changed.
- Multiple SES attempts (throttled / rate-limit): `ses_send_attempt_count` increments — the row is updated in place rather than producing duplicates.
- `subject_rendered` is the SUBJECT line actually emitted by SES; if the template's Handlebars render fails, the row is NOT created (worker errors out before SES call).
- COPPA: PII surface includes `to_address` and rendered body — 90-day retention enforced by sys-14 cleanup matches `notification_dispatches` window.
