---
entity: rate_limit_buckets
domain: 17-gateway
service_owner: Gateway
state_machine: none
api_endpoints:
  - "@no-api"
sequences_referenced_in:
  - "@no-sequence"
retention: 24h
---

# rate_limit_buckets

## Business purpose

Time-windowed sliding-window counter used by the API Gateway to enforce rate limits per subject (user, device, IP, or API key). Each row represents one time window for one subject. The UNIQUE constraint on `(subject_kind, subject_id, window_start)` ensures a single atomic counter per subject per window.

## Ownership rules

- Owner service: `Gateway` (WAF / rate limiting layer)
- Writers: `Gateway` (UPSERT on every request — increments `request_count`; creates new row at window boundary)
- Readers: `Gateway` (reads `request_count` vs `limit_value` before forwarding request)

## Lifecycle

- Create: on first request in a new time window for a subject.
- Update: `request_count` incremented on every subsequent request in the same window.
- Delete: hard-deleted by sweep worker after 24h (configurable retention window). Rows beyond the retention window are not needed for rate enforcement.
- State machine: none — purely a counter; no lifecycle transitions.

## Related APIs

- No direct REST API — internal Gateway mechanism only.

## Related sequences

- No explicit sequence file exists for rate limiting; annotated `@no-sequence`. Rate limiting is inline Gateway logic, not a cross-service flow.

## Validation rules

- `(subject_kind, subject_id, window_start)` is unique — enforced by DB unique index; enables atomic UPSERT increment.
- `window_size_s` must be > 0.
- `limit_value` must be > 0.
- `request_count` must be ≥ 0.

## Edge cases

- **Time-series volume**: with thousands of unique subjects and 60s windows, this table can accumulate millions of rows per day. TimescaleDB hypertable declared via `@timescaledb-hypertable` Note for efficient partition pruning and automated chunk expiry.
- **Race condition on UPSERT**: Gateway uses `INSERT ... ON CONFLICT DO UPDATE SET request_count = rate_limit_buckets.request_count + 1` for atomic increment — no application-level read-modify-write.
- **Window boundary**: Gateway floors timestamps to `window_size_s` before lookups — ensures consistent window alignment across multiple Gateway instances.
