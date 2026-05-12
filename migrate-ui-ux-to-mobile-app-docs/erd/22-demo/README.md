# 22-demo — DemoCLI ERD

**System spec:** `docs/site/software/systems/22-demo-retail-mode.md`
**Sequences:** `docs/sequences/22-demo/*.sequence.mmd`
**Owning service(s):** `DemoCLI`
**Lane:** G (worker-6, Phase 2)

## Entities

| Entity | Purpose |
|---|---|
| `demo_devices` | Registry of retail demo units; no PII; nullable cross-domain ref to DeviceService |
| `demo_session_overrides` | Short-lived per-session script overrides; 24h retention; session-scoped |

## Key conventions

- No PII stored in either entity.
- `demo_session_overrides` rows are hard-deleted after 24h by DemoCLI sweep on device boot.
- `demo_devices.device_id` cross-domain ref to `devices` (DeviceService) is optional/nullable.
