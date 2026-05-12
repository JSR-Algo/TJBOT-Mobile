---
entity: i18n_strings
domain: _shared
service_owner: NotificationService
state_machine: none
api_endpoints:
  - GET /i18n/:locale
  - PUT /i18n/:key/:locale
retention: hard
sequences_referenced_in:
  - docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd
---

# i18n_strings

## Business purpose

Backend-served translation strings. Covers anything the backend emits to a user surface that needs localisation: email subjects + bodies, push-notification text, default voice-fallback phrases, parent-summary boilerplate. Mobile/device-bundled strings are NOT in this table (they ship with the app).

Per plan §3 Q-8 default: backend-served (entitlement: locale + fallback chain).

## Ownership rules

- Owner service: `NotificationService` (primary consumer); admin authoring tooling writes.
- Writers: translation admins / external translation service; reviewer approval flow.
- Readers: every service that renders user-facing text.

## Lifecycle

- Create: admin or batch import.
- Update: edit + (re)review.
- Delete: hard-deleted when retired; no soft-delete (translations are not subject to retention compliance themselves).
- State machine: none — `reviewed` boolean gates production use.

## Related sequences

- `docs/sequences/10-notifications/sqs-worker-pipeline.sequence.mmd` — notification templates pull from here at render time.

## Validation rules

- `(key, locale)` unique.
- `locale` validated as BCP-47.
- Production render requires `reviewed=true` (else falls back to the locale chain → eventually `en-US` source).

## Edge cases

- Locale fallback chain: `vi-VN → vi → en-US`. Renderer walks until first reviewed string found.
- Variable substitution: app layer enforces same set of `{vars}` between locales; mismatched substitutions reject at review time.
- Hot path performance: services cache rendered templates per `(key, locale)`; the in-process cache invalidates on update via Redis pub/sub.
