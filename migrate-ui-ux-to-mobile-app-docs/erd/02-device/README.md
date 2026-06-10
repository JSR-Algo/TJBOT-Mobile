# 02-device — Device provisioning registry

**System spec:** `docs/site/software/systems/02-device-provisioning-registry.md`
**Sequences:** `docs/sequences/02-device/*.sequence.mmd`
**Owning service(s):** `DeviceService`, `OfflineSweepWorker`, `DecommissionWorker`, `TransferWorker`
**Lane:** C (worker-2, Phase 2)
**Status:** complete (Phase 2 Lane C).

## Entities

| Entity | Role |
|---|---|
| `devices` | Central registry of every TBOT device; tracks lifecycle from factory-new → assigned → decommissioned. |
| `device_pairings` | Per-attempt BLE pairing + provisioning state; idempotency anchor for provision/complete. |
| `device_transfers` | Multi-phase household-to-household transfer record with integrity-job anchor. |
| `device_decommissions` | Immutable audit record written once per decommission by DecommissionWorker. |
| `device_heartbeats` | TimescaleDB hypertable; one row per accepted heartbeat; 30-day retention. |

## Stateless service annotations

The following backend actors in `docs/sequences/_actors.md` are stateless workers in this lane (they operate on rows in `devices` and emit `device_decommissions` / `device_transfers` rows but own no entities themselves):

- `@stateless: OfflineSweepWorker` — periodic offline-state sweeper.
- `@stateless: DecommissionWorker` — async decommission executor; writes `device_decommissions`.
- `@stateless: TransferWorker` — async transfer integrity executor.
