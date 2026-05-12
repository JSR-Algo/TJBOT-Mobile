---
entity: mutation_log
domain: 11-telemetry
service_owner: MutationHandler
state_machine: none
api_endpoints: []
no_api: true
retention: 30d
sequences_referenced_in:
  - docs/sequences/11-telemetry/audit-log-write-path.sequence.mmd
---

# mutation_log

## Business purpose

Append-only journal capturing every mutation that the `AuditBuffer` middleware processes. Bridges the request side (the actual HTTP call) and the durable side (`audit_events`). If the audit-events flush path fails for any reason (role error, deadlock, transient), the mutation is still recorded here — enabling forensic recovery of "what happened during the outage window".

## Ownership rules

- Owner service: `MutationHandler` (the middleware that captures mutations); persistence shared with `AuditBuffer`.
- Writers: `MutationHandler` middleware (every backend mutation route).
- Readers: ops recovery scripts, sys-12 audit investigators, automated `promoted_to_audit_event_id` reconciliation.

## Lifecycle

- Create: one row per mutation observed by middleware.
- Update: never on body fields; `promoted_to_audit_event_id` updated once the row has been successfully flushed into `audit_events`. **Lifecycle.update = never** (body); single-field promotion update permitted by design.
- Delete: 30-day retention — shorter than `audit_events` because `mutation_log` is a recoverability buffer, not the long-term compliance record.

## Related APIs

- None — backend-only

## Related sequences

- `docs/sequences/11-telemetry/audit-log-write-path.sequence.mmd` — both write paths

## Validation rules

- `request_payload` and `response_summary` MUST be scrubbed of secrets before write (passwords, tokens, API keys).
- `endpoint` includes both HTTP method and path-template form (`POST /v1/households/:id/controls`).
- `http_status` populated by the response side of the middleware (set before write commits).

## Edge cases

- Same-request double-write: `mutation_log` rows are written before the response is sent; `audit_events` is flushed asynchronously by `AuditBuffer`. A single mutation generates 1 mutation_log row and (later) 1 audit_events row. The `promoted_to_audit_event_id` link guarantees no duplication.
- Recovery path: ops script scans `WHERE promoted_to_audit_event_id IS NULL AND created_at < NOW() - INTERVAL '10 min'` to find unflushed mutations and replay them into `audit_events`.
- Spec §Audit Log retry policy (3 retries with 200/400/800ms backoff) writes both `mutation_log` row (always) AND the audit-events flush attempt; if final retry fails, sys-11 audit-log-write-path falls back to CloudWatch — `promoted_to_audit_event_id` stays null and the ops alert fires.
- Retention difference rationale: 30 days here vs 1 year in `audit_events`. `mutation_log` is operationally a "what happened in the last sprint" buffer — its long-term replacement is `audit_events` once the flush succeeds.
