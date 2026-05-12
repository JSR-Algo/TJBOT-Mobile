---
entity: stripe_webhook_events
domain: 19-billing
service_owner: BillingService
state_machine: "@inline"
api_endpoints:
  - POST /webhooks/stripe
sequences_referenced_in:
  - docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd
retention: "1y"
---

# stripe_webhook_events

## Business purpose

Idempotency log for every Stripe webhook event received at `POST /webhooks/stripe`. The `stripe_event_id` unique constraint is the deduplication key that prevents Stripe's at-least-once redelivery from double-processing events (e.g. double-charging, double-activating subscriptions). Also serves as a financial audit trail for all Stripe-originated state changes.

## Ownership rules

- Owner service: `BillingService`
- Writers: `BillingService` (synchronous ingest handler on webhook receipt; async worker on processing completion)
- Readers: `BillingService` (async worker dequeues by `processing_status = received`; ops monitoring queries `failed` rows)

## Lifecycle

- Create: on every webhook receipt at `POST /webhooks/stripe`, before the event is enqueued to SQS. Created with `processing_status = received`.
- Update: async worker sets `processing_status = processed` / `failed` and increments `attempts`.
- Delete: never deleted during 1-year retention window. Archived to cold storage after 1 year for financial audit compliance.
- State machine: `@inline`
  - `received` → `processed` (async worker completes handler)
  - `received` → `failed` (handler throws; row updated with `failed_reason`; SQS visibility timeout returns event for retry)
  - `failed` → `processed` (retry succeeds after backoff)
  - `failed` → (DLQ after N attempts — row remains `failed` permanently, ops alerted)

## Related APIs

- `POST /webhooks/stripe` — Stripe webhook ingest endpoint; creates this row synchronously before returning 200 to Stripe

## Related sequences

- `docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd` — full webhook ingest + async worker flow; `stripe_event_id` PK conflict handling at step 3

## Validation rules

- `stripe_event_id` unique — enforced by DB unique index (the idempotency guarantee).
- `Stripe-Signature` header must be verified before row is created; BillingService rejects without this check (prevents webhook forgery from polluting the table).
- `processed_at` must be set when `processing_status = processed`.

## Edge cases

- **Duplicate delivery**: Stripe retries up to 3× on non-200 responses. If BillingService receives a duplicate `stripe_event_id`, the `INSERT` fails with a unique constraint violation → BillingService returns `200 OK` immediately without reprocessing (idempotent ingest).
- **Signature forgery**: before INSERT, BillingService verifies `Stripe-Signature` against the webhook secret from secrets manager. Forgery → 400, no row created, ops alert.
- **DLQ overflow**: rows stuck in `failed` after N SQS retries are not auto-deleted; ops must manually re-trigger or archive them after root-cause investigation.
