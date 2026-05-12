---
entity: outbox_events
domain: _shared
service_owner: PlatformGateway
state_machine: '@inline'
api_endpoints:
  - "*"
retention: 30d
sequences_referenced_in:
  - docs/sequences/_cross/safety-event-fanout.sequence.mmd
  - docs/sequences/_cross/billing-entitlement-session-start.sequence.mmd
  - docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd
  - docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd
---

# outbox_events

## Business purpose

Transactional outbox table. A producer service writes the business row + an `outbox_events` row in the same DB transaction; a relay worker polls + publishes to the message bus (SQS / SNS / EventBridge) at least once. Guarantees fanout cannot be lost even when the bus is down or the producer crashes between commit and publish.

Per plan §3: shared by sys-04 / sys-05 / sys-07 / sys-10 / sys-14 / sys-19.

## Ownership rules

- Owner service: each producing service writes its own rows; a single platform relay worker (in `MutationHandler` or service-local) polls + publishes.
- Writers: every service emitting cross-service events.
- Readers: the relay worker; observability dashboards.

## Lifecycle

- Create: in the same DB transaction as the business write.
- Update: `pending → delivering` (worker claim) → `delivered` (ack) | `failed` (retry) | `dead_lettered` (max attempts).
- Delete: hard-deleted by sys-14 retention sweep after `delivered_at + 30d`. Dead-lettered rows retained 90d for investigation.
- State machine (inline): `pending → delivering → delivered | failed`; `failed → delivering` (retry); `failed → dead_lettered` (after max attempts).

## Related sequences

- `docs/sequences/_cross/safety-event-fanout.sequence.mmd` — primary multi-consumer flow.
- `docs/sequences/_cross/billing-entitlement-session-start.sequence.mmd` — subscription change → entitlement refresh.
- `docs/sequences/14-retention/account-deletion-pipeline.sequence.mmd` — deletion-job triggers.
- `docs/sequences/19-billing/stripe-webhook-processing.sequence.mmd` — webhook → downstream.

## Validation rules

- `topic` is namespaced (`<service>.<noun>.<verb>`).
- `payload` schema versioned via `payload._version` (app layer enforces back-compat per service convention).

## Edge cases

- At-least-once delivery: consumers must be idempotent — they typically gate on `idempotency_keys` or natural keys (e.g. `aggregate_id + event_id`).
- Aggregate ordering: when a topic requires ordered delivery per aggregate, the worker serialises by `aggregate_id` (FIFO queue in SQS / partition key in Kinesis).
- Dead-lettered rows are surfaced to ops via the sys-11 dashboard; manual replay is via admin tooling.
