# 11-telemetry — Telemetry + audit + cost

**System spec:** `docs/site/software/systems/11-telemetry-audit-cost.md`
**Sequences:** `docs/sequences/11-telemetry/*.sequence.mmd`
**Owning service(s):** `TelemetryService`, `AuditBuffer`, `MutationHandler`, `CostAttributionWorker`
**Lane:** F (worker-5, Phase 2)
**Status:** complete — 4 entities.

## Entities

| Entity | Role |
|---|---|
| `telemetry_events` | TimescaleDB hypertable (`@timescaledb-hypertable column=created_at interval=1d`) — in-Postgres mirror of device telemetry for low-latency ops queries; 90d retention. |
| `audit_events` | Append-only COPPA-compliance audit log; polymorphic target (target_table + target_id, no FK by design); 1y retention with consent/deletion exclusions. |
| `cost_attributions` | Per-source unit economics (STT/LLM/TTS/infra cents); polymorphic source_kind (session, telemetry_event, ota_assignment, daily_aggregate). |
| `mutation_log` | 30d recoverability journal between request middleware and the durable `audit_events` flush. |

## Stateless service annotations

- `@stateless: AuditBuffer` — in-memory buffer between request middleware and `audit_events` write path; no own entity.
