---
entity: notification_templates
domain: 10-notifications
service_owner: NotificationService
state_machine: none
api_endpoints:
  - POST /admin/notifications/templates
  - PUT /admin/notifications/templates/:id
  - GET /admin/notifications/templates
retention: hard
sequences_referenced_in:
  - docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd
---

# notification_templates

## Business purpose

Single source of truth for every notification body + delivery rule. One row per `(notification_type, channel)` pair; the worker loads this row at step 3 of the SQS pipeline. Combines template body, subject, throttle window/limit, suppression cooldown, force-send flag, and the special `cannot_be_disabled` flag for safety alerts.

## Ownership rules

- Owner service: `NotificationService`.
- Writers: admin console + DB migration seeds at deploy time.
- Readers: SQS worker (every message), admin preview UI, compliance reports.

## Lifecycle

- Create: at deploy time via migration seed; admin may add new types.
- Update: admin tweaks (body, subject, throttle).
- Delete: hard delete only when a notification type is fully removed from the product. Use `active=false` instead for soft-disable.

## Related APIs

- `POST /admin/notifications/templates` — create
- `PUT /admin/notifications/templates/:id` — edit
- `GET /admin/notifications/templates` — list / inspect

## Related sequences

- `docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd` — read at every message

## Validation rules

- `(notification_type, channel)` is unique — one template per pair.
- `template_body` MUST contain only allow-listed Handlebars variables (no raw conversation text per spec §Security).
- `push_priority` ∈ {`high`, `normal`} when `channel='push'`; null otherwise.
- `cannot_be_disabled=true` is permitted only when `notification_type='safety_alert'`.
- `throttle_window_seconds > 0`, `throttle_limit ≥ 1`.

## Edge cases

- Adding a new notification type is a two-step admin operation: insert template rows for both channels (or just one if the type targets a single channel — e.g. `weekly_summary` is email-only).
- Safety alert override: spec §Notification Type Configuration explicitly states "Cannot Be Disabled". Worker pipeline checks `cannot_be_disabled` BEFORE the per-parent type-preference check.
- Email template body MUST include the `{{unsubscribe_url}}` Handlebars variable (CAN-SPAM requirement). Validator runs at admin save time.
- Push templates carry minimum identifying info (deviceName, batteryPercent) and never include child conversation text.
