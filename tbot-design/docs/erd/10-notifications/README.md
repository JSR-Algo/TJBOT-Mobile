# 10-notifications — Notification delivery

**System spec:** `docs/site/software/systems/10-notification-delivery.md`
**Sequences:** `docs/sequences/10-notifications/*.sequence.mmd`
**Owning service(s):** `NotificationService`
**Lane:** F (worker-5, Phase 2)
**Status:** complete — 5 entities.

## Entities

| Entity | Role |
|---|---|
| `notification_templates` | Per-(type, channel) Handlebars body + delivery rules (throttle/scope/suppression/force-send). |
| `notification_dispatches` | Per-attempt delivery record (renamed from `notification_log` to avoid sys-07 collision; lifecycle queued → sent → delivered | suppressed | failed | bounced). |
| `notification_receipts` | Append-only provider events (FCM ack, SES bounce/complaint/delivery). |
| `push_tokens` | FCM/APNs token registry per user; multi-device support. |
| `email_sends` | SES-specific detail rows (subject rendered, MessageId, configuration set, body hash); 1:1 with `notification_dispatches` where channel=email. |
