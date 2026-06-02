---
entity: notification_dispatches
domain: 10-notifications
service_owner: NotificationService
state_machine: '@inline'
api_endpoints:
  - GET /admin/notifications/dispatches
  - GET /v1/me/notifications
retention: 90d
sequences_referenced_in:
  - docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd
  - docs/sequences/10-notifications/ses-bounce-complaint-handling.sequence.mmd
  - docs/sequences/_cross/safety-event-fanout.sequence.mmd
---

# notification_dispatches

## Business purpose

Authoritative delivery record for every notification attempt. Each row represents a single `(parent, channel, type)` send (or a suppression decision when the send was blocked). Powers the parent's notification history view, admin troubleshooting, bounce/complaint correlation, and the 90-day cleanup sweep (sys-14 `notification_log_cleanup`).

## Ownership rules

- Owner service: `NotificationService`.
- Writers: SQS worker pipeline (INSERT `queued`, UPDATE on terminal outcome); SES webhook handler (UPDATE `delivered_at`, transitions `sent → delivered` / `sent → bounced`).
- Readers: parent app history view, admin dispatch search, cross-system observability dashboards.

## Lifecycle

- Create: SQS worker step 5h (insert `queued`).
- Update: status advances `queued → sent → delivered` (happy) or `queued → suppressed | failed | bounced`. `scheduled_for` set when send is deferred by quiet-hours / timezone-aware schedule.
- Delete: 90-day retention via sys-14 `notification_log_cleanup` cron.

State machine (inline):

```
queued → sent (provider accepted)        → delivered (webhook confirms)
                                          → bounced (SES bounce webhook)
queued → suppressed (throttle | preference | suppression_cooldown | email_disabled | quiet_hours)
queued → failed (non-retryable provider error after retries)
```

## Related APIs

- `GET /admin/notifications/dispatches` — admin search
- `GET /v1/me/notifications` — parent's recent history

## Related sequences

- `docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd` — INSERT + status writes
- `docs/sequences/10-notifications/ses-bounce-complaint-handling.sequence.mmd` — webhook updates
- `docs/sequences/_cross/safety-event-fanout.sequence.mmd` — multi-system trigger path

## Validation rules

- `idempotency_key` unique across all dispatches — prevents duplicate work on SQS redelivery (per spec §Idempotency: Redis SET NX 24h + DB unique index).
- `failure_reason` populated only when status ∈ {failed, bounced}.
- `suppression_reason` populated only when status='suppressed'.
- `external_id` populated only when status ∈ {sent, delivered, bounced} (provider accepted).
- `device_id` MUST be null when `notification_type` has parent scope; required for device-scoped types (`low_battery`, `device_offline`, `device_online`).

## Edge cases

- Duplicate webhook events: SES retries deliveries up to 23 days; webhook handler deduplicates by `external_id + status` (idempotent UPDATE).
- Hard-bounce / complaint cascades to disable email channel on the parent's preferences — handled in sys-10 ses-bounce-complaint-handling, NOT in this row. Future identical sends are suppressed with `suppression_reason='email_disabled'`.
- `weekly_summary` deferral: when worker step 4 detects local time outside 8am-9pm window, the dispatch row is created with `status='queued', scheduled_for=<future>`; a re-queue with delay handles eventual send. The original row stays — the deferred re-queue creates a NEW row with the same `idempotency_key` PREFIX (suffix records delay generation).
- Cross-domain FKs: `parent_account_id` → sys-01 `users` (owning side declares FK); `device_id` → sys-02 `devices`. Declared on producer side per CONVENTIONS §3.
- Retention 90d via sys-14 cleanup — short window keeps PII surface area small (per COPPA minimal-retention principle).
